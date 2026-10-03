package demo;

import com.anthropic.client.AnthropicClient;
import com.anthropic.client.okhttp.AnthropicOkHttpClient;
import com.anthropic.core.JsonValue;
import com.anthropic.models.messages.CacheControlEphemeral;
import com.anthropic.models.messages.ContentBlock;
import com.anthropic.models.messages.ContentBlockParam;
import com.anthropic.models.messages.Message;
import com.anthropic.models.messages.MessageCreateParams;
import com.anthropic.models.messages.StopReason;
import com.anthropic.models.messages.Tool;
import com.anthropic.models.messages.ToolChoiceNone;
import com.anthropic.models.messages.ToolResultBlockParam;
import com.anthropic.models.messages.ToolUseBlock;
import com.anthropic.models.messages.Usage;
import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.FileSystems;
import java.nio.file.FileVisitResult;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.PathMatcher;
import java.nio.file.SimpleFileVisitor;
import java.nio.file.attribute.BasicFileAttributes;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Scanner;
import java.util.Set;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** 第 10 课版本：结构化的系统提示、项目记忆 AGENTS.md、prompt caching、上下文压缩。 */
public class MiniAgent {

    static final Path ROOT = Path.of("").toAbsolutePath().normalize();
    static final int MAX_STEPS = 50;
    static final int MAX_RESULT_CHARS = 20_000;
    static final Set<String> SKIP_DIRS = Set.of(".git", "target", "build", "node_modules", ".idea", ".gradle");
    static final Scanner IN = new Scanner(System.in, StandardCharsets.UTF_8);
    // 上下文超过这个 token 数时自动压缩。默认 15 万；想观察压缩效果，可以用环境变量调小，比如 COMPACT_AT=20000
    static final long COMPACT_AT = Long.parseLong(System.getenv().getOrDefault("COMPACT_AT", "150000"));

    // ---------- 系统提示 ----------

    static String buildSystemPrompt() {
        StringBuilder prompt = new StringBuilder("""
                你是一个编程助手，在用户的项目目录中工作，通过工具读取和修改代码、执行命令。

                # 工作方式
                - 先用 list_files 和 grep 定位相关代码，再用 read_file 读取需要的部分，不要猜测文件内容。
                - 修改已有文件用 edit_file，只有创建新文件时才用 write_file。
                - 遵循项目现有的代码风格和约定，不做任务之外的修改。
                - 修改之后，运行构建或测试来验证，并根据输出继续修正。
                - 没有实际运行过的验证，不要说“已通过”。
                - 完成后，用中文简要说明改了哪些文件、怎么验证的。
                """);
        prompt.append("""

                # 环境
                - 项目根目录：%s
                - 操作系统：%s
                - Java 版本：%s
                - 今天的日期：%s
                """.formatted(ROOT, System.getProperty("os.name"), System.getProperty("java.version"), LocalDate.now()));
        String memory = loadProjectMemory();
        if (memory != null) {
            prompt.append("\n# 项目约定（来自 AGENTS.md，必须遵守）\n").append(memory);
        }
        return prompt.toString();
    }

    /** 项目记忆：根目录下的 AGENTS.md，没有的话再找 CLAUDE.md。 */
    static String loadProjectMemory() {
        for (String name : List.of("AGENTS.md", "CLAUDE.md")) {
            Path file = ROOT.resolve(name);
            try {
                if (Files.isRegularFile(file)) {
                    System.out.println("已加载项目记忆：" + name);
                    return Files.readString(file);
                }
            } catch (IOException e) {
                System.out.println("读取 " + name + " 失败：" + e);
            }
        }
        return null;
    }

    // ---------- 工具注册表 ----------

    interface Handler {
        String run(ToolUseBlock call) throws Exception;
    }

    /** readOnly 的工具直接执行；会改变文件或执行命令的工具，执行前要用户确认。 */
    record AgentTool(Tool definition, boolean readOnly, Handler handler) {}

    static AgentTool tool(String name, String description, boolean readOnly,
                          Map<String, Object> properties, List<String> required, Handler handler) {
        Tool.InputSchema.Builder schema = Tool.InputSchema.builder().properties(JsonValue.from(properties));
        required.forEach(schema::addRequired);
        Tool definition = Tool.builder().name(name).description(description).inputSchema(schema.build()).build();
        return new AgentTool(definition, readOnly, handler);
    }

    static final Map<String, AgentTool> TOOLS = new LinkedHashMap<>();

    static {
        register(tool("list_files",
                "按 glob 模式列出项目中的文件，自动跳过 .git、target 等目录。例如 **/*.java、src/main/**、pom.xml。",
                true,
                Map.of("pattern", Map.of("type", "string")),
                List.of("pattern"), MiniAgent::listFiles));
        register(tool("grep",
                "在项目文件中按正则表达式搜索，返回“路径:行号: 内容”。可以用 glob 限定文件范围，例如 **/*.java。",
                true,
                Map.of("pattern", Map.of("type", "string", "description", "Java 正则表达式"),
                       "glob", Map.of("type", "string", "description", "可选，只搜索匹配的文件")),
                List.of("pattern"), MiniAgent::grep));
        register(tool("read_file",
                "读取文本文件，每行前面带行号（行号不是文件内容）。大文件可以用 offset 和 limit 分段读取。",
                true,
                Map.of("path", Map.of("type", "string"),
                       "offset", Map.of("type", "integer", "description", "从第几行开始，默认 1"),
                       "limit", Map.of("type", "integer", "description", "最多读多少行，默认 400")),
                List.of("path"), MiniAgent::readFile));
        register(tool("edit_file",
                "把文件中的 old_string 替换为 new_string。old_string 必须与文件内容逐字一致（包括缩进，不含行号），"
                        + "并且在文件中只出现一次；不唯一时请包含更多上下文。修改前应先用 read_file 读过该文件。",
                false,
                Map.of("path", Map.of("type", "string"),
                       "old_string", Map.of("type", "string"),
                       "new_string", Map.of("type", "string")),
                List.of("path", "old_string", "new_string"), MiniAgent::editFile));
        register(tool("write_file",
                "创建新文件并写入完整内容。修改已有文件请用 edit_file。",
                false,
                Map.of("path", Map.of("type", "string"), "content", Map.of("type", "string")),
                List.of("path", "content"), MiniAgent::writeFile));
        register(tool("run_command",
                "在项目根目录用 bash 执行一条命令，返回退出码和输出。输出过长时只保留开头和结尾。",
                false,
                Map.of("command", Map.of("type", "string"),
                       "timeout_seconds", Map.of("type", "integer", "description", "超时秒数，默认 120，最大 600")),
                List.of("command"), MiniAgent::runCommand));
    }

    static void register(AgentTool tool) {
        TOOLS.put(tool.definition().name(), tool);
    }

    // ---------- 主程序 ----------

    public static void main(String[] args) {
        AnthropicClient client = AnthropicOkHttpClient.fromEnv();
        MessageCreateParams.Builder conversation = newConversation();

        System.out.println("项目目录：" + ROOT + "\n输入任务；/compact 压缩上下文，/clear 清空对话，exit 退出。");
        while (true) {
            System.out.print("\n> ");
            if (!IN.hasNextLine()) break;
            String task = IN.nextLine().trim();
            if (task.equals("exit")) break;
            if (task.isEmpty()) continue;
            if (task.equals("/clear")) {
                conversation = newConversation();
                System.out.println("（对话已清空）");
                continue;
            }
            if (task.equals("/compact")) {
                compact(client, conversation, List.of());
                continue;
            }
            conversation.addUserMessage(task);
            runAgentLoop(client, conversation);
        }
    }

    static MessageCreateParams.Builder newConversation() {
        MessageCreateParams.Builder conversation = MessageCreateParams.builder()
                .model("claude-opus-5-5")
                .maxTokens(16_000L)
                .system(buildSystemPrompt())
                // 自动缓存：在请求的最后一个块上打缓存标记，下一轮请求可以复用整个前缀
                .cacheControl(CacheControlEphemeral.builder().build());
        TOOLS.values().forEach(t -> conversation.addTool(t.definition()));
        return conversation;
    }

    // ---------- agent 循环（和第 8 课相同） ----------

    static void runAgentLoop(AnthropicClient client, MessageCreateParams.Builder conversation) {
        for (int step = 1; step <= MAX_STEPS; step++) {
            Message response = client.messages().create(conversation.build());
            conversation.addMessage(response);
            StopReason reason = response.stopReason().orElse(StopReason.END_TURN);
            Usage usage = response.usage();
            long cacheRead = usage.cacheReadInputTokens().orElse(0L);
            long cacheWrite = usage.cacheCreationInputTokens().orElse(0L);
            // 开启缓存后，input_tokens 只是未命中缓存的部分，上下文总量要把三者加起来
            long context = usage.inputTokens() + cacheRead + cacheWrite;
            System.out.printf("[第 %d 步] stop_reason=%s 上下文=%d（缓存命中 %d，写入缓存 %d，未缓存 %d） 输出=%d%n",
                    step, reason, context, cacheRead, cacheWrite, usage.inputTokens(), usage.outputTokens());

            List<ContentBlockParam> results = new ArrayList<>();
            for (ContentBlock block : response.content()) {
                block.text().ifPresent(t -> System.out.println(t.text()));
                block.toolUse().ifPresent(call -> results.add(ContentBlockParam.ofToolResult(
                        reason.equals(StopReason.MAX_TOKENS)
                                ? error(call, "未执行：回复在 max_tokens 处被截断，请把操作拆小后重试。")
                                : execute(call))));
            }

            if (!results.isEmpty()) {
                if (context > COMPACT_AT) {
                    // 工具结果还没发给模型，把它们一起交给压缩，摘要里会包含这些结果
                    compact(client, conversation, results);
                } else {
                    conversation.addUserMessageOfBlockParams(results);
                }
                continue;
            }
            if (reason.equals(StopReason.PAUSE_TURN)) continue;
            if (reason.equals(StopReason.MAX_TOKENS)) System.out.println("（回复被截断）");
            if (reason.equals(StopReason.REFUSAL)) System.out.println("（模型拒绝了这个请求）");
            return;
        }
        System.out.println("（达到 " + MAX_STEPS + " 步上限，停止。可以输入“继续”让它接着做。）");
    }

    // ---------- 上下文压缩 ----------

    static final String COMPACT_PROMPT = """
            上下文即将用完。请为接手这项工作的人写一份摘要，之后的工作将只依据这份摘要继续，原始对话会被丢弃。
            按以下标题组织，信息要具体（文件路径、类名、命令、报错原文）：
            1. 用户的目标和明确提出的要求
            2. 已完成的工作：修改了哪些文件，每处改了什么
            3. 重要发现：项目结构、约定、踩过的坑、失败过的尝试
            4. 当前状态：最近一次构建或测试的结果
            5. 下一步要做什么
            只输出摘要本身。
            """;

    /**
     * 让模型把目前的对话总结成一份摘要，然后用这份摘要替换全部历史。
     * pending 是还没发给模型的工具结果，它们会和压缩指令放在同一条 user 消息里。
     */
    static void compact(AnthropicClient client, MessageCreateParams.Builder conversation,
                        List<ContentBlockParam> pending) {
        List<ContentBlockParam> last = new ArrayList<>(pending);
        last.add(ContentBlockParam.ofText(COMPACT_PROMPT));
        MessageCreateParams request = conversation.build().toBuilder()
                .addUserMessageOfBlockParams(last)
                .toolChoice(ToolChoiceNone.builder().build()) // 只写摘要，不调用工具
                .build();
        Message response = client.messages().create(request);
        String summary = response.content().stream()
                .flatMap(block -> block.text().stream())
                .map(text -> text.text())
                .reduce("", String::concat);
        conversation.messages(List.of());
        conversation.addUserMessage("""
                这是一段长时间工作的延续。之前的对话已压缩为下面的摘要：

                %s

                请在此基础上继续工作。如果需要文件的细节，重新读取即可。
                """.formatted(summary));
        System.out.printf("（上下文已压缩：摘要 %d 个字符）%n", summary.length());
    }

    static ToolResultBlockParam execute(ToolUseBlock call) {
        AgentTool tool = TOOLS.get(call.name());
        if (tool == null) return error(call, "未知工具：" + call.name());
        System.out.println("  → " + call.name() + " " + brief(call));
        try {
            if (call.name().equals("edit_file")) checkEdit(call); // 先校验，免得用户确认了一个注定失败的修改
            if (!tool.readOnly() && !confirm(call)) return error(call, "用户拒绝了这个操作。");
            return ToolResultBlockParam.builder().toolUseId(call.id()).content(truncate(tool.handler().run(call))).build();
        } catch (IllegalArgumentException e) {
            return error(call, e.getMessage());
        } catch (Exception e) {
            return error(call, e.toString());
        }
    }

    // ---------- 搜索 ----------

    /** 项目中的所有文件（相对路径），跳过 SKIP_DIRS。 */
    static List<Path> projectFiles() throws IOException {
        List<Path> files = new ArrayList<>();
        Files.walkFileTree(ROOT, new SimpleFileVisitor<>() {
            @Override
            public FileVisitResult preVisitDirectory(Path dir, BasicFileAttributes attrs) {
                return !dir.equals(ROOT) && SKIP_DIRS.contains(dir.getFileName().toString())
                        ? FileVisitResult.SKIP_SUBTREE : FileVisitResult.CONTINUE;
            }

            @Override
            public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) {
                if (attrs.isRegularFile()) files.add(ROOT.relativize(file));
                return FileVisitResult.CONTINUE;
            }
        });
        files.sort(null);
        return files;
    }

    static boolean globMatches(String glob, Path relative) {
        PathMatcher matcher = FileSystems.getDefault().getPathMatcher("glob:" + glob);
        // 让 **/*.java 也能匹配根目录下的 Foo.java
        return matcher.matches(relative)
                || (glob.startsWith("**/") && FileSystems.getDefault()
                        .getPathMatcher("glob:" + glob.substring(3)).matches(relative));
    }

    static String listFiles(ToolUseBlock call) throws IOException {
        String pattern = arg(call, "pattern");
        List<String> matched = projectFiles().stream()
                .filter(p -> globMatches(pattern, p))
                .map(Path::toString)
                .toList();
        if (matched.isEmpty()) return "没有匹配 " + pattern + " 的文件。";
        int limit = 200;
        String list = String.join("\n", matched.subList(0, Math.min(limit, matched.size())));
        return matched.size() > limit
                ? list + "\n……共 " + matched.size() + " 个文件，只列出前 " + limit + " 个，请缩小范围。"
                : list;
    }

    static String grep(ToolUseBlock call) throws IOException {
        Pattern regex = Pattern.compile(arg(call, "pattern"));
        String glob = optArg(call, "glob");
        List<String> hits = new ArrayList<>();
        int limit = 100;
        for (Path file : projectFiles()) {
            if (glob != null && !globMatches(glob, file)) continue;
            Path absolute = ROOT.resolve(file);
            if (Files.size(absolute) > 1_000_000) continue;
            List<String> lines;
            try {
                lines = Files.readAllLines(absolute);
            } catch (IOException notText) {
                continue; // 二进制或非 UTF-8 文件
            }
            for (int i = 0; i < lines.size(); i++) {
                Matcher m = regex.matcher(lines.get(i));
                if (!m.find()) continue;
                if (hits.size() == limit) {
                    return String.join("\n", hits) + "\n……匹配超过 " + limit + " 处，请用更具体的模式或 glob 缩小范围。";
                }
                String line = lines.get(i).strip();
                hits.add(file + ":" + (i + 1) + ": " + (line.length() > 200 ? line.substring(0, 200) + "…" : line));
            }
        }
        return hits.isEmpty() ? "没有匹配。" : String.join("\n", hits);
    }

    // ---------- 读取与编辑 ----------

    static String readFile(ToolUseBlock call) throws IOException {
        List<String> lines = Files.readAllLines(resolve(arg(call, "path")));
        int offset = Math.max(1, intArg(call, "offset", 1));
        int limit = Math.max(1, intArg(call, "limit", 400));
        int end = Math.min(lines.size(), offset - 1 + limit);
        StringBuilder out = new StringBuilder();
        for (int i = offset - 1; i < end; i++) {
            out.append(String.format("%6d\t%s%n", i + 1, lines.get(i)));
        }
        if (offset > 1 || end < lines.size()) {
            out.append("（文件共 ").append(lines.size()).append(" 行，以上是第 ").append(offset)
               .append("–").append(end).append(" 行。）");
        }
        return out.toString();
    }

    static String editFile(ToolUseBlock call) throws IOException {
        Path file = checkEdit(call);
        String content = Files.readString(file);
        Files.writeString(file, content.replace(arg(call, "old_string"), arg(call, "new_string")));
        return "已修改 " + arg(call, "path");
    }

    /** old_string 必须恰好出现一次。错误信息写给模型看，告诉它下一步该怎么做。 */
    static Path checkEdit(ToolUseBlock call) throws IOException {
        Path file = resolve(arg(call, "path"));
        int count = countOccurrences(Files.readString(file), arg(call, "old_string"));
        if (count == 0) {
            throw new IllegalArgumentException("文件中没有找到 old_string。请先用 read_file 查看当前内容，"
                    + "注意缩进和空白要完全一致，且不要包含行号。");
        }
        if (count > 1) {
            throw new IllegalArgumentException("old_string 在文件中出现了 " + count + " 次。请包含更多上下文，使它只出现一次。");
        }
        return file;
    }

    static int countOccurrences(String text, String part) {
        if (part.isEmpty()) return 0;
        int count = 0;
        for (int i = text.indexOf(part); i >= 0; i = text.indexOf(part, i + part.length())) count++;
        return count;
    }

    static String writeFile(ToolUseBlock call) throws IOException {
        Path file = resolve(arg(call, "path"));
        if (file.getParent() != null) Files.createDirectories(file.getParent());
        Files.writeString(file, arg(call, "content"));
        return "已写入 " + arg(call, "path");
    }

    // ---------- 执行命令 ----------

    static String runCommand(ToolUseBlock call) throws Exception {
        int timeout = Math.min(600, intArg(call, "timeout_seconds", 120));
        File log = File.createTempFile("agent", ".log");
        Process process = new ProcessBuilder("bash", "-c", arg(call, "command"))
                .directory(ROOT.toFile())
                .redirectErrorStream(true)
                .redirectOutput(log)
                .start();
        boolean finished = process.waitFor(timeout, TimeUnit.SECONDS);
        if (!finished) process.destroyForcibly();
        String output = Files.readString(log.toPath());
        log.delete();
        String status = finished ? "exit code: " + process.exitValue() : "超时（" + timeout + " 秒），已终止";
        return status + "\n" + headAndTail(output, 4_000, 12_000);
    }

    /** 命令输出过长时保留开头和结尾：开头有命令的上下文，结尾通常是错误和汇总。 */
    static String headAndTail(String s, int head, int tail) {
        if (s.length() <= head + tail) return s;
        return s.substring(0, head)
                + "\n……（省略中间 " + (s.length() - head - tail) + " 个字符）……\n"
                + s.substring(s.length() - tail);
    }

    // ---------- 确认与辅助方法 ----------

    static boolean confirm(ToolUseBlock call) {
        switch (call.name()) {
            case "edit_file" -> {
                System.out.println("    " + arg(call, "path"));
                arg(call, "old_string").lines().forEach(l -> System.out.println("    - " + l));
                arg(call, "new_string").lines().forEach(l -> System.out.println("    + " + l));
            }
            case "write_file" -> System.out.println("    新文件 " + arg(call, "path")
                    + "（" + arg(call, "content").length() + " 个字符）");
            default -> { }
        }
        System.out.print("  允许执行？[y/N] ");
        return IN.hasNextLine() && IN.nextLine().trim().equalsIgnoreCase("y");
    }

    static Path resolve(String path) {
        Path p = ROOT.resolve(path).normalize();
        if (!p.startsWith(ROOT)) throw new IllegalArgumentException("不允许访问项目目录之外的路径：" + path);
        return p;
    }

    static Map<?, ?> input(ToolUseBlock call) {
        return call._input().convert(Map.class);
    }

    static String optArg(ToolUseBlock call, String name) {
        Object value = input(call).get(name);
        return value == null ? null : value.toString();
    }

    static String arg(ToolUseBlock call, String name) {
        String value = optArg(call, name);
        if (value == null) throw new IllegalArgumentException("缺少参数：" + name);
        return value;
    }

    static int intArg(ToolUseBlock call, String name, int defaultValue) {
        Object value = input(call).get(name);
        return value instanceof Number n ? n.intValue() : defaultValue;
    }

    static String brief(ToolUseBlock call) {
        String s = switch (call.name()) {
            case "edit_file", "write_file" -> arg(call, "path");
            default -> call._input().toString();
        };
        return s.length() > 120 ? s.substring(0, 120) + "…" : s;
    }

    static String truncate(String s) {
        if (s.length() <= MAX_RESULT_CHARS) return s;
        return s.substring(0, MAX_RESULT_CHARS) + "\n……（输出过长，已截断，共 " + s.length() + " 个字符）";
    }

    static ToolResultBlockParam error(ToolUseBlock call, String message) {
        return ToolResultBlockParam.builder().toolUseId(call.id()).content(message).isError(true).build();
    }
}

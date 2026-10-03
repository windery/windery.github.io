package demo;

import com.anthropic.client.AnthropicClient;
import com.anthropic.client.okhttp.AnthropicOkHttpClient;
import com.anthropic.core.JsonValue;
import com.anthropic.models.messages.ContentBlock;
import com.anthropic.models.messages.ContentBlockParam;
import com.anthropic.models.messages.Message;
import com.anthropic.models.messages.MessageCreateParams;
import com.anthropic.models.messages.StopReason;
import com.anthropic.models.messages.Tool;
import com.anthropic.models.messages.ToolResultBlockParam;
import com.anthropic.models.messages.ToolUseBlock;
import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Scanner;
import java.util.concurrent.TimeUnit;

public class MiniAgent {

    static final Path ROOT = Path.of("").toAbsolutePath().normalize();
    static final int MAX_STEPS = 30;            // 一次任务最多调用模型的次数
    static final int MAX_RESULT_CHARS = 20_000; // 单个工具结果的长度上限
    static final Scanner IN = new Scanner(System.in, StandardCharsets.UTF_8);

    static final String SYSTEM = """
            你是一个编程助手，在用户的项目目录中工作。项目根目录：%s
            - 修改代码之前，先用工具阅读相关文件，不要猜测文件内容。
            - 修改之后，运行构建或测试来验证，并根据输出继续修正。
            - 完成后，用中文简要说明改了哪些文件、怎么验证的。
            """.formatted(ROOT);

    // ---------- 工具定义 ----------

    static Tool tool(String name, String description, Map<String, Object> properties, String... required) {
        Tool.InputSchema.Builder schema = Tool.InputSchema.builder().properties(JsonValue.from(properties));
        for (String r : required) schema.addRequired(r);
        return Tool.builder().name(name).description(description).inputSchema(schema.build()).build();
    }

    static final List<Tool> TOOLS = List.of(
            tool("read_file", "读取一个文本文件的完整内容。路径相对于项目根目录。",
                    Map.of("path", Map.of("type", "string")), "path"),
            tool("write_file", "用给定内容覆盖写入一个文件，文件不存在时创建。路径相对于项目根目录。",
                    Map.of("path", Map.of("type", "string"),
                           "content", Map.of("type", "string", "description", "文件的完整新内容")),
                    "path", "content"),
            tool("run_command", "在项目根目录用 bash 执行一条命令，返回退出码和输出。适合 ls、grep、mvn test 等。",
                    Map.of("command", Map.of("type", "string")), "command"));

    // ---------- 主程序：读取用户输入，每条输入跑一轮 agent 循环 ----------

    public static void main(String[] args) {
        AnthropicClient client = AnthropicOkHttpClient.fromEnv();
        MessageCreateParams.Builder conversation = MessageCreateParams.builder()
                .model("claude-opus-5-5")
                .maxTokens(16_000L)
                .system(SYSTEM);
        TOOLS.forEach(conversation::addTool);

        System.out.println("项目目录：" + ROOT + "\n输入任务，输入 exit 退出。");
        while (true) {
            System.out.print("\n> ");
            if (!IN.hasNextLine()) break;
            String task = IN.nextLine().trim();
            if (task.equals("exit")) break;
            if (task.isEmpty()) continue;
            conversation.addUserMessage(task);
            runAgentLoop(client, conversation);
        }
    }

    // ---------- agent 循环 ----------

    static void runAgentLoop(AnthropicClient client, MessageCreateParams.Builder conversation) {
        for (int step = 1; step <= MAX_STEPS; step++) {
            Message response = client.messages().create(conversation.build());
            conversation.addMessage(response); // 模型的回复原样进入历史
            StopReason reason = response.stopReason().orElse(StopReason.END_TURN);
            System.out.printf("[第 %d 步] stop_reason=%s input_tokens=%d output_tokens=%d%n",
                    step, reason, response.usage().inputTokens(), response.usage().outputTokens());

            List<ContentBlockParam> results = new ArrayList<>();
            for (ContentBlock block : response.content()) {
                block.text().ifPresent(t -> System.out.println(t.text()));
                block.toolUse().ifPresent(toolUse -> {
                    ToolResultBlockParam result = reason.equals(StopReason.MAX_TOKENS)
                            // 输出被截断时，工具参数可能不完整，不执行，告诉模型原因
                            ? error(toolUse, "未执行：回复在 max_tokens 处被截断，请把操作拆小后重试。")
                            : execute(toolUse);
                    results.add(ContentBlockParam.ofToolResult(result));
                });
            }

            if (!results.isEmpty()) {
                // 每个 tool_use 都必须有对应的 tool_result，放在下一条 user 消息里
                conversation.addUserMessageOfBlockParams(results);
                continue;
            }
            if (reason.equals(StopReason.PAUSE_TURN)) continue; // 服务端暂停：原样再发一次即可继续
            if (reason.equals(StopReason.MAX_TOKENS)) System.out.println("（回复被截断）");
            if (reason.equals(StopReason.REFUSAL)) System.out.println("（模型拒绝了这个请求）");
            return; // end_turn 等：这一轮任务结束，把控制权交还用户
        }
        System.out.println("（达到 " + MAX_STEPS + " 步上限，停止。可以输入“继续”让它接着做。）");
    }

    // ---------- 工具执行 ----------

    static ToolResultBlockParam execute(ToolUseBlock toolUse) {
        System.out.println("  → " + toolUse.name() + " " + summary(toolUse));
        try {
            String output = switch (toolUse.name()) {
                case "read_file" -> Files.readString(resolve(arg(toolUse, "path")));
                case "write_file" -> writeFile(arg(toolUse, "path"), arg(toolUse, "content"));
                case "run_command" -> runCommand(arg(toolUse, "command"));
                default -> throw new IllegalArgumentException("未知工具：" + toolUse.name());
            };
            return ToolResultBlockParam.builder().toolUseId(toolUse.id()).content(truncate(output)).build();
        } catch (Exception e) {
            // 失败不抛给调用方，而是作为 is_error 的结果回传，模型会据此调整
            return error(toolUse, e.toString());
        }
    }

    static String writeFile(String path, String content) throws Exception {
        if (!confirm("写入 " + path + "（" + content.length() + " 个字符）")) {
            throw new IllegalStateException("用户拒绝了这次写入");
        }
        Path file = resolve(path);
        if (file.getParent() != null) Files.createDirectories(file.getParent());
        Files.writeString(file, content);
        return "已写入 " + path;
    }

    static String runCommand(String command) throws Exception {
        if (!confirm("执行 " + command)) {
            throw new IllegalStateException("用户拒绝执行这条命令");
        }
        File log = File.createTempFile("agent", ".log");
        Process process = new ProcessBuilder("bash", "-c", command)
                .directory(ROOT.toFile())
                .redirectErrorStream(true)
                .redirectOutput(log)
                .start();
        boolean finished = process.waitFor(120, TimeUnit.SECONDS);
        if (!finished) process.destroyForcibly();
        String output = Files.readString(log.toPath());
        log.delete();
        return (finished ? "exit code: " + process.exitValue() : "超时（120 秒），已终止") + "\n" + output;
    }

    // ---------- 辅助方法 ----------

    static Path resolve(String path) {
        Path p = ROOT.resolve(path).normalize();
        if (!p.startsWith(ROOT)) throw new IllegalArgumentException("不允许访问项目目录之外的路径：" + path);
        return p;
    }

    static String arg(ToolUseBlock toolUse, String name) {
        Map<?, ?> input = toolUse._input().convert(Map.class);
        Object value = input.get(name);
        if (value == null) throw new IllegalArgumentException("缺少参数：" + name);
        return value.toString();
    }

    static String summary(ToolUseBlock toolUse) {
        return toolUse.name().equals("write_file") ? arg(toolUse, "path") : toolUse._input().toString();
    }

    static boolean confirm(String action) {
        System.out.print("  允许" + action + "？[y/N] ");
        return IN.hasNextLine() && IN.nextLine().trim().equalsIgnoreCase("y");
    }

    static String truncate(String s) {
        if (s.length() <= MAX_RESULT_CHARS) return s;
        return s.substring(0, MAX_RESULT_CHARS) + "\n……（输出过长，已截断，共 " + s.length() + " 个字符）";
    }

    static ToolResultBlockParam error(ToolUseBlock toolUse, String message) {
        return ToolResultBlockParam.builder().toolUseId(toolUse.id()).content(message).isError(true).build();
    }
}

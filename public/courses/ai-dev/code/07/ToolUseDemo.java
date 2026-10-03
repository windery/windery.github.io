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
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public class ToolUseDemo {

    // 1. 工具定义：名字、说明、参数的 JSON Schema。这就是模型知道的关于这个工具的全部信息。
    static final Tool READ_FILE = Tool.builder()
            .name("read_file")
            .description("读取项目中一个文本文件的完整内容。路径相对于项目根目录。")
            .inputSchema(Tool.InputSchema.builder()
                    .properties(JsonValue.from(Map.of(
                            "path", Map.of(
                                    "type", "string",
                                    "description", "文件路径，例如 pom.xml"))))
                    .addRequired("path")
                    .build())
            .build();

    public static void main(String[] args) {
        AnthropicClient client = AnthropicOkHttpClient.fromEnv();
        String question = args.length > 0 ? args[0] : "这个项目依赖了哪些库？用一句话回答。";

        MessageCreateParams.Builder request = MessageCreateParams.builder()
                .model("claude-opus-5-5")
                .maxTokens(4096L)
                .addTool(READ_FILE)
                .addUserMessage(question);

        // 2. 第一次调用：模型可能直接回答，也可能请求调用工具
        Message first = client.messages().create(request.build());
        System.out.println("第一次 stop_reason = " + first.stopReason().orElseThrow());
        if (!first.stopReason().orElseThrow().equals(StopReason.TOOL_USE)) {
            printText(first);
            return;
        }

        // 3. 把模型的回复原样加入对话历史（包括 thinking 块和 tool_use 块）
        request.addMessage(first);

        // 4. 由我们的程序执行工具，把结果作为 tool_result 放进下一条 user 消息
        List<ContentBlockParam> results = new ArrayList<>();
        for (ContentBlock block : first.content()) {
            if (block.toolUse().isEmpty()) continue;
            ToolUseBlock toolUse = block.toolUse().get();
            System.out.println("模型请求调用：" + toolUse.name() + " " + toolUse._input());
            results.add(ContentBlockParam.ofToolResult(execute(toolUse)));
        }
        request.addUserMessageOfBlockParams(results);

        // 5. 第二次调用：模型读到工具结果，给出最终回答
        Message second = client.messages().create(request.build());
        System.out.println("第二次 stop_reason = " + second.stopReason().orElseThrow());
        printText(second);
    }

    static ToolResultBlockParam execute(ToolUseBlock toolUse) {
        ToolResultBlockParam.Builder result = ToolResultBlockParam.builder().toolUseId(toolUse.id());
        try {
            Map<?, ?> input = toolUse._input().convert(Map.class);
            String path = (String) input.get("path");
            return result.content(Files.readString(Path.of(path))).build();
        } catch (Exception e) {
            // 出错也要回传：告诉模型发生了什么，让它自己决定下一步
            return result.content("读取失败：" + e).isError(true).build();
        }
    }

    static void printText(Message message) {
        message.content().stream()
                .flatMap(block -> block.text().stream())
                .forEach(text -> System.out.println(text.text()));
    }
}

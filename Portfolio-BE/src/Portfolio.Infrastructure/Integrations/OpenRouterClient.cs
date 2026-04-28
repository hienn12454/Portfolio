using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Portfolio.Application.Abstractions;

namespace Portfolio.Infrastructure.Integrations;

public sealed class OpenRouterClient(IHttpClientFactory httpClientFactory, IConfiguration configuration) : IOpenRouterClient
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public bool IsConfigured => !string.IsNullOrWhiteSpace(configuration["OpenRouter:ApiKey"]);

    public async Task<string> GetCareerAdviceAsync(
        string track,
        string userQuestion,
        string ragContext,
        string roadmapSlug,
        IReadOnlyCollection<string> roadmapTopics,
        IReadOnlyCollection<WebResearchItem> webResearchItems,
        string historyText,
        CancellationToken cancellationToken)
    {
        var roadmapContext = roadmapTopics.Count == 0 ? "No roadmap topics found." : string.Join(", ", roadmapTopics.Take(14));
        var webResearchContext = webResearchItems.Count == 0
            ? "No external web research found."
            : string.Join(
                "\n",
                webResearchItems.Take(6).Select(item =>
                    $"- [{item.Source}] {item.Title}\n  URL: {item.Url}\n  Note: {item.Snippet}"));
        var prompt =
            $$"""
            Current selected track: {{track}}
            Roadmap source slug: {{roadmapSlug}}
            roadmap.sh topics: {{roadmapContext}}
            
            Web research context (public sources):
            {{webResearchContext}}
            
            RAG context:
            {{ragContext}}
            
            Recent conversation:
            {{historyText}}
            
            User question:
            {{userQuestion}}
            """;

        return await RequestCompletionAsync(
            systemPrompt:
            """
            You are a practical IT career advisor for Vietnamese users.
            Use provided context, roadmap topics, and web research as grounding.
            When web context exists, synthesize key insights and mention practical cautions.
            Respond in Vietnamese with:
            1) hướng đi phù hợp
            2) roadmap 30-60-90 ngày
            3) project gợi ý
            4) kỹ năng cần ưu tiên
            5) 2-3 nguồn tham khảo nên đọc tiếp
            """,
            userPrompt: prompt,
            fallback:
            "Bạn nên bắt đầu từ kiến thức nền, bám roadmap theo chuyên ngành, và học theo chu kỳ 30-60-90 ngày với project thực hành.",
            maxTokens: 600,
            cancellationToken);
    }

    public async Task<string> GenerateRoadmapPlanAsync(
        string track,
        string specialty,
        string roadmapSlug,
        IReadOnlyCollection<string> roadmapTopics,
        CancellationToken cancellationToken)
    {
        var topTopics = string.Join(", ", roadmapTopics.Take(12));
        var prompt =
            $$"""
            Bạn là mentor kỹ thuật.
            Hãy tạo plan học thực chiến bằng tiếng Việt cho user:
            - Nghề tổng quát: {{track}}
            - Chuyên ngành hẹp: {{specialty}}
            - Roadmap slug từ roadmap.sh: {{roadmapSlug}}
            - Các topic tham chiếu: {{topTopics}}
            
            Yêu cầu output:
            1) Lộ trình 12 tuần (theo tuần, ngắn gọn)
            2) 5 project milestone thực hành
            3) Checklist kỹ năng cốt lõi
            4) Gợi ý nhịp học mỗi ngày 60-90 phút
            """;

        var fallback =
            $$"""
            ## Plan học 12 tuần cho {{specialty}}
            
            ### Tuần 1-4: Nền tảng
            - Ôn kiến thức cốt lõi của {{track}}
            - Làm lab nhỏ theo topic chính
            
            ### Tuần 5-8: Thực hành chuyên sâu
            - Xây 1 project thực tế bám theo roadmap `{{roadmapSlug}}`
            - Viết README + mô tả kiến trúc
            
            ### Tuần 9-12: Production mindset
            - Tối ưu hiệu năng + log/monitoring
            - Triển khai cloud + CI/CD
            """;

        return await RequestCompletionAsync(
            systemPrompt: "Bạn tạo learning roadmap súc tích, thực dụng, ưu tiên tính khả thi.",
            userPrompt: prompt,
            fallback: fallback,
            maxTokens: 900,
            cancellationToken);
    }

    private async Task<string> RequestCompletionAsync(
        string systemPrompt,
        string userPrompt,
        string fallback,
        int maxTokens,
        CancellationToken cancellationToken)
    {
        var apiKey = configuration["OpenRouter:ApiKey"];
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            return fallback;
        }

        var model = configuration["OpenRouter:Model"] ?? "qwen/qwen3-coder:free";
        var referer = configuration["OpenRouter:HttpReferer"] ?? "https://localhost";
        var appTitle = configuration["OpenRouter:AppTitle"] ?? "Portfolio Planner";
        var temperature = configuration.GetValue<double?>("OpenRouter:Temperature") ?? 0.35;
        var configuredMaxTokens = configuration.GetValue<int?>("OpenRouter:MaxTokens");
        var resolvedMaxTokens = configuredMaxTokens.HasValue && configuredMaxTokens.Value > 0
            ? Math.Min(configuredMaxTokens.Value, maxTokens)
            : maxTokens;

        var payload = new
        {
            model,
            temperature,
            max_tokens = resolvedMaxTokens,
            messages = new object[]
            {
                new { role = "system", content = systemPrompt },
                new { role = "user", content = userPrompt }
            }
        };

        var httpClient = httpClientFactory.CreateClient();
        using var request = new HttpRequestMessage(HttpMethod.Post, "https://openrouter.ai/api/v1/chat/completions")
        {
            Content = new StringContent(JsonSerializer.Serialize(payload, JsonOptions), Encoding.UTF8, "application/json")
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
        request.Headers.TryAddWithoutValidation("HTTP-Referer", referer);
        request.Headers.TryAddWithoutValidation("X-OpenRouter-Title", appTitle);

        using var response = await httpClient.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            return fallback;
        }

        var responseText = await response.Content.ReadAsStringAsync(cancellationToken);
        using var json = JsonDocument.Parse(responseText);
        var content = json.RootElement.GetProperty("choices")[0].GetProperty("message").GetProperty("content").GetString();
        return string.IsNullOrWhiteSpace(content) ? fallback : content.Trim();
    }
}

using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Portfolio.Application.Abstractions;

namespace Portfolio.Infrastructure.Integrations;

public sealed class OpenRouterClient(
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    ILogger<OpenRouterClient> logger) : IOpenRouterClient
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private static readonly string[] ProfanityTerms =
    [
        "dm",
        "dmm",
        "đm",
        "đmm",
        "địt",
        "dit",
        "cặc",
        "cak",
        "đéo",
        "deo",
        "lồn",
        "lon",
        "vcl",
        "vl",
        "fuck",
        "fucking",
        "shit",
        "bitch",
        "asshole"
    ];

    public bool IsConfigured => !string.IsNullOrWhiteSpace(configuration["OpenRouter:ApiKey"]);

    public async Task<OpenRouterDiagnosticResult> GetDiagnosticAsync(CancellationToken cancellationToken = default)
    {
        var apiKey = configuration["OpenRouter:ApiKey"];
        var baseUrl = (configuration["OpenRouter:BaseUrl"] ?? "https://openrouter.ai/api/v1").Trim().TrimEnd('/');
        var modelId = (configuration["OpenRouter:ModelId"] ?? configuration["OpenRouter:Model"] ?? "qwen/qwen3-coder:free").Trim();

        var provider = "OpenRouter";

        if (string.IsNullOrWhiteSpace(apiKey))
        {
            return new OpenRouterDiagnosticResult(
                ApiKeyConfigured: false,
                Provider: provider,
                BaseUrl: baseUrl,
                ModelId: modelId,
                TestError: $"{provider}:ApiKey chưa được cấu hình.");
        }

        if (string.IsNullOrWhiteSpace(modelId))
        {
            return new OpenRouterDiagnosticResult(
                ApiKeyConfigured: true,
                Provider: provider,
                BaseUrl: baseUrl,
                ModelId: modelId,
                TestError: $"{provider}:ModelId chưa được cấu hình.");
        }

        var referer = configuration["OpenRouter:HttpReferer"] ?? "https://localhost";
        var title = configuration["OpenRouter:SiteTitle"] ?? configuration["OpenRouter:AppTitle"] ?? "Portfolio Planner";

        try
        {
            // Chẩn đoán đơn giản: gọi /chat/completions với max_tokens nhỏ
            var payload = new
            {
                model = modelId,
                temperature = configuration.GetValue<double?>("OpenRouter:Temperature") ?? 0.35,
                max_tokens = 5,
                messages = new object[]
                {
                    new { role = "system", content = "You are a helpful assistant." },
                    new { role = "user", content = "Hello" }
                }
            };

            var httpClient = httpClientFactory.CreateClient();
            using var request = new HttpRequestMessage(HttpMethod.Post, $"{baseUrl}/chat/completions")
            {
                Content = new StringContent(JsonSerializer.Serialize(payload, JsonOptions), Encoding.UTF8, "application/json")
            };

            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
            request.Headers.TryAddWithoutValidation("HTTP-Referer", referer);
            request.Headers.TryAddWithoutValidation("X-OpenRouter-Title", title);

            using var response = await httpClient.SendAsync(request, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
                return new OpenRouterDiagnosticResult(
                    ApiKeyConfigured: true,
                    Provider: provider,
                    BaseUrl: baseUrl,
                    ModelId: modelId,
                    TestError: $"{provider} trả {(int)response.StatusCode}: {Truncate(errorBody, 1200)}");
            }

            var responseText = await response.Content.ReadAsStringAsync(cancellationToken);
            using var json = JsonDocument.Parse(responseText);
            var content = ExtractMessageContent(json.RootElement);
            if (string.IsNullOrWhiteSpace(content))
            {
                return new OpenRouterDiagnosticResult(
                    ApiKeyConfigured: true,
                    Provider: provider,
                    BaseUrl: baseUrl,
                    ModelId: modelId,
                    TestError: $"{provider} trả response nhưng không có choices[0].message.content");
            }

            return new OpenRouterDiagnosticResult(
                ApiKeyConfigured: true,
                Provider: provider,
                BaseUrl: baseUrl,
                ModelId: modelId,
                TestError: null);
        }
        catch (Exception ex)
        {
            return new OpenRouterDiagnosticResult(
                ApiKeyConfigured: true,
                Provider: provider,
                BaseUrl: baseUrl,
                ModelId: modelId,
                TestError: ex.Message);
        }
    }

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
            Tuyệt đối không sử dụng từ ngữ thô tục, xúc phạm, hoặc nội dung độc hại.
            KHONG dung markdown.
            KHONG dung cac ky tu dac biet nhu *, #, $, `.
            Chi duoc dung van ban thuong va gach dau dong bang dau "-".
            """,
            userPrompt: prompt,
            fallback: BuildCareerAdviceFallback(track, userQuestion, roadmapSlug, roadmapTopics, webResearchItems),
            maxTokens: 2000,
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
            maxTokens: 2000,
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
            var message = "OpenRouter API key is missing (OpenRouter:ApiKey).";
            logger.LogWarning(message);
            throw new InvalidOperationException(message);
        }

        var baseUrl = (configuration["OpenRouter:BaseUrl"] ?? "https://openrouter.ai/api/v1").Trim().TrimEnd('/');
        var model = (configuration["OpenRouter:ModelId"] ?? configuration["OpenRouter:Model"] ?? "qwen/qwen3-coder:free").Trim();
        var referer = configuration["OpenRouter:HttpReferer"] ?? "https://localhost";
        var appTitle = configuration["OpenRouter:SiteTitle"] ?? configuration["OpenRouter:AppTitle"] ?? "Portfolio Planner";
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
        logger.LogInformation(
            "OpenRouter request starting. Model: {Model}; MaxTokens: {MaxTokens}; Temperature: {Temperature}; Referer: {Referer}; ApiKeyLength: {ApiKeyLength}",
            model,
            resolvedMaxTokens,
            temperature,
            referer,
            apiKey.Length);

        var httpClient = httpClientFactory.CreateClient();
        using var request = new HttpRequestMessage(HttpMethod.Post, $"{baseUrl}/chat/completions")
        {
            Content = new StringContent(JsonSerializer.Serialize(payload, JsonOptions), Encoding.UTF8, "application/json")
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
        request.Headers.TryAddWithoutValidation("HTTP-Referer", referer);
        request.Headers.TryAddWithoutValidation("X-OpenRouter-Title", appTitle);

        try
        {
            using var response = await httpClient.SendAsync(request, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
                logger.LogWarning(
                    "OpenRouter request failed. Status: {StatusCode}; Reason: {ReasonPhrase}; Body: {Body}",
                    (int)response.StatusCode,
                    response.ReasonPhrase,
                    Truncate(errorBody, 1200));
                throw new InvalidOperationException(
                    $"OpenRouter request failed: HTTP {(int)response.StatusCode} {response.ReasonPhrase}. Body: {Truncate(errorBody, 1200)}");
            }

            var responseText = await response.Content.ReadAsStringAsync(cancellationToken);
            logger.LogInformation(
                "OpenRouter response success. PayloadLength: {PayloadLength}",
                responseText.Length);

            using var json = JsonDocument.Parse(responseText);
            var content = ExtractMessageContent(json.RootElement);
            if (string.IsNullOrWhiteSpace(content))
            {
                logger.LogWarning("OpenRouter returned empty content.");
                throw new InvalidOperationException("OpenRouter returned empty content.");
            }

            var sanitized = SanitizeAnswer(content.Trim());
            if (sanitized.Length < 90)
            {
                logger.LogWarning("OpenRouter content too short ({Length}). Falling back.", sanitized.Length);
                throw new InvalidOperationException($"OpenRouter content too short ({sanitized.Length}).");
            }

            return NormalizePlainBullets(sanitized);
        }
        catch (TaskCanceledException ex) when (!cancellationToken.IsCancellationRequested)
        {
            logger.LogError(ex, "OpenRouter request timed out before completion.");
            throw new InvalidOperationException("OpenRouter request timed out.");
        }
        catch (HttpRequestException ex)
        {
            logger.LogError(ex, "OpenRouter HTTP request error.");
            throw new InvalidOperationException($"OpenRouter HTTP request error: {ex.Message}");
        }
        catch (JsonException ex)
        {
            logger.LogError(ex, "OpenRouter response JSON parse error.");
            throw new InvalidOperationException($"OpenRouter response JSON parse error: {ex.Message}");
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unexpected OpenRouter integration error.");
            throw new InvalidOperationException($"Unexpected OpenRouter integration error: {ex.Message}");
        }
    }

    private static string SanitizeAnswer(string input)
    {
        var output = input;
        foreach (var term in ProfanityTerms)
        {
            output = Regex.Replace(
                output,
                $@"\b{Regex.Escape(term)}\b",
                "***",
                RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);
        }

        return output;
    }

    private static string BuildCareerAdviceFallback(
        string track,
        string userQuestion,
        string roadmapSlug,
        IReadOnlyCollection<string> roadmapTopics,
        IReadOnlyCollection<WebResearchItem> webResearchItems)
    {
        var normalizedTrack = string.IsNullOrWhiteSpace(track) ? "IT tổng quát" : track.Trim();
        var coreTopics = roadmapTopics.Take(8).ToList();
        var readingSources = webResearchItems.Take(3).ToList();

        var topicsText = coreTopics.Count == 0
            ? "- Nền tảng lập trình\n- Kiến trúc hệ thống\n- Thực hành dự án"
            : string.Join("\n", coreTopics.Select(topic => $"- {topic}"));

        var sourcesText = readingSources.Count == 0
            ? "- roadmap.sh\n- Tài liệu chính thức của stack bạn chọn"
            : string.Join("\n", readingSources.Select(source => $"- {source.Title} ({source.Url})"));

        return NormalizePlainBullets($$"""
        Mình đang tạm dùng chế độ dự phòng AI, nhưng vẫn xây được lộ trình theo ngữ cảnh của bạn.

        **Track hiện tại:** {{normalizedTrack}}
        **Câu hỏi:** {{userQuestion}}
        **Roadmap tham chiếu:** roadmap.sh/{{roadmapSlug}}

        1) Hướng đi đề xuất:
        - Ưu tiên học theo roadmap cố định 30-60-90 ngày.
        - Mỗi tuần dành thời gian cho cả lý thuyết + project nhỏ.

        2) Roadmap 30-60-90 ngày (rút gọn):
        - 30 ngày đầu: củng cố nền tảng + 1 mini project.
        - 60 ngày tiếp: mở rộng kỹ năng chính + 1 project thực chiến có deploy.
        - 90 ngày: tối ưu, viết tài liệu, chuẩn bị CV + interview.

        3) Kỹ năng nên ưu tiên:
        {{topicsText}}

        4) Nguồn đọc thêm:
        {{sourcesText}}
        """);
    }

    private static string Truncate(string value, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return string.Empty;
        }

        return value.Length <= maxLength ? value : $"{value[..maxLength]}...";
    }

    private static string NormalizePlainBullets(string input)
    {
        if (string.IsNullOrWhiteSpace(input))
        {
            return input;
        }

        var withoutMarkdown = input
            .Replace("**", string.Empty)
            .Replace("*", string.Empty)
            .Replace("#", string.Empty)
            .Replace("$", string.Empty)
            .Replace("`", string.Empty);

        var lines = withoutMarkdown
            .Split('\n')
            .Select(line => line.Trim())
            .Where(line => !string.IsNullOrWhiteSpace(line))
            .ToList();

        for (var i = 0; i < lines.Count; i++)
        {
            var line = lines[i];
            if (Regex.IsMatch(line, @"^\d+\)"))
            {
                lines[i] = $"- {line}";
                continue;
            }

            if (line.StartsWith("- "))
            {
                continue;
            }

            lines[i] = $"- {line}";
        }

        return string.Join('\n', lines);
    }

    private static string? ExtractMessageContent(JsonElement root)
    {
        if (!root.TryGetProperty("choices", out var choices) ||
            choices.ValueKind != JsonValueKind.Array ||
            choices.GetArrayLength() == 0)
        {
            return null;
        }

        var message = choices[0].GetProperty("message");
        if (!message.TryGetProperty("content", out var contentNode))
        {
            return null;
        }

        if (contentNode.ValueKind == JsonValueKind.String)
        {
            return contentNode.GetString();
        }

        if (contentNode.ValueKind != JsonValueKind.Array)
        {
            return contentNode.ToString();
        }

        var textParts = new List<string>();
        foreach (var part in contentNode.EnumerateArray())
        {
            if (part.ValueKind == JsonValueKind.String)
            {
                var text = part.GetString();
                if (!string.IsNullOrWhiteSpace(text))
                {
                    textParts.Add(text.Trim());
                }

                continue;
            }

            if (part.ValueKind == JsonValueKind.Object &&
                part.TryGetProperty("text", out var textNode) &&
                textNode.ValueKind == JsonValueKind.String)
            {
                var text = textNode.GetString();
                if (!string.IsNullOrWhiteSpace(text))
                {
                    textParts.Add(text.Trim());
                }
            }
        }

        return textParts.Count == 0 ? null : string.Join("\n", textParts);
    }
}

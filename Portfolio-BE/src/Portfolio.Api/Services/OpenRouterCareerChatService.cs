using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Configuration;

namespace Portfolio.Api.Services;

public interface IOpenRouterCareerChatService
{
    Task<CareerChatResult> AskAsync(CareerChatRequest request, CancellationToken cancellationToken);
}

public sealed class OpenRouterCareerChatService(IHttpClientFactory httpClientFactory, IConfiguration configuration)
    : IOpenRouterCareerChatService
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private static readonly IReadOnlyCollection<CareerKnowledgeChunk> KnowledgeBase =
    [
        new(
            "backend-roadmap",
            "Backend path",
            """
            Backend engineers focus on API design, authentication, database modeling, performance, and system reliability.
            Recommended roadmap: HTTP fundamentals -> REST conventions -> relational database + SQL -> .NET Web API -> clean architecture -> caching + queues -> observability.
            Portfolio projects should include: secure auth, role-based permissions, logging, and a clear deployment story.
            """,
            ["backend", "api", "database", "sql", "dotnet", "architecture", "performance", "security"]),
        new(
            "frontend-roadmap",
            "Frontend path",
            """
            Frontend engineers focus on user experience, accessibility, component architecture, and performance.
            Recommended roadmap: HTML/CSS/JS -> React fundamentals -> state management -> routing -> API integration -> performance profiling -> testing.
            Portfolio projects should show responsive UI, loading/error states, and reusable design patterns.
            """,
            ["frontend", "react", "ui", "ux", "component", "performance", "javascript", "css"]),
        new(
            "devops-roadmap",
            "DevOps path",
            """
            DevOps engineers optimize delivery, reliability, and infrastructure automation.
            Recommended roadmap: Linux + networking basics -> containerization (Docker) -> CI/CD pipelines -> cloud deployment -> monitoring + alerting -> incident handling.
            Portfolio projects should include deployment automation and rollback strategies.
            """,
            ["devops", "docker", "ci", "cd", "cloud", "azure", "monitoring", "infrastructure"]),
        new(
            "fullstack-roadmap",
            "Full-stack path",
            """
            Full-stack engineers combine frontend and backend skills with product thinking.
            Recommended roadmap: strong frontend foundation + backend API skills + database modeling + deployment basics.
            Focus on end-to-end project quality rather than learning every framework at once.
            """,
            ["fullstack", "frontend", "backend", "project", "product", "integration"]),
        new(
            "career-strategy",
            "Career strategy",
            """
            For beginners: choose one primary direction for 3-6 months and build 2-3 polished projects.
            For job readiness: prepare a clear CV, GitHub with readable README, and project demos with architecture explanation.
            Interview prep should combine fundamentals, problem solving, and communication.
            """,
            ["career", "beginner", "interview", "portfolio", "cv", "roadmap", "job"])
    ];

    public async Task<CareerChatResult> AskAsync(CareerChatRequest request, CancellationToken cancellationToken)
    {
        var apiKey = configuration["OpenRouter:ApiKey"];
        var model = configuration["OpenRouter:Model"] ?? "meta-llama/llama-3.1-8b-instruct";
        var referer = configuration["OpenRouter:HttpReferer"] ?? "https://localhost";
        var appTitle = configuration["OpenRouter:AppTitle"] ?? "Portfolio Career Advisor";
        var maxTokens = GetBoundedInt(configuration["OpenRouter:MaxTokens"], min: 128, max: 2048, fallback: 500);
        var temperature = GetBoundedDouble(configuration["OpenRouter:Temperature"], min: 0, max: 1.5, fallback: 0.35);

        if (string.IsNullOrWhiteSpace(apiKey))
        {
            throw new InvalidOperationException(
                "OpenRouter API key is missing. Set OpenRouter__ApiKey in Azure App Service configuration.");
        }

        var normalizedQuestion = request.Message.Trim();
        var retrievedChunks = RetrieveRelevantChunks(normalizedQuestion, request.Track);
        var ragContext = string.Join("\n\n", retrievedChunks.Select(chunk => $"- {chunk.Title}: {chunk.Content}"));
        var historyText = BuildHistorySnippet(request.History);

        var messages = new List<object>
        {
            new
            {
                role = "system",
                content =
                    """
                    You are a practical IT career advisor for Vietnamese users.
                    Use the provided RAG context as primary grounding.
                    Keep advice concrete, actionable, and beginner-friendly.
                    Respond in Vietnamese with:
                    1) hướng đi phù hợp
                    2) roadmap 30-60-90 ngày
                    3) project gợi ý
                    4) kỹ năng cần ưu tiên
                    If user asks beyond context, answer honestly and mark assumptions.
                    """
            },
            new
            {
                role = "user",
                content =
                    $$"""
                    Current selected track: {{request.Track ?? "general"}}
                    
                    RAG context:
                    {{ragContext}}
                    
                    Recent conversation:
                    {{historyText}}
                    
                    User question:
                    {{normalizedQuestion}}
                    """
            }
        };

        var payload = new
        {
            model,
            messages,
            temperature,
            max_tokens = maxTokens
        };

        var httpClient = httpClientFactory.CreateClient();
        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, "https://openrouter.ai/api/v1/chat/completions")
        {
            Content = new StringContent(JsonSerializer.Serialize(payload, JsonOptions), Encoding.UTF8, "application/json")
        };

        httpRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
        httpRequest.Headers.TryAddWithoutValidation("HTTP-Referer", referer);
        httpRequest.Headers.TryAddWithoutValidation("X-OpenRouter-Title", appTitle);

        using var httpResponse = await httpClient.SendAsync(httpRequest, cancellationToken);
        var responseText = await httpResponse.Content.ReadAsStringAsync(cancellationToken);

        if (!httpResponse.IsSuccessStatusCode)
        {
            throw new InvalidOperationException(
                $"OpenRouter request failed ({(int)httpResponse.StatusCode}): {Truncate(responseText, 500)}");
        }

        using var jsonDocument = JsonDocument.Parse(responseText);
        var root = jsonDocument.RootElement;
        var answer =
            root.GetProperty("choices")[0].GetProperty("message").GetProperty("content").GetString()
            ?? "Xin lỗi, mình chưa tạo được câu trả lời lúc này.";

        return new CareerChatResult(
            Answer: answer.Trim(),
            Track: request.Track,
            Model: model,
            Sources:
            [
                ..retrievedChunks.Select(chunk => new CareerSource(chunk.Id, chunk.Title))
            ]);
    }

    private static string BuildHistorySnippet(IReadOnlyCollection<CareerChatHistoryItem>? history)
    {
        if (history is null || history.Count == 0)
        {
            return "No prior history.";
        }

        var turns = history
            .TakeLast(6)
            .Select(item => $"[{item.Role}] {Truncate(item.Content, 280)}");
        return string.Join("\n", turns);
    }

    private static IReadOnlyCollection<CareerKnowledgeChunk> RetrieveRelevantChunks(string question, string? track)
    {
        var tokens = Tokenize(question);
        if (!string.IsNullOrWhiteSpace(track))
        {
            foreach (var token in Tokenize(track))
            {
                tokens.Add(token);
            }
        }

        var ranked = KnowledgeBase
            .Select(chunk => new
            {
                Chunk = chunk,
                Score = chunk.Keywords.Count(keyword => tokens.Contains(keyword))
            })
            .OrderByDescending(item => item.Score)
            .ThenBy(item => item.Chunk.Title)
            .Take(3)
            .Select(item => item.Chunk)
            .ToList();

        if (ranked.Count == 0)
        {
            return KnowledgeBase.Take(3).ToList();
        }

        return ranked;
    }

    private static HashSet<string> Tokenize(string input)
    {
        return Regex.Split(input.ToLowerInvariant(), @"[^a-z0-9]+")
            .Where(part => part.Length >= 2)
            .ToHashSet();
    }

    private static int GetBoundedInt(string? rawValue, int min, int max, int fallback)
    {
        if (!int.TryParse(rawValue, out var value))
        {
            return fallback;
        }

        return Math.Clamp(value, min, max);
    }

    private static double GetBoundedDouble(string? rawValue, double min, double max, double fallback)
    {
        if (!double.TryParse(rawValue, out var value))
        {
            return fallback;
        }

        return Math.Clamp(value, min, max);
    }

    private static string Truncate(string value, int maxLength)
    {
        if (value.Length <= maxLength)
        {
            return value;
        }

        return $"{value[..maxLength]}...";
    }
}

public sealed record CareerChatRequest(string Message, string? Track, IReadOnlyCollection<CareerChatHistoryItem>? History);

public sealed record CareerChatHistoryItem(string Role, string Content);

public sealed record CareerChatResult(string Answer, string? Track, string Model, IReadOnlyCollection<CareerSource> Sources);

public sealed record CareerSource(string Id, string Title);

public sealed record CareerKnowledgeChunk(string Id, string Title, string Content, IReadOnlyCollection<string> Keywords);

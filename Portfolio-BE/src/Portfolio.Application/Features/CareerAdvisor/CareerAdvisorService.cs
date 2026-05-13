using System.Text.RegularExpressions;
using Portfolio.Application.Abstractions;

namespace Portfolio.Application.Features.CareerAdvisor;

public interface ICareerAdvisorService
{
    Task<CareerChatResult> AskAsync(CareerChatRequest request, CancellationToken cancellationToken);
}

public sealed class CareerAdvisorService(
    IOpenRouterClient openRouterClient,
    IRoadmapShClient roadmapShClient,
    IWebResearchClient webResearchClient,
    ICareerChatCache careerChatCache) : ICareerAdvisorService
{
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
        var normalizedQuestion = request.Message.Trim();
        var normalizedTrack = request.Track?.Trim() ?? "general";

        var cachedResult = await careerChatCache.GetAsync(normalizedTrack, normalizedQuestion, cancellationToken);
        if (cachedResult is not null)
        {
            return cachedResult with
            {
                Sources =
                [
                    new CareerSource("cache-hit", "Redis cache reuse"),
                    ..cachedResult.Sources
                ]
            };
        }

        var userContext = BuildUserContextSnippet(normalizedQuestion, request.Track, request.History);
        var retrievedChunks = RetrieveRelevantChunks(normalizedQuestion, request.Track);
        var ragContext = string.Join(
            "\n\n",
            retrievedChunks.Select(chunk => $"- {chunk.Title}: {chunk.Content}")
                .Append($"- User context profile: {userContext}"));
        var historyText = BuildHistorySnippet(request.History);
        var roadmapSlug = ResolveRoadmapSlug(request.Track, normalizedQuestion);
        var roadmapTopics = await roadmapShClient.GetRoadmapTopicsAsync(roadmapSlug, cancellationToken);
        var webQuery = BuildWebQuery(request.Track, normalizedQuestion, request.History);
        var webResearchItems = await webResearchClient.SearchAsync(webQuery, cancellationToken);

        var answer = await openRouterClient.GetCareerAdviceAsync(
            request.Track ?? "general",
            normalizedQuestion,
            ragContext,
            roadmapSlug,
            roadmapTopics,
            webResearchItems,
            historyText,
            cancellationToken);

        var topWebSources = webResearchItems
            .Take(3)
            .Select(item => new CareerSource($"web-{Slugify(item.Source)}", $"{item.Source}: {item.Title}"))
            .ToList();

        var result = new CareerChatResult(
            Answer: answer.Trim(),
            Track: request.Track,
            Model: "openrouter",
            Sources:
            [
                ..retrievedChunks.Select(chunk => new CareerSource(chunk.Id, chunk.Title)),
                new CareerSource($"roadmap-{roadmapSlug}", $"roadmap.sh/{roadmapSlug}"),
                ..topWebSources
            ]);

        await careerChatCache.SetAsync(normalizedTrack, normalizedQuestion, result, cancellationToken);

        return result;
    }

    private static string BuildHistorySnippet(IReadOnlyCollection<CareerChatHistoryItem>? history)
    {
        if (history is null || history.Count == 0)
        {
            return "No prior history.";
        }

        return string.Join("\n", history.TakeLast(6).Select(item => $"[{item.Role}] {Truncate(item.Content, 280)}"));
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
            .Select(chunk => new { Chunk = chunk, Score = chunk.Keywords.Count(keyword => tokens.Contains(keyword)) })
            .OrderByDescending(item => item.Score)
            .ThenBy(item => item.Chunk.Title)
            .Take(5)
            .Select(item => item.Chunk)
            .ToList();

        return ranked.Count == 0 ? KnowledgeBase.Take(5).ToList() : ranked;
    }

    private static HashSet<string> Tokenize(string input)
    {
        return Regex.Split(input.ToLowerInvariant(), @"[^a-z0-9]+")
            .Where(part => part.Length >= 2)
            .ToHashSet();
    }

    private static string ResolveRoadmapSlug(string? track, string? question)
    {
        var input = $"{track} {question}".ToLowerInvariant();
        if (input.Contains("devops")) return "devops";
        if (input.Contains("frontend")) return "frontend";
        if (input.Contains("backend")) return "backend";
        if (input.Contains("fullstack") || input.Contains("full-stack")) return "full-stack";
        if (input.Contains("kubernetes")) return "kubernetes";
        if (input.Contains("docker")) return "docker";
        if (input.Contains("asp.net") || input.Contains("aspnet")) return "aspnet-core";
        return "devops";
    }

    private static string Truncate(string value, int maxLength)
    {
        return value.Length <= maxLength ? value : $"{value[..maxLength]}...";
    }

    private static string BuildWebQuery(string? track, string question, IReadOnlyCollection<CareerChatHistoryItem>? history)
    {
        var historyKeywords = history is null
            ? string.Empty
            : string.Join(
                " ",
                history.TakeLast(4)
                    .SelectMany(item => Tokenize(item.Content))
                    .Take(12));

        return $"{track} {question} {historyKeywords} learning roadmap best practices".Trim();
    }

    private static string BuildUserContextSnippet(string question, string? track, IReadOnlyCollection<CareerChatHistoryItem>? history)
    {
        var historyText = history is null || history.Count == 0
            ? "no prior preferences provided"
            : string.Join(
                "; ",
                history.TakeLast(4).Select(item => $"{item.Role}: {Truncate(item.Content, 120)}"));

        return $"track={track ?? "general"}; current_question={Truncate(question, 240)}; history={historyText}";
    }

    private static string Slugify(string input)
    {
        return Regex.Replace(input.ToLowerInvariant(), "[^a-z0-9]+", "-").Trim('-');
    }
}

public sealed record CareerChatRequest(string Message, string? Track, IReadOnlyCollection<CareerChatHistoryItem>? History);
public sealed record CareerChatHistoryItem(string Role, string Content);
public sealed record CareerChatResult(string Answer, string? Track, string Model, IReadOnlyCollection<CareerSource> Sources);
public sealed record CareerSource(string Id, string Title);
public sealed record CareerKnowledgeChunk(string Id, string Title, string Content, IReadOnlyCollection<string> Keywords);

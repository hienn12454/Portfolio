namespace Portfolio.Application.Abstractions;

public sealed record OpenRouterDiagnosticResult(
    bool ApiKeyConfigured,
    string Provider,
    string BaseUrl,
    string ModelId,
    string? TestError);

public interface IOpenRouterClient
{
    bool IsConfigured { get; }
    Task<string> GetCareerAdviceAsync(
        string track,
        string userQuestion,
        string ragContext,
        string roadmapSlug,
        IReadOnlyCollection<string> roadmapTopics,
        IReadOnlyCollection<WebResearchItem> webResearchItems,
        string historyText,
        CancellationToken cancellationToken);

    Task<string> GenerateRoadmapPlanAsync(
        string track,
        string specialty,
        string roadmapSlug,
        IReadOnlyCollection<string> roadmapTopics,
        CancellationToken cancellationToken);

    Task<OpenRouterDiagnosticResult> GetDiagnosticAsync(CancellationToken cancellationToken);
}

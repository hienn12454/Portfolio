namespace Portfolio.Application.Abstractions;

public sealed record OpenRouterDiagnosticResult(
    bool ApiKeyConfigured,
    string Provider,
    string BaseUrl,
    string ModelId,
    string? TestError);

public sealed record CvProjectInsight(string Name, string Description, string TechStack);

public sealed record CvParseResult(
    string ProfessionalHeadline,
    string TechnicalSummary,
    string Skills,
    string Strengths,
    string Projects,
    string Education,
    string Languages,
    string DesiredRole,
    string Company,
    int? EstimatedYearsOfExperience,
    decimal? Gpa);

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

    Task<CvParseResult?> ParseCvImageAsync(
        string base64ImageContent,
        string? fileName,
        CancellationToken cancellationToken);
}

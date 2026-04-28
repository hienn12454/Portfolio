namespace Portfolio.Application.Abstractions;

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
}

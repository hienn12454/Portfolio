namespace Portfolio.Application.Abstractions;

public interface IRoadmapShClient
{
    Task<IReadOnlyCollection<string>> GetRoadmapTopicsAsync(string roadmapSlug, CancellationToken cancellationToken);
}

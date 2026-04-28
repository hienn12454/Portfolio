namespace Portfolio.Application.Abstractions;

public interface IWebResearchClient
{
    Task<IReadOnlyCollection<WebResearchItem>> SearchAsync(string query, CancellationToken cancellationToken);
}

public sealed record WebResearchItem(string Title, string Snippet, string Url, string Source);

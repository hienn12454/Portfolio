using System.Net;
using System.Text.Json;
using Portfolio.Application.Abstractions;

namespace Portfolio.Infrastructure.Integrations;

public sealed class WebResearchClient(IHttpClientFactory httpClientFactory) : IWebResearchClient
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public async Task<IReadOnlyCollection<WebResearchItem>> SearchAsync(string query, CancellationToken cancellationToken)
    {
        var normalizedQuery = string.IsNullOrWhiteSpace(query) ? "it career roadmap" : query.Trim();
        var results = new List<WebResearchItem>();

        try
        {
            var wikiItems = await SearchWikipediaAsync(normalizedQuery, cancellationToken);
            results.AddRange(wikiItems);
        }
        catch
        {
            // Keep chatbot resilient if external source is down.
        }

        try
        {
            var duckDuckGoItems = await SearchDuckDuckGoAsync(normalizedQuery, cancellationToken);
            results.AddRange(duckDuckGoItems);
        }
        catch
        {
            // Keep chatbot resilient if external source is down.
        }

        return results
            .GroupBy(item => item.Url, StringComparer.OrdinalIgnoreCase)
            .Select(group => group.First())
            .Take(6)
            .ToList();
    }

    private async Task<IReadOnlyCollection<WebResearchItem>> SearchWikipediaAsync(string query, CancellationToken cancellationToken)
    {
        var client = httpClientFactory.CreateClient();
        var url = $"https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch={Uri.EscapeDataString(query)}&format=json&srlimit=3";
        using var response = await client.GetAsync(url, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            return [];
        }

        var payload = await response.Content.ReadAsStringAsync(cancellationToken);
        using var document = JsonDocument.Parse(payload);
        if (!document.RootElement.TryGetProperty("query", out var queryNode) ||
            !queryNode.TryGetProperty("search", out var searchNode) ||
            searchNode.ValueKind != JsonValueKind.Array)
        {
            return [];
        }

        var items = new List<WebResearchItem>();
        foreach (var item in searchNode.EnumerateArray())
        {
            var title = item.TryGetProperty("title", out var titleNode) ? titleNode.GetString() : null;
            var snippet = item.TryGetProperty("snippet", out var snippetNode) ? snippetNode.GetString() : null;
            if (string.IsNullOrWhiteSpace(title))
            {
                continue;
            }

            var safeTitle = Uri.EscapeDataString(title);
            items.Add(new WebResearchItem(
                Title: title.Trim(),
                Snippet: CleanSnippet(snippet),
                Url: $"https://en.wikipedia.org/wiki/{safeTitle}",
                Source: "Wikipedia"));
        }

        return items;
    }

    private async Task<IReadOnlyCollection<WebResearchItem>> SearchDuckDuckGoAsync(string query, CancellationToken cancellationToken)
    {
        var client = httpClientFactory.CreateClient();
        var url = $"https://api.duckduckgo.com/?q={Uri.EscapeDataString(query)}&format=json&no_html=1&skip_disambig=1";
        using var response = await client.GetAsync(url, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            return [];
        }

        var payload = await response.Content.ReadAsStringAsync(cancellationToken);
        var dto = JsonSerializer.Deserialize<DuckDuckGoResponse>(payload, JsonOptions);
        if (dto is null)
        {
            return [];
        }

        var items = new List<WebResearchItem>();
        if (!string.IsNullOrWhiteSpace(dto.AbstractText) && !string.IsNullOrWhiteSpace(dto.AbstractUrl))
        {
            items.Add(new WebResearchItem(
                Title: string.IsNullOrWhiteSpace(dto.Heading) ? "DuckDuckGo Answer" : dto.Heading,
                Snippet: dto.AbstractText.Trim(),
                Url: dto.AbstractUrl.Trim(),
                Source: "DuckDuckGo"));
        }

        if (dto.RelatedTopics is not null)
        {
            foreach (var topic in dto.RelatedTopics.Take(4))
            {
                if (string.IsNullOrWhiteSpace(topic.Text) || string.IsNullOrWhiteSpace(topic.FirstUrl))
                {
                    continue;
                }

                items.Add(new WebResearchItem(
                    Title: BuildTopicTitle(topic.Text),
                    Snippet: topic.Text.Trim(),
                    Url: topic.FirstUrl.Trim(),
                    Source: "DuckDuckGo"));
            }
        }

        return items;
    }

    private static string CleanSnippet(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
        {
            return "Nguon thong tin bo sung tu web de doi chieu.";
        }

        var decoded = WebUtility.HtmlDecode(raw);
        return decoded.Replace("<span class=\"searchmatch\">", string.Empty)
            .Replace("</span>", string.Empty)
            .Trim();
    }

    private static string BuildTopicTitle(string text)
    {
        var normalized = text.Trim();
        var separatorIndex = normalized.IndexOf(" - ", StringComparison.Ordinal);
        if (separatorIndex > 0)
        {
            return normalized[..separatorIndex].Trim();
        }

        return normalized.Length <= 72 ? normalized : $"{normalized[..72]}...";
    }

    private sealed record DuckDuckGoResponse(
        string? Heading,
        string? AbstractText,
        string? AbstractUrl,
        IReadOnlyCollection<DuckDuckGoRelatedTopic>? RelatedTopics);

    private sealed record DuckDuckGoRelatedTopic(string? Text, string? FirstUrl);
}

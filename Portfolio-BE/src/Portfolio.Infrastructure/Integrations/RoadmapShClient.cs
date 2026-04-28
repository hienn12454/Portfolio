using System.Text.Json;
using Portfolio.Application.Abstractions;

namespace Portfolio.Infrastructure.Integrations;

public sealed class RoadmapShClient(IHttpClientFactory httpClientFactory) : IRoadmapShClient
{
    public async Task<IReadOnlyCollection<string>> GetRoadmapTopicsAsync(string roadmapSlug, CancellationToken cancellationToken)
    {
        try
        {
            var httpClient = httpClientFactory.CreateClient();
            using var response = await httpClient.GetAsync($"https://roadmap.sh/api/v1-official-roadmap/{roadmapSlug}", cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                return FallbackTopics(roadmapSlug);
            }

            var payload = await response.Content.ReadAsStringAsync(cancellationToken);
            using var json = JsonDocument.Parse(payload);
            if (!json.RootElement.TryGetProperty("nodes", out var nodes) || nodes.ValueKind != JsonValueKind.Array)
            {
                return FallbackTopics(roadmapSlug);
            }

            var labels = new List<string>();
            foreach (var node in nodes.EnumerateArray())
            {
                if (!node.TryGetProperty("data", out var data) || !data.TryGetProperty("label", out var labelElement))
                {
                    continue;
                }

                var label = labelElement.GetString();
                if (!string.IsNullOrWhiteSpace(label))
                {
                    labels.Add(label.Trim());
                }
            }

            return labels.Count > 0
                ? labels.Distinct(StringComparer.OrdinalIgnoreCase).Take(40).ToList()
                : FallbackTopics(roadmapSlug);
        }
        catch
        {
            return FallbackTopics(roadmapSlug);
        }
    }

    private static IReadOnlyCollection<string> FallbackTopics(string roadmapSlug)
    {
        if (roadmapSlug == "devops")
        {
            return ["Linux basics", "Docker", "CI/CD", "Kubernetes", "Monitoring", "Cloud fundamentals"];
        }

        if (roadmapSlug == "backend")
        {
            return ["HTTP", "REST API", "Authentication", "SQL", "Caching", "System Design"];
        }

        if (roadmapSlug == "frontend")
        {
            return ["HTML/CSS", "JavaScript", "React", "State Management", "Performance", "Accessibility"];
        }

        return ["Programming fundamentals", "Version control", "Testing", "Deployment"];
    }
}

namespace Portfolio.Api.Extensions;

public static class RateLimitingExtensions
{
    public static IServiceCollection AddRateLimiting(this IServiceCollection services)
    {
        var policy = RateLimitPolicy.PerClientRateLimitPolicy();
        services.AddSingleton(policy);
        return services;
    }
}

public class RateLimitPolicy
{
    private readonly Dictionary<string, RateLimitEntry> _entries = new();
    private readonly object _lock = new();

    public bool IsAllowed(string clientId, int requestsPerMinute = 60)
    {
        lock (_lock)
        {
            if (!_entries.TryGetValue(clientId, out var entry))
            {
                entry = new RateLimitEntry();
                _entries[clientId] = entry;
            }

            var now = DateTime.UtcNow;
            if ((now - entry.WindowStart).TotalMinutes > 1)
            {
                entry.RequestCount = 0;
                entry.WindowStart = now;
            }

            if (entry.RequestCount >= requestsPerMinute)
                return false;

            entry.RequestCount++;
            return true;
        }
    }

    private class RateLimitEntry
    {
        public int RequestCount { get; set; }
        public DateTime WindowStart { get; set; } = DateTime.UtcNow;
    }

    public static RateLimitPolicy PerClientRateLimitPolicy() => new();
}

public class RateLimitingAttribute : Attribute
{
    public int RequestsPerMinute { get; }

    public RateLimitingAttribute(int requestsPerMinute = 60)
    {
        RequestsPerMinute = requestsPerMinute;
    }
}

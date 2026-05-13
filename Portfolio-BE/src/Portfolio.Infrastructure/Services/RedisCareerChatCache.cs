using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Portfolio.Application.Abstractions;
using Portfolio.Application.Features.CareerAdvisor;

namespace Portfolio.Infrastructure.Services;

public sealed class RedisCareerChatCache(
    IDistributedCache distributedCache,
    IConfiguration configuration,
    ILogger<RedisCareerChatCache> logger) : ICareerChatCache
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private static readonly HashSet<string> StopWords = new(StringComparer.OrdinalIgnoreCase)
    {
        "la", "là", "va", "và", "cho", "toi", "tôi", "minh", "mình", "the", "a", "an", "to", "for", "of", "in", "on", "with"
    };

    public async Task<CareerChatResult?> GetAsync(string track, string question, CancellationToken cancellationToken)
    {
        if (!IsEnabled())
        {
            return null;
        }

        foreach (var key in BuildCacheKeys(track, question))
        {
            var payload = await distributedCache.GetStringAsync(key, cancellationToken);
            if (string.IsNullOrWhiteSpace(payload))
            {
                continue;
            }

            try
            {
                var item = JsonSerializer.Deserialize<CachedCareerChatItem>(payload, JsonOptions);
                if (item?.Result is null)
                {
                    continue;
                }

                logger.LogInformation("Career chat cache hit: {CacheKey}", key);
                return item.Result;
            }
            catch (JsonException ex)
            {
                logger.LogWarning(ex, "Invalid career chat cache payload for key: {CacheKey}", key);
            }
        }

        return null;
    }

    public async Task SetAsync(string track, string question, CareerChatResult result, CancellationToken cancellationToken)
    {
        if (!IsEnabled())
        {
            return;
        }

        var cached = new CachedCareerChatItem(result, DateTimeOffset.UtcNow);
        var payload = JsonSerializer.Serialize(cached, JsonOptions);
        var ttlMinutes = configuration.GetValue<int?>("AiCache:CareerChat:TtlMinutes") ?? 360;
        var options = new DistributedCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(Math.Clamp(ttlMinutes, 5, 43200))
        };

        foreach (var key in BuildCacheKeys(track, question))
        {
            await distributedCache.SetStringAsync(key, payload, options, cancellationToken);
        }
    }

    private bool IsEnabled()
    {
        return configuration.GetValue<bool?>("AiCache:CareerChat:Enabled") ?? true;
    }

    private static IReadOnlyCollection<string> BuildCacheKeys(string track, string question)
    {
        var normalizedTrack = Normalize(track, keepOrder: true);
        var exactQuestion = Normalize(question, keepOrder: true);
        var semanticQuestion = Normalize(question, keepOrder: false);

        var exact = Hash($"{normalizedTrack}|exact|{exactQuestion}");
        var semantic = Hash($"{normalizedTrack}|semantic|{semanticQuestion}");

        return
        [
            $"ai:career-chat:{exact}",
            $"ai:career-chat:{semantic}"
        ];
    }

    private static string Normalize(string input, bool keepOrder)
    {
        var tokens = Regex
            .Split((input ?? string.Empty).ToLowerInvariant(), @"[^a-z0-9àáảãạăắằẳẵặâấầẩẫậđèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵ]+")
            .Where(token => token.Length >= 2 && !StopWords.Contains(token))
            .ToList();

        if (tokens.Count == 0)
        {
            return "empty";
        }

        if (!keepOrder)
        {
            tokens = tokens.Distinct(StringComparer.Ordinal).OrderBy(token => token, StringComparer.Ordinal).Take(18).ToList();
        }

        return string.Join(' ', tokens);
    }

    private static string Hash(string input)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(input));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }

    private sealed record CachedCareerChatItem(CareerChatResult Result, DateTimeOffset CreatedAtUtc);
}

using Portfolio.Application.Abstractions;

namespace Portfolio.Infrastructure.Services;

public sealed class SystemDateTimeProvider : IDateTimeProvider
{
    private static readonly TimeZoneInfo VietnamTimeZone = ResolveVietnamTimeZone();

    public DateTime UtcNow => DateTime.UtcNow;
    public DateTime VietnamNow => TimeZoneInfo.ConvertTimeFromUtc(UtcNow, VietnamTimeZone);
    public DateOnly VietnamToday => DateOnly.FromDateTime(VietnamNow);

    private static TimeZoneInfo ResolveVietnamTimeZone()
    {
        try
        {
            return TimeZoneInfo.FindSystemTimeZoneById("Asia/Ho_Chi_Minh");
        }
        catch
        {
            return TimeZoneInfo.FindSystemTimeZoneById("SE Asia Standard Time");
        }
    }
}

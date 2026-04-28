namespace Portfolio.Application.Abstractions;

public interface IDateTimeProvider
{
    DateTime UtcNow { get; }
    DateTime VietnamNow { get; }
    DateOnly VietnamToday { get; }
}

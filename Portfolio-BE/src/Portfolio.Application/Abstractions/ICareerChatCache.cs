using Portfolio.Application.Features.CareerAdvisor;

namespace Portfolio.Application.Abstractions;

public interface ICareerChatCache
{
    Task<CareerChatResult?> GetAsync(string track, string question, CancellationToken cancellationToken);
    Task SetAsync(string track, string question, CareerChatResult result, CancellationToken cancellationToken);
}

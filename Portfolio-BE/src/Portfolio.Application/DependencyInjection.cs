using Microsoft.Extensions.DependencyInjection;
using Portfolio.Application.Features.CareerAdvisor;
using Portfolio.Application.Features.RoadmapPlans;
using Portfolio.Application.Features.Users;

namespace Portfolio.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<ICareerAdvisorService, CareerAdvisorService>();
        services.AddScoped<IUserRoadmapPlanService, UserRoadmapPlanService>();
        services.AddScoped<ICurrentAppUserService, CurrentAppUserService>();
        return services;
    }
}

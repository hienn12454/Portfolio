using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.IdentityModel.Tokens;
using Portfolio.Api.Auth;
using Portfolio.Api.Extensions;
using Portfolio.Application;
using Portfolio.Infrastructure;

var builder = WebApplication.CreateBuilder(args);
var clerkAuthority = builder.Configuration["Clerk:Authority"];
var clerkAudience = builder.Configuration["Clerk:Audience"];
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? Array.Empty<string>();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddHttpClient();
builder.Services.AddCors(options =>
{
    options.AddPolicy("FrontendPolicy", policy =>
    {
        if (allowedOrigins.Length == 0)
        {
            policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod();
            return;
        }

        policy.WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        if (string.IsNullOrWhiteSpace(clerkAuthority) || string.IsNullOrWhiteSpace(clerkAudience))
        {
            return;
        }

        var normalizedAuthority = clerkAuthority.Trim().TrimEnd('/');
        var normalizedAudiences = clerkAudience
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(value => !string.IsNullOrWhiteSpace(value))
            .Distinct(StringComparer.Ordinal)
            .ToArray();

        options.Authority = normalizedAuthority;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuers = new[] { normalizedAuthority, $"{normalizedAuthority}/" },
            ValidateAudience = true,
            ValidAudiences = normalizedAudiences,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(2)
        };

        options.Events = new JwtBearerEvents
        {
            OnAuthenticationFailed = context =>
            {
                var logger = context.HttpContext.RequestServices
                    .GetRequiredService<ILoggerFactory>()
                    .CreateLogger("JwtAuth");
                logger.LogWarning(
                    context.Exception,
                    "JWT authentication failed for path {Path}.",
                    context.HttpContext.Request.Path);
                return Task.CompletedTask;
            },
            OnChallenge = context =>
            {
                var logger = context.HttpContext.RequestServices
                    .GetRequiredService<ILoggerFactory>()
                    .CreateLogger("JwtAuth");
                logger.LogWarning(
                    "JWT challenge issued for path {Path}. Error={Error}; Description={Description}",
                    context.HttpContext.Request.Path,
                    context.Error,
                    context.ErrorDescription);
                return Task.CompletedTask;
            }
        };
    });
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy =>
        policy.RequireAuthenticatedUser().AddRequirements(new AdminRequirement()));
});
builder.Services.AddScoped<IAuthorizationHandler, AdminRequirementHandler>();

builder.Services
    .AddApplication()
    .AddInfrastructure(builder.Configuration);

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI();

await app.ApplyDatabaseMigrationsAsync();

app.UseHttpsRedirection();
app.UseCors("FrontendPolicy");
app.Use(async (context, next) =>
{
    if (context.Request.Path.StartsWithSegments("/api"))
    {
        var logger = context.RequestServices
            .GetRequiredService<ILoggerFactory>()
            .CreateLogger("AuthHeaderProbe");
        var authHeader = context.Request.Headers.Authorization.FirstOrDefault();
        logger.LogInformation(
            "AUTH HEADER EXISTS: {HasHeader} | Path: {Path}",
            !string.IsNullOrWhiteSpace(authHeader),
            context.Request.Path);
    }

    await next();
});
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapGet("/", () => Results.Redirect("/swagger"));

app.MapGet("/health", () => Results.Ok(new { Status = "Healthy" }));

app.Run();

using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.IdentityModel.Tokens;
using OpenTelemetry.Logs;
using OpenTelemetry.Metrics;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;
using System.Text.Json;
using Portfolio.Api.Auth;
using Portfolio.Api.Extensions;
using Portfolio.Application;
using Portfolio.Infrastructure;

var builder = WebApplication.CreateBuilder(args);
var clerkAuthority = builder.Configuration["Clerk:Authority"];
var clerkAudience = builder.Configuration["Clerk:Audience"];
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? Array.Empty<string>();
var openTelemetryEnabled = new[]
{
    "OTEL_EXPORTER_OTLP_ENDPOINT",
    "OTEL_EXPORTER_OTLP_TRACES_ENDPOINT",
    "OTEL_EXPORTER_OTLP_METRICS_ENDPOINT",
    "OTEL_EXPORTER_OTLP_LOGS_ENDPOINT"
}.Any(key => !string.IsNullOrWhiteSpace(builder.Configuration[key]));
var serviceName = builder.Configuration["OTEL_SERVICE_NAME"]
    ?? builder.Configuration["Observability:ServiceName"]
    ?? "portfolio-api";
var serviceVersion = typeof(Program).Assembly.GetName().Version?.ToString();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
    {
        Title = "Portfolio API",
        Version = "v1",
        Description = "Portfolio backend API for hiennt.website"
    });
    options.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Description = "Enter JWT token (without Bearer prefix)"
    });
    options.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});
builder.Services.AddHttpClient("OpenRouter")
    .ConfigureHttpClient((sp, client) =>
    {
        var seconds = sp.GetRequiredService<IConfiguration>().GetValue("OpenRouter:RequestTimeoutSeconds", 240);
        client.Timeout = TimeSpan.FromSeconds(Math.Clamp(seconds, 30, 600));
    });
builder.Services.AddHttpClient();
if (openTelemetryEnabled)
{
    var resourceBuilder = ResourceBuilder.CreateDefault()
        .AddService(
            serviceName: serviceName,
            serviceVersion: serviceVersion,
            serviceInstanceId: Environment.MachineName)
        .AddAttributes(new[]
        {
            new KeyValuePair<string, object>("deployment.environment", builder.Environment.EnvironmentName)
        });

    builder.Services.AddOpenTelemetry()
        .ConfigureResource(resource => resource.AddService(
            serviceName: serviceName,
            serviceVersion: serviceVersion,
            serviceInstanceId: Environment.MachineName)
            .AddAttributes(new[]
            {
                new KeyValuePair<string, object>("deployment.environment", builder.Environment.EnvironmentName)
            }))
        .WithMetrics(metrics => metrics
            .AddAspNetCoreInstrumentation()
            .AddHttpClientInstrumentation()
            .AddRuntimeInstrumentation()
            .AddOtlpExporter())
        .WithTracing(tracing => tracing
            .AddAspNetCoreInstrumentation(options => options.RecordException = true)
            .AddHttpClientInstrumentation(options => options.RecordException = true)
            .AddOtlpExporter());

    builder.Logging.AddOpenTelemetry(logging =>
    {
        logging.IncludeFormattedMessage = true;
        logging.IncludeScopes = true;
        logging.ParseStateValues = true;
        logging.SetResourceBuilder(resourceBuilder);
        logging.AddOtlpExporter();
    });
}
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
            .AllowAnyMethod()
            .SetPreflightMaxAge(TimeSpan.FromHours(12));
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
    .AddInfrastructure(builder.Configuration)
    .AddRateLimiting();

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI(options =>
{
    options.SwaggerEndpoint("/swagger/v1/swagger.json", "Portfolio API v1");
    options.RoutePrefix = "swagger";
    options.DocumentTitle = "Portfolio API";
    options.DisplayRequestDuration();
});

await app.ApplyDatabaseMigrationsAsync();

app.UseMiddleware<ExceptionHandlingMiddleware>();

app.UseHttpsRedirection();
app.UseCors("FrontendPolicy");
app.UseHttpsRedirection();
if (app.Environment.IsDevelopment())
{
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

            if (!string.IsNullOrWhiteSpace(authHeader) &&
                authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            {
                var token = authHeader["Bearer ".Length..].Trim();
                var parts = token.Split('.');
                if (parts.Length >= 2)
                {
                    try
                    {
                        var payloadBytes = Convert.FromBase64String(
                            parts[1]
                                .Replace('-', '+')
                                .Replace('_', '/')
                                .PadRight(parts[1].Length + (4 - parts[1].Length % 4) % 4, '='));
                        using var json = JsonDocument.Parse(payloadBytes);
                        var root = json.RootElement;
                        var aud = root.TryGetProperty("aud", out var audNode) ? audNode.ToString() : "(missing)";
                        var iss = root.TryGetProperty("iss", out var issNode) ? issNode.GetString() : "(missing)";
                        var sub = root.TryGetProperty("sub", out var subNode) ? subNode.GetString() : "(missing)";
                        logger.LogInformation(
                            "JWT PROBE | Path: {Path} | aud: {Aud} | iss: {Iss} | sub-present: {HasSub}",
                            context.Request.Path,
                            aud,
                            iss,
                            !string.IsNullOrWhiteSpace(sub));
                    }
                    catch (Exception ex)
                    {
                        logger.LogWarning(ex, "JWT PROBE decode failed for path {Path}.", context.Request.Path);
                    }
                }
            }
        }

        await next();
    });
}
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapGet("/", () => Results.Redirect("/swagger"));
app.MapMethods("/", new[] { "OPTIONS" }, () => Results.NoContent());

app.MapGet("/health", () => Results.Ok(new { Status = "Healthy" }));

app.Run();

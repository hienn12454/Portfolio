using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.IdentityModel.Tokens;
using Portfolio.Api.Auth;
using Portfolio.Api.Extensions;
using Portfolio.Api.Services;
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

        options.Authority = clerkAuthority;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = clerkAuthority,
            ValidateAudience = true,
            ValidAudience = clerkAudience,
            ValidateLifetime = true
        };
    });
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy =>
        policy.RequireAuthenticatedUser().AddRequirements(new AdminRequirement()));
});
builder.Services.AddScoped<IAuthorizationHandler, AdminRequirementHandler>();
builder.Services.AddScoped<IOpenRouterCareerChatService, OpenRouterCareerChatService>();

builder.Services
    .AddApplication()
    .AddInfrastructure(builder.Configuration);

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI();

await app.ApplyDatabaseMigrationsAsync();

app.UseHttpsRedirection();
app.UseCors("FrontendPolicy");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapGet("/", () => Results.Redirect("/swagger"));

app.MapGet("/health", () => Results.Ok(new { Status = "Healthy" }));

app.Run();

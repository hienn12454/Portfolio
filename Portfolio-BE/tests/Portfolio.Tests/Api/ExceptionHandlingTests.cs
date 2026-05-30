using Xunit;
using Portfolio.Api.Extensions;

namespace Portfolio.Tests.Api.Extensions;

public class ExceptionHandlingMiddlewareTests
{
    [Fact]
    public void ErrorResponse_Should_Have_Required_Properties()
    {
        // Arrange
        var errorResponse = new ErrorResponse
        {
            Message = "Test error",
            Details = "Test details",
            Timestamp = DateTime.UtcNow
        };

        // Act & Assert
        Assert.NotNull(errorResponse.Message);
        Assert.Equal("Test error", errorResponse.Message);
        Assert.NotNull(errorResponse.Timestamp);
    }
}

public class RateLimitPolicyTests
{
    [Fact]
    public void RateLimitPolicy_Should_Allow_Initial_Request()
    {
        // Arrange
        var policy = RateLimitPolicy.PerClientRateLimitPolicy();
        var clientId = "test-client";

        // Act
        var isAllowed = policy.IsAllowed(clientId, 60);

        // Assert
        Assert.True(isAllowed);
    }

    [Fact]
    public void RateLimitPolicy_Should_Block_After_Limit_Exceeded()
    {
        // Arrange
        var policy = RateLimitPolicy.PerClientRateLimitPolicy();
        var clientId = "test-client";
        var limit = 3;

        // Act
        for (int i = 0; i < limit; i++)
        {
            policy.IsAllowed(clientId, limit);
        }
        var blockedRequest = policy.IsAllowed(clientId, limit);

        // Assert
        Assert.False(blockedRequest);
    }
}

public class ValidationExtensionsTests
{
    [Fact]
    public void ValidateModel_Should_Throw_On_Invalid_Model()
    {
        // Arrange
        var invalidModel = new TestModel { Name = "" }; // Empty name is invalid

        // Act & Assert
        Assert.Throws<ArgumentException>(() => ValidationExtensions.ValidateModel(invalidModel));
    }
}

// Test models
public class TestModel
{
    [System.ComponentModel.DataAnnotations.Required]
    public string Name { get; set; } = null!;
}

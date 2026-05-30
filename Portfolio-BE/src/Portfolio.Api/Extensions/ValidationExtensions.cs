using System.ComponentModel.DataAnnotations;

namespace Portfolio.Api.Extensions;

public static class ValidationExtensions
{
    public static void ValidateModel<T>(T model) where T : class
    {
        var context = new ValidationContext(model, serviceProvider: null, items: null);
        var results = new List<ValidationResult>();
        
        if (!Validator.TryValidateObject(model, context, results, validateAllProperties: true))
        {
            var errors = string.Join("; ", results.Select(r => r.ErrorMessage));
            throw new ArgumentException($"Model validation failed: {errors}");
        }
    }
}

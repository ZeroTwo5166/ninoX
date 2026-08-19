using backend.Common;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace backend.Controllers;

[ApiController]
public abstract class ApiControllerBase : ControllerBase
{
    // pulled from the JWT
    protected Guid CurrentUserId =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    protected IActionResult FromError(ServiceResult result) =>
        result.ErrorType switch
        {
            ServiceErrorType.Validation => BadRequest(new { error = result.Error }),
            ServiceErrorType.NotFound => NotFound(new { error = result.Error }),
            ServiceErrorType.Unauthorized => Unauthorized(new { error = result.Error }),
            ServiceErrorType.Conflict => Conflict(new { error = result.Error }),
            ServiceErrorType.TooManyRequests => StatusCode(StatusCodes.Status429TooManyRequests, new { error = result.Error }),
            _ => BadRequest(new { error = result.Error ?? "Unknown error." })
        };
}

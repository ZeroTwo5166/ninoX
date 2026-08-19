namespace backend.Common;

public enum ServiceErrorType
{
    None,
    Validation,
    NotFound,
    Unauthorized,
    Conflict,
    TooManyRequests
}

public class ServiceResult
{
    public bool Success { get; protected init; }
    public string? Error { get; protected init; }
    public ServiceErrorType ErrorType { get; protected init; } = ServiceErrorType.None;

    public static ServiceResult Ok() => new() { Success = true };

    public static ServiceResult Fail(ServiceErrorType type, string error) =>
        new() { Success = false, ErrorType = type, Error = error };
}

public class ServiceResult<T> : ServiceResult
{
    public T? Data { get; private init; }

    public static ServiceResult<T> Ok(T data) =>
        new() { Success = true, Data = data };

    public static new ServiceResult<T> Fail(ServiceErrorType type, string error) =>
        new() { Success = false, ErrorType = type, Error = error };
}

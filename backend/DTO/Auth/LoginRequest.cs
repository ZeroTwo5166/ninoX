namespace backend.DTO.Auth;

public record LoginRequest(
    string Email,
    string Password
);

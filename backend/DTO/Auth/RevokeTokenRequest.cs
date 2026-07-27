namespace backend.DTO.Auth;

public record RevokeTokenRequest(
    string RefreshToken
);

using backend.DTO.Users;

namespace backend.DTO.Auth;

public record AuthResponse(
    string AccessToken,
    string RefreshToken,
    DateTime AccessTokenExpiresAt,
    UserResponse User
);

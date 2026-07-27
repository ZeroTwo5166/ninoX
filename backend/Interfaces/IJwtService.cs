using backend.Models;

namespace backend.Interfaces;

public interface IJwtService
{
    string GenerateAccessToken(User user);
    (string Token, string TokenHash) GenerateRefreshToken();
    string HashToken(string token);
    DateTime GetAccessTokenExpiry();
    DateTime GetRefreshTokenExpiry();
}
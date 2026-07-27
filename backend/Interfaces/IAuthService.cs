using backend.Common;
using backend.DTO.Auth;

namespace backend.Interfaces;

public interface IAuthService
{
    Task<ServiceResult<AuthResponse>> RegisterAsync(RegisterRequest request);
    Task<ServiceResult<AuthResponse>> LoginAsync(LoginRequest request);
    Task<ServiceResult<AuthResponse>> RefreshTokenAsync(RefreshTokenRequest request);
    Task<ServiceResult> RevokeTokenAsync(RevokeTokenRequest request);
    Task<ServiceResult> VerifyEmailAsync(VerifyEmailRequest request);
    Task<ServiceResult> ResendVerificationAsync(ResendVerificationRequest request);
    Task<ServiceResult> ForgotPasswordAsync(ForgotPasswordRequest request);
    Task<ServiceResult> ResetPasswordAsync(ResetPasswordRequest request);
    Task<ServiceResult> ChangePasswordAsync(Guid userId, ChangePasswordRequest request);
}

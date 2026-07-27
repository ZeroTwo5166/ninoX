using System.Security.Cryptography;
using backend.Common;
using backend.DTO.Auth;
using backend.DTO.Users;
using backend.Interfaces;
using backend.Models;

namespace backend.Services;

public class AuthService : IAuthService
{
    private const int MinPasswordLength = 8;
    private static readonly TimeSpan EmailTokenLifetime = TimeSpan.FromHours(24);
    private static readonly TimeSpan ResetTokenLifetime = TimeSpan.FromHours(1);

    private readonly IUnitOfWork _unitOfWork;
    private readonly IJwtService _jwtService;
    private readonly IEmailService _emailService;

    public AuthService(IUnitOfWork unitOfWork, IJwtService jwtService, IEmailService emailService)
    {
        _unitOfWork = unitOfWork;
        _jwtService = jwtService;
        _emailService = emailService;
    }

    public async Task<ServiceResult<AuthResponse>> RegisterAsync(RegisterRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email))
            return ServiceResult<AuthResponse>.Fail(ServiceErrorType.Validation, "Email is required.");

        if (request.Password != request.ConfirmPassword)
            return ServiceResult<AuthResponse>.Fail(ServiceErrorType.Validation, "Passwords do not match.");

        if (request.Password.Length < MinPasswordLength)
            return ServiceResult<AuthResponse>.Fail(ServiceErrorType.Validation,
                $"Password must be at least {MinPasswordLength} characters long.");

        var email = request.Email.Trim().ToLowerInvariant();

        if (await _unitOfWork.Users.EmailExistsAsync(email))
            return ServiceResult<AuthResponse>.Fail(ServiceErrorType.Conflict, "An account with this email already exists.");

        var user = new User
        {
            Id = Guid.NewGuid(),
            FirstName = request.FirstName.Trim(),
            LastName = request.LastName.Trim(),
            DateOfBirth = request.DateOfBirth,
            Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password)
        };

        await _unitOfWork.Users.AddAsync(user);

        // Email verification token
        var verificationToken = GenerateSecureToken();
        await _unitOfWork.EmailVerificationTokens.AddAsync(new EmailVerificationToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Token = verificationToken,
            ExpiresAt = DateTime.UtcNow.Add(EmailTokenLifetime)
        });

        var authResponse = await IssueTokensAsync(user);

        await _unitOfWork.SaveChangesAsync();

        await _emailService.SendVerificationEmailAsync(user.Email, verificationToken);

        return ServiceResult<AuthResponse>.Ok(authResponse);
    }

    public async Task<ServiceResult<AuthResponse>> LoginAsync(LoginRequest request)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await _unitOfWork.Users.GetByEmailAsync(email);

        if (user is null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            return ServiceResult<AuthResponse>.Fail(ServiceErrorType.Unauthorized, "Invalid email or password.");

        var authResponse = await IssueTokensAsync(user);
        await _unitOfWork.SaveChangesAsync();

        return ServiceResult<AuthResponse>.Ok(authResponse);
    }

    public async Task<ServiceResult<AuthResponse>> RefreshTokenAsync(RefreshTokenRequest request)
    {
        var tokenHash = _jwtService.HashToken(request.RefreshToken);
        var existing = await _unitOfWork.RefreshTokens.GetByTokenAsync(tokenHash);

        if (existing is null || !existing.IsActive)
            return ServiceResult<AuthResponse>.Fail(ServiceErrorType.Unauthorized, "Invalid or expired refresh token.");

        var user = await _unitOfWork.Users.GetByIdAsync(existing.UserId);
        if (user is null)
            return ServiceResult<AuthResponse>.Fail(ServiceErrorType.Unauthorized, "Invalid refresh token.");

        // Rotate: revoke the old token and issue a fresh pair.
        existing.RevokedAt = DateTime.UtcNow;
        _unitOfWork.RefreshTokens.Update(existing);

        var authResponse = await IssueTokensAsync(user);
        await _unitOfWork.SaveChangesAsync();

        return ServiceResult<AuthResponse>.Ok(authResponse);
    }

    public async Task<ServiceResult> RevokeTokenAsync(RevokeTokenRequest request)
    {
        var tokenHash = _jwtService.HashToken(request.RefreshToken);
        var existing = await _unitOfWork.RefreshTokens.GetByTokenAsync(tokenHash);

        if (existing is null || !existing.IsActive)
            return ServiceResult.Fail(ServiceErrorType.NotFound, "Token not found or already revoked.");

        existing.RevokedAt = DateTime.UtcNow;
        _unitOfWork.RefreshTokens.Update(existing);
        await _unitOfWork.SaveChangesAsync();

        return ServiceResult.Ok();
    }

    public async Task<ServiceResult> VerifyEmailAsync(VerifyEmailRequest request)
    {
        var token = await _unitOfWork.EmailVerificationTokens.GetByTokenAsync(request.Token);

        if (token is null || token.Used || token.ExpiresAt <= DateTime.UtcNow)
            return ServiceResult.Fail(ServiceErrorType.Validation, "Invalid or expired verification token.");

        var user = await _unitOfWork.Users.GetByIdAsync(token.UserId);
        if (user is null)
            return ServiceResult.Fail(ServiceErrorType.NotFound, "User not found.");

        token.Used = true;
        user.EmailVerified = true;

        _unitOfWork.EmailVerificationTokens.Update(token);
        _unitOfWork.Users.Update(user);
        await _unitOfWork.SaveChangesAsync();

        return ServiceResult.Ok();
    }

    public async Task<ServiceResult> ResendVerificationAsync(ResendVerificationRequest request)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await _unitOfWork.Users.GetByEmailAsync(email);

        // Always return Ok to avoid leaking which emails are registered.
        if (user is null || user.EmailVerified)
            return ServiceResult.Ok();

        var verificationToken = GenerateSecureToken();
        await _unitOfWork.EmailVerificationTokens.AddAsync(new EmailVerificationToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Token = verificationToken,
            ExpiresAt = DateTime.UtcNow.Add(EmailTokenLifetime)
        });
        await _unitOfWork.SaveChangesAsync();

        await _emailService.SendVerificationEmailAsync(user.Email, verificationToken);

        return ServiceResult.Ok();
    }

    public async Task<ServiceResult> ForgotPasswordAsync(ForgotPasswordRequest request)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await _unitOfWork.Users.GetByEmailAsync(email);

        // Always return Ok to avoid leaking which emails are registered.
        if (user is null)
            return ServiceResult.Ok();

        var resetToken = GenerateSecureToken();
        await _unitOfWork.PasswordResetTokens.AddAsync(new PasswordResetToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Token = resetToken,
            ExpiresAt = DateTime.UtcNow.Add(ResetTokenLifetime)
        });
        await _unitOfWork.SaveChangesAsync();

        await _emailService.SendPasswordResetEmailAsync(user.Email, resetToken);

        return ServiceResult.Ok();
    }

    public async Task<ServiceResult> ResetPasswordAsync(ResetPasswordRequest request)
    {
        if (request.NewPassword != request.ConfirmNewPassword)
            return ServiceResult.Fail(ServiceErrorType.Validation, "Passwords do not match.");

        if (request.NewPassword.Length < MinPasswordLength)
            return ServiceResult.Fail(ServiceErrorType.Validation,
                $"Password must be at least {MinPasswordLength} characters long.");

        var token = await _unitOfWork.PasswordResetTokens.GetByTokenAsync(request.Token);

        if (token is null || token.Used || token.ExpiresAt <= DateTime.UtcNow)
            return ServiceResult.Fail(ServiceErrorType.Validation, "Invalid or expired reset token.");

        var user = await _unitOfWork.Users.GetByIdAsync(token.UserId);
        if (user is null)
            return ServiceResult.Fail(ServiceErrorType.NotFound, "User not found.");

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        token.Used = true;

        // Revoke all active refresh tokens so stolen sessions die with the old password.
        var activeTokens = await _unitOfWork.RefreshTokens.GetActiveByUserIdAsync(user.Id);
        foreach (var rt in activeTokens)
        {
            rt.RevokedAt = DateTime.UtcNow;
            _unitOfWork.RefreshTokens.Update(rt);
        }

        _unitOfWork.Users.Update(user);
        _unitOfWork.PasswordResetTokens.Update(token);
        await _unitOfWork.SaveChangesAsync();

        return ServiceResult.Ok();
    }

    public async Task<ServiceResult> ChangePasswordAsync(Guid userId, ChangePasswordRequest request)
    {
        var user = await _unitOfWork.Users.GetByIdAsync(userId);
        if (user is null)
            return ServiceResult.Fail(ServiceErrorType.NotFound, "User not found.");

        if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
            return ServiceResult.Fail(ServiceErrorType.Unauthorized, "Current password is incorrect.");

        if (request.NewPassword != request.ConfirmNewPassword)
            return ServiceResult.Fail(ServiceErrorType.Validation, "Passwords do not match.");

        if (request.NewPassword.Length < MinPasswordLength)
            return ServiceResult.Fail(ServiceErrorType.Validation,
                $"Password must be at least {MinPasswordLength} characters long.");

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);

        // Revoke all active refresh tokens so other sessions (including this one)
        // must re-authenticate with the new password — mirrors ResetPasswordAsync.
        var activeTokens = await _unitOfWork.RefreshTokens.GetActiveByUserIdAsync(user.Id);
        foreach (var rt in activeTokens)
        {
            rt.RevokedAt = DateTime.UtcNow;
            _unitOfWork.RefreshTokens.Update(rt);
        }

        _unitOfWork.Users.Update(user);
        await _unitOfWork.SaveChangesAsync();

        return ServiceResult.Ok();
    }

    // ---------- helpers ----------

    private async Task<AuthResponse> IssueTokensAsync(User user)
    {
        var accessToken = _jwtService.GenerateAccessToken(user);
        var (refreshToken, refreshTokenHash) = _jwtService.GenerateRefreshToken();

        await _unitOfWork.RefreshTokens.AddAsync(new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Token = refreshTokenHash, // store the hash, never the raw token
            ExpiresAt = _jwtService.GetRefreshTokenExpiry()
        });

        return new AuthResponse(
            accessToken,
            refreshToken, // raw token goes to the client only
            _jwtService.GetAccessTokenExpiry(),
            ToUserResponse(user)
        );
    }

    private static string GenerateSecureToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(32);
        return Convert.ToHexString(bytes); // URL-safe, easy to embed in links
    }

    private static UserResponse ToUserResponse(User user) =>
        new(user.Id, user.FirstName, user.LastName, user.Email, user.EmailVerified, user.CreatedAt);
}

using backend.Interfaces;

namespace backend.Services;

/// <summary>
/// Development email sender that logs instead of sending.
/// Swap for a real implementation (SMTP, SendGrid, Resend, etc.) in production.
/// </summary>
public class ConsoleEmailService : IEmailService
{
    private readonly ILogger<ConsoleEmailService> _logger;

    public ConsoleEmailService(ILogger<ConsoleEmailService> logger)
    {
        _logger = logger;
    }

    public Task SendVerificationEmailAsync(string toEmail, string token)
    {
        _logger.LogInformation("[EMAIL] Verification email to {Email}. Token: {Token}", toEmail, token);
        return Task.CompletedTask;
    }

    public Task SendPasswordResetEmailAsync(string toEmail, string token)
    {
        _logger.LogInformation("[EMAIL] Password reset email to {Email}. Token: {Token}", toEmail, token);
        return Task.CompletedTask;
    }
}

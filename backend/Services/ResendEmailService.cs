using System.Net.Http.Headers;
using System.Net.Http.Json;
using backend.Interfaces;
using Microsoft.Extensions.Options;

namespace backend.Services;

public class ResendSettings
{
    public string ApiKey { get; set; } = default!;
    public string FromEmail { get; set; } = default!;
    public string FromName { get; set; } = "ninoX";

    // base URL of the frontend, used to build links inside emails
    public string AppUrl { get; set; } = "http://localhost:3000";
}

public class ResendEmailService : IEmailService
{
    private readonly HttpClient _httpClient;
    private readonly ResendSettings _settings;
    private readonly ILogger<ResendEmailService> _logger;

    public ResendEmailService(HttpClient httpClient, IOptions<ResendSettings> settings, ILogger<ResendEmailService> logger)
    {
        _httpClient = httpClient;
        _settings = settings.Value;
        _logger = logger;

        _httpClient.BaseAddress = new Uri("https://api.resend.com/");
        _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _settings.ApiKey);
    }

    public Task SendVerificationEmailAsync(string toEmail, string token)
    {
        var link = $"{_settings.AppUrl}/verify-email?token={Uri.EscapeDataString(token)}";
        var html = $"""
            <p>Welcome to ninoX! Confirm your email address to finish setting up your account.</p>
            <p><a href="{link}">Verify my email</a></p>
            <p>If the link doesn't work, paste this into your browser:<br>{link}</p>
            """;

        return SendAsync(toEmail, "Verify your ninoX email", html);
    }

    public Task SendPasswordResetEmailAsync(string toEmail, string token)
    {
        var link = $"{_settings.AppUrl}/reset-password?token={Uri.EscapeDataString(token)}";
        var html = $"""
            <p>We received a request to reset your ninoX password.</p>
            <p><a href="{link}">Reset my password</a></p>
            <p>If you didn't request this, you can ignore this email.</p>
            """;

        return SendAsync(toEmail, "Reset your ninoX password", html);
    }

    private async Task SendAsync(string toEmail, string subject, string html)
    {
        var payload = new
        {
            from = $"{_settings.FromName} <{_settings.FromEmail}>",
            to = new[] { toEmail },
            subject,
            html
        };

        var response = await _httpClient.PostAsJsonAsync("emails", payload);

        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync();
            _logger.LogError("Resend email to {Email} failed ({Status}): {Body}", toEmail, response.StatusCode, body);
        }
    }
}

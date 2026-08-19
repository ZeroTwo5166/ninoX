using backend.Models;

namespace backend.Interfaces;

public interface IEmailVerificationTokenRepository : IGenericRepository<EmailVerificationToken>
{
    Task<EmailVerificationToken?> GetByTokenAsync(string token);
    Task<EmailVerificationToken?> GetLatestByUserIdAsync(Guid userId);
}

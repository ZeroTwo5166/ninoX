using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.Interfaces;
using backend.Models;

namespace backend.Repositories;

public class EmailVerificationTokenRepository : GenericRepository<EmailVerificationToken>, IEmailVerificationTokenRepository
{
    public EmailVerificationTokenRepository(ApplicationDbContext context) : base(context)
    {
    }

    public async Task<EmailVerificationToken?> GetByTokenAsync(string token) =>
        await _dbSet.FirstOrDefaultAsync(t => t.Token == token);

    public async Task<EmailVerificationToken?> GetLatestByUserIdAsync(Guid userId) =>
        await _dbSet.Where(t => t.UserId == userId)
            .OrderByDescending(t => t.CreatedAt)
            .FirstOrDefaultAsync();
}

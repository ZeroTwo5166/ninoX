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
}

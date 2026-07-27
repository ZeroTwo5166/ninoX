namespace backend.Models
{
    public class User
    {
        public Guid Id { get; set; }
        public string FirstName { get; set; } = default!;
        public string LastName { get; set; } = default!;
        public DateOnly DateOfBirth { get; set; }
        public string Email { get; set; } = default!;
        public string PasswordHash { get; set; } = default!;
        public bool EmailVerified { get; set; } = false;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public List<Conversation> Conversations { get; set; } = [];
        public List<RefreshToken> RefreshTokens { get; set; } = [];
    }
}

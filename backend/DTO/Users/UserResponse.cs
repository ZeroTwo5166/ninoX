namespace backend.DTO.Users;

public record UserResponse(
    Guid Id,
    string FirstName,
    string LastName,
    string Email,
    bool EmailVerified,
    DateTime CreatedAt
);

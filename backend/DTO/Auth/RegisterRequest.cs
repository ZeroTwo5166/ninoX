namespace backend.DTO.Auth;

public record RegisterRequest(
    string FirstName,
    string LastName,
    DateOnly DateOfBirth,
    string Email,
    string Password,
    string ConfirmPassword
);

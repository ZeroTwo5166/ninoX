namespace backend.DTO.Auth;

public record ResetPasswordRequest(
    string Token,
    string NewPassword,
    string ConfirmNewPassword
);

namespace backend.DTO.Messages;

// Type: "user" | "thinking" | "delta" | "assistant" | "error"
public record ChatStreamEvent(
    string Type,
    string? Delta = null,
    MessageResponse? Message = null,
    string? Error = null
);

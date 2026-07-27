namespace backend.DTO.Messages;

/// <summary>
/// One event in a streamed chat response. Type is one of: "user" (the saved
/// user message), "thinking" (a chunk of the model's reasoning trace, in
/// Delta), "delta" (a chunk of the assistant's answer, in Delta), "assistant"
/// (the final saved assistant message, including its full Thinking if any),
/// "error".
/// </summary>
public record ChatStreamEvent(
    string Type,
    string? Delta = null,
    MessageResponse? Message = null,
    string? Error = null
);

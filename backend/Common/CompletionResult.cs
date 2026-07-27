namespace backend.Common;

/// <summary>The full (non-streamed) reply from a chat completion call.</summary>
public record CompletionResult(string Content, string? Thinking);

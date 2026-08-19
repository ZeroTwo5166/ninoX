namespace backend.Common;

// IsThinking tells you whether this is a reasoning chunk or an answer chunk
public readonly record struct CompletionChunk(string Text, bool IsThinking);

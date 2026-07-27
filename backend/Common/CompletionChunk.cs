namespace backend.Common;

/// <summary>
/// One streamed piece of a reply. Thinking-capable models stream reasoning
/// tokens before the actual answer tokens; <see cref="IsThinking"/> tells the
/// caller which stream this chunk belongs to.
/// </summary>
public readonly record struct CompletionChunk(string Text, bool IsThinking);

using backend.Common;
using backend.Models;

namespace backend.Interfaces;

public interface IChatCompletionService
{
    /// <summary>The model used when a conversation doesn't specify its own.</summary>
    string DefaultModel { get; }

    /// <summary>The "think" setting used when a conversation doesn't specify its own.</summary>
    bool DefaultThink { get; }

    /// <summary>
    /// Generates the assistant's full reply given the ordered message history
    /// (oldest first, including the new user message).
    /// </summary>
    Task<CompletionResult> GetCompletionAsync(
        IReadOnlyList<Message> history, string? model, bool think, CancellationToken cancellationToken = default);

    /// <summary>
    /// Streams the assistant's reply as it is generated. Thinking-capable
    /// models stream reasoning chunks first (<see cref="CompletionChunk.IsThinking"/>)
    /// followed by the actual answer chunks.
    /// </summary>
    IAsyncEnumerable<CompletionChunk> StreamCompletionAsync(
        IReadOnlyList<Message> history, string? model, bool think, CancellationToken cancellationToken = default);

    /// <summary>
    /// Generates a short, human-readable title (a few words) summarizing the
    /// opening exchange of a conversation, the way ChatGPT/Claude auto-title new chats.
    /// </summary>
    Task<string> GenerateTitleAsync(
        string userMessage, string assistantMessage, string? model, CancellationToken cancellationToken = default);

    /// <summary>Lists the models currently available to chat with (e.g. pulled into Ollama).</summary>
    Task<List<string>> GetAvailableModelsAsync(CancellationToken cancellationToken = default);
}

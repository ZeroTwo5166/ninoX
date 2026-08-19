using backend.Common;
using backend.Models;

namespace backend.Interfaces;

public interface IChatCompletionService
{
    string DefaultModel { get; }
    bool DefaultThink { get; }

    // full reply given the ordered history (oldest first, includes the new user message)
    Task<CompletionResult> GetCompletionAsync(
        IReadOnlyList<Message> history, string? model, bool think, CancellationToken cancellationToken = default);

    // reasoning chunks stream first for thinking-capable models, then the actual answer
    IAsyncEnumerable<CompletionChunk> StreamCompletionAsync(
        IReadOnlyList<Message> history, string? model, bool think, CancellationToken cancellationToken = default);

    // short auto-title for a new conversation, ChatGPT/Claude style
    Task<string> GenerateTitleAsync(
        string userMessage, string assistantMessage, string? model, CancellationToken cancellationToken = default);

    Task<List<string>> GetAvailableModelsAsync(CancellationToken cancellationToken = default);

    Task<bool> IsAvailableAsync(CancellationToken cancellationToken = default);
}

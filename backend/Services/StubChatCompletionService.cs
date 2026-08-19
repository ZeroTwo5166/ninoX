using System.Runtime.CompilerServices;
using backend.Common;
using backend.Interfaces;
using backend.Models;

namespace backend.Services;

// placeholder so the message flow works without a real model hooked up
public class StubChatCompletionService : IChatCompletionService
{
    public string DefaultModel => "stub-model";
    public bool DefaultThink => false;

    public Task<CompletionResult> GetCompletionAsync(
        IReadOnlyList<Message> history, string? model, bool think, CancellationToken cancellationToken = default)
    {
        return Task.FromResult(new CompletionResult(BuildReply(history), null));
    }

    public async IAsyncEnumerable<CompletionChunk> StreamCompletionAsync(
        IReadOnlyList<Message> history, string? model, bool think,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        foreach (var word in BuildReply(history).Split(' '))
        {
            cancellationToken.ThrowIfCancellationRequested();
            await Task.Delay(50, cancellationToken); // simulate token latency
            yield return new CompletionChunk(word + " ", IsThinking: false);
        }
    }

    private static string BuildReply(IReadOnlyList<Message> history)
    {
        var lastUserMessage = history.LastOrDefault(m => m.Role == MessageRole.User);

        return lastUserMessage is null
            ? "Hello! How can I help you today?"
            : $"(stub reply) You said: \"{lastUserMessage.Content}\" — connect a real AI provider.";
    }

    public Task<string> GenerateTitleAsync(
        string userMessage, string assistantMessage, string? model, CancellationToken cancellationToken = default)
    {
        var title = userMessage.Length <= 50 ? userMessage : userMessage[..50].TrimEnd() + "…";
        return Task.FromResult(title);
    }

    public Task<List<string>> GetAvailableModelsAsync(CancellationToken cancellationToken = default) =>
        Task.FromResult(new List<string> { DefaultModel });

    public Task<bool> IsAvailableAsync(CancellationToken cancellationToken = default) =>
        Task.FromResult(true);
}

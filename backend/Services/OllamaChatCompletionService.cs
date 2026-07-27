using System.Net.Http.Json;
using System.Runtime.CompilerServices;
using System.Text.Json;
using System.Text.Json.Serialization;
using backend.Common;
using backend.Interfaces;
using backend.Models;
using Microsoft.Extensions.Options;

namespace backend.Services;

public class OllamaSettings
{
    public string BaseUrl { get; set; } = "http://localhost:11434";
    public string Model { get; set; } = default!;
    public string? SystemPrompt { get; set; }

    /// <summary>Disables reasoning/"thinking" output for models that support it (e.g. Qwen3).</summary>
    public bool Think { get; set; } = false;
}

public class OllamaChatCompletionService : IChatCompletionService
{
    private readonly HttpClient _httpClient;
    private readonly OllamaSettings _settings;

    public OllamaChatCompletionService(HttpClient httpClient, IOptions<OllamaSettings> settings)
    {
        _httpClient = httpClient;
        _settings = settings.Value;
        _httpClient.BaseAddress = new Uri(_settings.BaseUrl);
        _httpClient.Timeout = TimeSpan.FromMinutes(10); // local models can be slow on first load
    }

    public string DefaultModel => _settings.Model;
    public bool DefaultThink => _settings.Think;

    public async Task<CompletionResult> GetCompletionAsync(
        IReadOnlyList<Message> history, string? model, bool think, CancellationToken cancellationToken = default)
    {
        var request = new OllamaChatRequest(ResolveModel(model), BuildMessages(history), Stream: false, Think: think);

        var response = await _httpClient.PostAsJsonAsync("/api/chat", request, cancellationToken);
        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<OllamaChatResponse>(cancellationToken: cancellationToken);
        var content = result?.Message?.Content?.Trim();

        if (string.IsNullOrEmpty(content))
            throw new InvalidOperationException("Ollama returned an empty response.");

        var thinking = string.IsNullOrWhiteSpace(result?.Message?.Thinking) ? null : result!.Message!.Thinking!.Trim();

        return new CompletionResult(content, thinking);
    }

    public async IAsyncEnumerable<CompletionChunk> StreamCompletionAsync(
        IReadOnlyList<Message> history, string? model, bool think,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        var request = new OllamaChatRequest(ResolveModel(model), BuildMessages(history), Stream: true, Think: think);

        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, "/api/chat")
        {
            Content = JsonContent.Create(request),
        };

        using var response = await _httpClient.SendAsync(
            httpRequest, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
        response.EnsureSuccessStatusCode();

        await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
        using var reader = new StreamReader(stream);

        // Ollama streams newline-delimited JSON objects, one per chunk. Thinking-capable
        // models send reasoning tokens (message.thinking) before answer tokens (message.content).
        while (!reader.EndOfStream)
        {
            cancellationToken.ThrowIfCancellationRequested();

            var line = await reader.ReadLineAsync(cancellationToken);
            if (string.IsNullOrWhiteSpace(line)) continue;

            OllamaChatResponse? chunk;
            try
            {
                chunk = JsonSerializer.Deserialize<OllamaChatResponse>(line);
            }
            catch (JsonException)
            {
                continue; // skip malformed keep-alive lines
            }

            var thinkingText = chunk?.Message?.Thinking;
            if (!string.IsNullOrEmpty(thinkingText))
                yield return new CompletionChunk(thinkingText, IsThinking: true);

            var contentText = chunk?.Message?.Content;
            if (!string.IsNullOrEmpty(contentText))
                yield return new CompletionChunk(contentText, IsThinking: false);

            if (chunk?.Done == true)
                yield break;
        }
    }

    public async Task<string> GenerateTitleAsync(
        string userMessage, string assistantMessage, string? model, CancellationToken cancellationToken = default)
    {
        var prompt =
            "Give this chat a short title, the way ChatGPT or Claude auto-titles a new conversation: " +
            "3-6 words, no quotes, no trailing punctuation, no markdown. Respond with only the title.\n\n" +
            $"User: {Truncate(userMessage, 300)}\n" +
            $"Assistant: {Truncate(assistantMessage, 300)}";

        var request = new OllamaChatRequest(
            ResolveModel(model),
            [new OllamaMessage("user", prompt)],
            Stream: false,
            Think: false);

        try
        {
            var response = await _httpClient.PostAsJsonAsync("/api/chat", request, cancellationToken);
            response.EnsureSuccessStatusCode();

            var result = await response.Content.ReadFromJsonAsync<OllamaChatResponse>(cancellationToken: cancellationToken);
            var title = CleanTitle(result?.Message?.Content);

            return string.IsNullOrWhiteSpace(title) ? Truncate(userMessage, 50) : title;
        }
        catch (Exception) when (!cancellationToken.IsCancellationRequested)
        {
            // Title generation is a nice-to-have — fall back rather than fail the whole reply.
            return Truncate(userMessage, 50);
        }
    }

    public async Task<List<string>> GetAvailableModelsAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await _httpClient.GetAsync("/api/tags", cancellationToken);
            response.EnsureSuccessStatusCode();

            var result = await response.Content.ReadFromJsonAsync<OllamaTagsResponse>(cancellationToken: cancellationToken);
            var names = result?.Models?
                .Select(m => m.Name)
                .Where(n => !string.IsNullOrWhiteSpace(n))
                .ToList() ?? [];

            return names.Count > 0 ? names : [_settings.Model];
        }
        catch (Exception) when (!cancellationToken.IsCancellationRequested)
        {
            // Ollama unreachable — the configured default is the only thing we can offer.
            return [_settings.Model];
        }
    }

    private string ResolveModel(string? model) =>
        string.IsNullOrWhiteSpace(model) ? _settings.Model : model;

    private static string CleanTitle(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return string.Empty;

        var title = raw.Trim().Trim('"', '\'', '“', '”', '.', ' ');
        return Truncate(title, 60);
    }

    private static string Truncate(string text, int maxLength) =>
        text.Length <= maxLength ? text : text[..maxLength].TrimEnd() + "…";

    private List<OllamaMessage> BuildMessages(IReadOnlyList<Message> history)
    {
        var messages = new List<OllamaMessage>();

        if (!string.IsNullOrWhiteSpace(_settings.SystemPrompt))
            messages.Add(new OllamaMessage("system", _settings.SystemPrompt));

        messages.AddRange(history.Select(m => new OllamaMessage(
            m.Role switch
            {
                MessageRole.User => "user",
                MessageRole.Assistant => "assistant",
                _ => "system",
            },
            m.Content)));

        return messages;
    }

    // ---------- Ollama API contracts ----------

    private record OllamaMessage(
        [property: JsonPropertyName("role")] string Role,
        [property: JsonPropertyName("content")] string Content,
        [property: JsonPropertyName("thinking")] string? Thinking = null);

    private record OllamaChatRequest(
        [property: JsonPropertyName("model")] string Model,
        [property: JsonPropertyName("messages")] List<OllamaMessage> Messages,
        [property: JsonPropertyName("stream")] bool Stream,
        [property: JsonPropertyName("think")] bool Think);

    private record OllamaChatResponse(
        [property: JsonPropertyName("message")] OllamaMessage? Message,
        [property: JsonPropertyName("done")] bool Done);

    private record OllamaTagsResponse(
        [property: JsonPropertyName("models")] List<OllamaModelInfo> Models);

    private record OllamaModelInfo(
        [property: JsonPropertyName("name")] string Name);
}

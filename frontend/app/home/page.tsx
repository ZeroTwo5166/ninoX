"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, LogOut, PanelLeft, Cpu, Brain, ChevronUp, ChevronDown, Square } from "lucide-react";
import {
  api,
  tokenStore,
  type ConversationResponse,
  type MessageResponse,
  type UserResponse,
} from "../lib/api";

const mono = { fontFamily: "'JetBrains Mono', ui-monospace, monospace" } as const;

const HomePage = () => {
  const router = useRouter();

  const [user, setUser] = useState<UserResponse | null>(null);
  const [conversations, setConversations] = useState<ConversationResponse[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageResponse[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const [thinkingText, setThinkingText] = useState<string | null>(null);
  const [liveThinkExpanded, setLiveThinkExpanded] = useState(false);
  const [expandedThinking, setExpandedThinking] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [pendingDelete, setPendingDelete] = useState<ConversationResponse | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ---------- per-conversation model / think settings ----------
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [defaultModel, setDefaultModel] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<string | null>(null); // null = use server default
  const [thinkEnabled, setThinkEnabled] = useState(false);
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const modelMenuRef = useRef<HTMLDivElement>(null);
  const displayedModel = selectedModel ?? defaultModel;

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const thinkingScrollRef = useRef<HTMLDivElement>(null);

  // ---------- bootstrap: require auth, load user + sessions ----------
  useEffect(() => {
    if (!tokenStore.access) {
      router.replace("/login");
      return;
    }
    (async () => {
      try {
        const [me, convos] = await Promise.all([api.getMe(), api.getConversations()]);
        setUser(me);
        setConversations(convos.items);
      } catch {
        tokenStore.clear();
        router.replace("/login");
        return;
      }
      try {
        const modelsResp = await api.getModels();
        setAvailableModels(modelsResp.models);
        setDefaultModel(modelsResp.defaultModel);
      } catch {
        // Model list is best-effort — the backend still applies its own
        // default per-conversation even if this fetch fails.
      }
    })();
  }, [router]);

  // ---------- load messages when switching sessions ----------
  const jumpToBottomRef = useRef(false);

  useEffect(() => {
    setModelMenuOpen(false);
    if (!activeId) {
      setMessages([]);
      setSelectedModel(null);
      setThinkEnabled(false);
      return;
    }
    jumpToBottomRef.current = true;
    (async () => {
      try {
        const detail = await api.getConversation(activeId);
        setMessages(detail.messages);
        setSelectedModel(detail.model);
        setThinkEnabled(detail.think);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load session.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  useEffect(() => {
    // Opening a conversation (or switching to one) should land straight on the
    // latest message, like ChatGPT/Claude — no visible scroll-from-top. Only
    // messages arriving live (sending/streaming) get the smooth scroll.
    const behavior = jumpToBottomRef.current ? "auto" : "smooth";
    jumpToBottomRef.current = false;
    bottomRef.current?.scrollIntoView({ behavior, block: "nearest" });
  }, [messages, sending, streamingText, thinkingText]);

  // ---------- keep the expanded live thinking panel pinned to its latest line ----------
  useEffect(() => {
    if (!liveThinkExpanded || !thinkingScrollRef.current) return;
    thinkingScrollRef.current.scrollTop = thinkingScrollRef.current.scrollHeight;
  }, [thinkingText, liveThinkExpanded]);

  // ---------- close the delete dialog on Escape ----------
  useEffect(() => {
    if (!pendingDelete) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !deleting) setPendingDelete(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pendingDelete, deleting]);

  // ---------- close the model dropdown on an outside click or Escape ----------
  useEffect(() => {
    if (!modelMenuOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (modelMenuRef.current && !modelMenuRef.current.contains(e.target as Node)) setModelMenuOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModelMenuOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [modelMenuOpen]);

  const refreshConversations = useCallback(async () => {
    const convos = await api.getConversations();
    setConversations(convos.items);
  }, []);

  // ---------- actions ----------
  const handleNewChat = () => {
    setActiveId(null);
    setMessages([]);
    setError(null);
    inputRef.current?.focus();
  };

  const toggleThinking = (id: string) => {
    setExpandedThinking((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSend = async () => {
    const content = input.trim();
    if (!content || sending) return;

    setSending(true);
    setError(null);
    setInput("");
    setThinkingText(null);
    setLiveThinkExpanded(false);

    // optimistic user message
    const optimistic: MessageResponse = {
      id: `local-${Date.now()}`,
      role: "User",
      content,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    const controller = new AbortController();
    abortControllerRef.current = controller;
    let partialReply = "";
    let partialThinking = "";
    let assistantFinalized = false;

    try {
      let conversationId = activeId;
      if (!conversationId) {
        const created = await api.createConversation(null, selectedModel, thinkEnabled);
        conversationId = created.id;
        setActiveId(created.id);
        // note: setActiveId triggers a message reload for the (empty) new
        // conversation; re-add the optimistic message on top of it
        setMessages([optimistic]);
      }

      let streamFailed: string | null = null;

      await api.streamMessage(
        conversationId,
        content,
        (event) => {
          switch (event.type) {
            case "user":
              if (event.message) {
                const serverUserMsg = event.message;
                setMessages((prev) => [
                  ...prev.filter((m) => m.id !== optimistic.id),
                  serverUserMsg,
                ]);
              }
              break;
            case "thinking":
              partialThinking += event.delta ?? "";
              setThinkingText((prev) => (prev ?? "") + (event.delta ?? ""));
              break;
            case "delta":
              partialReply += event.delta ?? "";
              setStreamingText((prev) => (prev ?? "") + (event.delta ?? ""));
              break;
            case "assistant":
              assistantFinalized = true;
              if (event.message) {
                const finalMsg = event.message;
                setMessages((prev) => [...prev, finalMsg]);
              }
              setStreamingText(null);
              setThinkingText(null);
              break;
            case "error":
              streamFailed = event.error ?? "Stream error.";
              break;
          }
        },
        controller.signal
      );

      if (streamFailed) {
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
        setInput(content);
        setError(streamFailed);
      }

      await refreshConversations();
    } catch (e) {
      const wasStopped = e instanceof Error && e.name === "AbortError";
      if (wasStopped) {
        // User clicked stop() — keep whatever was generated so far as the
        // final reply (the backend persists the same partial reply on its
        // end once it sees the request was cancelled).
        if (!assistantFinalized && partialReply.trim()) {
          setMessages((prev) => [
            ...prev,
            {
              id: `local-assistant-${Date.now()}`,
              role: "Assistant",
              content: partialReply.trim(),
              thinking: partialThinking.trim() || null,
              createdAt: new Date().toISOString(),
            },
          ]);
        }
        await refreshConversations();
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
        setInput(content); // give the text back
        setError(e instanceof Error ? e.message : "Failed to send message.");
      }
    } finally {
      setStreamingText(null);
      setThinkingText(null);
      setSending(false);
      abortControllerRef.current = null;
      inputRef.current?.focus();
    }
  };

  const handleStop = () => {
    abortControllerRef.current?.abort();
  };

  const requestDelete = (c: ConversationResponse, e: React.MouseEvent) => {
    e.stopPropagation();
    if (sending) return; // don't delete sessions mid-generation
    setPendingDelete(c);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const { id } = pendingDelete;

    setDeleting(true);
    try {
      await api.deleteConversation(id);
      if (activeId === id) handleNewChat();
      await refreshConversations();
      setPendingDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete session.");
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const handleLogout = async () => {
    await api.logout();
    router.replace("/login");
  };

  const handleSelectModel = async (model: string) => {
    setSelectedModel(model);
    setModelMenuOpen(false);
    if (activeId) {
      try {
        await api.updateConversationSettings(activeId, { model });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to update model.");
      }
    }
  };

  const handleToggleThink = async () => {
    const next = !thinkEnabled;
    setThinkEnabled(next);
    if (activeId) {
      try {
        await api.updateConversationSettings(activeId, { think: next });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to update think setting.");
      }
    }
  };

  const onInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!user) {
    return (
      <div
        className="flex-1 flex items-center justify-center bg-[#FDFDFC] dark:bg-black text-black dark:text-white text-sm"
        style={mono}
      >
        loading<span className="animate-pulse">_</span>
      </div>
    );
  }

  const username = user.firstName.toLowerCase();

  return (
    <div className="fixed inset-x-0 bottom-0 top-16 sm:top-20 flex overflow-hidden bg-[#FDFDFC] dark:bg-black transition-colors duration-300">
      {/* ---------- Sidebar: sessions (own scrollbar) ---------- */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-0"
        } shrink-0 min-h-0 overflow-hidden border-r border-[#111114]/10 dark:border-white/10 flex flex-col transition-[width] duration-200 bg-white dark:bg-[#0A0A0A]`}
      >
        <div className="shrink-0 p-3 border-b border-[#111114]/10 dark:border-white/10">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center gap-2 text-sm text-white dark:text-black px-3 py-2 bg-black dark:bg-white cursor-pointer hover:bg-[#2954E3] dark:hover:bg-[#5B7FFF] transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black dark:focus-visible:outline-white"
            style={mono}
          >
            <Plus size={14} strokeWidth={2} />
            new_chat()
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto py-2 scrollbar-premium">
          <p className="px-4 pb-2 text-xs text-black dark:text-white" style={mono}>
            ~/sessions ({conversations.length})
          </p>
          {conversations.length === 0 && (
            <p className="px-4 text-sm text-black dark:text-white" style={mono}>
              no sessions yet
            </p>
          )}
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveId(c.id)}
              className={`group w-full flex items-center justify-between gap-2 px-4 py-2.5 text-left text-sm cursor-pointer transition-colors duration-150 ${
                activeId === c.id
                  ? "bg-[#2954E3]/10 dark:bg-[#5B7FFF]/15 text-black dark:text-white border-l-2 border-[#2954E3] dark:border-[#5B7FFF]"
                  : "text-black dark:text-white hover:bg-[#111114]/5 dark:hover:bg-white/5 border-l-2 border-transparent"
              }`}
              style={mono}
            >
              <span className="truncate">{c.title ?? "untitled"}</span>
              <Trash2
                size={14}
                className="shrink-0 opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:text-red-500 transition-opacity"
                onClick={(e) => requestDelete(c, e)}
              />
            </button>
          ))}
        </div>

        {/* user footer */}
        <div className="shrink-0 p-3 border-t border-[#111114]/10 dark:border-white/10 flex items-center justify-between gap-2">
          <span className="truncate text-sm text-black dark:text-white" style={mono}>
            {username}@ninoX
          </span>
          <button
            onClick={handleLogout}
            aria-label="Log out"
            className="flex items-center gap-1 text-sm text-black dark:text-white hover:text-red-500 cursor-pointer transition-colors"
            style={mono}
          >
            <LogOut size={14} />
            exit
          </button>
        </div>
      </aside>

      {/* ---------- Main: terminal chat (own scrollbar) ---------- */}
      <main className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* window chrome */}
        <div className="shrink-0 flex items-center gap-1.5 px-4 py-3 border-b border-[#111114]/10 dark:border-white/12 bg-white dark:bg-[#0A0A0A]">
          <button
            onClick={() => setSidebarOpen((s) => !s)}
            aria-label="Toggle sidebar"
            className="mr-2 text-black dark:text-white hover:text-black dark:hover:text-white cursor-pointer transition-colors"
          >
            <PanelLeft size={16} />
          </button>

          <span className="ml-2 text-xs text-black dark:text-white truncate" style={mono}>
            ninoX --chat{" "}
            {activeId
              ? `--session ${conversations.find((c) => c.id === activeId)?.title ?? activeId.slice(0, 8)}`
              : "--new"}
          </span>
        </div>

        {/* messages */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-8 py-6 scrollbar-premium">
          {messages.length === 0 && !sending && (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-center">
              <p className="text-sm text-black dark:text-white" style={mono}>
                <span className="text-[#2954E3] dark:text-[#5B7FFF]">$</span> start a conversation
              </p>
              <p className="text-xs text-black dark:text-white" style={mono}>
                type a message below — enter to send, shift+enter for newline
              </p>
            </div>
          )}

          <div className="max-w-3xl mx-auto flex flex-col gap-6">
            {messages.map((m) =>
              m.role === "User" ? (
                /* ---- user message: right-aligned accent block ---- */
                <div key={m.id} className="flex justify-end">
                  <div className="max-w-[85%]">
                    <p
                      className="text-[10px] text-right mb-1 text-[#2954E3] dark:text-[#5B7FFF]"
                      style={mono}
                    >
                      {username} $
                    </p>
                    <div
                      className="text-sm leading-relaxed text-black dark:text-white whitespace-pre-wrap px-3.5 py-2.5 bg-[#2954E3]/8 dark:bg-[#5B7FFF]/12 border border-[#2954E3]/30 dark:border-[#5B7FFF]/30"
                      style={mono}
                    >
                      {m.content}
                    </div>
                  </div>
                </div>
              ) : (
                /* ---- assistant message: left, labeled output block ---- */
                <div key={m.id} className="flex justify-start">
                  <div className="max-w-[85%]">
                    {m.thinking && (
                      <div className="mb-1.5">
                        <button
                          onClick={() => toggleThinking(m.id)}
                          className="flex items-center gap-1.5 text-[11px] text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white cursor-pointer transition-colors"
                          style={mono}
                        >
                          <Brain size={11} />
                          thoughts
                          <ChevronDown
                            size={11}
                            className={`transition-transform duration-150 ${
                              expandedThinking.has(m.id) ? "rotate-180" : ""
                            }`}
                          />
                        </button>
                        {expandedThinking.has(m.id) && (
                          <div
                            className="mt-1.5 text-xs leading-relaxed text-black/60 dark:text-white/60 whitespace-pre-wrap pl-3 border-l-2 border-[#111114]/15 dark:border-white/15 max-h-56 overflow-y-auto scrollbar-premium"
                            style={mono}
                          >
                            {m.thinking}
                          </div>
                        )}
                      </div>
                    )}
                    <p className="text-[10px] mb-1 text-black dark:text-white" style={mono}>
                      ninoX &gt;
                    </p>
                    <div
                      className="text-sm leading-relaxed text-black dark:text-white whitespace-pre-wrap pl-3 border-l-2 border-[#111114]/20 dark:border-white/20"
                      style={mono}
                    >
                      {m.content}
                    </div>
                  </div>
                </div>
              )
            )}

            {/* live thinking trace */}
            {thinkingText !== null && (
              <div className="flex justify-start">
                <div className="max-w-[85%]">
                  <button
                    onClick={() => setLiveThinkExpanded((v) => !v)}
                    className="flex items-center gap-1.5 text-[11px] text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white cursor-pointer transition-colors"
                    style={mono}
                  >
                    <Brain size={11} className={streamingText === null ? "animate-pulse" : ""} />
                    {streamingText === null ? "thinking" : "thoughts"}
                    {streamingText === null && <span className="tracking-widest">......</span>}
                    <ChevronDown
                      size={11}
                      className={`transition-transform duration-150 ${liveThinkExpanded ? "rotate-180" : ""}`}
                    />
                  </button>
                  {liveThinkExpanded && (
                    <div
                      ref={thinkingScrollRef}
                      className="mt-1.5 text-xs leading-relaxed text-black/60 dark:text-white/60 whitespace-pre-wrap pl-3 border-l-2 border-[#111114]/15 dark:border-white/15 max-h-56 overflow-y-auto scrollbar-premium"
                      style={mono}
                    >
                      {thinkingText}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* live streaming reply */}
            {streamingText !== null && (
              <div className="flex justify-start">
                <div className="max-w-[85%]">
                  <p className="text-[10px] mb-1 text-[#2954E3] dark:text-[#5B7FFF]" style={mono}>
                    ninoX &gt;
                  </p>
                  <div
                    className="text-sm leading-relaxed text-black dark:text-white whitespace-pre-wrap pl-3 border-l-2 border-[#2954E3] dark:border-[#5B7FFF]"
                    style={mono}
                  >
                    {streamingText}
                    <span className="inline-block w-[7px] h-[14px] ml-0.5 align-middle bg-[#2954E3] dark:bg-[#5B7FFF] animate-pulse motion-reduce:animate-none" />
                  </div>
                </div>
              </div>
            )}

            {/* waiting for the model to start responding */}
            {sending && streamingText === null && thinkingText === null && (
              <div
                className="text-sm border-l-2 border-[#2954E3] dark:border-[#5B7FFF] pl-3 text-black dark:text-white"
                style={mono}
              >
                connecting<span className="animate-pulse">...</span>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* error */}
        {error && (
          <p className="shrink-0 px-4 sm:px-8 pb-2 text-xs text-red-500" style={mono}>
            error: {error}
          </p>
        )}

        {/* input */}
        <div className="shrink-0 px-4 sm:px-8 pb-5">
          <div className="max-w-3xl mx-auto flex items-end border border-[#111114]/15 dark:border-white/18 bg-white dark:bg-[#0A0A0A] focus-within:border-[#2954E3] dark:focus-within:border-[#5B7FFF] transition-colors duration-200">
            <span className="pl-3 pb-2.5 text-black dark:text-white text-sm select-none" style={mono}>
              &gt;
            </span>
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onInputKeyDown}
              placeholder={sending ? "generating..." : "message ninoX"}
              disabled={sending}
              className="w-full max-h-40 resize-none bg-transparent px-2 py-2.5 text-sm text-black dark:text-white placeholder:text-black/40 dark:placeholder:text-white/40 outline-none disabled:opacity-50"
              style={mono}
            />
            {sending ? (
              <button
                onClick={handleStop}
                aria-label="Stop generating"
                className="m-1.5 flex items-center gap-1.5 text-sm text-white dark:text-black px-4 py-1.5 bg-black dark:bg-white cursor-pointer hover:bg-red-600 dark:hover:bg-red-500 transition-colors duration-200"
                style={mono}
              >
                <Square size={12} fill="currentColor" />
                stop()
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="m-1.5 text-sm text-white dark:text-black px-4 py-1.5 bg-black dark:bg-white cursor-pointer hover:bg-[#2954E3] dark:hover:bg-[#5B7FFF] disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-200"
                style={mono}
              >
                send()
              </button>
            )}
          </div>

          {/* model + think controls */}
          <div className="max-w-3xl mx-auto flex items-center gap-2 mt-2">
            <div className="relative" ref={modelMenuRef}>
              <button
                type="button"
                onClick={() => setModelMenuOpen((o) => !o)}
                disabled={sending}
                aria-haspopup="menu"
                aria-expanded={modelMenuOpen}
                aria-label="Select model"
                className="flex items-center gap-1.5 text-xs text-black dark:text-white px-2.5 py-1.5 border border-[#111114]/15 dark:border-white/15 hover:border-[#2954E3] dark:hover:border-[#5B7FFF] rounded cursor-pointer transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                style={mono}
              >
                <Cpu size={12} />
                <span className="max-w-[220px] truncate">{displayedModel || "model"}</span>
                <ChevronUp
                  size={12}
                  className={`transition-transform duration-150 ${modelMenuOpen ? "" : "rotate-180"}`}
                />
              </button>

              {modelMenuOpen && (
                <div
                  role="menu"
                  className="absolute bottom-full left-0 mb-2 min-w-[220px] max-w-[320px] max-h-56 overflow-y-auto scrollbar-premium border border-[#111114]/15 dark:border-white/20 bg-white dark:bg-[#0A0A0A] shadow-lg"
                >
                  {availableModels.length === 0 && (
                    <p className="px-3 py-2 text-xs text-black dark:text-white" style={mono}>
                      no models found
                    </p>
                  )}
                  {availableModels.map((m) => (
                    <button
                      key={m}
                      type="button"
                      role="menuitem"
                      onClick={() => handleSelectModel(m)}
                      className={`w-full text-left px-3 py-2 text-xs truncate cursor-pointer transition-colors ${
                        displayedModel === m
                          ? "bg-[#2954E3]/10 dark:bg-[#5B7FFF]/15 text-black dark:text-white"
                          : "text-black dark:text-white hover:bg-[#111114]/5 dark:hover:bg-white/5"
                      }`}
                      style={mono}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleToggleThink}
              disabled={sending}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 border rounded cursor-pointer transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                thinkEnabled
                  ? "text-[#2954E3] dark:text-[#5B7FFF] border-[#2954E3]/40 dark:border-[#5B7FFF]/40 bg-[#2954E3]/5 dark:bg-[#5B7FFF]/10"
                  : "text-black dark:text-white border-[#111114]/15 dark:border-white/15 hover:border-[#111114]/40 dark:hover:border-white/40"
              }`}
              style={mono}
            >
              <Brain size={12} />
              {thinkEnabled ? "think" : "no_think"}
            </button>
          </div>
        </div>
      </main>

      {/* ---------- delete confirmation dialog ---------- */}
      {pendingDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 px-4"
          onClick={() => !deleting && setPendingDelete(null)}
        >
          <div
            className="w-full max-w-sm border border-[#111114]/15 dark:border-white/20 bg-white dark:bg-[#0A0A0A] shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-1.5 px-4 py-3 border-b border-[#111114]/10 dark:border-white/12">
              <span className="w-2.5 h-2.5 rounded-full bg-[#111114]/15 dark:bg-white/20" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#111114]/15 dark:bg-white/20" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#111114]/15 dark:bg-white/20" />
              <span className="ml-2 text-xs text-black dark:text-white" style={mono}>
                nino --confirm
              </span>
            </div>

            <div className="px-5 py-5">
              <p className="text-sm text-black dark:text-white mb-2" style={mono}>
                <span className="text-red-500">$</span> delete_session()
              </p>
              <p className="text-xs text-black dark:text-white leading-relaxed" style={mono}>
                Delete &ldquo;{pendingDelete.title ?? "untitled"}&rdquo;? This can&apos;t be undone.
              </p>
            </div>

            <div className="flex justify-end gap-2 px-5 pb-5">
              <button
                onClick={() => setPendingDelete(null)}
                disabled={deleting}
                className="text-xs text-black dark:text-white hover:text-black dark:hover:text-white px-3.5 py-2 border border-[#111114]/15 dark:border-white/15 hover:border-[#111114]/40 dark:hover:border-white/40 transition-colors duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                style={mono}
              >
                cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="text-xs text-white px-3.5 py-2 bg-red-600 hover:bg-red-700 transition-colors duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-wait"
                style={mono}
              >
                {deleting ? "deleting..." : "delete()"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;

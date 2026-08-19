"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, LogOut, PanelLeft, Cpu, Brain, ChevronUp, ChevronDown, Square, Pencil, ImagePlus, X, Copy, Check, RotateCw } from "lucide-react";
import {
  ACTIVE_CONVERSATION_KEY,
  api,
  tokenStore,
  type ChatStreamEvent,
  type ConversationResponse,
  type MessageResponse,
  type UserResponse,
} from "../lib/api";
import { Markdown } from "../components/Markdown";
import { useServerStatus } from "../lib/serverStatus";

const mono = { fontFamily: "'JetBrains Mono', ui-monospace, monospace" } as const;

const HomePage = () => {
  const router = useRouter();
  const serverStatus = useServerStatus();

  const [user, setUser] = useState<UserResponse | null>(null);
  const [conversations, setConversations] = useState<ConversationResponse[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageResponse[]>([]);
  const [input, setInput] = useState("");
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [sending, setSending] = useState(false);
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const [thinkingText, setThinkingText] = useState<string | null>(null);
  const [liveThinkExpanded, setLiveThinkExpanded] = useState(false);
  const [expandedThinking, setExpandedThinking] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [pendingDelete, setPendingDelete] = useState<ConversationResponse | null>(null);
  const [offlineDialogOpen, setOfflineDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingMessageContent, setEditingMessageContent] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // per-conversation model / think settings
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

  // deltas land here first, get flushed into state in batches instead of every SSE token
  const pendingReplyRef = useRef("");
  const pendingThinkingRef = useRef("");
  const streamRafRef = useRef<number | null>(null);

  // grabbed before the session-recovery effect below can clear it on mount
  const savedConversationIdRef = useRef<string | null>(
    typeof window === "undefined" ? null : sessionStorage.getItem(ACTIVE_CONVERSATION_KEY)
  );

  // require auth, load user + sessions
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
        // restore whatever session was open before navigating away
        const savedId = savedConversationIdRef.current;
        if (savedId && convos.items.some((c) => c.id === savedId)) {
          setActiveId(savedId);
        }
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
        // model list is best-effort, backend has its own fallback default
      }
    })();
  }, [router]);

  useEffect(() => {
    if (activeId) sessionStorage.setItem(ACTIVE_CONVERSATION_KEY, activeId);
    else sessionStorage.removeItem(ACTIVE_CONVERSATION_KEY);
  }, [activeId]);

  const jumpToBottomRef = useRef(false);
  // set right before setActiveId() when handleSend just made a new conversation,
  // so the effect below doesn't re-fetch and stomp on the messages it's already streaming in
  const skipNextLoadRef = useRef(false);

  useEffect(() => {
    setModelMenuOpen(false);
    if (!activeId) {
      setMessages([]);
      setSelectedModel(null);
      setThinkEnabled(false);
      return;
    }
    if (skipNextLoadRef.current) {
      // this came from handleSend, not the user switching sessions - it already owns state here
      skipNextLoadRef.current = false;
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
    // opening/switching a session jumps straight to the bottom, only live messages smooth-scroll
    const behavior = jumpToBottomRef.current ? "auto" : "smooth";
    jumpToBottomRef.current = false;
    bottomRef.current?.scrollIntoView({ behavior, block: "nearest" });
  }, [messages, sending, streamingText, thinkingText]);

  useEffect(() => {
    if (!liveThinkExpanded || !thinkingScrollRef.current) return;
    thinkingScrollRef.current.scrollTop = thinkingScrollRef.current.scrollHeight;
  }, [thinkingText, liveThinkExpanded]);

  // grow the textarea to fit its content
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [input]);

  useEffect(() => {
    if (!pendingDelete) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !deleting) setPendingDelete(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pendingDelete, deleting]);

  useEffect(() => {
    if (!offlineDialogOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOfflineDialogOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [offlineDialogOpen]);

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

  // pulls the real messages back from the server after a failed regenerate/edit,
  // since nothing actually got deleted server-side if the request failed
  const syncMessagesFromServer = async (conversationId: string) => {
    try {
      const detail = await api.getConversation(conversationId);
      setMessages(detail.messages);
    } catch {
      // best effort, just leave things as they are
    }
  };

  const refreshConversations = useCallback(async () => {
    const convos = await api.getConversations();
    setConversations(convos.items);
  }, []);

  // navbar logo dispatches this when clicked while already on this page
  useEffect(() => {
    const onNewChat = () => {
      setActiveId(null);
      setMessages([]);
      setError(null);
      inputRef.current?.focus();
    };
    window.addEventListener("ninox:new-chat", onNewChat);
    return () => window.removeEventListener("ninox:new-chat", onNewChat);
  }, []);

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

  const handleImagesSelected = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => setPendingImages((prev) => [...prev, reader.result as string]);
      reader.readAsDataURL(file);
    });
  };

  const removePendingImage = (index: number) => {
    setPendingImages((prev) => prev.filter((_, i) => i !== index));
  };

  // drives an SSE stream (send/regenerate/edit all use this) - batches chunks into
  // streamingText/thinkingText, appends the final message, handles abort/error
  const runStream = async (
    startFetch: (onEvent: (event: ChatStreamEvent) => void, signal: AbortSignal) => Promise<void>,
    onUserEvent?: (msg: MessageResponse) => void
  ): Promise<{ status: "ok" | "aborted" | "threw"; error: string | null }> => {
    const controller = new AbortController();
    abortControllerRef.current = controller;
    let partialReply = "";
    let partialThinking = "";
    let assistantFinalized = false;

    try {
      let streamFailed: string | null = null;

      // flushing every animation frame makes react-markdown re-parse way too often,
      // so cap it a bit - still scheduled via rAF, just skips some frames
      const MIN_FLUSH_INTERVAL_MS = 48;
      let lastFlushAt = 0;

      const flushPending = () => {
        const now = performance.now();
        if (now - lastFlushAt < MIN_FLUSH_INTERVAL_MS) {
          streamRafRef.current = requestAnimationFrame(flushPending);
          return;
        }
        streamRafRef.current = null;
        lastFlushAt = now;
        if (pendingReplyRef.current) {
          const chunk = pendingReplyRef.current;
          pendingReplyRef.current = "";
          setStreamingText((prev) => (prev ?? "") + chunk);
        }
        if (pendingThinkingRef.current) {
          const chunk = pendingThinkingRef.current;
          pendingThinkingRef.current = "";
          setThinkingText((prev) => (prev ?? "") + chunk);
        }
      };

      const scheduleFlush = () => {
        if (streamRafRef.current === null) {
          streamRafRef.current = requestAnimationFrame(flushPending);
        }
      };

      const cancelPendingFlush = () => {
        if (streamRafRef.current !== null) {
          cancelAnimationFrame(streamRafRef.current);
          streamRafRef.current = null;
        }
        pendingReplyRef.current = "";
        pendingThinkingRef.current = "";
      };

      await startFetch((event) => {
        switch (event.type) {
          case "user":
            if (event.message) onUserEvent?.(event.message);
            break;
          case "thinking":
            partialThinking += event.delta ?? "";
            pendingThinkingRef.current += event.delta ?? "";
            scheduleFlush();
            break;
          case "delta":
            partialReply += event.delta ?? "";
            pendingReplyRef.current += event.delta ?? "";
            scheduleFlush();
            break;
          case "assistant":
            assistantFinalized = true;
            cancelPendingFlush();
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
      }, controller.signal);

      return { status: "ok", error: streamFailed };
    } catch (e) {
      const wasStopped = e instanceof Error && e.name === "AbortError";
      if (wasStopped) {
        // user hit stop() - keep whatever was generated as the final reply,
        // backend saves the same partial content on its end
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
        return { status: "aborted", error: null };
      }
      return { status: "threw", error: e instanceof Error ? e.message : "Something went wrong." };
    } finally {
      if (streamRafRef.current !== null) {
        cancelAnimationFrame(streamRafRef.current);
        streamRafRef.current = null;
      }
      pendingReplyRef.current = "";
      pendingThinkingRef.current = "";
      setStreamingText(null);
      setThinkingText(null);
      setSending(false);
      abortControllerRef.current = null;
      inputRef.current?.focus();
    }
  };

  // blocks a send/regen/edit if we already know the model host is offline
  // ("checking" is let through, better to try and fail than block on a guess)
  const guardOnline = () => {
    if (serverStatus === "offline") {
      setOfflineDialogOpen(true);
      return false;
    }
    return true;
  };

  const handleSend = async () => {
    const content = input.trim();
    const images = pendingImages;
    if ((!content && images.length === 0) || sending) return;
    if (!guardOnline()) return;

    setSending(true);
    setError(null);
    setInput("");
    setPendingImages([]);
    setThinkingText(null);
    setLiveThinkExpanded(false);

    // optimistic user message
    const optimistic: MessageResponse = {
      id: `local-${Date.now()}`,
      role: "User",
      content,
      createdAt: new Date().toISOString(),
      images: images.length > 0 ? images : undefined,
    };
    setMessages((prev) => [...prev, optimistic]);

    let conversationId = activeId;
    if (!conversationId) {
      try {
        const created = await api.createConversation(null, selectedModel, thinkEnabled);
        conversationId = created.id;
        setSelectedModel(created.model);
        setThinkEnabled(created.think);
        skipNextLoadRef.current = true; // don't let the switch-session effect reload over us
        setActiveId(created.id);
      } catch (e) {
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
        setInput(content);
        setError(e instanceof Error ? e.message : "Failed to send message.");
        setSending(false);
        return;
      }
    }

    const result = await runStream(
      (onEvent, signal) =>
        api.streamMessage(conversationId!, content, images.length > 0 ? images : undefined, onEvent, signal),
      (serverUserMsg) =>
        setMessages((prev) => [...prev.filter((m) => m.id !== optimistic.id), serverUserMsg])
    );

    if (result.status === "threw") {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setInput(content); // give it back so nothing's lost
      setPendingImages(images);
      setError(result.error);
      return;
    }

    if (result.status === "ok" && result.error) {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setInput(content);
      setPendingImages(images);
      setError(result.error);
    }

    await refreshConversations();
  };

  const handleStop = () => {
    abortControllerRef.current?.abort();
  };

  const handleCopy = async (id: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to copy.");
    }
  };

  const handleRegenerate = async (assistantMessageId: string) => {
    if (!activeId || sending) return;
    if (!guardOnline()) return;

    setSending(true);
    setError(null);
    setThinkingText(null);
    setLiveThinkExpanded(false);
    setMessages((prev) => {
      const idx = prev.findIndex((m) => m.id === assistantMessageId);
      return idx === -1 ? prev : prev.slice(0, idx);
    });

    const result = await runStream((onEvent, signal) =>
      api.regenerateMessage(activeId, assistantMessageId, onEvent, signal)
    );

    if (result.status !== "aborted" && result.error) {
      setError(result.error);
      // nothing was actually deleted server-side on failure, so pull it back
      await syncMessagesFromServer(activeId);
    }
    if (result.status !== "threw") await refreshConversations();
  };

  const startEditMessage = (m: MessageResponse) => {
    if (sending) return;
    setEditingMessageId(m.id);
    setEditingMessageContent(m.content);
  };

  const cancelEditMessage = () => setEditingMessageId(null);

  const handleEditAndResend = async (m: MessageResponse) => {
    if (!activeId || sending) return;
    const content = editingMessageContent.trim();
    if (!content && (!m.images || m.images.length === 0)) return;
    if (!guardOnline()) return;

    setEditingMessageId(null);
    setSending(true);
    setError(null);
    setThinkingText(null);
    setLiveThinkExpanded(false);
    setMessages((prev) => {
      const idx = prev.findIndex((x) => x.id === m.id);
      return idx === -1 ? prev : prev.slice(0, idx);
    });

    const result = await runStream(
      (onEvent, signal) =>
        api.editMessage(activeId, m.id, content, m.images ?? undefined, onEvent, signal),
      (updatedMsg) => setMessages((prev) => [...prev, updatedMsg])
    );

    if (result.status !== "aborted" && result.error) {
      setError(result.error);
      // same deal as regenerate, the edit never got committed
      await syncMessagesFromServer(activeId);
    }
    if (result.status !== "threw") await refreshConversations();
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

  const startRename = (c: ConversationResponse, e: React.MouseEvent) => {
    e.stopPropagation();
    if (sending) return; // don't rename mid-generation, mirrors requestDelete
    setEditingId(c.id);
    setEditingTitle(c.title ?? "");
  };

  const commitRename = async (id: string) => {
    const title = editingTitle.trim();
    setEditingId(null);
    if (!title) return; // empty -> no-op, keep the existing title
    try {
      await api.renameConversation(id, title);
      await refreshConversations();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to rename session.");
    }
  };

  const cancelRename = () => setEditingId(null);

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
      {/* sidebar: sessions */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-0"
        } shrink-0 min-h-0 overflow-hidden border-r border-[#111114]/10 dark:border-white/10 flex flex-col transition-[width] duration-200 bg-white dark:bg-[#000000]`}
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
          {conversations.map((c) =>
            editingId === c.id ? (
              <div
                key={c.id}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm border-l-2 border-[#2954E3] dark:border-[#5B7FFF]"
                style={mono}
              >
                <input
                  autoFocus
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitRename(c.id);
                    else if (e.key === "Escape") cancelRename();
                  }}
                  onBlur={() => commitRename(c.id)}
                  className="w-full bg-transparent outline-none border-b border-[#2954E3] dark:border-[#5B7FFF] text-black dark:text-white"
                />
              </div>
            ) : (
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
                <span className="flex items-center gap-1.5 shrink-0">
                  <Pencil
                    size={13}
                    className="opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:text-[#2954E3] dark:hover:text-[#5B7FFF] transition-opacity"
                    onClick={(e) => startRename(c, e)}
                  />
                  <Trash2
                    size={14}
                    className="opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:text-red-500 transition-opacity"
                    onClick={(e) => requestDelete(c, e)}
                  />
                </span>
              </button>
            )
          )}
        </div>

        
      </aside>

      {/* main chat area */}
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
                /* user message */
                <div key={m.id} className="group flex justify-end">
                  <div className="max-w-[85%]">
                    <p
                      className="text-[10px] text-right mb-1 text-[#2954E3] dark:text-[#5B7FFF]"
                      style={mono}
                    >
                      {username} $
                    </p>
                    {m.images && m.images.length > 0 && (
                      <div className="flex flex-wrap justify-end gap-2 mb-2">
                        {m.images.map((img, i) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={i}
                            src={img}
                            alt=""
                            className="h-28 w-28 object-cover border border-[#2954E3]/30 dark:border-[#5B7FFF]/30"
                          />
                        ))}
                      </div>
                    )}
                    {editingMessageId === m.id ? (
                      <div className="flex flex-col items-end gap-1.5">
                        <textarea
                          autoFocus
                          rows={3}
                          value={editingMessageContent}
                          onChange={(e) => setEditingMessageContent(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleEditAndResend(m);
                            } else if (e.key === "Escape") {
                              cancelEditMessage();
                            }
                          }}
                          className="w-full min-w-[16rem] resize-none text-sm leading-relaxed text-black dark:text-white px-3.5 py-2.5 bg-[#2954E3]/8 dark:bg-[#5B7FFF]/12 border border-[#2954E3]/40 dark:border-[#5B7FFF]/40 outline-none"
                          style={mono}
                        />
                        <div className="flex items-center gap-3">
                          <button
                            onClick={cancelEditMessage}
                            className="text-xs text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white cursor-pointer transition-colors"
                            style={mono}
                          >
                            cancel
                          </button>
                          <button
                            onClick={() => handleEditAndResend(m)}
                            className="text-xs text-white dark:text-black px-3 py-1 bg-black dark:bg-white hover:bg-[#2954E3] dark:hover:bg-[#5B7FFF] cursor-pointer transition-colors"
                            style={mono}
                          >
                            save &amp; resend
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {m.content && (
                          <div
                            className="text-sm leading-relaxed text-black dark:text-white whitespace-pre-wrap px-3.5 py-2.5 bg-[#2954E3]/8 dark:bg-[#5B7FFF]/12 border border-[#2954E3]/30 dark:border-[#5B7FFF]/30"
                            style={mono}
                          >
                            {m.content}
                          </div>
                        )}
                        <div className="flex items-center justify-end gap-2.5 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => startEditMessage(m)}
                            disabled={sending}
                            aria-label="Edit message"
                            className="text-black/50 dark:text-white/50 hover:text-[#2954E3] dark:hover:text-[#5B7FFF] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            onClick={() => handleCopy(m.id, m.content)}
                            aria-label="Copy message"
                            className="text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white cursor-pointer transition-colors"
                          >
                            {copiedId === m.id ? <Check size={12} /> : <Copy size={12} />}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                /* assistant message */
                <div key={m.id} className="group flex justify-start">
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
                            className="mt-1.5 text-xs leading-relaxed text-black/60 dark:text-white/60 pl-3 border-l-2 border-[#111114]/15 dark:border-white/15 max-h-56 overflow-y-auto scrollbar-premium"
                            style={mono}
                          >
                            <Markdown>{m.thinking}</Markdown>
                          </div>
                        )}
                      </div>
                    )}
                    <p className="text-[10px] mb-1 text-black dark:text-white" style={mono}>
                      ninoX &gt;
                    </p>
                    <div
                      className="text-sm leading-relaxed text-black dark:text-white pl-3 border-l-2 border-[#111114]/20 dark:border-white/20"
                      style={mono}
                    >
                      <Markdown>{m.content}</Markdown>
                    </div>
                    <div className="flex items-center gap-2.5 mt-1.5 pl-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleCopy(m.id, m.content)}
                        aria-label="Copy reply"
                        className="text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white cursor-pointer transition-colors"
                      >
                        {copiedId === m.id ? <Check size={12} /> : <Copy size={12} />}
                      </button>
                      {!m.id.startsWith("local-") && (
                        <button
                          onClick={() => handleRegenerate(m.id)}
                          disabled={sending}
                          aria-label="Regenerate reply"
                          className="text-black/50 dark:text-white/50 hover:text-[#2954E3] dark:hover:text-[#5B7FFF] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                        >
                          <RotateCw size={12} />
                        </button>
                      )}
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
                      className="mt-1.5 text-xs leading-relaxed text-black/60 dark:text-white/60 pl-3 border-l-2 border-[#111114]/15 dark:border-white/15 max-h-56 overflow-y-auto scrollbar-premium"
                      style={mono}
                    >
                      <Markdown>{thinkingText}</Markdown>
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
                    className="text-sm leading-relaxed text-black dark:text-white pl-3 border-l-2 border-[#2954E3] dark:border-[#5B7FFF]"
                    style={mono}
                  >
                    <Markdown>{streamingText}</Markdown>
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
          {pendingImages.length > 0 && (
            <div className="max-w-3xl mx-auto flex flex-wrap gap-2 mb-2">
              {pendingImages.map((img, i) => (
                <div key={i} className="relative group/thumb">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img}
                    alt=""
                    className="h-14 w-14 object-cover border border-[#111114]/15 dark:border-white/15"
                  />
                  <button
                    type="button"
                    onClick={() => removePendingImage(i)}
                    aria-label="Remove image"
                    className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-4 h-4 rounded-full bg-black dark:bg-white text-white dark:text-black opacity-0 group-hover/thumb:opacity-100 transition-opacity cursor-pointer"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}
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
              className="w-full max-h-40 resize-none overflow-y-auto bg-transparent px-2 py-2.5 text-sm text-black dark:text-white placeholder:text-black/40 dark:placeholder:text-white/40 outline-none disabled:opacity-50 scrollbar-premium"
              style={mono}
            />
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                handleImagesSelected(e.target.files);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              disabled={sending}
              aria-label="Attach image"
              className="m-1.5 text-black/60 dark:text-white/60 hover:text-[#2954E3] dark:hover:text-[#5B7FFF] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              <ImagePlus size={16} />
            </button>
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
                disabled={!input.trim() && pendingImages.length === 0}
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

      {/* delete confirmation dialog */}
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

      {/* offline notice dialog */}
      {offlineDialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 px-4"
          onClick={() => setOfflineDialogOpen(false)}
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
                nino --offline
              </span>
            </div>

            <div className="px-5 py-5">
              <p className="text-sm text-black dark:text-white mb-2" style={mono}>
                <span className="text-red-500">$</span> model_host_unreachable()
              </p>
              <p className="text-xs text-black dark:text-white leading-relaxed" style={mono}>
                The AI model is offline right now — the machine it runs on isn&apos;t reachable.
                Try again once it&apos;s back online.
              </p>
            </div>

            <div className="flex justify-end gap-2 px-5 pb-5">
              <button
                onClick={() => setOfflineDialogOpen(false)}
                className="text-xs text-white dark:text-black px-3.5 py-2 bg-black dark:bg-white hover:bg-[#2954E3] dark:hover:bg-[#5B7FFF] transition-colors duration-200 cursor-pointer"
                style={mono}
              >
                ok
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;

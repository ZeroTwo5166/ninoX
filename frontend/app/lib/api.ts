// Client for the ninoX backend API.
// Set NEXT_PUBLIC_API_URL in .env.local to override (defaults to the http dev port).

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5068";

// ---------- Types (mirror backend DTOs) ----------

export interface UserResponse {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  emailVerified: boolean;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
  user: UserResponse;
}

export interface ConversationResponse {
  id: string;
  title: string | null;
  model: string;
  think: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ModelsResponse {
  models: string[];
  defaultModel: string;
}

export interface MessageResponse {
  id: string;
  role: "User" | "Assistant" | "System";
  content: string;
  thinking?: string | null;
  createdAt: string;
}

export interface ConversationDetailResponse extends ConversationResponse {
  messages: MessageResponse[];
}

export interface PagedResult<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

// ---------- Token storage ----------

export const ACTIVE_CONVERSATION_KEY = "nino:activeConversationId";

export const tokenStore = {
  get access() {
    return typeof window === "undefined" ? null : localStorage.getItem("accessToken");
  },
  get refresh() {
    return typeof window === "undefined" ? null : localStorage.getItem("refreshToken");
  },
  get user(): UserResponse | null {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem("authUser");
    if (!raw) return null;
    try {
      return JSON.parse(raw) as UserResponse;
    } catch {
      return null;
    }
  },
  set(auth: AuthResponse) {
    localStorage.setItem("accessToken", auth.accessToken);
    localStorage.setItem("refreshToken", auth.refreshToken);
    localStorage.setItem("authUser", JSON.stringify(auth.user));
  },
  clear() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("authUser");
    sessionStorage.removeItem(ACTIVE_CONVERSATION_KEY);
  },
};

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// ---------- Core request helper (auto-refresh on 401) ----------

async function request<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  };

  const token = tokenStore.access;
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });

  if (res.status === 401 && retry && tokenStore.refresh) {
    const refreshed = await tryRefresh();
    if (refreshed) return request<T>(path, init, false);
    tokenStore.clear();
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

async function tryRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: tokenStore.refresh }),
    });
    if (!res.ok) return false;
    tokenStore.set((await res.json()) as AuthResponse);
    return true;
  } catch {
    return false;
  }
}

// ---------- API surface ----------

export const api = {
  // auth
  login: (email: string, password: string) =>
    request<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  register: (data: {
    firstName: string;
    lastName: string;
    dateOfBirth: string; // "YYYY-MM-DD"
    email: string;
    password: string;
    confirmPassword: string;
  }) => request<AuthResponse>("/api/auth/register", { method: "POST", body: JSON.stringify(data) }),

  logout: async () => {
    const refreshToken = tokenStore.refresh;
    if (refreshToken) {
      try {
        await request<void>("/api/auth/revoke", {
          method: "POST",
          body: JSON.stringify({ refreshToken }),
        });
      } catch {
        /* revoking a dead token is fine */
      }
    }
    tokenStore.clear();
  },

  changePassword: (currentPassword: string, newPassword: string, confirmNewPassword: string) =>
    request<{ message: string }>("/api/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword, confirmNewPassword }),
    }),

  // users
  getMe: () => request<UserResponse>("/api/users/me"),

  // models
  getModels: () => request<ModelsResponse>("/api/models"),

  // conversations
  getConversations: (pageNumber = 1, pageSize = 50) =>
    request<PagedResult<ConversationResponse>>(
      `/api/conversations?pageNumber=${pageNumber}&pageSize=${pageSize}`
    ),

  createConversation: (title: string | null = null, model: string | null = null, think: boolean | null = null) =>
    request<ConversationResponse>("/api/conversations", {
      method: "POST",
      body: JSON.stringify({ title, model, think }),
    }),

  getConversation: (id: string) => request<ConversationDetailResponse>(`/api/conversations/${id}`),

  renameConversation: (id: string, title: string) =>
    request<ConversationResponse>(`/api/conversations/${id}`, {
      method: "PUT",
      body: JSON.stringify({ title }),
    }),

  updateConversationSettings: (id: string, settings: { model?: string; think?: boolean }) =>
    request<ConversationResponse>(`/api/conversations/${id}/settings`, {
      method: "PATCH",
      body: JSON.stringify(settings),
    }),

  deleteConversation: (id: string) =>
    request<void>(`/api/conversations/${id}`, { method: "DELETE" }),

  // messages
  sendMessage: (conversationId: string, content: string) =>
    request<MessageResponse[]>(`/api/conversations/${conversationId}/messages`, {
      method: "POST",
      body: JSON.stringify({ content }),
    }),

  /**
   * Streaming send: emits ChatStreamEvents as the assistant reply is generated.
   * Resolves when the stream completes.
   */
  streamMessage: async (
    conversationId: string,
    content: string,
    onEvent: (event: ChatStreamEvent) => void,
    signal?: AbortSignal
  ): Promise<void> => {
    const doFetch = () =>
      fetch(`${API_BASE}/api/conversations/${conversationId}/messages/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(tokenStore.access ? { Authorization: `Bearer ${tokenStore.access}` } : {}),
        },
        body: JSON.stringify({ content }),
        signal,
      });

    let res = await doFetch();
    if (res.status === 401 && tokenStore.refresh) {
      if (await tryRefresh()) res = await doFetch();
      else tokenStore.clear();
    }

    if (!res.ok || !res.body) {
      throw new ApiError(res.status, `Stream request failed (${res.status})`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // SSE frames are separated by a blank line
      const frames = buffer.split("\n\n");
      buffer = frames.pop() ?? "";

      for (const frame of frames) {
        const line = frame.trim();
        if (!line.startsWith("data: ")) continue;
        try {
          onEvent(JSON.parse(line.slice(6)) as ChatStreamEvent);
        } catch {
          /* ignore malformed frame */
        }
      }
    }
  },
};

export interface ChatStreamEvent {
  type: "user" | "thinking" | "delta" | "assistant" | "error";
  delta?: string | null;
  message?: MessageResponse | null;
  error?: string | null;
}

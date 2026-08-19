"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { api } from "./api";

export type ServerStatus = "checking" | "online" | "offline";

const POLL_INTERVAL_MS = 20_000;
const FETCH_TIMEOUT_MS = 5_000;

const ServerStatusContext = createContext<ServerStatus>("checking");

// polls /api/health (which pings ollama), shared here so the navbar
// badge and the chat page don't each run their own poller
export function ServerStatusProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<ServerStatus>("checking");

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      try {
        const result = await api.getHealth(controller.signal);
        if (!cancelled) setStatus(result.online ? "online" : "offline");
      } catch {
        if (!cancelled) setStatus("offline");
      } finally {
        clearTimeout(timeout);
      }
    };

    check();
    const id = setInterval(check, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return <ServerStatusContext.Provider value={status}>{children}</ServerStatusContext.Provider>;
}

export const useServerStatus = () => useContext(ServerStatusContext);

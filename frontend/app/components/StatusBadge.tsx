"use client";

import { useServerStatus } from "../lib/serverStatus";

const mono = { fontFamily: "'JetBrains Mono', ui-monospace, monospace" } as const;

export const StatusBadge = () => {
  const status = useServerStatus();

  const dotColor =
    status === "online"
      ? "bg-emerald-500"
      : status === "offline"
      ? "bg-red-500"
      : "bg-black/30 dark:bg-white/30";

  return (
    <div
      className="hidden sm:flex items-center gap-1.5 text-xs text-black/70 dark:text-white/70 px-2.5 py-1.5 rounded border border-[#111114]/15 dark:border-white/15 select-none"
      style={mono}
      title={
        status === "checking"
          ? "checking model host status..."
          : status === "online"
          ? "model host is reachable"
          : "model host is unreachable — the owner's PC may be offline"
      }
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${dotColor} ${
          status === "online" ? "animate-pulse motion-reduce:animate-none" : ""
        }`}
      />
      {status === "checking" ? "checking" : status}
    </div>
  );
};

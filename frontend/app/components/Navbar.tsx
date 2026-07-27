"use client";

import { useEffect, useRef, useState } from "react";
import { Sun, Moon, Settings, LogOut } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { api, tokenStore, type UserResponse } from "../lib/api";

const mono = { fontFamily: "'JetBrains Mono', ui-monospace, monospace" } as const;

const getInitials = (user: UserResponse) =>
  `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase();

export const Navbar = () => {
  const router = useRouter();
  const pathname = usePathname();

  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [user, setUser] = useState<UserResponse | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem("theme") as "light" | "dark" | null;
    const initial =
      stored ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setTheme(initial);
    document.documentElement.classList.toggle("dark", initial === "dark");
  }, []);

  // Re-check on every route change: client-side navigation (login/logout)
  // doesn't remount the Navbar, so this is what keeps it in sync.
  useEffect(() => {
    setUser(tokenStore.access ? tokenStore.user : null);
    setMenuOpen(false);
  }, [pathname]);

  // close the dropdown on an outside click or Escape
  useEffect(() => {
    if (!menuOpen) return;

    const onPointerDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    localStorage.setItem("theme", next);
  };

  const handleLogoClick = () => {
    if (user) {
      // Home page is already mounted if we're on it (client-side nav to the
      // same route doesn't remount it), so tell it to reset to the "new
      // chat" state itself rather than relying on a fresh mount.
      window.dispatchEvent(new Event("ninox:new-chat"));
      router.push("/home");
    } else {
      router.push("/");
    }
  };

  const handleLogout = async () => {
    setMenuOpen(false);
    await api.logout();
    setUser(null);
    router.replace("/");
  };

  return (
    <nav className="sticky top-0 z-50 w-full h-16 sm:h-20 flex items-center justify-between px-4 sm:px-6 lg:px-8 bg-[#FDFDFC] dark:bg-[#000000] border-b border-[#111114]/10 dark:border-white/10 transition-colors duration-300">
      {/* Logo */}
      <button
        onClick={handleLogoClick}
        className="group flex items-center select-none cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2954E3] rounded"
      >
        <span
          className="text-lg sm:text-xl text-black dark:text-white tracking-tight"
          style={{ ...mono, fontWeight: 500 }}
        >
          nino
        </span>
        <span
          className="inline-flex items-center justify-center ml-[1px] w-[22px] h-[22px] sm:w-6 sm:h-6 bg-[#2954E3] dark:bg-[#5B7FFF] text-white dark:text-black text-sm sm:text-base animate-pulse motion-reduce:animate-none group-hover:bg-black dark:group-hover:bg-white transition-colors duration-200"
          style={{ ...mono, fontWeight: 500 }}
        >
          X
        </span>
      </button>

      {/* Actions */}
      <div className="flex items-center gap-3 sm:gap-5">
        <button
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
          className="flex items-center gap-1.5 text-xs cursor-pointer sm:text-sm text-black dark:text-white hover:text-black dark:hover:text-white px-2.5 py-1.5 rounded border border-[#111114]/15 dark:border-white/15 hover:border-[#2954E3] dark:hover:border-[#5B7FFF] transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2954E3]"
          style={mono}
        >
          {theme === "light" ? (
            <>
              <Moon size={14} strokeWidth={2} />
              <span className="hidden sm:inline">--dark</span>
            </>
          ) : (
            <>
              <Sun size={14} strokeWidth={2} />
              <span className="hidden sm:inline">--light</span>
            </>
          )}
        </button>

        {user ? (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="Account menu"
              className="flex items-center justify-center w-9 h-9 rounded-full bg-[#2954E3] dark:bg-[#5B7FFF] text-white dark:text-black text-xs cursor-pointer hover:opacity-90 transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2954E3]"
              style={{ ...mono, fontWeight: 500 }}
            >
              {getInitials(user)}
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-56 border border-[#111114]/15 dark:border-white/20 bg-white dark:bg-[#0A0A0A] shadow-lg"
              >
                <div className="px-3.5 py-3 border-b border-[#111114]/10 dark:border-white/10">
                  <p className="text-sm text-black dark:text-white truncate" style={mono}>
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-xs text-black dark:text-white truncate mt-0.5" style={mono}>
                    {user.email}
                  </p>
                </div>

                <button
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    router.push("/settings");
                  }}
                  className="w-full flex items-center gap-2 px-3.5 py-2.5 text-xs text-left text-black dark:text-white hover:bg-[#111114]/5 dark:hover:bg-white/5 cursor-pointer transition-colors"
                  style={mono}
                >
                  <Settings size={13} />
                  settings
                </button>

                <button
                  role="menuitem"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3.5 py-2.5 text-xs text-left text-red-500 hover:bg-red-500/5 cursor-pointer transition-colors border-t border-[#111114]/10 dark:border-white/10"
                  style={mono}
                >
                  <LogOut size={13} />
                  log_out
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            <button
              className="text-sm sm:text-[15px] cursor-pointer text-black dark:text-white hover:text-black dark:hover:text-white px-3.5 sm:px-4 py-2 rounded border border-[#111114]/15 dark:border-white/15 hover:border-[#111114]/40 dark:hover:border-white/40 transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2954E3]"
              style={mono}
              onClick={() => router.push("/login")}
            >
              log_in
            </button>

            <button
              className="text-sm sm:text-[15px] cursor-pointer text-white dark:text-black px-4 sm:px-5 py-2 rounded bg-black dark:bg-white hover:bg-[#2954E3] dark:hover:bg-[#5B7FFF] transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black dark:focus-visible:outline-white"
              style={mono}
              onClick={() => router.push("/signup")}
            >
              sign_up()
            </button>
          </>
        )}
      </div>
    </nav>
  );
};

"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { useRouter } from "next/navigation";

export const Navbar = () => {
      const router = useRouter();

  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const stored = localStorage.getItem("theme") as "light" | "dark" | null;
    const initial =
      stored ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setTheme(initial);
    document.documentElement.classList.toggle("dark", initial === "dark");
  }, []);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    localStorage.setItem("theme", next);
  };

  return (
    <nav className="sticky top-0 z-50 w-full h-16 sm:h-20 flex items-center justify-between px-4 sm:px-6 lg:px-8 bg-[#FDFDFC] dark:bg-[#000000] border-b border-[#111114]/10 dark:border-white/10 transition-colors duration-300">
      {/* Logo */}
      <a
        href="/"
        className="group flex items-center select-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2954E3] rounded"
      >
        <span
          className="text-lg sm:text-xl text-black dark:text-white tracking-tight"
          style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontWeight: 500 }}
        >
          nino
        </span>
        <span
          className="inline-flex items-center justify-center ml-[1px] w-[22px] h-[22px] sm:w-6 sm:h-6 bg-[#2954E3] dark:bg-[#5B7FFF] text-white dark:text-black text-sm sm:text-base animate-pulse motion-reduce:animate-none group-hover:bg-black dark:group-hover:bg-white transition-colors duration-200"
          style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontWeight: 500 }}
        >
          X
        </span>
      </a>

      {/* Actions */}
      <div className="flex items-center gap-3 sm:gap-5">
  <button
    onClick={toggleTheme}
    aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
    className="flex items-center gap-1.5 text-xs cursor-pointer sm:text-sm text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white px-2.5 py-1.5 rounded border border-[#111114]/15 dark:border-white/15 hover:border-[#2954E3] dark:hover:border-[#5B7FFF] transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2954E3]"
    style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace" }}
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

  <button
    className="text-sm sm:text-[15px] cursor-pointer text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white px-3.5 sm:px-4 py-2 rounded border border-[#111114]/15 dark:border-white/15 hover:border-[#111114]/40 dark:hover:border-white/40 transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2954E3]"
    style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace" }}
    onClick={() => router.push("/login")}

  >
    log_in
  </button>

  <button
    className="text-sm sm:text-[15px] cursor-pointer text-white dark:text-black px-4 sm:px-5 py-2 rounded bg-black dark:bg-white hover:bg-[#2954E3] dark:hover:bg-[#5B7FFF] transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black dark:focus-visible:outline-white"
    style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace" }}
              onClick={() => router.push("/signup")}

  >
    sign_up()
  </button>
</div>
    </nav>
  );
};
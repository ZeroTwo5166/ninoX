"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "../lib/api";

const mono = { fontFamily: "'JetBrains Mono', ui-monospace, monospace" } as const;

const ForgotPasswordPage = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send reset email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] sm:min-h-[calc(100vh-5rem)] w-full flex items-center justify-center px-4 bg-[#FDFDFC] dark:bg-black transition-colors duration-300">
      <div className="w-full max-w-[420px]">
        <div className="border border-[#111114]/15 dark:border-white/20 bg-white dark:bg-[#0A0A0A] shadow-sm dark:shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
          <div className="flex items-center gap-1.5 px-4 py-3 border-b border-[#111114]/10 dark:border-white/12">
            <span className="w-2.5 h-2.5 rounded-full bg-[#111114]/15 dark:bg-white/20" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#111114]/15 dark:bg-white/20" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#111114]/15 dark:bg-white/20" />
            <span className="ml-2 text-xs text-black dark:text-white" style={mono}>
              nino --forgot-password
            </span>
          </div>

          {sent ? (
            <div className="px-6 py-7 sm:px-8 sm:py-8">
              <p className="text-sm text-black dark:text-white mb-4" style={mono}>
                <span className="text-[#2954E3] dark:text-[#5B7FFF]">$</span> forgot_password --email
              </p>
              <p className="text-sm text-green-600 dark:text-green-400 mb-6" style={mono}>
                if that email exists, a reset link is on its way. check your inbox.
              </p>
              <button
                onClick={() => router.push("/login")}
                className="w-full text-sm text-black dark:text-white px-4 py-2.5 border border-[#111114]/15 dark:border-white/20 hover:bg-[#111114]/5 dark:hover:bg-white/5 cursor-pointer transition-colors duration-200"
                style={mono}
              >
                back_to_login()
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="px-6 py-7 sm:px-8 sm:py-8">
              <p className="text-sm text-black dark:text-white mb-6" style={mono}>
                <span className="text-[#2954E3] dark:text-[#5B7FFF]">$</span> forgot_password --email
              </p>

              <div className="mb-5">
                <label htmlFor="email" className="block text-xs text-black dark:text-white mb-1.5" style={mono}>
                  email
                </label>
                <div className="flex items-center border border-[#111114]/15 dark:border-white/18 focus-within:border-[#2954E3] dark:focus-within:border-[#5B7FFF] transition-colors duration-200">
                  <span className="pl-3 text-black/50 dark:text-white/50 text-sm" style={mono}>
                    &gt;
                  </span>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@domain.com"
                    disabled={loading}
                    className="w-full bg-transparent px-2 py-2.5 text-sm text-black dark:text-white placeholder:text-black/50 dark:placeholder:text-white/50 outline-none disabled:opacity-50"
                    style={mono}
                  />
                </div>
              </div>

              {error && (
                <p className="text-xs text-red-500 mb-4" style={mono}>
                  error: {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full disabled:opacity-50 disabled:cursor-wait text-sm text-white dark:text-black px-4 py-2.5 bg-black dark:bg-white cursor-pointer hover:bg-[#2954E3] dark:hover:bg-[#5B7FFF] transition-colors duration-200"
                style={mono}
              >
                {loading ? "sending..." : "send_reset_link()"}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-black dark:text-white mt-6" style={mono}>
          remembered it?{" "}
          <button onClick={() => router.push("/login")} className="text-[#2954E3] dark:text-[#5B7FFF] hover:underline cursor-pointer">
            login()
          </button>
        </p>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;

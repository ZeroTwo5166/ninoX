"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "../lib/api";

const mono = { fontFamily: "'JetBrains Mono', ui-monospace, monospace" } as const;

const ResetPasswordContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("Missing reset token.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setLoading(true);
    try {
      await api.resetPassword(token, newPassword, confirmNewPassword);
      setSuccess(true);
      setTimeout(() => router.replace("/login"), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password.");
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
              nino --reset-password
            </span>
          </div>

          <div className="px-6 py-7 sm:px-8 sm:py-8">
            <p className="text-sm text-black dark:text-white mb-6" style={mono}>
              <span className="text-[#2954E3] dark:text-[#5B7FFF]">$</span> reset_password --token
            </p>

            {!token ? (
              <p className="text-sm text-red-500" style={mono}>
                error: missing reset token. use the link from your email.
              </p>
            ) : success ? (
              <p className="text-sm text-green-600 dark:text-green-400" style={mono}>
                password reset. redirecting to login...
              </p>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="block text-xs text-black dark:text-white mb-1.5" style={mono}>
                    new_password
                  </label>
                  <div className="flex items-center border border-[#111114]/15 dark:border-white/18 focus-within:border-[#2954E3] dark:focus-within:border-[#5B7FFF] transition-colors duration-200">
                    <span className="pl-3 text-black dark:text-white text-sm" style={mono}>
                      &gt;
                    </span>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="********"
                      disabled={loading}
                      className="w-full bg-transparent px-2 py-2.5 text-sm text-black dark:text-white placeholder:text-black/50 dark:placeholder:text-white/50 outline-none disabled:opacity-50"
                      style={mono}
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-xs text-black dark:text-white mb-1.5" style={mono}>
                    confirm_new_password
                  </label>
                  <div className="flex items-center border border-[#111114]/15 dark:border-white/18 focus-within:border-[#2954E3] dark:focus-within:border-[#5B7FFF] transition-colors duration-200">
                    <span className="pl-3 text-black dark:text-white text-sm" style={mono}>
                      &gt;
                    </span>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="********"
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
                  {loading ? "resetting..." : "reset_password()"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const ResetPasswordPage = () => (
  <Suspense fallback={null}>
    <ResetPasswordContent />
  </Suspense>
);

export default ResetPasswordPage;

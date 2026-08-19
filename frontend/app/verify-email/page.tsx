"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, tokenStore } from "../lib/api";

const mono = { fontFamily: "'JetBrains Mono', ui-monospace, monospace" } as const;

type Status = "verifying" | "success" | "error";

const VerifyEmailContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [asyncStatus, setAsyncStatus] = useState<"verifying" | "success" | "error" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return; // rendered as an error below without needing effect-driven state
    (async () => {
      try {
        await api.verifyEmail(token);
        setAsyncStatus("success");
      } catch (err) {
        setAsyncStatus("error");
        setError(err instanceof Error ? err.message : "Verification failed.");
      }
    })();
  }, [token]);

  const status: Status = !token ? "error" : (asyncStatus ?? "verifying");

  return (
    <div className="min-h-[calc(100vh-4rem)] sm:min-h-[calc(100vh-5rem)] w-full flex items-center justify-center px-4 bg-[#FDFDFC] dark:bg-black transition-colors duration-300">
      <div className="w-full max-w-[420px]">
        <div className="border border-[#111114]/15 dark:border-white/20 bg-white dark:bg-[#0A0A0A] shadow-sm dark:shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
          <div className="flex items-center gap-1.5 px-4 py-3 border-b border-[#111114]/10 dark:border-white/12">
            <span className="w-2.5 h-2.5 rounded-full bg-[#111114]/15 dark:bg-white/20" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#111114]/15 dark:bg-white/20" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#111114]/15 dark:bg-white/20" />
            <span className="ml-2 text-xs text-black dark:text-white" style={mono}>
              nino --verify
            </span>
          </div>

          <div className="px-6 py-7 sm:px-8 sm:py-8">
            <p className="text-sm text-black dark:text-white mb-6" style={mono}>
              <span className="text-[#2954E3] dark:text-[#5B7FFF]">$</span> verify_email --token
            </p>

            {status === "verifying" && (
              <p className="text-sm text-black dark:text-white" style={mono}>
                verifying<span className="animate-pulse">_</span>
              </p>
            )}

            {status === "success" && (
              <>
                <p className="text-sm text-green-600 dark:text-green-400 mb-6" style={mono}>
                  email verified. your account is now fully active.
                </p>
                <button
                  onClick={() => router.push(tokenStore.access ? "/home" : "/login")}
                  className="w-full text-sm text-white dark:text-black px-4 py-2.5 bg-black dark:bg-white cursor-pointer hover:bg-[#2954E3] dark:hover:bg-[#5B7FFF] transition-colors duration-200"
                  style={mono}
                >
                  {tokenStore.access ? "continue()" : "go_to_login()"}
                </button>
              </>
            )}

            {status === "error" && (
              <>
                <p className="text-sm text-red-500 mb-6" style={mono}>
                  error: {token ? error : "Missing verification token."}
                </p>
                <button
                  onClick={() => router.push(tokenStore.access ? "/settings" : "/login")}
                  className="w-full text-sm text-black dark:text-white px-4 py-2.5 border border-[#111114]/15 dark:border-white/20 hover:bg-[#111114]/5 dark:hover:bg-white/5 cursor-pointer transition-colors duration-200"
                  style={mono}
                >
                  {tokenStore.access ? "back_to_settings()" : "back_to_login()"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const VerifyEmailPage = () => (
  <Suspense fallback={null}>
    <VerifyEmailContent />
  </Suspense>
);

export default VerifyEmailPage;

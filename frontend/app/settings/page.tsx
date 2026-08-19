"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, KeyRound, LogOut } from "lucide-react";
import { api, tokenStore, type UserResponse } from "../lib/api";

const mono = { fontFamily: "'JetBrains Mono', ui-monospace, monospace" } as const;

const getInitials = (user: UserResponse) =>
  `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase();

const SettingsPage = () => {
  const router = useRouter();
  const [user, setUser] = useState<UserResponse | null>(null);

  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendMessage, setResendMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [changePasswordError, setChangePasswordError] = useState<string | null>(null);
  const [changePasswordSuccess, setChangePasswordSuccess] = useState(false);

  useEffect(() => {
    if (!tokenStore.access) {
      router.replace("/login");
      return;
    }
    (async () => {
      try {
        setUser(await api.getMe());
      } catch {
        tokenStore.clear();
        router.replace("/login");
      }
    })();
  }, [router]);

  const handleLogout = async () => {
    await api.logout();
    router.replace("/login");
  };

  // ticks the cooldown down once a second while it's active
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setTimeout(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(id);
  }, [resendCooldown]);

  const handleResendVerification = async () => {
    if (!user || resending || resendCooldown > 0) return;
    setResending(true);
    setResendMessage(null);
    try {
      await api.resendVerification(user.email);
      setResendMessage({ type: "success", text: "verification email sent, check your inbox" });
      setResendCooldown(60);
    } catch (err) {
      const text = err instanceof Error ? err.message : "failed to send verification email.";
      setResendMessage({ type: "error", text });
      // server enforces the real cooldown - mirror it locally so the button
      // doesn't re-enable before the server would actually accept another request
      const match = text.match(/(\d+)\s*seconds?/i);
      if (match) setResendCooldown(parseInt(match[1], 10));
    } finally {
      setResending(false);
    }
  };

  const closeChangePasswordDialog = () => {
    setShowChangePassword(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
    setChangePasswordError(null);
    setChangePasswordSuccess(false);
  };

  useEffect(() => {
    if (!showChangePassword) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !changingPassword) closeChangePasswordDialog();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showChangePassword, changingPassword]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePasswordError(null);

    if (newPassword !== confirmNewPassword) {
      setChangePasswordError("Passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      setChangePasswordError("Password must be at least 8 characters long.");
      return;
    }

    setChangingPassword(true);
    try {
      await api.changePassword(currentPassword, newPassword, confirmNewPassword);
      setChangePasswordSuccess(true);
      // backend revoked all refresh tokens, so just log out now
      setTimeout(() => {
        tokenStore.clear();
        router.replace("/login");
      }, 1200);
    } catch (err) {
      setChangePasswordError(err instanceof Error ? err.message : "Failed to change password.");
    } finally {
      setChangingPassword(false);
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

  return (
    <div className="flex-1 w-full flex justify-center px-4 py-10 bg-[#FDFDFC] dark:bg-black transition-colors duration-300">
      <div className="w-full max-w-[480px]">
        <button
          onClick={() => router.push("/home")}
          className="flex items-center gap-1.5 text-xs text-black dark:text-white hover:text-black dark:hover:text-white mb-6 cursor-pointer transition-colors"
          style={mono}
        >
          <ArrowLeft size={13} />
          back_to_chat()
        </button>

        <div className="border border-[#111114]/15 dark:border-white/20 bg-white dark:bg-[#0A0A0A] shadow-sm dark:shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
          <div className="flex items-center gap-1.5 px-4 py-3 border-b border-[#111114]/10 dark:border-white/12">
            <span className="w-2.5 h-2.5 rounded-full bg-[#111114]/15 dark:bg-white/20" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#111114]/15 dark:bg-white/20" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#111114]/15 dark:bg-white/20" />
            <span className="ml-2 text-xs text-black dark:text-white" style={mono}>
              nino --settings
            </span>
          </div>

          <div className="px-6 py-7 sm:px-8 sm:py-8">
            <div className="flex items-center gap-4 mb-8">
              <div
                className="flex items-center justify-center w-14 h-14 rounded-full bg-[#2954E3] dark:bg-[#5B7FFF] text-white dark:text-black text-lg shrink-0"
                style={{ ...mono, fontWeight: 500 }}
              >
                {getInitials(user)}
              </div>
              <div className="min-w-0">
                <p className="text-base text-black dark:text-white truncate" style={mono}>
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-sm text-black dark:text-white truncate" style={mono}>
                  {user.email}
                </p>
              </div>
            </div>

            <dl className="space-y-4 mb-8">
              <div className="flex items-center justify-between border-b border-[#111114]/10 dark:border-white/10 pb-3">
                <dt className="text-xs text-black dark:text-white" style={mono}>
                  email_status
                </dt>
                <dd className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      user.emailVerified
                        ? "text-green-600 dark:text-green-400 bg-green-500/10"
                        : "text-amber-600 dark:text-amber-400 bg-amber-500/10"
                    }`}
                    style={mono}
                  >
                    {user.emailVerified ? "verified" : "unverified"}
                  </span>
                  {!user.emailVerified && (
                    <button
                      onClick={handleResendVerification}
                      disabled={resending || resendCooldown > 0}
                      className="text-xs text-[#2954E3] dark:text-[#5B7FFF] hover:underline disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed cursor-pointer transition-colors"
                      style={mono}
                    >
                      {resending ? "sending..." : resendCooldown > 0 ? `resend (${resendCooldown}s)` : "verify_now()"}
                    </button>
                  )}
                </dd>
              </div>

              {!user.emailVerified && resendMessage && (
                <p
                  className={`text-xs -mt-2 ${
                    resendMessage.type === "success" ? "text-green-600 dark:text-green-400" : "text-red-500"
                  }`}
                  style={mono}
                >
                  {resendMessage.text}
                </p>
              )}

              <div className="flex items-center justify-between border-b border-[#111114]/10 dark:border-white/10 pb-3">
                <dt className="text-xs text-black dark:text-white" style={mono}>
                  member_since
                </dt>
                <dd className="text-xs text-black dark:text-white" style={mono}>
                  {new Date(user.createdAt).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </dd>
              </div>
            </dl>

            <button
              onClick={() => setShowChangePassword(true)}
              className="w-full flex items-center justify-center gap-2 text-sm text-black dark:text-white px-4 py-2.5 border border-[#111114]/15 dark:border-white/20 hover:bg-[#111114]/5 dark:hover:bg-white/5 cursor-pointer transition-colors duration-200 mb-3"
              style={mono}
            >
              <KeyRound size={14} />
              change_password()
            </button>

            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 text-sm text-red-500 px-4 py-2.5 border border-red-500/30 hover:bg-red-500/5 cursor-pointer transition-colors duration-200"
              style={mono}
            >
              <LogOut size={14} />
              log_out()
            </button>
          </div>
        </div>
      </div>

      {/* change password dialog */}
      {showChangePassword && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 px-4"
          onClick={() => !changingPassword && !changePasswordSuccess && closeChangePasswordDialog()}
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
                nino --password
              </span>
            </div>

            <form onSubmit={handleChangePassword} className="px-5 py-5">
              <p className="text-sm text-black dark:text-white mb-4" style={mono}>
                <span className="text-[#2954E3] dark:text-[#5B7FFF]">$</span> change_password()
              </p>

              {changePasswordSuccess ? (
                <p
                  className="text-xs text-green-600 dark:text-green-400 leading-relaxed mb-1"
                  style={mono}
                >
                  password changed. redirecting to login...
                </p>
              ) : (
                <>
                  <div className="mb-3">
                    <label className="block text-xs text-black dark:text-white mb-1.5" style={mono}>
                      current_password
                    </label>
                    <div className="flex items-center border border-[#111114]/15 dark:border-white/18 focus-within:border-[#2954E3] dark:focus-within:border-[#5B7FFF] transition-colors duration-200">
                      <span className="pl-3 text-black dark:text-white text-sm" style={mono}>
                        &gt;
                      </span>
                      <input
                        type="password"
                        required
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="********"
                        disabled={changingPassword}
                        className="w-full bg-transparent px-2 py-2.5 text-sm text-black dark:text-white placeholder:text-black/50 dark:placeholder:text-white/50 outline-none disabled:opacity-50"
                        style={mono}
                      />
                    </div>
                  </div>

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
                        disabled={changingPassword}
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
                        disabled={changingPassword}
                        className="w-full bg-transparent px-2 py-2.5 text-sm text-black dark:text-white placeholder:text-black/50 dark:placeholder:text-white/50 outline-none disabled:opacity-50"
                        style={mono}
                      />
                    </div>
                  </div>

                  {changePasswordError && (
                    <p className="text-xs text-red-500 mb-3" style={mono}>
                      error: {changePasswordError}
                    </p>
                  )}
                </>
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeChangePasswordDialog}
                  disabled={changingPassword || changePasswordSuccess}
                  className="text-xs text-black dark:text-white hover:text-black dark:hover:text-white px-3.5 py-2 border border-[#111114]/15 dark:border-white/15 hover:border-[#111114]/40 dark:hover:border-white/40 transition-colors duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  style={mono}
                >
                  cancel
                </button>
                {!changePasswordSuccess && (
                  <button
                    type="submit"
                    disabled={changingPassword}
                    className="text-xs text-white dark:text-black px-3.5 py-2 bg-black dark:bg-white hover:bg-[#2954E3] dark:hover:bg-[#5B7FFF] transition-colors duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-wait"
                    style={mono}
                  >
                    {changingPassword ? "changing..." : "confirm()"}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;

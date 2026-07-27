"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, tokenStore, ApiError } from "../lib/api";

const SignupPage = () => {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("passwords do not match");
      return;
    }
    if (!agreedToTerms) {
      setError("you must agree to the terms to continue");
      return;
    }

    setLoading(true);
    try {
      const auth = await api.register({
        firstName,
        lastName,
        dateOfBirth,
        email,
        password,
        confirmPassword,
      });
      tokenStore.set(auth);
      router.push("/home");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const inputWrapper =
    "flex items-center border border-[#111114]/15 dark:border-white/18 focus-within:border-[#2954E3] dark:focus-within:border-[#5B7FFF] transition-colors duration-200";
  const inputPrompt = "pl-3 text-black/50 dark:text-white/50 text-sm";
  const inputField =
    "w-full bg-transparent px-2 py-2.5 text-sm text-black dark:text-white placeholder:text-black/50 dark:placeholder:text-white/50 outline-none";
  const labelClass = "block text-xs text-black dark:text-white mb-1.5";
  const mono = { fontFamily: "'JetBrains Mono', ui-monospace, monospace" };

  return (
    <div className="min-h-[calc(100vh-4rem)] sm:min-h-[calc(100vh-5rem)] w-full flex items-center justify-center px-4 py-10 bg-[#FDFDFC] dark:bg-black transition-colors duration-300">
      <div className="w-full max-w-[420px]">
        <div className="flex justify-center mb-8">
          <a href="/" className="group flex items-center select-none">
            <span className="text-2xl text-black dark:text-white tracking-tight" style={{ ...mono, fontWeight: 500 }}>
              nino
            </span>
            <span
              className="inline-flex items-center justify-center ml-[1px] w-[22px] h-[22px] sm:w-6 sm:h-6 bg-[#2954E3] dark:bg-[#5B7FFF] text-white dark:text-black text-sm sm:text-base animate-pulse motion-reduce:animate-none group-hover:bg-black dark:group-hover:bg-white transition-colors duration-200"
              style={{ ...mono, fontWeight: 500 }}
            >
              X
            </span>
          </a>
        </div>

        <div className="border border-[#111114]/15 dark:border-white/20 bg-white dark:bg-[#0A0A0A] shadow-sm dark:shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
          <div className="flex items-center gap-1.5 px-4 py-3 border-b border-[#111114]/10 dark:border-white/12">
            <span className="w-2.5 h-2.5 rounded-full bg-[#111114]/15 dark:bg-white/20" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#111114]/15 dark:bg-white/20" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#111114]/15 dark:bg-white/20" />
            <span className="ml-2 text-xs text-black dark:text-white" style={mono}>
              nino --signup
            </span>
          </div>

          <div className="px-6 py-7 sm:px-8 sm:py-8">
            <p className="text-sm text-black dark:text-white mb-6" style={mono}>
              <span className="text-[#2954E3] dark:text-[#5B7FFF]">$</span> create --account
            </p>

            <form onSubmit={handleSubmit}>
              {/* first + last name */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div>
                  <label htmlFor="firstName" className={labelClass} style={mono}>
                    first_name
                  </label>
                  <div className={inputWrapper}>
                    <span className={inputPrompt} style={mono}>&gt;</span>
                    <input
                      id="firstName"
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Son"
                      className={inputField}
                      style={mono}
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="lastName" className={labelClass} style={mono}>
                    last_name
                  </label>
                  <div className={inputWrapper}>
                    <span className={inputPrompt} style={mono}>&gt;</span>
                    <input
                      id="lastName"
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Goku"
                      className={inputField}
                      style={mono}
                    />
                  </div>
                </div>
              </div>

              {/* date of birth */}
              <div className="mb-5">
                <label htmlFor="dateOfBirth" className={labelClass} style={mono}>
                  date_of_birth
                </label>
                <div className={inputWrapper}>
                  <span className={inputPrompt} style={mono}>&gt;</span>
                  <input
                    id="dateOfBirth"
                    type="date"
                    required
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    max={new Date().toISOString().split("T")[0]}
                    className={`${inputField} [color-scheme:light] dark:[color-scheme:dark]`}
                    style={mono}
                  />
                </div>
              </div>

              {/* email */}
              <div className="mb-5">
                <label htmlFor="email" className={labelClass} style={mono}>
                  email
                </label>
                <div className={inputWrapper}>
                  <span className={inputPrompt} style={mono}>&gt;</span>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@domain.com"
                    className={inputField}
                    style={mono}
                  />
                </div>
              </div>

              {/* password */}
              <div className="mb-5">
                <label htmlFor="password" className={labelClass} style={mono}>
                  password
                </label>
                <div className={inputWrapper}>
                  <span className={inputPrompt} style={mono}>&gt;</span>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={inputField}
                    style={mono}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="pr-3 text-xs text-black/50 dark:text-white/50 hover:text-black/70 dark:hover:text-white/80 transition-colors duration-200 cursor-pointer"
                    style={mono}
                  >
                    {showPassword ? "hide" : "show"}
                  </button>
                </div>
              </div>

              {/* confirm password */}
              <div className="mb-5">
                <label htmlFor="confirmPassword" className={labelClass} style={mono}>
                  confirm_password
                </label>
                <div className={inputWrapper}>
                  <span className={inputPrompt} style={mono}>&gt;</span>
                  <input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className={inputField}
                    style={mono}
                  />
                </div>
              </div>

              {/* terms */}
              <label className="flex items-start gap-2.5 mb-6 select-none">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-[#2954E3] dark:accent-[#5B7FFF] shrink-0 cursor-pointer"
                />
                <span className="text-xs text-black/70 dark:text-white/70 leading-relaxed" style={mono}>
                  i_agree_to the{" "}
                  <a href="/terms" className="text-[#2954E3] dark:text-[#5B7FFF] hover:underline">terms</a>{" "}
                  and{" "}
                  <a href="/privacy" className="text-[#2954E3] dark:text-[#5B7FFF] hover:underline">privacy_policy</a>
                </span>
              </label>

              {error && (
                <p className="text-xs text-red-500 dark:text-red-400 mb-4" style={mono}>
                  error: {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full text-sm text-white dark:text-black px-4 py-2.5 bg-black dark:bg-white hover:bg-[#2954E3] dark:hover:bg-[#5B7FFF] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black dark:focus-visible:outline-white"
                style={mono}
              >
                {loading ? "creating_account..." : "create_account()"}
              </button>
            </form>
          </div>
        </div>

        <p className="text-center text-sm text-black dark:text-white mt-6" style={mono}>
          have_account?{" "}
          <button onClick={() => router.push("/login")} className="text-[#2954E3] dark:text-[#5B7FFF] hover:underline">
            log_in()
          </button>
        </p>
      </div>
    </div>
  );
};

export default SignupPage;
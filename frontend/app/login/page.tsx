"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const LoginPage = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // wire up your auth call here
    console.log({ email, password });
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] sm:min-h-[calc(100vh-5rem)] w-full flex items-center justify-center px-4 bg-[#FDFDFC] dark:bg-black transition-colors duration-300">
      <div className="w-full max-w-[420px]">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <a href="/" className="group flex items-center select-none">
            <span
              className="text-2xl text-black dark:text-white tracking-tight"
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
        </div>

        {/* Terminal window */}
        <div className="border border-[#111114]/15 dark:border-white/20 bg-white dark:bg-[#0A0A0A] shadow-sm dark:shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
          {/* window chrome */}
          <div className="flex items-center gap-1.5 px-4 py-3 border-b border-[#111114]/10 dark:border-white/12">
            <span className="w-2.5 h-2.5 rounded-full bg-[#111114]/15 dark:bg-white/20" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#111114]/15 dark:bg-white/20" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#111114]/15 dark:bg-white/20" />
            <span
              className="ml-2 text-xs text-black dark:text-white"
              style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace" }}
            >
              nino --login
            </span>
          </div>

          {/* form */}
          <form onSubmit={handleSubmit} className="px-6 py-7 sm:px-8 sm:py-8">
            <p
              className="text-sm text-black dark:text-white mb-6"
              style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace" }}
            >
              <span className="text-[#2954E3] dark:text-[#5B7FFF]">$</span> authenticate --user
            </p>

            {/* email */}
            <div className="mb-5">
              <label
                htmlFor="email"
                className="block text-xs text-black dark:text-white mb-1.5"
                style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace" }}
              >
                email
              </label>
              <div className="flex items-center border border-[#111114]/15 dark:border-white/18 focus-within:border-[#2954E3] dark:focus-within:border-[#5B7FFF] transition-colors duration-200">
                <span
                  className="pl-3 text-black/50 dark:text-white/50 text-sm"
                  style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace" }}
                >
                  &gt;
                </span>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@domain.com"
                  className="w-full bg-transparent px-2 py-2.5 text-sm text-black dark:text-white placeholder:text-black/50 dark:placeholder:text-white/50 outline-none"
                  style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace" }}
                />
              </div>
            </div>

            {/* password */}
            <div className="mb-2">
              <label
                htmlFor="password"
                className="block text-xs text-black dark:text-white mb-1.5"
                style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace" }}
              >
                password
              </label>
              <div className="flex items-center border border-[#111114]/15 dark:border-white/18 focus-within:border-[#2954E3] dark:focus-within:border-[#5B7FFF] transition-colors duration-200">
                <span
                  className="pl-3 text-black/50 dark:text-white/50 text-sm"
                  style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace" }}
                >
                  &gt;
                </span>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-transparent px-2 py-2.5 text-sm text-black dark:text-white placeholder:text-black/50 dark:placeholder:text-white/50 outline-none"
                  style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="pr-3 text-xs text-black/50 dark:text-white/50 hover:text-black/70 dark:hover:text-white/80 transition-colors duration-200 cursor-pointer"
                  style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace" }}
                >
                  {showPassword ? "hide" : "show"}
                </button>
              </div>
            </div>

            <div className="flex justify-end mb-6">
              <button
                type="button"
                onClick={() => router.push("/forgot-password")}
                className="text-xs text-red-500  cursor-pointer"
                style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace" }}
              >
                forgot_password?
              </button>
            </div>

            <button
              type="submit"
              className="w-full text-sm text-white dark:text-black px-4 py-2.5 bg-black dark:bg-white cursor-pointer hover:bg-[#2954E3] dark:hover:bg-[#5B7FFF] transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black dark:focus-visible:outline-white"
              style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace" }}
            >
              login()
            </button>
          </form>
        </div>

        {/* footer link */}
        <p
          className="text-center text-sm text-black dark:text-white mt-6"
          style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace" }}
        >
          no_account?{" "}
          <button
            onClick={() => router.push("/signup")}
            className="text-[#2954E3] dark:text-[#5B7FFF] hover:underline cursor-pointer"
          >
            sign_up()
          </button>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
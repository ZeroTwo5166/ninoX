"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Sparkles,
  Zap,
  ShieldCheck,
  Radio,
  Plus,
} from "lucide-react";
import { tokenStore } from "./lib/api";

const mono = { fontFamily: "'JetBrains Mono', ui-monospace, monospace" };

const CONTAINER = "max-w-[1760px] mx-auto px-6 sm:px-10 lg:px-16 xl:px-20 2xl:px-24";

const DEMO_MESSAGES: { role: "user" | "ai"; text: string }[] = [
  { role: "user", text: "explain black holes like i'm 5" },
  {
    role: "ai",
    text: "imagine a vacuum cleaner so strong not even light can escape it.",
  },
  { role: "user", text: "write a haiku about debugging" },
  {
    role: "ai",
    text: "silent code sleeps, bugs\nlurk between the lines of light\ncoffee. patience. fixed.",
  },
  { role: "user", text: "summarize this thread in one line" },
  { role: "ai", text: "you asked, i remembered, we shipped it." },
];

// real example prompts for the marquee, not made-up stats
const PROMPT_STRIP = [
  "explain black holes like i'm 5",
  "write a haiku about debugging",
  "summarize this thread in one line",
  "refactor this function for clarity",
  "draft a reply to this email",
  "compare two approaches to caching",
  "turn these notes into a plan",
  "what am i missing here?",
];

const SECTIONS = [
  { id: "hero", label: "intro" },
  { id: "features", label: "features" },
  { id: "how", label: "usage" },
  { id: "faq", label: "faq" },
  { id: "cta", label: "start" },
];

function useChatDemo() {
  const [log, setLog] = useState<{ role: "user" | "ai"; text: string }[]>([]);
  const [typing, setTyping] = useState("");
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const current = DEMO_MESSAGES[msgIndex % DEMO_MESSAGES.length];
    let charIndex = 0;
    let timeoutId: ReturnType<typeof setTimeout>;

    const typeChar = () => {
      charIndex++;
      setTyping(current.text.slice(0, charIndex));
      if (charIndex < current.text.length) {
        timeoutId = setTimeout(typeChar, 18 + Math.random() * 22);
      } else {
        timeoutId = setTimeout(() => {
          setLog((prev) => {
            const next = [...prev, current];
            return next.length > 4 ? next.slice(next.length - 4) : next;
          });
          setTyping("");
          setMsgIndex((i) => i + 1);
        }, 1100);
      }
    };

    timeoutId = setTimeout(typeChar, 400);
    return () => clearTimeout(timeoutId);
  }, [msgIndex]);

  return {
    log,
    typing,
    currentRole: DEMO_MESSAGES[msgIndex % DEMO_MESSAGES.length].role,
  };
}

// tracks which section is centered in the viewport, to drive the side rail
function useActiveSection(ids: string[]) {
  const [active, setActive] = useState(ids[0]);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActive(id);
        },
        { rootMargin: "-40% 0px -40% 0px", threshold: 0 }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return active;
}

function useClock() {
  const [time, setTime] = useState("");
  useEffect(() => {
    const update = () =>
      setTime(
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
      );
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

function SectionRail({ active }: { active: string }) {
  return (
    <nav
      aria-label="Section navigation"
      className="hidden lg:flex fixed left-8 top-1/2 -translate-y-1/2 z-20 flex-col items-start gap-6"
    >
      <div className="absolute left-[3px] top-1 bottom-1 w-px bg-[#111114]/10 dark:bg-white/10" />
      {SECTIONS.map(({ id, label }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            onClick={() =>
              document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
            }
            className="group relative flex items-center gap-3 cursor-pointer"
          >
            <span className="relative z-10 flex items-center justify-center w-[7px] h-[7px]">
              {isActive && (
                <motion.span
                  layoutId="rail-active-ring"
                  className="absolute -inset-1.5 rounded-full bg-[#2954E3]/15 dark:bg-[#5B7FFF]/15"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <motion.span
                animate={{ scale: isActive ? 1.3 : 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                className={
                  "w-[7px] h-[7px] rounded-full transition-colors duration-300 " +
                  (isActive
                    ? "bg-[#2954E3] dark:bg-[#5B7FFF]"
                    : "bg-[#111114]/25 dark:bg-white/25 group-hover:bg-[#2954E3]/70 dark:group-hover:bg-[#5B7FFF]/70")
                }
              />
            </span>
            <span
              className={
                "text-[11px] tracking-wide transition-all duration-300 " +
                (isActive
                  ? "text-black dark:text-white opacity-100 translate-x-0"
                  : "text-black/40 dark:text-white/40 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0")
              }
              style={mono}
            >
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

function StatusRail() {
  const time = useClock();
  return (
    <div
      aria-hidden
      className="hidden lg:flex fixed right-8 top-1/2 -translate-y-1/2 z-20 flex-col items-center gap-3"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-[#2954E3] dark:bg-[#5B7FFF] animate-pulse motion-reduce:animate-none" />
      <span
        className="text-[11px] text-black/40 dark:text-white/40 [writing-mode:vertical-rl]"
        style={mono}
      >
        local_time {time}
      </span>
    </div>
  );
}

function PromptMarquee() {
  const shouldReduceMotion = useReducedMotion();
  const items = [...PROMPT_STRIP, ...PROMPT_STRIP];
  return (
    <div className="relative border-y border-[#111114]/10 dark:border-white/10 overflow-hidden">
      <div className="pointer-events-none absolute inset-y-0 left-0 w-20 sm:w-40 bg-gradient-to-r from-[#FDFDFC] dark:from-black to-transparent z-10" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-20 sm:w-40 bg-gradient-to-l from-[#FDFDFC] dark:from-black to-transparent z-10" />
      <div
        className={
          "flex whitespace-nowrap py-5 " +
          (shouldReduceMotion ? "" : "animate-[marquee_38s_linear_infinite] hover:[animation-play-state:paused]")
        }
      >
        {items.map((text, i) => (
          <span
            key={i}
            className="flex items-center text-sm text-black/50 dark:text-white/50 px-6"
            style={mono}
          >
            <span className="text-[#2954E3] dark:text-[#5B7FFF] mr-2">$</span>
            {text}
          </span>
        ))}
      </div>
      <style>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}

function FaqItem({
  q,
  a,
  isOpen,
  onToggle,
}: {
  q: string;
  a: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-[#111114]/10 dark:border-white/10">
      <button
        onClick={onToggle}
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between gap-4 py-6 text-left cursor-pointer"
      >
        <span
          className="text-sm sm:text-base text-black dark:text-white"
          style={mono}
        >
          {q}
        </span>
        <motion.span
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="shrink-0 text-[#2954E3] dark:text-[#5B7FFF]"
        >
          <Plus size={16} strokeWidth={2} />
        </motion.span>
      </button>
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-out"
        style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <p
            className="pb-6 text-sm text-black/60 dark:text-white/60 leading-relaxed max-w-2xl"
            style={mono}
          >
            {a}
          </p>
        </div>
      </div>
    </div>
  );
}

const FEATURES = [
  {
    icon: Zap,
    title: "instant_responses()",
    desc: "Streaming replies with no spinners and no waiting around for a full response.",
  },
  {
    icon: ShieldCheck,
    title: "private_by_default()",
    desc: "Conversations stay yours. Nothing here is sold or handed off to anyone else.",
  },
  {
    icon: Sparkles,
    title: "context_aware()",
    desc: "Remembers the whole thread, so you never have to repeat yourself.",
  },
];

const STEPS = [
  { n: "01", title: "sign_up()", desc: "Create an account in under a minute." },
  { n: "02", title: "start_chat()", desc: "Open a thread and say what's on your mind." },
  { n: "03", title: "keep_going()", desc: "Nino remembers context across every session." },
];

const HIGHLIGHTS = [
  { icon: Zap, label: "streams instantly" },
  { icon: ShieldCheck, label: "private by default" },
  { icon: Sparkles, label: "remembers the thread" },
  { icon: Radio, label: "online when i'm online" },
];

const FAQS = [
  {
    q: "is this online all the time?",
    a: "Not yet — this is a personal project running on my own machine, so it's online whenever I am. Think side project, not hosted product.",
  },
  {
    q: "is my data actually private?",
    a: "Yes. Conversations stay yours — nothing is sold or handed off to anyone else.",
  },
  {
    q: "do i lose context if i close the tab?",
    a: "No — every thread is saved automatically and picks up right where you left off.",
  },
  {
    q: "does it work on mobile?",
    a: "Yes. The whole interface is responsive, from the terminal-style chat to the nav.",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function Home() {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();
  const { log, typing, currentRole } = useChatDemo();
  const activeSection = useActiveSection(SECTIONS.map((s) => s.id));
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // skip the marketing page for logged-in users
  useEffect(() => {
    if (tokenStore.access) {
      router.replace("/home");
    }
  }, [router]);

  return (
    <div className="w-full bg-[#FDFDFC] dark:bg-black transition-colors duration-300 overflow-x-hidden">
      {/* full-bleed grid texture so the outer edges read as intentional, not empty */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-30 bg-[linear-gradient(to_right,rgba(0,0,0,0.035)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[length:140px_100%]"
      />

      {/* ambient background */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden -z-20">
        <motion.div
          className="absolute top-[-10%] left-[-8%] w-[420px] h-[420px] rounded-full bg-[#2954E3]/10 dark:bg-[#5B7FFF]/10 blur-3xl"
          animate={shouldReduceMotion ? undefined : { x: [0, 40, 0], y: [0, 30, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-[-15%] right-[-10%] w-[480px] h-[480px] rounded-full bg-[#2954E3]/10 dark:bg-[#5B7FFF]/10 blur-3xl"
          animate={shouldReduceMotion ? undefined : { x: [0, -30, 0], y: [0, -40, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <SectionRail active={activeSection} />
      <StatusRail />

      {/* hero */}
      <section
        id="hero"
        className={`${CONTAINER} min-h-[70vh] flex flex-col justify-center pt-24 pb-16 grid lg:grid-cols-12 gap-y-12 gap-x-12 xl:gap-x-20 2xl:gap-x-28 items-center`}
      >
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.08 } } }}
          className="lg:col-span-6"
        >
          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 text-xs px-3 py-1.5 border border-[#111114]/15 dark:border-white/15 rounded-full mb-6 text-black/70 dark:text-white/70"
            style={mono}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#2954E3] dark:bg-[#5B7FFF] animate-pulse motion-reduce:animate-none" />
            now_streaming: v2.0
          </motion.div>

          <h1
            className="text-4xl sm:text-5xl lg:text-6xl leading-[1.1] text-black dark:text-white tracking-tight mb-6"
            style={{ ...mono, fontWeight: 500 }}
          >
            <motion.span variants={fadeUp} transition={{ duration: 0.5 }} className="block">
              chat with ai
            </motion.span>
            <motion.span
              variants={fadeUp}
              transition={{ duration: 0.5 }}
              className="block text-[#2954E3] dark:text-[#5B7FFF]"
            >
              that actually gets it
            </motion.span>
          </h1>

          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            className="text-base sm:text-lg text-black/60 dark:text-white/60 max-w-md mb-8"
            style={mono}
          >
            ninoX remembers context, streams responses instantly, and never sells your
            conversations. built for people who think in threads.
          </motion.p>

          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            className="flex flex-wrap items-center gap-4"
          >
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => router.push("/signup")}
              className="group inline-flex items-center gap-2 text-sm text-white dark:text-black px-5 py-3 bg-black dark:bg-white hover:bg-[#2954E3] dark:hover:bg-[#5B7FFF] transition-colors duration-200 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black dark:focus-visible:outline-white"
              style={mono}
            >
              get_started()
              <ArrowRight
                size={16}
                className="transition-transform duration-200 group-hover:translate-x-1"
              />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => router.push("/login")}
              className="text-sm text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white px-5 py-3 border border-[#111114]/15 dark:border-white/15 hover:border-[#2954E3] dark:hover:border-[#5B7FFF] transition-colors duration-200 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2954E3]"
              style={mono}
            >
              log_in()
            </motion.button>
          </motion.div>

          <motion.div
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.08, delayChildren: 0.3 } },
            }}
            className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-10 pt-6 border-t border-[#111114]/10 dark:border-white/10"
          >
            {HIGHLIGHTS.map(({ icon: Icon, label }) => (
              <motion.div
                key={label}
                variants={fadeUp}
                transition={{ duration: 0.4 }}
                className="flex items-center gap-2 text-xs text-black/50 dark:text-white/50"
                style={mono}
              >
                <Icon size={14} strokeWidth={1.75} className="text-[#2954E3] dark:text-[#5B7FFF]" />
                {label}
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* live terminal demo */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          whileHover={{ y: -3 }}
          className="lg:col-span-6 border border-[#111114]/15 dark:border-white/20 bg-white dark:bg-[#0A0A0A] shadow-sm dark:shadow-[0_0_0_1px_rgba(255,255,255,0.03)] transition-shadow duration-300 hover:shadow-lg dark:hover:shadow-[0_0_30px_rgba(91,127,255,0.08)]"
        >
          <div className="flex items-center gap-1.5 px-4 py-3 border-b border-[#111114]/10 dark:border-white/12">
            <span className="w-2.5 h-2.5 rounded-full bg-[#111114]/15 dark:bg-white/20" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#111114]/15 dark:bg-white/20" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#111114]/15 dark:bg-white/20" />
            <span className="ml-2 text-xs text-black dark:text-white" style={mono}>
              nino --chat
            </span>
          </div>

          <div
            className="px-5 py-5 h-[360px] overflow-hidden flex flex-col gap-3 text-sm"
            style={mono}
          >
            {log.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={
                  m.role === "user"
                    ? "text-black/70 dark:text-white/70"
                    : "text-black dark:text-white"
                }
              >
                <span
                  className={
                    m.role === "user"
                      ? "text-[#2954E3] dark:text-[#5B7FFF]"
                      : "text-black/40 dark:text-white/40"
                  }
                >
                  {m.role === "user" ? "$" : ">"}
                </span>{" "}
                <span className="whitespace-pre-wrap">{m.text}</span>
              </motion.div>
            ))}
            <div
              className={
                currentRole === "user"
                  ? "text-black/70 dark:text-white/70"
                  : "text-black dark:text-white"
              }
            >
              <span
                className={
                  currentRole === "user"
                    ? "text-[#2954E3] dark:text-[#5B7FFF]"
                    : "text-black/40 dark:text-white/40"
                }
              >
                {currentRole === "user" ? "$" : ">"}
              </span>{" "}
              <span className="whitespace-pre-wrap">{typing}</span>
              <span className="animate-pulse motion-reduce:animate-none">▍</span>
            </div>
          </div>
        </motion.div>
      </section>

      {/* prompt marquee — replaces fabricated metrics with real example prompts */}
      <PromptMarquee />

      {/* features */}
      <section id="features" className={`${CONTAINER} py-24 sm:py-32`}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="mb-12 max-w-xl"
        >
          <p className="text-sm text-[#2954E3] dark:text-[#5B7FFF] mb-2" style={mono}>
            $ ls features/
          </p>
          <h2
            className="text-2xl sm:text-3xl text-black dark:text-white tracking-tight"
            style={{ ...mono, fontWeight: 500 }}
          >
            built for real conversations
          </h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          transition={{ staggerChildren: 0.1 }}
          className="grid sm:grid-cols-3 gap-4 xl:gap-6"
        >
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <motion.div
              key={title}
              variants={fadeUp}
              transition={{ duration: 0.5 }}
              whileHover={{ y: -4 }}
              className="group border border-[#111114]/15 dark:border-white/15 bg-white dark:bg-[#0A0A0A] p-6 hover:border-[#2954E3] dark:hover:border-[#5B7FFF] transition-colors duration-200"
            >
              <Icon
                size={20}
                strokeWidth={1.75}
                className="text-black/60 dark:text-white/60 group-hover:text-[#2954E3] dark:group-hover:text-[#5B7FFF] transition-colors duration-200 mb-4"
              />
              <h3
                className="text-sm text-black dark:text-white mb-2"
                style={{ ...mono, fontWeight: 500 }}
              >
                {title}
              </h3>
              <p className="text-sm text-black/60 dark:text-white/60 leading-relaxed" style={mono}>
                {desc}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* how it works */}
      <section id="how" className="border-t border-[#111114]/10 dark:border-white/10 bg-[#F7F7F5] dark:bg-[#050505] transition-colors duration-300">
        <div className={`${CONTAINER} py-24 sm:py-32`}>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
            className="text-sm text-[#2954E3] dark:text-[#5B7FFF] mb-2"
            style={mono}
          >
            $ cat how_it_works.md
          </motion.p>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            transition={{ staggerChildren: 0.12 }}
            className="grid sm:grid-cols-3 gap-8 lg:gap-16 xl:gap-24 mt-8"
          >
            {STEPS.map(({ n, title, desc }) => (
              <motion.div key={n} variants={fadeUp} transition={{ duration: 0.5 }}>
                <div
                  className="text-3xl text-black/15 dark:text-white/15 mb-3"
                  style={{ ...mono, fontWeight: 500 }}
                >
                  {n}
                </div>
                <h3
                  className="text-sm text-black dark:text-white mb-2"
                  style={{ ...mono, fontWeight: 500 }}
                >
                  {title}
                </h3>
                <p className="text-sm text-black/60 dark:text-white/60 leading-relaxed" style={mono}>
                  {desc}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* faq */}
      <section id="faq" className={`${CONTAINER} py-24 sm:py-32`}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="mb-10 max-w-xl"
        >
          <p className="text-sm text-[#2954E3] dark:text-[#5B7FFF] mb-2" style={mono}>
            $ man nino
          </p>
          <h2
            className="text-2xl sm:text-3xl text-black dark:text-white tracking-tight"
            style={{ ...mono, fontWeight: 500 }}
          >
            questions, answered
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="max-w-3xl border-t border-[#111114]/10 dark:border-white/10"
        >
          {FAQS.map((item, i) => (
            <FaqItem
              key={item.q}
              q={item.q}
              a={item.a}
              isOpen={openFaq === i}
              onToggle={() => setOpenFaq(openFaq === i ? null : i)}
            />
          ))}
        </motion.div>
      </section>

      {/* final cta */}
      <section
        id="cta"
        className={`${CONTAINER} min-h-[60vh] flex flex-col justify-center py-20 sm:py-28 text-center`}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
        >
          <h2
            className="text-2xl sm:text-4xl text-black dark:text-white tracking-tight mb-6"
            style={{ ...mono, fontWeight: 500 }}
          >
            ready to start the conversation?
          </h2>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => router.push("/signup")}
            className="group inline-flex items-center gap-2 text-sm text-white dark:text-black px-6 py-3 bg-black dark:bg-white hover:bg-[#2954E3] dark:hover:bg-[#5B7FFF] transition-colors duration-200 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black dark:focus-visible:outline-white"
            style={mono}
          >
            get_started()
            <ArrowRight
              size={16}
              className="transition-transform duration-200 group-hover:translate-x-1"
            />
          </motion.button>
        </motion.div>
      </section>

      {/* footer */}
      <footer className="border-t border-[#111114]/10 dark:border-white/10">
        <div className={`${CONTAINER} py-8 flex flex-col sm:flex-row items-center justify-between gap-4`}>
          <div className="flex items-center select-none">
            <span
              className="text-base text-black dark:text-white tracking-tight"
              style={{ ...mono, fontWeight: 500 }}
            >
              nino
            </span>
            <span
              className="inline-flex items-center justify-center ml-[1px] w-[18px] h-[18px] bg-[#2954E3] dark:bg-[#5B7FFF] text-white dark:text-black text-xs"
              style={{ ...mono, fontWeight: 500 }}
            >
              X
            </span>
          </div>
          <p className="text-xs text-black/50 dark:text-white/50" style={mono}>
            © {new Date().getFullYear()} nino. self-hosted personal project — online while my machine is running.
          </p>
        </div>
      </footer>
    </div>
  );
}
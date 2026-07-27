"use client";

import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

const mono = { fontFamily: "'JetBrains Mono', ui-monospace, monospace" } as const;

const components: Components = {
  h1: ({ children }) => (
    <h1 className="text-base font-semibold text-[#2954E3] dark:text-[#5B7FFF] mt-4 mb-2 pb-1 border-b border-[#111114]/10 dark:border-white/15 first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-sm font-semibold text-[#2954E3] dark:text-[#5B7FFF] mt-4 mb-2 first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-sm font-semibold text-black dark:text-white mt-3 mb-1.5 first:mt-0">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-sm font-semibold text-black dark:text-white mt-3 mb-1 first:mt-0">
      {children}
    </h4>
  ),
  p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>,
  strong: ({ children }) => (
    <strong className="font-semibold text-[#2954E3] dark:text-[#5B7FFF]">{children}</strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[#2954E3] dark:text-[#5B7FFF] underline underline-offset-2 hover:opacity-80 transition-opacity"
    >
      {children}
    </a>
  ),
  ul: ({ children }) => <ul className="mb-3 last:mb-0 pl-5 space-y-1 list-disc">{children}</ul>,
  ol: ({ children }) => <ol className="mb-3 last:mb-0 pl-5 space-y-1 list-decimal">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="mb-3 last:mb-0 pl-3 border-l-2 border-[#2954E3]/40 dark:border-[#5B7FFF]/40 italic text-black dark:text-white">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-4 border-[#111114]/10 dark:border-white/15" />,
  code: ({ className, children, ...props }) => {
    const isBlock = /language-/.test(className ?? "");
    if (isBlock) {
      return (
        <code className={className} style={mono} {...props}>
          {children}
        </code>
      );
    }
    return (
      <code
        className="px-1 py-0.5 mx-0.5 rounded text-[0.85em] bg-[#111114]/[0.06] dark:bg-white/10 border border-[#111114]/10 dark:border-white/10"
        style={mono}
        {...props}
      >
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre
      className="mb-3 last:mb-0 px-3 py-2.5 overflow-x-auto text-xs bg-[#111114]/[0.04] dark:bg-white/[0.06] border border-[#111114]/10 dark:border-white/12 rounded scrollbar-premium"
      style={mono}
    >
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <div className="mb-3 last:mb-0 overflow-x-auto scrollbar-premium">
      <table className="border-collapse text-xs">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="px-2.5 py-1.5 border border-[#111114]/15 dark:border-white/15 bg-[#111114]/5 dark:bg-white/5 text-left font-semibold">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-2.5 py-1.5 border border-[#111114]/15 dark:border-white/15">{children}</td>
  ),
};

export function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {children}
    </ReactMarkdown>
  );
}

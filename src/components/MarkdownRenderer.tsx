"use client";

import { isValidElement, useMemo } from "react";
import type { ReactNode } from "react";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import katex from "katex";
import type { PluggableList } from "unified";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import "katex/dist/katex.min.css";
import { SearchResult } from "@/lib/types";
import { getFaviconUrl, getDomain } from "@/lib/utils";

const remarkPlugins = [
  remarkGfm,
  [remarkMath, { singleDollarTextMath: false }],
] satisfies PluggableList;

interface MarkdownRendererProps {
  content: string;
  sources?: SearchResult[];
}

function normalizeMarkdown(content: string): string {
  let normalized = content.trim();

  if (!normalized.includes("\n") && normalized.includes("\\n")) {
    normalized = normalized.replace(/\\n/g, "\n").replace(/\\t/g, "\t");
  }

  normalized = normalized.replace(
    /^(?:here(?:'s| is)\s+(?:the\s+)?(?:answer|response)\s+in\s+markdown:?\s*)/i,
    ""
  ).trim();

  const fenced = normalized.match(
    /^```(?:markdown|md|text)?\s*\n([\s\S]*?)\n```$/i
  );
  if (fenced) {
    return fenced[1].trim();
  }

  return normalized;
}

function preprocessCitations(content: string): string {
  const parts = normalizeMarkdown(content).split(
    /(```[\s\S]*?```|`[^`]+`)/g
  );
  return parts
    .map((part, i) => {
      if (i % 2 === 1) return part;
      return part.replace(/\[(\d+)\](?!\()/g, "[$1](#cite-$1)");
    })
    .join("");
}

function getNodeText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map(getNodeText).join("");
  }

  if (isValidElement<{ children?: ReactNode }>(node)) {
    return getNodeText(node.props.children);
  }

  return "";
}

function getNodeClassName(node: ReactNode): string {
  if (Array.isArray(node)) {
    return node.map(getNodeClassName).join(" ");
  }

  if (isValidElement<{ className?: string; children?: ReactNode }>(node)) {
    return [node.props.className, getNodeClassName(node.props.children)]
      .filter(Boolean)
      .join(" ");
  }

  return "";
}

function looksLikeMath(text: string): boolean {
  const value = text.trim();

  if (!value || value.length > 400) return false;
  if (/https?:\/\/|www\.|[\w.-]+@[\w.-]+/.test(value)) return false;
  if (/[{};<>]|=>|(?:const|let|var|function|return|class|import|export)\b/.test(value)) {
    return false;
  }
  if (/[A-Za-z]{4,}/.test(value.replace(/\b(?:sqrt|sin|cos|tan|log|frac|left|right)\b/g, ""))) {
    return false;
  }

  const hasMathSyntax =
    /\\(?:frac|sqrt|sum|int|pm|alpha|beta|gamma|theta|pi|le|ge)/.test(value) ||
    /[=^±√≤≥÷×]/.test(value) ||
    /\n\s*[-—]{3,}\s*\n/.test(value);

  return hasMathSyntax && /[\dA-Za-z]/.test(value);
}

function asciiMathToLatex(text: string): string {
  let value = text.trim();
  const fraction = value.match(/^([\s\S]+?)\n\s*[-—]{3,}\s*\n([\s\S]+)$/);

  if (fraction) {
    const numerator = fraction[1].trim();
    const denominator = fraction[2].trim();
    const assignment = numerator.match(/^([A-Za-z])\s*=\s*(.+)$/);

    if (assignment) {
      const expression = assignment[2].trim().replace(/^\((.*)\)$/, "$1");
      value = `${assignment[1]} = \\frac{${expression}}{${denominator}}`;
    } else {
      value = `\\frac{${numerator}}{${denominator}}`;
    }
  }

  value = value
    .replace(/±/g, "\\pm")
    .replace(/≤/g, "\\le")
    .replace(/≥/g, "\\ge")
    .replace(/÷/g, "\\div")
    .replace(/×/g, "\\times")
    .replace(/√\(([^()]+)\)/g, "\\sqrt{$1}")
    .replace(/√([A-Za-z0-9]+)/g, "\\sqrt{$1}");

  const quadratic = value.match(
    /^x\s*=\s*\(-?b\s*\\pm\s*\\sqrt\{(.+?)\}\)\s*\/\s*(2a)$/i
  );

  if (quadratic) {
    return `x = \\frac{-b \\pm \\sqrt{${quadratic[1]}}}{${quadratic[2]}}`;
  }

  return value;
}

function renderMathFallback(text: string, displayMode: boolean): ReactNode | null {
  if (!looksLikeMath(text)) return null;

  const html = katex.renderToString(asciiMathToLatex(text), {
    displayMode,
    throwOnError: false,
  });

  return (
    <span
      className={displayMode ? "math-display" : "math-inline"}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function CitationPill({
  num,
  source,
}: {
  num: number;
  source?: SearchResult;
}) {
  const domain = source ? getDomain(source.url) : null;
  const favicon = source ? getFaviconUrl(source.url) : null;

  const rawExcerpt =
    source?.highlights?.join(" ") || source?.text?.slice(0, 200) || "";
  const excerpt = rawExcerpt
    .replace(/^[\s?)\]}>.,;:!*#\-]+/, "")
    .replace(/\s+/g, " ")
    .trim();

  if (source) {
    return (
      <span className="group/cite relative mx-px inline-block align-baseline">
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-[5px] px-1.5 py-px text-[11px] font-medium no-underline transition-all duration-150"
          style={{
            background: "var(--color-surface-tertiary)",
            color: "var(--color-ink-secondary)",
            border: "none",
            lineHeight: "1.4",
            verticalAlign: "baseline",
            position: "relative",
            top: "-1px",
          }}
        >
          {favicon && (
            <Image
              src={favicon}
              alt=""
              width={10}
              height={10}
              className="h-2.5 w-2.5 rounded-sm"
              style={{ flexShrink: 0 }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          )}
          {domain}
        </a>
        {excerpt && (
          <span
            className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden w-72 -translate-x-1/2 rounded-xl px-3.5 py-3 text-[12.5px] leading-relaxed group-hover/cite:block"
            style={{
              background: "var(--color-surface-primary)",
              color: "var(--color-ink-primary)",
              letterSpacing: 0,
              border: "1px solid var(--color-border-light)",
            }}
          >
            <span
              className="mb-1.5 block text-[11.5px] font-semibold leading-snug"
              style={{
                color: "var(--color-ink-primary)",
                letterSpacing: 0,
              }}
            >
              {source.title}
            </span>
            <span style={{ color: "var(--color-ink-secondary)" }}>
              {excerpt.length > 180 ? excerpt.slice(0, 180) + "..." : excerpt}
            </span>
            <span
              className="absolute left-1/2 top-full -translate-x-1/2 border-[5px] border-transparent"
              style={{ borderTopColor: "var(--color-surface-primary)" }}
            />
          </span>
        )}
      </span>
    );
  }

  return (
    <span
      className="mx-px inline-flex items-center rounded-[5px] px-1.5 py-px text-[11px] font-medium"
      style={{
        background: "var(--color-surface-tertiary)",
        color: "var(--color-ink-tertiary)",
        lineHeight: "1.4",
        verticalAlign: "baseline",
        position: "relative",
        top: "-1px",
      }}
    >
      {num}
    </span>
  );
}

export default function MarkdownRenderer({
  content,
  sources = [],
}: MarkdownRendererProps) {
  const processedContent = useMemo(
    () => preprocessCitations(content),
    [content]
  );

  return (
    <ReactMarkdown
      remarkPlugins={remarkPlugins}
      rehypePlugins={[rehypeKatex, rehypeHighlight]}
      components={{
        a: ({ href, children }) => {
          const citeMatch = href?.match(/^#cite-(\d+)$/);
          if (citeMatch) {
            const num = parseInt(citeMatch[1]);
            const source = sources[num - 1];
            return <CitationPill num={num} source={source} />;
          }
          return (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          );
        },
        pre: ({ children }) => {
          const hasLanguage = /\blanguage-/.test(getNodeClassName(children));
          const math = hasLanguage
            ? null
            : renderMathFallback(getNodeText(children), true);

          if (math) {
            return <div className="math-block">{math}</div>;
          }

          return (
            <pre
              className="overflow-x-auto rounded-lg border text-[13px] leading-relaxed"
              style={{
                borderColor: "var(--color-border-light)",
              }}
            >
              {children}
            </pre>
          );
        },
        table: ({ children }) => (
          <div
            className="my-3 overflow-x-auto rounded-lg"
            style={{ border: "1px solid var(--color-border-light)" }}
          >
            <table className="w-full border-collapse text-[13.5px]">
              {children}
            </table>
          </div>
        ),
        thead: ({ children }) => (
          <thead style={{ background: "var(--color-surface-secondary)" }}>
            {children}
          </thead>
        ),
        th: ({ children }) => (
          <th
            className="px-3 py-2 text-left text-[12.5px] font-semibold"
            style={{
              color: "var(--color-ink-secondary)",
              borderBottom: "1px solid var(--color-border-light)",
            }}
          >
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td
            className="px-3 py-2 text-[13px]"
            style={{
              color: "var(--color-ink-primary)",
              borderBottom: "1px solid var(--color-border-light)",
            }}
          >
            {children}
          </td>
        ),
        code: ({ className, children, ...props }) => {
          const isBlock =
            className?.includes("language-") || className?.includes("hljs");
          const text = getNodeText(children);

          if (!isBlock && !text.includes("\n")) {
            const math = renderMathFallback(text, false);
            if (math) return math;
          }

          if (isBlock) {
            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          }
          return (
            <code
              className="rounded px-1.5 py-0.5 text-[0.85em]"
              style={{
                background: "var(--color-surface-tertiary)",
                color: "var(--color-ink-secondary)",
                fontFamily: "var(--font-mono)",
              }}
              {...props}
            >
              {children}
            </code>
          );
        },
      }}
    >
      {processedContent}
    </ReactMarkdown>
  );
}

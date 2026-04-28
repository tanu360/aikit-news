"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { SearchResult } from "@/lib/types";
import { getFaviconUrl, getDomain } from "@/lib/utils";

interface SearchTimelineProps {
  query: string;
  results: SearchResult[];
  status: "searching" | "done";
  answerStarted?: boolean;
}

export default function SearchTimeline({
  query,
  results,
  status,
  answerStarted,
}: SearchTimelineProps) {
  const [manualCollapsed, setManualCollapsed] = useState<boolean | null>(null);
  const [visibleCount, setVisibleCount] = useState(0);
  const collapsed = manualCollapsed ?? !!answerStarted;

  useEffect(() => {
    if (results.length > visibleCount) {
      const timer = setTimeout(() => {
        setVisibleCount((c) => Math.min(c + 1, results.length));
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [results.length, visibleCount]);

  const visibleResults = results.slice(0, visibleCount);

  return (
    <div className="mb-4">
      <button
        onClick={() => setManualCollapsed(!collapsed)}
        className="timeline-trigger group flex w-full items-center gap-1 rounded-lg px-3 py-2 text-left"
      >
        <div className="flex h-5 w-5 shrink-0 items-center justify-center">
          {status === "searching" ? (
            <div className="relative flex items-center justify-center">
              <div
                className="h-3.5 w-3.5 rounded-full border-[1.5px]"
                style={{
                  borderColor: "var(--color-border-default)",
                  borderTopColor: "var(--color-accent)",
                }}
              >
                <style jsx>{`
                  div {
                    animation: spin 0.8s linear infinite;
                  }
                  @keyframes spin {
                    to {
                      transform: rotate(360deg);
                    }
                  }
                `}</style>
              </div>
            </div>
          ) : (
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              style={{ color: "var(--color-ink-tertiary)" }}
            >
              <circle
                cx="7"
                cy="7"
                r="5"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M11 11L14 14"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          )}
        </div>

        <div className="flex flex-1 items-center gap-2 overflow-hidden">
          <span
            className="truncate text-[13px] font-medium"
            style={{ color: "var(--color-ink-secondary)" }}
          >
            {status === "searching" ? "Searching" : "Searched"}
          </span>
          <span
            className="truncate text-[13px]"
            style={{ color: "var(--color-ink-primary)" }}
          >
            &ldquo;{query}&rdquo;
          </span>
        </div>

        <motion.svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
          style={{ color: "var(--color-ink-tertiary)" }}
          animate={{ rotate: collapsed ? 0 : 180 }}
          transition={{ duration: 0.2 }}
        >
          <path
            d="M3 4.5L6 7.5L9 4.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </motion.svg>
      </button>

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden"
          >
            <div className="relative pt-1 pb-1">
              <div
                aria-hidden="true"
                className="absolute top-2 bottom-2 w-px"
                style={{
                  left: 3,
                  background:
                    "color-mix(in oklch, var(--color-accent) 34%, var(--color-border-light))",
                }}
              />
              {visibleResults.map((result, i) => (
                <motion.a
                  key={result.url}
                  href={result.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    duration: 0.25,
                    ease: "easeOut",
                  }}
                  className="source-row group/item relative block pl-8"
                >
                  <div
                    className="source-row-dot absolute left-0 top-1/2 h-1.75 w-1.75 -translate-y-1/2 rounded-full border-[1.5px] transition-colors"
                    style={{
                      borderColor:
                        i === visibleResults.length - 1 && status === "searching"
                          ? "var(--color-accent)"
                          : "color-mix(in oklch, var(--color-accent) 62%, var(--color-border-default))",
                      background:
                        i === visibleResults.length - 1 && status === "searching"
                          ? "var(--color-accent-light)"
                          : "color-mix(in oklch, var(--color-accent) 10%, var(--color-surface-primary))",
                    }}
                  />

                  <div className="source-row-surface flex min-h-11 items-center gap-2.5 rounded-md px-2 py-2 sm:min-h-0 sm:py-1.5">
                    <Image
                      src={getFaviconUrl(result.url)}
                      alt=""
                      width={16}
                      height={16}
                      unoptimized
                      className="h-4 w-4 shrink-0 rounded-sm"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />

                    <div className="flex flex-1 items-center gap-2 overflow-hidden">
                      <span
                        className="source-row-title truncate text-[12.5px]"
                      >
                        {result.title}
                      </span>
                      <span
                        className="source-row-domain shrink-0 text-[11px]"
                      >
                        {getDomain(result.url)}
                      </span>
                    </div>

                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 12 12"
                      className="source-row-icon shrink-0"
                    >
                      <path
                        d="M4.5 2H10V7.5M10 2L3 9"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </motion.a>
              ))}

              {status === "searching" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="relative flex items-center gap-2.5 py-1.5 pl-8"
                >
                  <div
                    className="absolute left-px top-1/2 h-1.25 w-1.25 -translate-y-1/2 rounded-full animate-pulse-soft"
                    style={{ background: "var(--color-accent)" }}
                  />
                  <span
                    className="text-[11px] animate-pulse-soft"
                    style={{ color: "var(--color-ink-tertiary)" }}
                  >
                    Finding more sources...
                  </span>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

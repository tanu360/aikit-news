"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { File01Icon } from "@hugeicons/core-free-icons";
import type { Message } from "@/lib/types";
import { formatTokenCount, getAttachmentTokenCount } from "@/lib/tokenCount";
import SearchTimeline from "./SearchTimeline";
import DeepResearchTimeline from "./DeepResearchTimeline";
import MarkdownRenderer from "./MarkdownRenderer";
import WeatherCard from "./WeatherCard";

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
  searchQuery?: string;
}

function highlightText(text: string, query: string, darkBg = false): ReactNode {
  if (!query.trim()) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={i} className={darkBg ? "search-match-dark" : "search-match"}>
        {part}
      </mark>
    ) : part
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MessageBubble({
  message,
  isStreaming,
  searchQuery = "",
}: MessageBubbleProps) {
  if (message.role === "user") {
    const attachments = message.attachments || [];

    return (
      <motion.div
        data-message-id={message.id}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="flex justify-end"
      >
        <div
          className="max-w-[85%] rounded-2xl rounded-br-md px-4 py-2.5"
          style={{
            background: "var(--color-ink-primary)",
            color: "var(--color-surface-primary)",
          }}
        >
          {attachments.length > 0 && (
            <div className="mb-2 flex flex-wrap justify-end gap-1.5">
              {attachments.map((file) => {
                const tokenCount = getAttachmentTokenCount(file);

                return (
                  <span
                    key={`${file.name}-${file.size}-${tokenCount}`}
                    className="inline-flex max-w-full items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-medium"
                    style={{
                      background:
                        "color-mix(in oklch, var(--color-surface-primary) 14%, transparent)",
                      border:
                        "1px solid color-mix(in oklch, var(--color-surface-primary) 20%, transparent)",
                      color: "var(--color-surface-primary)",
                    }}
                    title={`${file.name} - ${formatTokenCount(
                      tokenCount
                    )} - ${formatFileSize(file.size)}`}
                  >
                    <HugeiconsIcon
                      icon={File01Icon}
                      size={12}
                      strokeWidth={1.8}
                      primaryColor="currentColor"
                    />
                    <span className="min-w-0 truncate">{file.name}</span>
                    <span style={{ opacity: 0.7 }}>
                      {formatTokenCount(tokenCount)}
                    </span>
                  </span>
                );
              })}
            </div>
          )}
          {message.content && (
            <p className="text-[13.5px] leading-relaxed sm:text-[14.5px]">
              {highlightText(message.content, searchQuery, true)}
            </p>
          )}
        </div>
      </motion.div>
    );
  }

  const sources = message.isDeepResearch
    ? message.allSources
    : message.searchResults;

  const isWaitingForContent =
    !message.content &&
    isStreaming &&
    (message.isDeepResearch
      ? message.researchStatus === "answering"
      : message.searchStatus === "done" || !message.searchQuery);

  return (
    <motion.div
      data-message-id={message.id}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="flex justify-start"
    >
      <div className="max-w-[92%]">
        {message.isDeepResearch && message.researchSteps && (
          <DeepResearchTimeline
            steps={message.researchSteps}
            status={message.researchStatus || "done"}
            answerStarted={!!message.content}
          />
        )}

        {!message.isDeepResearch &&
          message.searchQuery &&
          message.searchResults && (
            <SearchTimeline
              query={message.searchQuery}
              results={message.searchResults}
              status={message.searchStatus || "done"}
              answerStarted={!!message.content}
            />
          )}

        {message.weather && <WeatherCard weather={message.weather} />}

        {message.content && (
          <div className="prose">
            <MarkdownRenderer content={message.content} sources={sources} searchQuery={searchQuery} />
            {isStreaming && (
              <span
                className="ml-0.5 inline-block h-4.5 w-0.5 align-text-bottom animate-pulse-soft"
                style={{ background: "var(--color-ink-primary)" }}
              />
            )}
          </div>
        )}

        {isWaitingForContent && (
          <div className="flex items-center gap-1.5 py-2">
            {[0, 300, 600].map((delay) => (
              <div
                key={delay}
                className="h-1.5 w-1.5 rounded-full animate-pulse-soft"
                style={{
                  background: "var(--color-ink-ghost)",
                  animationDelay: `${delay}ms`,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import type { Message } from "@/lib/types";
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

export default function MessageBubble({
  message,
  isStreaming,
  searchQuery = "",
}: MessageBubbleProps) {
  if (message.role === "user") {
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
          style={{ background: "var(--color-ink-primary)", color: "var(--color-surface-primary)" }}
        >
          <p className="text-[13.5px] leading-relaxed sm:text-[14.5px]">
            {highlightText(message.content, searchQuery, true)}
          </p>
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

"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { FocusEvent, ReactNode } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  File01Icon,
  Copy01Icon,
  CopyCheckIcon,
  ReloadIcon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons";
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
  onRegenerate?: () => void;
  onNavigateVersion?: (dir: -1 | 1) => void;
}

function highlightText(text: string, query: string, userMessage = false): ReactNode {
  if (!query.trim()) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={i} className={userMessage ? "search-match-user" : "search-match"}>
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

function getMessageCopyText(message: Message): string {
  const lines: string[] = [];
  const trimmedContent = message.content.trim();

  if (trimmedContent) {
    lines.push(trimmedContent);
  }

  if (message.role === "user" && message.attachments?.length) {
    lines.push(
      ...message.attachments.map((file) =>
        file.path ? `${file.name} - ${file.path}` : file.name
      )
    );
  }

  return lines.join("\n");
}

function ActionButton({
  onClick,
  title,
  disabled,
  children,
}: {
  onClick?: () => void;
  title: string;
  disabled?: boolean;
  children: ReactNode;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      className="inline-flex h-8 w-8 items-center justify-center rounded-full disabled:opacity-40 active:scale-[0.94]"
      style={{
        background: "transparent",
        color: hovered
          ? "var(--color-ink-primary)"
          : "var(--color-ink-secondary)",
        border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "color 120ms",
      }}
    >
      {children}
    </button>
  );
}

export default function MessageBubble({
  message,
  isStreaming,
  searchQuery = "",
  onRegenerate,
  onNavigateVersion,
}: MessageBubbleProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isFocusedWithin, setIsFocusedWithin] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getMessageCopyText(message));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const hasVersions = (message.versions?.length ?? 0) > 1;
  const versionIndex = message.versionIndex ?? 0;
  const totalVersions = message.versions?.length ?? 1;
  const actionsVisible = isHovered || isFocusedWithin;

  const handleActionBlur = (event: FocusEvent<HTMLDivElement>) => {
    const nextTarget = event.relatedTarget;
    if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
      setIsFocusedWithin(false);
    }
  };

  if (message.role === "user") {
    const attachments = message.attachments || [];

    return (
      <motion.div
        data-message-id={message.id}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="flex justify-end"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onFocusCapture={() => setIsFocusedWithin(true)}
        onBlurCapture={handleActionBlur}
      >
        <div className="flex flex-col items-end gap-0.5">
          <div
            className="max-w-full rounded-2xl rounded-br-md px-4 py-2.5"
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

          <div
            className="message-actions mt-0.5 flex items-center gap-0.5 pr-0.5"
            data-visible={actionsVisible ? "true" : "false"}
          >
            <ActionButton onClick={handleCopy} title={copied ? "Copied!" : "Copy"}>
              <HugeiconsIcon
                icon={copied ? CopyCheckIcon : Copy01Icon}
                size={15}
                strokeWidth={1.8}
                primaryColor="currentColor"
              />
            </ActionButton>
          </div>
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
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocusCapture={() => setIsFocusedWithin(true)}
      onBlurCapture={handleActionBlur}
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

        <div
          className="message-actions flex items-center gap-0.5 mt-0.5"
          data-visible={actionsVisible ? "true" : "false"}
        >
          <ActionButton onClick={handleCopy} title={copied ? "Copied!" : "Copy"}>
            <HugeiconsIcon
              icon={copied ? CopyCheckIcon : Copy01Icon}
              size={15}
              strokeWidth={1.8}
              primaryColor="currentColor"
            />
          </ActionButton>

          {onRegenerate && (
            <ActionButton
              onClick={onRegenerate}
              title="Regenerate"
              disabled={isStreaming}
            >
              <HugeiconsIcon
                icon={ReloadIcon}
                size={15}
                strokeWidth={1.8}
                primaryColor="currentColor"
              />
            </ActionButton>
          )}

          {hasVersions && !isStreaming && (
            <div className="ml-0.5 flex items-center gap-0">
              <ActionButton
                onClick={() => onNavigateVersion?.(-1)}
                title="Previous response"
                disabled={versionIndex === 0}
              >
                <HugeiconsIcon
                  icon={ArrowLeft01Icon}
                  size={14}
                  strokeWidth={2}
                  primaryColor="currentColor"
                />
              </ActionButton>
              <span
                className="select-none px-0.5 tabular-nums"
                style={{
                  color: "var(--color-ink-tertiary)",
                  fontSize: 11,
                  letterSpacing: 0,
                }}
              >
                {versionIndex + 1}/{totalVersions}
              </span>
              <ActionButton
                onClick={() => onNavigateVersion?.(1)}
                title="Next response"
                disabled={versionIndex === totalVersions - 1}
              >
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  size={14}
                  strokeWidth={2}
                  primaryColor="currentColor"
                />
              </ActionButton>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

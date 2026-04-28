"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Cancel01Icon,
  MessageDownload01Icon,
  CopyrightIcon,
  Delete02Icon,
} from "@hugeicons/core-free-icons";
import type { Chat } from "@/lib/types";

const SIDEBAR_W = 284;
const COMPACT_MEDIA_QUERY = "(max-width: 1023px)";

function formatExportDate(timestamp: number) {
  if (!timestamp) return "Unknown";
  return new Date(timestamp).toLocaleString();
}

function sanitizeFilenamePart(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "chat"
  );
}

function buildChatExport(chat: Chat) {
  const title = chat.title || "New conversation";
  const lines = [
    `# ${title}`,
    "",
    `Chat ID: ${chat.id}`,
    `Created: ${formatExportDate(chat.createdAt)}`,
    `Updated: ${formatExportDate(chat.updatedAt)}`,
    `Messages: ${chat.messages.length}`,
    "",
    "---",
    "",
  ];

  chat.messages.forEach((message, index) => {
    const role = message.role === "assistant" ? "Assistant" : "You";
    lines.push(
      `## ${index + 1}. ${role} - ${formatExportDate(message.timestamp)}`,
      "",
      message.content.trim() || "_Empty message_",
      ""
    );

    if (message.attachments?.length) {
      lines.push("Attachments:");
      message.attachments.forEach((file) => {
        lines.push(`- ${file.name} (${file.size.toLocaleString()} bytes)`);
      });
      lines.push("");
    }

    const sources = message.allSources?.length
      ? message.allSources
      : message.searchResults;
    if (sources?.length) {
      lines.push("Sources:");
      sources.forEach((source, sourceIndex) => {
        lines.push(
          `${sourceIndex + 1}. ${source.title || source.url}${source.url ? ` - ${source.url}` : ""
          }`
        );
      });
      lines.push("");
    }
  });

  return lines.join("\n");
}

function exportChat(chat: Chat) {
  const title = chat.title || "New conversation";
  const datePart = new Date().toISOString().slice(0, 10);
  const filename = `${sanitizeFilenamePart(title)}-${datePart}.md`;
  const blob = new Blob([buildChatExport(chat)], {
    type: "text/markdown;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  chats: Chat[];
  activeChatId: string;
  onSelectChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
  disabled?: boolean;
}

export default function Sidebar({
  isOpen,
  onToggle,
  chats,
  activeChatId,
  onSelectChat,
  onDeleteChat,
  disabled,
}: SidebarProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [isCompact, setIsCompact] = useState(false);

  const ease = [0.22, 1, 0.36, 1] as const;

  useEffect(() => {
    const mediaQuery = window.matchMedia(COMPACT_MEDIA_QUERY);
    const sync = () => setIsCompact(mediaQuery.matches);
    sync();
    mediaQuery.addEventListener("change", sync);
    return () => mediaQuery.removeEventListener("change", sync);
  }, []);

  const handleSelectChat = (id: string) => {
    if (disabled) return;
    onSelectChat(id);
    if (isCompact && isOpen) onToggle();
  };

  const sidebarPanel = (
    <div
      className="flex h-full flex-col"
      style={{
        borderRadius: isCompact ? 0 : 22,
        backgroundColor: "var(--color-surface-secondary)",
        border: "1px solid var(--color-border-light)",
        overflow: "hidden",
        transition:
          "background-color 240ms var(--theme-ease), border-color 240ms var(--theme-ease)",
      }}
    >
      <div
        className="flex h-12 shrink-0 items-center p-1"
        style={{
          gap: 8,
          borderBottom: isOpen
            ? "1px solid color-mix(in oklch, var(--color-border-light) 82%, transparent)"
            : "1px solid transparent",
        }}
      >
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              key="header-expanded"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="relative flex flex-1 items-center justify-center overflow-hidden"
            >
              <div className="flex min-w-0 items-center justify-center gap-2">
                <span
                  className="truncate select-none text-center font-semibold"
                  style={{
                    fontSize: 14,
                    letterSpacing: 0,
                    color: "var(--color-ink-primary)",
                  }}
                >
                  AiKit News Chats
                </span>
                <span
                  className="flex h-5 min-w-5 shrink-0 select-none items-center justify-center rounded-full px-1.5 text-[11px] font-semibold"
                  style={{
                    backgroundColor: "var(--color-surface-tertiary)",
                    color: "var(--color-ink-secondary)",
                    border:
                      "1px solid color-mix(in oklch, var(--color-border-light) 86%, transparent)",
                  }}
                  aria-label={`${chats.length} chats`}
                  title={`${chats.length} chats`}
                >
                  {chats.length}
                </span>
              </div>
              {isCompact && (
                <button
                  type="button"
                  onClick={onToggle}
                  aria-label="Close sidebar"
                  title="Close sidebar"
                  className="absolute right-0 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors duration-150"
                  style={{
                    color: "var(--color-ink-tertiary)",
                    backgroundColor: "transparent",
                    WebkitTapHighlightColor: "transparent",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "#dc2626";
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "var(--color-ink-tertiary)";
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  <HugeiconsIcon
                    icon={Cancel01Icon}
                    size={16}
                    strokeWidth={2}
                    primaryColor="currentColor"
                  />
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex-1 overflow-hidden">
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              key="chat-list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="flex h-full flex-col gap-2 overflow-y-auto px-2 py-2"
            >
              {chats.length === 0 ? (
                <p
                  className="px-2 py-6 text-center text-[12px] leading-relaxed"
                  style={{ color: "var(--color-ink-tertiary)" }}
                >
                  No chats yet
                </p>
              ) : (
                chats.map((chat, index) => {
                  const isActive = chat.id === activeChatId;
                  const isHovered =
                    !isCompact && isOpen && hoveredId === chat.id;
                  const showActions = isCompact || isActive || isHovered;
                  const canExport = chat.messages.length > 0;
                  const actionButtonSize = isCompact ? 28 : 24;
                  const actionAreaGap = 2;
                  const actionAreaWidth = actionButtonSize * 2 + actionAreaGap;
                  return (
                    <div
                      key={chat.id}
                      className="group relative flex cursor-pointer items-center rounded-xl"
                      style={{
                        paddingLeft: 12,
                        paddingRight: 12,
                        backgroundColor: isActive
                          ? "var(--color-surface-tertiary)"
                          : isHovered
                            ? "var(--color-surface-hover)"
                            : "transparent",
                        color: isActive
                          ? "var(--color-ink-primary)"
                          : "var(--color-ink-secondary)",
                        transition: "background-color 120ms ease, color 120ms ease",
                      }}
                      onClick={() => handleSelectChat(chat.id)}
                      onMouseEnter={() => {
                        if (!isCompact) setHoveredId(chat.id);
                      }}
                      onMouseLeave={() => {
                        if (!isCompact) setHoveredId(null);
                      }}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <span
                        className="shrink-0 select-none font-semibold leading-none"
                        style={{
                          marginRight: isCompact ? 8 : 10,
                          fontSize: isCompact ? 12 : 11,
                          letterSpacing: 0,
                          fontVariantNumeric: "tabular-nums",
                          color: isActive
                            ? "var(--color-ink-primary)"
                            : isHovered
                              ? "var(--color-ink-secondary)"
                              : "var(--color-ink-tertiary)",
                        }}
                        aria-hidden="true"
                      >
                        {index + 1}
                      </span>
                      <span
                        className="min-w-0 flex-1 select-none truncate py-1.5 leading-snug"
                        style={{
                          fontSize: 12.5,
                          letterSpacing: 0,
                        }}
                      >
                        {chat.title || "New conversation"}
                      </span>
                      <div
                        className="flex shrink-0 items-center overflow-hidden"
                        style={{
                          width: showActions ? actionAreaWidth : 0,
                          marginLeft: showActions ? 4 : 0,
                          gap: showActions ? actionAreaGap : 0,
                          opacity: showActions ? 1 : 0,
                          pointerEvents: showActions ? "auto" : "none",
                          transition:
                            "width 160ms ease, margin-left 160ms ease, opacity 120ms ease",
                        }}
                        aria-hidden={showActions ? undefined : true}
                      >
                        <button
                          type="button"
                          disabled={!canExport}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!canExport) return;
                            exportChat(chat);
                          }}
                          className="flex shrink-0 items-center justify-center rounded-xl transition-colors duration-150 disabled:cursor-not-allowed"
                          style={{
                            width: actionButtonSize,
                            height: actionButtonSize,
                            color: canExport
                              ? "var(--color-ink-secondary)"
                              : "var(--color-ink-tertiary)",
                            opacity: canExport ? 1 : 0.42,
                            backgroundColor: "transparent",
                            WebkitTapHighlightColor: "transparent",
                          }}
                          onMouseEnter={(e) => {
                            if (!canExport) return;
                            e.currentTarget.style.color =
                              "var(--color-ink-primary)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color =
                              canExport
                                ? "var(--color-ink-secondary)"
                                : "var(--color-ink-tertiary)";
                          }}
                          tabIndex={showActions && canExport ? 0 : -1}
                          aria-label={`Export ${chat.title || "conversation"}`}
                          title={
                            canExport
                              ? "Export chat"
                              : "No messages to export"
                          }
                        >
                          <HugeiconsIcon
                            icon={MessageDownload01Icon}
                            size={15}
                            strokeWidth={1.5}
                            primaryColor="currentColor"
                          />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setHoveredId(null);
                            onDeleteChat(chat.id);
                          }}
                          className="flex shrink-0 items-center justify-center rounded-xl transition-colors duration-150"
                          style={{
                            width: actionButtonSize,
                            height: actionButtonSize,
                            color: "var(--color-ink-secondary)",
                            backgroundColor: "transparent",
                            WebkitTapHighlightColor: "transparent",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = "#dc2626";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color =
                              "var(--color-ink-secondary)";
                          }}
                          tabIndex={showActions ? 0 : -1}
                          aria-label={`Delete ${chat.title || "conversation"}`}
                          title="Delete"
                        >
                          <HugeiconsIcon
                            icon={Delete02Icon}
                            size={15}
                            strokeWidth={1.5}
                            primaryColor="currentColor"
                          />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {isOpen && (
        <div className="shrink-0">
          <div
            className="flex h-12 items-center justify-center overflow-hidden px-3"
            style={{
              background: "var(--color-surface-tertiary)",
              color: "var(--color-ink-secondary)",
            }}
          >
            <div
              className="flex min-w-0 items-center justify-center text-[14px] font-semibold"
              style={{ letterSpacing: 0 }}
            >
              <span
                className="flex shrink-0 items-center justify-center"
                style={{
                  width: 18,
                  height: 18,
                }}
              >
                <HugeiconsIcon
                  icon={CopyrightIcon}
                  size={11}
                  strokeWidth={2}
                  primaryColor="currentColor"
                />
              </span>
              <span className="truncate">tanu360</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {isCompact && (
        <AnimatePresence>
          {isOpen && (
            <motion.div
              className="fixed inset-0 z-40 lg:hidden"
              role="dialog"
              aria-modal="true"
              aria-label="Sidebar"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.24, ease }}
            >
              {sidebarPanel}
            </motion.div>
          )}
        </AnimatePresence>
      )}
      <motion.div
        initial={false}
        animate={{ width: isOpen ? SIDEBAR_W : 0 }}
        transition={{ duration: 0.26, ease }}
        className="hidden shrink-0 overflow-hidden lg:block"
        style={{ width: isOpen ? SIDEBAR_W : 0, height: "100dvh" }}
      >
        <motion.div
          initial={false}
          animate={{
            paddingLeft: isOpen ? 16 : 0,
            paddingRight: isOpen ? 12 : 0,
          }}
          transition={{ duration: 0.26, ease }}
          className="flex h-full flex-col pt-4 pb-4 sm:pt-5 sm:pb-5"
          style={{
            paddingLeft: isOpen ? 16 : 0,
            paddingRight: isOpen ? 12 : 0,
            width: "100%",
          }}
        >
          {sidebarPanel}
        </motion.div>
      </motion.div>
    </>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Cancel01Icon,
  CopyrightIcon,
  Delete02Icon,
} from "@hugeicons/core-free-icons";
import type { Chat } from "@/lib/types";

const SIDEBAR_W = 284;
const COLLAPSED_W = 64;
const COMPACT_MEDIA_QUERY = "(max-width: 1023px)";


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
              <span
                className="truncate select-none font-semibold text-center"
                style={{
                  fontSize: 14,
                  letterSpacing: 0,
                  color: "var(--color-ink-primary)",
                }}
              >
                AiKit News Chats
              </span>
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
                    e.currentTarget.style.color = "var(--color-ink-primary)";
                    e.currentTarget.style.backgroundColor =
                      "var(--color-surface-tertiary)";
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
              className="h-full overflow-y-auto px-1.5 py-1.5"
            >
              {chats.length === 0 ? (
                <p
                  className="px-2 py-6 text-center text-[12px] leading-relaxed"
                  style={{ color: "var(--color-ink-ghost)" }}
                >
                  No chats yet
                </p>
              ) : (
                chats.map((chat) => {
                  const isActive = chat.id === activeChatId;
                  const isHovered =
                    !isCompact && isOpen && hoveredId === chat.id;
                  const showDelete = isCompact || isActive || isHovered;
                  return (
                    <div
                      key={chat.id}
                      className="group relative mb-1 flex cursor-pointer items-center rounded-xl"
                      style={{
                        paddingLeft: 10,
                        paddingRight: isCompact ? 6 : 8,
                        backgroundColor: isActive
                          ? "var(--color-surface-tertiary)"
                          : isHovered
                            ? "var(--color-surface-hover)"
                            : "transparent",
                        color: isActive
                          ? "var(--color-ink-primary)"
                          : "var(--color-ink-secondary)",
                        transition: "background-color 120ms ease, color 120ms ease",
                        minHeight: isCompact ? 44 : 32,
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
                        className="flex-1 select-none truncate py-1.5 leading-snug"
                        style={{
                          fontSize: 12.5,
                          letterSpacing: 0,
                        }}
                      >
                        {chat.title || "New conversation"}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setHoveredId(null);
                          onDeleteChat(chat.id);
                        }}
                        className="ml-1 flex shrink-0 items-center justify-center rounded-lg transition-opacity duration-150"
                        style={{
                          width: isCompact ? 44 : 22,
                          height: isCompact ? 44 : 22,
                          color: "var(--color-ink-tertiary)",
                          opacity: showDelete ? 0.7 : 0,
                          pointerEvents: showDelete ? "auto" : "none",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.opacity = "1";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.opacity = showDelete
                            ? "0.7"
                            : "0";
                        }}
                        tabIndex={showDelete ? 0 : -1}
                        aria-hidden={showDelete ? undefined : true}
                        aria-label={`Delete ${chat.title || "conversation"}`}
                        title="Delete"
                      >
                        <HugeiconsIcon
                          icon={Delete02Icon}
                          size={isCompact ? 12 : 10}
                          strokeWidth={2.2}
                          primaryColor="currentColor"
                        />
                      </button>
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
              color: "var(--color-ink-primary)",
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
        animate={{ width: isOpen ? SIDEBAR_W : COLLAPSED_W }}
        transition={{ duration: 0.26, ease }}
        className="hidden shrink-0 lg:block"
        style={{ height: "100dvh" }}
      >
        <motion.div
          animate={{ paddingRight: isOpen ? 12 : 0 }}
          transition={{ duration: 0.26, ease }}
          className="flex h-full flex-col pt-4 pb-4 sm:pt-5 sm:pb-5"
          style={{ paddingLeft: 16, width: "100%" }}
        >
          {sidebarPanel}
        </motion.div>
      </motion.div>
    </>
  );
}

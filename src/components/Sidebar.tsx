"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Delete02Icon,
  GithubIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
} from "@hugeicons/core-free-icons";
import type { Chat } from "@/lib/types";
import ThemeToggler, { useIsDarkTheme } from "@/components/ui/ThemeToggler";

const SIDEBAR_W = 252;
const COLLAPSED_W = 64;
const COMPACT_MEDIA_QUERY = "(max-width: 1023px)";

const LOGO_PATH =
  "m256 0c-141.38 0-256 114.62-256 256s114.62 256 256 256 256-114.62 256-256-114.62-256-256-256zm0 375.36a119.36 119.36 0 1 1 119.36-119.36 119.36 119.36 0 0 1 -119.36 119.36z";

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  chats: Chat[];
  activeChatId: string;
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
  disabled?: boolean;
}

export default function Sidebar({
  isOpen,
  onToggle,
  chats,
  activeChatId,
  onNewChat,
  onSelectChat,
  onDeleteChat,
  disabled,
}: SidebarProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const isDark = useIsDarkTheme();
  const [isCompact, setIsCompact] = useState(false);

  const ease = [0.22, 1, 0.36, 1] as const;
  const inputSeparatorFocusedColor = isDark
    ? "var(--color-border-light)"
    : "var(--color-border-light)";
  const inputShellFillColor = "var(--color-surface-tertiary)";
  const segmentActionClass =
    "flex min-w-0 flex-1 items-center justify-center transition-colors duration-150";
  const segmentActionStyle = {
    minWidth: 0,
    minHeight: 34,
    color: "var(--color-ink-secondary)",
    backgroundColor: "transparent",
  } satisfies React.CSSProperties;
  const segmentHoverIn = (event: React.MouseEvent<HTMLElement>) => {
    event.currentTarget.style.color = "var(--color-ink-primary)";
  };
  const segmentHoverOut = (event: React.MouseEvent<HTMLElement>) => {
    event.currentTarget.style.color = "var(--color-ink-secondary)";
  };

  useEffect(() => {
    const mediaQuery = window.matchMedia(COMPACT_MEDIA_QUERY);
    const sync = () => setIsCompact(mediaQuery.matches);
    sync();
    mediaQuery.addEventListener("change", sync);
    return () => mediaQuery.removeEventListener("change", sync);
  }, []);

  const handleNewChat = () => {
    onNewChat();
    if (isCompact && isOpen) onToggle();
  };

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
        className="flex h-11 shrink-0 items-center px-3"
        style={{ gap: 8 }}
      >
        <div
          aria-hidden="true"
          className="flex shrink-0 items-center justify-center rounded-lg"
          style={{
            width: 24,
            height: 24,
            color: "var(--color-ink-primary)",
            opacity: 0.8,
          }}
        >
          <svg
            viewBox="0 0 512 512"
            xmlns="http://www.w3.org/2000/svg"
            style={{ width: 16, height: 16 }}
          >
            <path fill="currentColor" d={LOGO_PATH} />
          </svg>
        </div>

        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              key="header-expanded"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="flex flex-1 items-center justify-between overflow-hidden"
            >
              <span
                className="truncate select-none font-semibold"
                style={{
                  fontSize: 13,
                  letterSpacing: 0,
                  color: "var(--color-ink-primary)",
                }}
              >
                AiKit News
              </span>
              <button
                type="button"
                onClick={handleNewChat}
                disabled={disabled}
                title="New chat"
                className="ml-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg transition-colors duration-150 disabled:opacity-40"
                style={{ color: "var(--color-ink-tertiary)" }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.color = "var(--color-ink-primary)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = "var(--color-ink-tertiary)")
                }
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="div-top"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="mx-3 shrink-0"
            style={{
              height: 1,
              backgroundColor:
                "color-mix(in oklch, var(--color-border-light) 60%, transparent)",
            }}
          />
        )}
      </AnimatePresence>

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
                        transition:
                          "background-color 120ms ease, color 120ms ease",
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
                        style={{ fontSize: 12.5, letterSpacing: 0 }}
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

      <div className="shrink-0">
        <div
          className={
            isOpen
              ? "flex h-11 overflow-hidden"
              : "flex flex-col overflow-hidden"
          }
          style={{
            backgroundColor: inputShellFillColor,
            borderTop: `1px solid ${inputSeparatorFocusedColor}`,
          }}
        >
          <motion.a
            href="https://github.com/tanu360"
            target="_blank"
            rel="noopener noreferrer"
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.14, ease }}
            className={segmentActionClass}
            style={segmentActionStyle}
            aria-label="GitHub tanu360"
            title="GitHub tanu360"
            onMouseEnter={segmentHoverIn}
            onMouseLeave={segmentHoverOut}
          >
            <HugeiconsIcon
              icon={GithubIcon}
              size={14}
              strokeWidth={1.8}
              primaryColor="currentColor"
            />
          </motion.a>

          <div
            className={isOpen ? "h-full w-px" : "h-px w-full"}
            style={{
              backgroundColor: inputSeparatorFocusedColor,
            }}
          />

          <ThemeToggler
            className={segmentActionClass}
            iconSize={14}
            style={{
              ...segmentActionStyle,
              width: "100%",
              height: "100%",
              borderRadius: 0,
            }}
            aria-label="Toggle theme"
            title="Toggle theme"
            onMouseEnter={segmentHoverIn}
            onMouseLeave={segmentHoverOut}
          />

          <div
            className={isOpen ? "h-full w-px" : "h-px w-full"}
            style={{
              backgroundColor: inputSeparatorFocusedColor,
            }}
          />

          <motion.button
            type="button"
            onClick={onToggle}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.14, ease }}
            className={segmentActionClass}
            style={segmentActionStyle}
            aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
            title={isOpen ? "Collapse sidebar" : "Expand sidebar"}
            onMouseEnter={segmentHoverIn}
            onMouseLeave={segmentHoverOut}
          >
            <HugeiconsIcon
              icon={isOpen ? PanelLeftCloseIcon : PanelLeftOpenIcon}
              size={14}
              strokeWidth={1.8}
              primaryColor="currentColor"
            />
          </motion.button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <AnimatePresence initial={false}>
        {isCompact && !isOpen && (
          <motion.button
            key="mobile-sidebar-handle"
            type="button"
            onClick={onToggle}
            aria-label="Open sidebar"
            title="Open sidebar"
            initial={{ x: -12, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -12, opacity: 0 }}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.18, ease }}
            className="fixed left-0 z-30 flex h-28 w-11 items-center justify-start lg:hidden"
            style={{
              top: "calc(50% - 56px)",
              color: "var(--color-ink-secondary)",
              backgroundColor: "transparent",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <span
              aria-hidden="true"
              className="flex h-24 w-6 items-center justify-center rounded-r-2xl"
              style={{
                backgroundColor: "var(--color-surface-secondary)",
                border: "1px solid var(--color-border-light)",
                borderLeft: 0,
                boxShadow:
                  "0 12px 28px color-mix(in oklch, var(--color-ink-primary) 10%, transparent)",
              }}
            >
              <span
                className="rounded-full"
                style={{
                  width: 3,
                  height: 28,
                  backgroundColor: "var(--color-ink-ghost)",
                }}
              />
            </span>
          </motion.button>
        )}
      </AnimatePresence>
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

"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Cancel01Icon,
  GithubIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  Setting07Icon,
} from "@hugeicons/core-free-icons";
import type { Chat } from "@/lib/types";
import ThemeToggler, { useIsDarkTheme } from "@/components/ui/ThemeToggler";

const SIDEBAR_W = 252;
const COLLAPSED_W = 64;

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
  onSettingsClick: () => void;
  showSettings: boolean;
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
  onSettingsClick,
  showSettings,
  disabled,
}: SidebarProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const isDark = useIsDarkTheme();

  const ease = [0.22, 1, 0.36, 1] as const;
  const inputSeparatorFocusedColor = isDark
    ? "var(--color-input-border)"
    : "color-mix(in oklch, var(--color-border-light) 45%, transparent)";
  const inputShellFillColor = "var(--color-surface-tertiary)";
  const footerActionClass =
    "flex w-full items-center px-2.5 transition-colors duration-150";
  const segmentActionClass =
    "flex min-w-0 flex-1 items-center justify-center transition-colors duration-150";
  const footerActionStyle = {
    gap: 8,
    minHeight: 34,
    justifyContent: isOpen ? "flex-start" : "center",
    color: "var(--color-ink-secondary)",
    backgroundColor: "transparent",
  } satisfies React.CSSProperties;
  const segmentActionStyle = {
    minWidth: 0,
    minHeight: 34,
    color: "var(--color-ink-secondary)",
    backgroundColor: "transparent",
  } satisfies React.CSSProperties;
  const footerHoverIn = (event: React.MouseEvent<HTMLElement>) => {
    event.currentTarget.style.backgroundColor = "var(--color-surface-hover)";
    event.currentTarget.style.color = "var(--color-ink-primary)";
  };
  const footerHoverOut = (event: React.MouseEvent<HTMLElement>) => {
    event.currentTarget.style.backgroundColor = "transparent";
    event.currentTarget.style.color = "var(--color-ink-secondary)";
  };
  const segmentHoverIn = (event: React.MouseEvent<HTMLElement>) => {
    event.currentTarget.style.backgroundColor =
      "var(--color-sidebar-taskbar-hover)";
    event.currentTarget.style.color = "var(--color-ink-primary)";
  };
  const segmentHoverOut = (event: React.MouseEvent<HTMLElement>) => {
    event.currentTarget.style.backgroundColor = "transparent";
    event.currentTarget.style.color = "var(--color-ink-secondary)";
  };
  const footerLabel = (key: string, label: string) => (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.span
          key={key}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="truncate"
          style={{ fontSize: 12.5, letterSpacing: 0 }}
        >
          {label}
        </motion.span>
      )}
    </AnimatePresence>
  );

  return (
    <motion.div
      animate={{ width: isOpen ? SIDEBAR_W : COLLAPSED_W }}
      transition={{ duration: 0.26, ease }}
      className="shrink-0"
      style={{ height: "100dvh" }}
    >
      <motion.div
        animate={{ paddingRight: isOpen ? 12 : 0 }}
        transition={{ duration: 0.26, ease }}
        className="flex h-full flex-col pt-4 pb-4 sm:pt-5 sm:pb-5"
        style={{ paddingLeft: 16, width: "100%" }}
      >
        <div
          className="flex h-full flex-col"
          style={{
            borderRadius: 22,
            backgroundColor: "var(--color-surface-secondary)",
            border: "1px solid var(--color-border-light)",
            overflow: "hidden",
            transition:
              "background-color 240ms var(--theme-ease), border-color 240ms var(--theme-ease)",
          }}
        >
          <div
            className="flex shrink-0 items-center px-3 pb-2 pt-3"
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
                    onClick={onNewChat}
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
                      const isHovered = hoveredId === chat.id;
                      return (
                        <div
                          key={chat.id}
                          className="group relative mb-0.5 flex cursor-pointer items-center rounded-xl px-2.5"
                          style={{
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
                            minHeight: 32,
                          }}
                          onClick={() => !disabled && onSelectChat(chat.id)}
                          onMouseEnter={() => setHoveredId(chat.id)}
                          onMouseLeave={() => setHoveredId(null)}
                        >
                          <span
                            className="flex-1 select-none truncate py-1.5 leading-snug"
                            style={{ fontSize: 12.5, letterSpacing: 0 }}
                          >
                            {chat.title || "New conversation"}
                          </span>
                          {isHovered && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteChat(chat.id);
                              }}
                              className="ml-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-md"
                              style={{
                                color: "var(--color-ink-tertiary)",
                                opacity: 0.55,
                              }}
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.opacity = "1")
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.opacity = "0.55")
                              }
                              title="Delete"
                            >
                              <HugeiconsIcon
                                icon={Cancel01Icon}
                                size={10}
                                strokeWidth={2.2}
                                primaryColor="currentColor"
                              />
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div
            className="shrink-0"
            style={{
              borderTop:
                "1px solid var(--color-sidebar-taskbar-border)",
            }}
          >
            <div className={isOpen ? "px-1.5 py-1.5" : "py-1.5"}>
              <button
                type="button"
                onClick={onToggle}
                className={footerActionClass}
                style={footerActionStyle}
                aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
                title={isOpen ? "Collapse sidebar" : "Expand sidebar"}
                onMouseEnter={footerHoverIn}
                onMouseLeave={footerHoverOut}
              >
                <HugeiconsIcon
                  icon={isOpen ? PanelLeftCloseIcon : PanelLeftOpenIcon}
                  size={14}
                  strokeWidth={1.8}
                  primaryColor="currentColor"
                />
                {footerLabel("collapse-label", isOpen ? "Collapse" : "Expand")}
              </button>
            </div>

            <div
              className={
                isOpen
                  ? "flex h-9 overflow-hidden"
                  : "flex flex-col overflow-hidden"
              }
              style={{
                backgroundColor: inputShellFillColor,
                borderTop: `1px solid ${inputSeparatorFocusedColor}`,
              }}
            >
              <button
                type="button"
                onClick={onSettingsClick}
                className={segmentActionClass}
                aria-label="Settings"
                title="Settings"
                style={{
                  ...segmentActionStyle,
                  backgroundColor: showSettings
                    ? "var(--color-sidebar-taskbar-active)"
                    : "transparent",
                  color: showSettings
                    ? "var(--color-ink-primary)"
                    : "var(--color-ink-secondary)",
                }}
                onMouseEnter={(e) => {
                  if (!showSettings)
                    e.currentTarget.style.backgroundColor =
                      "var(--color-sidebar-taskbar-hover)";
                  e.currentTarget.style.color = "var(--color-ink-primary)";
                }}
                onMouseLeave={(e) => {
                  if (!showSettings)
                    e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.color = showSettings
                    ? "var(--color-ink-primary)"
                    : "var(--color-ink-secondary)";
                }}
              >
                <HugeiconsIcon
                  icon={Setting07Icon}
                  size={14}
                  strokeWidth={1.8}
                  primaryColor="currentColor"
                />
              </button>

              <div
                className={isOpen ? "h-full w-px" : "h-px w-full"}
                style={{
                  backgroundColor: inputSeparatorFocusedColor,
                }}
              />

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
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

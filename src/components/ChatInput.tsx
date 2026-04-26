"use client";

import { useRef, useEffect, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import { AiBrain03Icon, ArrowUp02Icon } from "@hugeicons/core-free-icons";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  placeholder?: string;
  agentMode: boolean;
  onAgentModeChange: (mode: boolean) => void;
}

export default function ChatInput({
  value,
  onChange,
  onSubmit,
  disabled,
  placeholder = "Ask anything...",
  agentMode,
  onAgentModeChange,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [focused, setFocused] = useState(false);
  const [ripple, setRipple] = useState(false);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 180) + "px";
  }, [value]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const submitMessage = () => {
    if (disabled || !value.trim()) return;
    triggerRipple();
    onSubmit();
  };

  const handleFormSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    submitMessage();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) {
      return;
    }

    e.preventDefault();
    submitMessage();
  };

  const triggerRipple = () => {
    setRipple(true);
    setTimeout(() => setRipple(false), 600);
  };

  const hasValue = value.trim().length > 0;
  const isActive = hasValue && !disabled;

  return (
    <form className="relative" onSubmit={handleFormSubmit}>
      <AnimatePresence>
        {ripple && (
          <motion.div
            initial={{ opacity: 0.15, scale: 0.95 }}
            animate={{ opacity: 0, scale: 1.02 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="pointer-events-none absolute -inset-1 rounded-2xl"
            style={{
              background: "var(--color-input-ripple)",
            }}
          />
        )}
      </AnimatePresence>

      <div
        className="relative overflow-hidden rounded-2xl transition-all duration-300"
        style={{
          background: focused
            ? "var(--color-input-bg-focus)"
            : "var(--color-input-bg)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          border: focused
            ? "1px solid var(--color-input-ring)"
            : "1px solid var(--color-input-border)",
        }}
      >
        <div className="flex items-end gap-2 px-4 pt-3.5 pb-2">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            disabled={disabled}
            placeholder={placeholder}
            enterKeyHint="send"
            rows={1}
            className="flex-1 resize-none bg-transparent text-[15px] leading-relaxed outline-none disabled:opacity-40"
            style={{
              color: "var(--color-ink-primary)",
              maxHeight: "180px",
              letterSpacing: "-0.01em",
              caretColor: "var(--color-accent)",
            }}
          />
        </div>

        <div className="flex items-center justify-between px-3 pb-2.5 pt-0.5">
          <button
            onClick={() => onAgentModeChange(!agentMode)}
            className="group relative flex items-center gap-1.5 rounded-full px-2.5 py-[5px] text-[12px] font-medium transition-all duration-300"
            style={{
              background: agentMode
                ? "var(--color-accent-muted)"
                : "transparent",
              color: agentMode
                ? "var(--color-accent-muted-strong)"
                : "var(--color-ink-tertiary)",
            }}
          >
            <HugeiconsIcon
              icon={AiBrain03Icon}
              size={13}
              strokeWidth={1.8}
              primaryColor="currentColor"
              className="transition-all duration-300"
              style={{
                color: agentMode
                  ? "var(--color-accent-muted-strong)"
                  : "var(--color-ink-tertiary)",
                transform: agentMode ? "scale(1.05)" : "scale(1)",
              }}
            />

            <span
              className="transition-all duration-300"
              style={{
                letterSpacing: agentMode ? "0.01em" : "0",
              }}
            >
              Deep Research
            </span>

            <AnimatePresence>
              {agentMode && (
                <motion.span
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 25 }}
                  className="h-1 w-1 rounded-full"
                  style={{
                    background: "var(--color-accent-dot)",
                  }}
                />
              )}
            </AnimatePresence>
          </button>

          <motion.button
            type="submit"
            disabled={disabled || !hasValue}
            animate={{
              scale: isActive ? 1 : 0.85,
              opacity: isActive ? 1 : 0,
            }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors duration-200 disabled:pointer-events-none"
            style={{
              background: isActive
                ? "var(--color-ink-primary)"
                : "transparent",
            }}
          >
            <HugeiconsIcon
              icon={ArrowUp02Icon}
              size={15}
              strokeWidth={2}
              primaryColor="currentColor"
              style={{ color: "var(--color-icon-on-fill)" }}
            />
          </motion.button>
        </div>
      </div>
    </form>
  );
}

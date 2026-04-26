"use client";

import React, { useRef, useEffect, useLayoutEffect, useState } from "react";
import type { KeyboardEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AiBrain03Icon,
  ArrowUp02Icon,
  Attachment01Icon,
  Cancel01Icon,
  CpuIcon,
  File01Icon,
} from "@hugeicons/core-free-icons";
import type { AttachedFile } from "@/lib/types";

const MODEL_NAME = process.env.NEXT_PUBLIC_CHATJIMMY_MODEL || "";
const FILE_CHAR_LIMIT = 16384;
const ACCEPTED_TYPES = ".txt,.md,.csv,.json,.ts,.tsx,.js,.jsx,.py,.html,.css,.yaml,.yml,.xml,.log";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  placeholder?: string;
  agentMode: boolean;
  onAgentModeChange: (mode: boolean) => void;
  attachedFile: AttachedFile | null;
  onFileAttach: (file: AttachedFile | null) => void;
}

export default function ChatInput({
  value,
  onChange,
  onSubmit,
  disabled,
  placeholder = "Ask anything...",
  agentMode,
  onAgentModeChange,
  attachedFile,
  onFileAttach,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const [agentControlHover, setAgentControlHover] = useState(false);
  const [modelName, setModelName] = useState(MODEL_NAME || "AI Model");
  const [ripple, setRipple] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const agentControlColor = agentMode
    ? "var(--color-accent-muted-strong)"
    : agentControlHover
      ? "var(--color-ink-secondary)"
      : "var(--color-ink-tertiary)";
  const minTextareaHeight = 52;

  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height =
      Math.max(minTextareaHeight, Math.min(el.scrollHeight, 180)) + "px";
  }, [value, minTextareaHeight]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadModelName() {
      try {
        const response = await fetch("/api/config", { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as { modelName?: unknown };
        const nextModelName =
          typeof data.modelName === "string" ? data.modelName.trim() : "";
        if (!cancelled && nextModelName) setModelName(nextModelName);
      } catch {
        return;
      }
    }
    loadModelName();
    return () => { cancelled = true; };
  }, []);

  const submitMessage = () => {
    if (disabled || !value.trim()) return;
    triggerRipple();
    onSubmit();
  };

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    submitMessage();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) return;
    e.preventDefault();
    submitMessage();
  };

  const triggerRipple = () => {
    setRipple(true);
    setTimeout(() => setRipple(false), 600);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content.length > FILE_CHAR_LIMIT) {
        setFileError(
          `File too large — ${content.length.toLocaleString()} chars (limit: ${FILE_CHAR_LIMIT.toLocaleString()})`
        );
        onFileAttach(null);
        return;
      }
      setFileError(null);
      onFileAttach({ name: file.name, content, size: file.size, charCount: content.length });
    };
    reader.onerror = () => {
      setFileError("Could not read file. Make sure it's a plain text file.");
    };
    reader.readAsText(file);
  };

  const removeFile = () => {
    onFileAttach(null);
    setFileError(null);
  };

  const hasValue = value.trim().length > 0;
  const isActive = hasValue && !disabled;
  const themeColorTransition =
    "background-color 240ms var(--theme-ease), border-color 240ms var(--theme-ease), color 240ms var(--theme-ease)";

  return (
    <form className="relative" onSubmit={handleFormSubmit}>
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        className="hidden"
        onChange={handleFileChange}
      />

      <AnimatePresence>
        {ripple && (
          <motion.div
            initial={{ opacity: 0.15, scale: 0.95 }}
            animate={{ opacity: 0, scale: 1.02 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="pointer-events-none absolute -inset-1 rounded-[26px]"
            style={{ background: "var(--color-input-ripple)" }}
          />
        )}
      </AnimatePresence>

      <div
        className="rounded-[22px] p-1"
        style={{
          border: "1px solid var(--color-border-light)",
          backgroundColor: "var(--color-surface-tertiary)",
          transition: themeColorTransition,
        }}
      >
        <div
          className="overflow-hidden rounded-[20px]"
          style={{
            backgroundColor: focused
              ? "var(--color-input-bg-focus)"
              : "var(--color-input-bg)",
            border: "1px solid var(--color-border-light)",
            backdropFilter: "blur(20px) saturate(180%)",
            WebkitBackdropFilter: "blur(20px) saturate(180%)",
            transition: themeColorTransition,
          }}
        >
          <div className="px-4 pt-4 pb-3">
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
              className="w-full resize-none bg-transparent text-[15px] leading-relaxed outline-none disabled:opacity-40"
              style={{
                color: "var(--color-ink-primary)",
                maxHeight: "180px",
                minHeight: `${minTextareaHeight}px`,
                letterSpacing: "-0.01em",
                caretColor: "var(--color-accent)",
              }}
            />

            <AnimatePresence>
              {(attachedFile || fileError) && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: "auto", marginTop: 8 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  {fileError ? (
                    <div
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-[12px]"
                      style={{
                        backgroundColor: "color-mix(in oklch, #ef4444 10%, transparent)",
                        border: "1px solid color-mix(in oklch, #ef4444 25%, transparent)",
                        color: "#ef4444",
                      }}
                    >
                      <span className="flex-1">{fileError}</span>
                      <button
                        type="button"
                        onClick={removeFile}
                        className="shrink-0 opacity-60 transition-opacity hover:opacity-100"
                        aria-label="Dismiss error"
                      >
                        <HugeiconsIcon
                          icon={Cancel01Icon}
                          size={12}
                          strokeWidth={2}
                          primaryColor="currentColor"
                        />
                      </button>
                    </div>
                  ) : attachedFile ? (
                    <div
                      className="inline-flex max-w-full items-center gap-2 rounded-xl px-3 py-2 text-[12px]"
                      style={{
                        backgroundColor: "var(--color-surface-tertiary)",
                        border: "1px solid var(--color-border-default)",
                        color: "var(--color-ink-secondary)",
                      }}
                    >
                      <HugeiconsIcon
                        icon={File01Icon}
                        size={13}
                        strokeWidth={1.8}
                        primaryColor="currentColor"
                        style={{ color: "var(--color-ink-tertiary)", flexShrink: 0 }}
                      />
                      <span
                        className="truncate font-medium"
                        style={{ color: "var(--color-ink-primary)", maxWidth: 180 }}
                      >
                        {attachedFile.name}
                      </span>
                      <span style={{ color: "var(--color-ink-tertiary)" }}>·</span>
                      <span className="shrink-0" style={{ color: "var(--color-ink-tertiary)" }}>
                        {formatFileSize(attachedFile.size)} · {attachedFile.charCount.toLocaleString()} chars
                      </span>
                      <button
                        type="button"
                        onClick={removeFile}
                        className="ml-0.5 shrink-0 opacity-50 transition-opacity hover:opacity-100"
                        style={{ color: "var(--color-ink-tertiary)" }}
                        aria-label="Remove file"
                      >
                        <HugeiconsIcon
                          icon={Cancel01Icon}
                          size={12}
                          strokeWidth={2}
                          primaryColor="currentColor"
                        />
                      </button>
                    </div>
                  ) : null}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div
            className="mx-0"
            style={{
              height: "1px",
              backgroundColor: focused
                ? "var(--color-input-border)"
                : "var(--color-border-light)",
              transition: "background-color 220ms var(--theme-ease)",
            }}
          />

          <div className="flex items-center justify-between px-3 py-2">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onAgentModeChange(!agentMode)}
                onMouseEnter={() => setAgentControlHover(true)}
                onMouseLeave={() => setAgentControlHover(false)}
                onFocus={() => setAgentControlHover(true)}
                onBlur={() => setAgentControlHover(false)}
                className="flex items-center gap-1.5 rounded-full px-2.5 py-1.25 text-[12px] font-medium transition-[background-color,border-color,color,transform] duration-200"
                style={{
                  backgroundColor: agentMode
                    ? "var(--color-accent-muted)"
                    : "transparent",
                  color: agentControlColor,
                  border: "1px solid",
                  borderColor: agentMode
                    ? "color-mix(in oklch, var(--color-accent) 20%, transparent)"
                    : "transparent",
                  transitionTimingFunction: "var(--theme-ease)",
                }}
              >
                <HugeiconsIcon
                  icon={AiBrain03Icon}
                  size={13}
                  strokeWidth={1.8}
                  primaryColor="currentColor"
                  className="transition-[color,transform] duration-200"
                  style={{
                    color: agentControlColor,
                    transform: agentMode ? "scale(1.05)" : "scale(1)",
                    transitionTimingFunction: "var(--theme-ease)",
                  }}
                />
                <span
                  className="transition-colors duration-200"
                  style={{
                    letterSpacing: agentMode ? "0.01em" : "0",
                    transitionTimingFunction: "var(--theme-ease)",
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
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: "var(--color-accent-dot)" }}
                    />
                  )}
                </AnimatePresence>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
                title="Attach text file"
                className="flex h-7 w-7 items-center justify-center rounded-full transition-[background-color,border-color,color] duration-200 disabled:opacity-30"
                style={{
                  backgroundColor: attachedFile
                    ? "var(--color-accent-muted)"
                    : "transparent",
                  color: attachedFile
                    ? "var(--color-accent-muted-strong)"
                    : "var(--color-ink-tertiary)",
                  border: "1px solid",
                  borderColor: attachedFile
                    ? "color-mix(in oklch, var(--color-accent) 20%, transparent)"
                    : "transparent",
                }}
              >
                <HugeiconsIcon
                  icon={Attachment01Icon}
                  size={13}
                  strokeWidth={1.8}
                  primaryColor="currentColor"
                />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <HugeiconsIcon
                  icon={CpuIcon}
                  size={13}
                  strokeWidth={1.8}
                  primaryColor="currentColor"
                  style={{ color: "var(--color-ink-tertiary)" }}
                />
                <span
                  className="text-[12px] font-medium"
                  style={{ color: "var(--color-ink-secondary)" }}
                >
                  {modelName}
                </span>
              </div>

              <motion.button
                type="submit"
                disabled={disabled || !hasValue}
                animate={{
                  scale: isActive ? 1 : 0.85,
                  opacity: isActive ? 1 : 0,
                  width: isActive ? 28 : 0,
                }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="flex h-7 items-center justify-center overflow-hidden rounded-lg transition-colors duration-200 disabled:pointer-events-none"
                style={{
                  backgroundColor: isActive
                    ? "var(--color-ink-primary)"
                    : "transparent",
                  minWidth: 0,
                  transitionTimingFunction: "var(--theme-ease)",
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
        </div>
      </div>
    </form>
  );
}

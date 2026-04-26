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
const FILE_SIZE_LIMIT = 16 * 1024;
const ACCEPTED_TYPES = ".txt,.md,.mdx,.csv,.json,.jsonc,.ts,.tsx,.js,.jsx,.mjs,.cjs,.py,.html,.htm,.css,.scss,.sass,.less,.yaml,.yml,.xml,.log,.toml,.ini,.cfg,.conf,.env,.sh,.bash,.zsh,.fish,.sql,.rs,.go,.java,.c,.cpp,.cc,.h,.hpp,.rb,.php,.swift,.kt,.dart,.r,.tex,.vue,.svelte,.graphql,.gql,.proto";

function truncateFileName(name: string): string {
  const dotIdx = name.lastIndexOf(".");
  if (dotIdx <= 0) return name.length > 8 ? name.slice(0, 8) + "..." : name;
  const stem = name.slice(0, dotIdx);
  const ext = name.slice(dotIdx);
  return stem.length > 8 ? stem.slice(0, 8) + "..." + ext : name;
}

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
  const [fileButtonHover, setFileButtonHover] = useState(false);
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

    if (file.size > FILE_SIZE_LIMIT) {
      setFileError(`File too large — ${formatFileSize(file.size)} (limit: 16 KB)`);
      onFileAttach(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
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
          border: focused
            ? "1px solid var(--color-border-default)"
            : "1px solid var(--color-border-light)",
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
            border: focused
              ? "1px solid var(--color-border-default)"
              : "1px solid var(--color-border-light)",
            backdropFilter: "blur(20px) saturate(180%)",
            WebkitBackdropFilter: "blur(20px) saturate(180%)",
            transition: themeColorTransition,
          }}
        >
          <div className="relative px-4 pt-4 pb-3">
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
                paddingRight: hasValue ? "2.25rem" : undefined,
              }}
            />

            <motion.button
              type="submit"
              disabled={disabled || !hasValue}
              animate={{
                scale: isActive ? 1 : 0.8,
                opacity: isActive ? 1 : 0,
                width: isActive ? 28 : 0,
              }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="absolute bottom-3 right-4 flex h-7 items-center justify-center overflow-hidden rounded-full transition-colors duration-200 disabled:pointer-events-none"
              style={{
                backgroundColor: isActive ? "var(--color-ink-primary)" : "transparent",
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
                      className="inline-flex max-w-full items-center gap-1.5 rounded-2xl px-2.5 py-1.5 text-[11.5px]"
                      style={{
                        backgroundColor: "var(--color-surface-secondary)",
                        border: "1px solid var(--color-border-light)",
                        color: "var(--color-ink-ghost)",
                      }}
                    >
                      <HugeiconsIcon
                        icon={File01Icon}
                        size={12}
                        strokeWidth={1.7}
                        primaryColor="currentColor"
                        style={{ color: "var(--color-ink-ghost)", flexShrink: 0 }}
                      />
                      <span
                        className="shrink-0 font-medium tracking-tight"
                        style={{ color: "var(--color-ink-primary)" }}
                      >
                        {truncateFileName(attachedFile.name)}
                      </span>
                      <span style={{ color: "var(--color-ink-ghost)", opacity: 0.5 }}>·</span>
                      <span className="shrink-0">
                        {formatFileSize(attachedFile.size)}
                      </span>
                      <button
                        type="button"
                        onClick={removeFile}
                        className="ml-0.5 shrink-0 flex h-4 w-4 items-center justify-center rounded-full transition-opacity duration-150 hover:opacity-75"
                        style={{
                          backgroundColor: "var(--color-ink-primary)",
                          color: "var(--color-icon-on-fill)",
                        }}
                        aria-label="Remove file"
                      >
                        <HugeiconsIcon
                          icon={Cancel01Icon}
                          size={9}
                          strokeWidth={2.5}
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
                : "color-mix(in oklch, var(--color-border-light) 45%, transparent)",
              transition: "background-color 220ms var(--theme-ease)",
            }}
          />

          <div className="flex items-center justify-between px-3 py-1.5">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                onMouseEnter={() => setFileButtonHover(true)}
                onMouseLeave={() => setFileButtonHover(false)}
                onFocus={() => setFileButtonHover(true)}
                onBlur={() => setFileButtonHover(false)}
                disabled={disabled}
                title="Attach text file"
                className="flex h-7 w-7 items-center justify-center rounded-full transition-[background-color,border-color,color] duration-200 disabled:opacity-30"
                style={{
                  backgroundColor: attachedFile ? "var(--color-ink-primary)" : "transparent",
                  color: attachedFile
                    ? "var(--color-icon-on-fill)"
                    : fileButtonHover
                      ? "var(--color-ink-secondary)"
                      : "var(--color-ink-tertiary)",
                  border: "1px solid transparent",
                }}
              >
                <HugeiconsIcon
                  icon={Attachment01Icon}
                  size={13}
                  strokeWidth={1.8}
                  primaryColor="currentColor"
                />
              </button>

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
                  border: agentMode ? "1px solid" : "1px solid transparent",
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
            </div>

            <div className="flex items-center gap-1" style={{ opacity: 0.55 }}>
              <HugeiconsIcon
                icon={CpuIcon}
                size={11}
                strokeWidth={1.7}
                primaryColor="currentColor"
                style={{ color: "var(--color-ink-tertiary)" }}
              />
              <span
                className="text-[11px] font-medium tracking-tight"
                style={{ color: "var(--color-ink-secondary)" }}
              >
                {modelName}
              </span>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}

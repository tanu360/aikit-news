"use client";

import React, { useRef, useEffect, useLayoutEffect, useState } from "react";
import type { KeyboardEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowUp02Icon,
  Cancel01Icon,
  FileAddIcon,
  File01Icon,
  Search01Icon,
  Setting07Icon,
  SunCloud01Icon,
} from "@hugeicons/core-free-icons";
import type { AttachedFile } from "@/lib/types";
import type {
  ChatToolKey,
  ChatToolSettings,
} from "@/lib/toolSettings";
import {
  FILE_TOKEN_LIMIT,
  formatTokenCount,
  getAttachmentTokenCount,
  getSiteTokenCount,
} from "@/lib/tokenCount";
import { Slider } from "@/components/ui/Slider";
import { useIsDarkTheme } from "@/components/ui/ThemeToggler";

const MODEL_NAME = process.env.NEXT_PUBLIC_CHATJIMMY_MODEL || "";
const ACCEPTED_FILE_EXTENSIONS = [
  ".txt", ".md", ".mdx", ".csv", ".json", ".jsonc", ".ts", ".tsx",
  ".js", ".jsx", ".mjs", ".cjs", ".py", ".html", ".htm", ".css",
  ".scss", ".sass", ".less", ".yaml", ".yml", ".xml", ".log", ".toml",
  ".ini", ".cfg", ".conf", ".env", ".sh", ".bash", ".zsh", ".fish",
  ".sql", ".rs", ".go", ".java", ".c", ".cpp", ".cc", ".h", ".hpp",
  ".rb", ".php", ".swift", ".kt", ".dart", ".r", ".tex", ".vue",
  ".svelte", ".graphql", ".gql", ".proto",
] as const;
const ACCEPTED_TYPES = ACCEPTED_FILE_EXTENSIONS.join(",");
const BLOCKED_FILE_TYPE_PREFIXES = ["image/", "video/", "audio/"] as const;
const TOOL_OPTIONS: Array<{
  key: ChatToolKey;
  label: string;
  shortLabel: string;
  icon: typeof Search01Icon;
}> = [
    {
      key: "search",
      label: "Search",
      shortLabel: "Search",
      icon: Search01Icon,
    },
    {
      key: "weather",
      label: "Weather",
      shortLabel: "Weather",
      icon: SunCloud01Icon,
    },
  ];

function isSupportedAttachment(file: File): boolean {
  const lowerName = file.name.toLowerCase();
  const hasSupportedExtension = ACCEPTED_FILE_EXTENSIONS.some((extension) =>
    lowerName.endsWith(extension)
  );
  const hasBlockedMediaType = BLOCKED_FILE_TYPE_PREFIXES.some((prefix) =>
    file.type.startsWith(prefix)
  );
  return hasSupportedExtension && !hasBlockedMediaType;
}

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
  systemPrompt: string;
  onSystemPromptChange: (v: string) => void;
  topK: number;
  onTopKChange: (v: number) => void;
  toolSettings: ChatToolSettings;
  onToolSettingsChange: (settings: ChatToolSettings) => void;
  showSettings: boolean;
  onSettingsClick: () => void;
  onSettingsClose: () => void;
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
  systemPrompt,
  onSystemPromptChange,
  topK,
  onTopKChange,
  toolSettings,
  onToolSettingsChange,
  showSettings,
  onSettingsClick,
  onSettingsClose,
}: ChatInputProps) {
  const rootRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const [agentControlHover, setAgentControlHover] = useState(false);
  const [fileButtonHover, setFileButtonHover] = useState(false);
  const [modelName, setModelName] = useState(MODEL_NAME || "AI Model");
  const [ripple, setRipple] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const isDark = useIsDarkTheme();
  const exaActiveColor = isDark ? "#829FFF" : "#1F40ED";
  const fileErrorForeground = "oklch(0.985 0.008 27)";
  const fileErrorMutedForeground = "#ebebeb";
  const isAgentActive = agentMode || agentControlHover;
  const agentControlColor = isAgentActive ? exaActiveColor : "var(--color-ink-tertiary)";
  const exaIconColor = isAgentActive ? exaActiveColor : "var(--color-ink-tertiary)";
  const minTextareaHeight = 52;
  const enabledToolCount = TOOL_OPTIONS.filter((tool) => toolSettings[tool.key]).length;
  const fileUploadDisabled = toolSettings.weather;

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
    if (!showSettings) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (rootRef.current?.contains(target)) return;
      onSettingsClose();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [onSettingsClose, showSettings]);

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

  const hasValue = value.trim().length > 0;
  const canSubmit = (hasValue || !!attachedFile) && !disabled;
  const isActive = canSubmit;
  const fileErrorLimitIndex = fileError?.indexOf(" (limit:");

  const submitMessage = () => {
    if (!canSubmit) return;
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

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (showSettings) onSettingsClose();
    onChange(e.target.value);
  };

  const handlePromptFocus = () => {
    setFocused(true);
    if (showSettings) onSettingsClose();
  };

  const triggerRipple = () => {
    setRipple(true);
    setTimeout(() => setRipple(false), 600);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    if (!isSupportedAttachment(file)) {
      setFileError(
        "Only text/code files are supported. Images and videos are not allowed."
      );
      onFileAttach(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const tokenCount = getSiteTokenCount(content);

      if (tokenCount > FILE_TOKEN_LIMIT) {
        const actualTokens = formatTokenCount(tokenCount);
        const limitTokens = formatTokenCount(FILE_TOKEN_LIMIT);

        setFileError(
          `File too large - ${actualTokens} (limit: ${limitTokens}).`
        );
        onFileAttach(null);
        return;
      }

      setFileError(null);
      const fileWithPath = file as File & {
        path?: string;
        webkitRelativePath?: string;
      };
      const path =
        fileWithPath.path || fileWithPath.webkitRelativePath || undefined;
      onFileAttach({
        name: file.name,
        path,
        content,
        size: file.size,
        tokenCount,
      });
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

  const toggleTool = (key: ChatToolKey) => {
    onToolSettingsChange({
      ...toolSettings,
      [key]: !toolSettings[key],
    });
  };

  const themeColorTransition =
    "background-color 240ms var(--theme-ease), border-color 240ms var(--theme-ease), color 240ms var(--theme-ease)";

  return (
    <form ref={rootRef} className="relative" onSubmit={handleFormSubmit}>
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        className="hidden"
        disabled={fileUploadDisabled || disabled}
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
            ? "1px solid color-mix(in oklch, var(--color-border-light) 45%, transparent)"
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
              ? "1px solid color-mix(in oklch, var(--color-border-light) 45%, transparent)"
              : "1px solid var(--color-border-light)",
            backdropFilter: "blur(20px) saturate(180%)",
            WebkitBackdropFilter: "blur(20px) saturate(180%)",
            transition: themeColorTransition,
          }}
        >
          <AnimatePresence>
            {showSettings && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <div className="px-4 pt-3 pb-3 flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[11px] font-medium" style={{ color: "var(--color-ink-tertiary)" }}>
                      System prompt
                    </span>
                    <div
                      className="overflow-hidden rounded-2xl"
                      style={{
                        backgroundColor: "var(--color-surface-secondary)",
                        border: "1px solid var(--color-border-light)",
                        transition: themeColorTransition,
                      }}
                    >
                      <textarea
                        value={systemPrompt}
                        onChange={(e) => onSystemPromptChange(e.target.value)}
                        placeholder="You are a helpful assistant."
                        rows={3}
                        className="block w-full resize-none border-0 bg-transparent px-3 py-2 text-[13px] leading-relaxed outline-none"
                        style={{
                          color: "var(--color-ink-primary)",
                          caretColor: "var(--color-accent)",
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-3">
                      <span
                        className="text-[11px] font-medium"
                        style={{ color: "var(--color-ink-tertiary)" }}
                      >
                        Tools
                      </span>
                      <span
                        className="shrink-0 text-[11px] font-medium"
                        style={{ color: "var(--color-ink-tertiary)" }}
                      >
                        {enabledToolCount}/{TOOL_OPTIONS.length} enabled
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {TOOL_OPTIONS.map((tool) => {
                        const enabled = toolSettings[tool.key];
                        return (
                          <button
                            key={tool.key}
                            type="button"
                            role="switch"
                            aria-checked={enabled}
                            aria-label={`Toggle ${tool.label}`}
                            onClick={() => toggleTool(tool.key)}
                            className="flex min-h-10 items-center gap-2 rounded-xl px-2.5 py-2 text-left transition-[background-color,border-color,color,opacity] duration-200"
                            style={{
                              backgroundColor: enabled
                                ? `color-mix(in oklch, ${exaActiveColor} 10%, transparent)`
                                : "var(--color-surface-secondary)",
                              border: "1px solid",
                              borderColor: enabled
                                ? `color-mix(in oklch, ${exaActiveColor} 26%, transparent)`
                                : "var(--color-border-light)",
                              color: enabled
                                ? exaActiveColor
                                : "var(--color-ink-secondary)",
                              transitionTimingFunction: "var(--theme-ease)",
                            }}
                            title={tool.label}
                          >
                            <HugeiconsIcon
                              icon={tool.icon}
                              size={13}
                              strokeWidth={1.8}
                              primaryColor="currentColor"
                              style={{ flexShrink: 0 }}
                            />
                            <span className="min-w-0 flex-1 truncate text-[12px] font-medium">
                              {tool.shortLabel}
                            </span>
                            <span
                              className="relative h-4 w-7 shrink-0 rounded-full transition-colors duration-200"
                              style={{
                                backgroundColor: enabled
                                  ? exaActiveColor
                                  : "color-mix(in oklch, var(--color-ink-tertiary) 18%, transparent)",
                              }}
                            >
                              <span
                                className="absolute top-0.5 h-3 w-3 rounded-full transition-transform duration-200"
                                style={{
                                  left: 2,
                                  transform: enabled
                                    ? "translateX(12px)"
                                    : "translateX(0)",
                                  backgroundColor: "var(--color-icon-on-fill)",
                                }}
                              />
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className="shrink-0 text-[11px] font-medium"
                      style={{ color: "var(--color-ink-tertiary)" }}
                    >
                      Top K
                    </span>
                    <Slider
                      value={[topK]}
                      min={1}
                      max={8}
                      step={1}
                      className="flex-1"
                      onValueChange={(values) => {
                        const nextValue = values[0];
                        if (typeof nextValue === "number") onTopKChange(nextValue);
                      }}
                      aria-label="Top K"
                    />
                    <span
                      className="min-w-9 shrink-0 rounded-2xl px-2.5 py-1 text-center text-[11px] font-medium"
                      style={{
                        color: "var(--color-ink-primary)",
                        backgroundColor: "var(--color-surface-secondary)",
                        border: "1px solid var(--color-border-light)",
                      }}
                    >
                      {topK}
                    </span>
                  </div>
                </div>
                <div style={{ height: "1px", backgroundColor: "color-mix(in oklch, var(--color-border-light) 45%, transparent)" }} />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative px-4 pt-4 pb-3">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={handlePromptChange}
              onKeyDown={handleKeyDown}
              onFocus={handlePromptFocus}
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
                letterSpacing: 0,
                caretColor: "var(--color-accent)",
                paddingRight: hasValue ? "2.25rem" : undefined,
              }}
            />

            <motion.button
              type="submit"
              disabled={!canSubmit}
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
                      className="inline-flex max-w-full items-center gap-1.5 rounded-2xl px-2.5 py-1.5 text-[11.5px] font-medium"
                      style={{
                        backgroundColor: "oklch(0.58 0.23 27)",
                        color: fileErrorForeground,
                      }}
                    >
                      <HugeiconsIcon
                        icon={File01Icon}
                        size={12}
                        strokeWidth={1.7}
                        primaryColor="currentColor"
                        style={{
                          color: fileErrorMutedForeground,
                          flexShrink: 0,
                        }}
                      />
                      <span className="min-w-0 truncate">
                        {typeof fileErrorLimitIndex === "number" &&
                          fileErrorLimitIndex >= 0 ? (
                          <>
                            {fileError.slice(0, fileErrorLimitIndex)}
                            <span style={{ color: fileErrorMutedForeground }}>
                              {fileError.slice(fileErrorLimitIndex)}
                            </span>
                          </>
                        ) : (
                          fileError
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={removeFile}
                        className="ml-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full transition-opacity duration-150 hover:opacity-80"
                        style={{
                          backgroundColor:
                            `color-mix(in oklch, ${fileErrorForeground} 18%, transparent)`,
                          color: fileErrorForeground,
                        }}
                        aria-label="Dismiss file error"
                      >
                        <HugeiconsIcon
                          icon={Cancel01Icon}
                          size={9}
                          strokeWidth={2.5}
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
                        color: "var(--color-ink-tertiary)",
                      }}
                    >
                      <HugeiconsIcon
                        icon={File01Icon}
                        size={12}
                        strokeWidth={1.7}
                        primaryColor="currentColor"
                        style={{ color: "var(--color-ink-tertiary)", flexShrink: 0 }}
                      />
                      <span
                        className="shrink-0 font-medium"
                        style={{ color: "var(--color-ink-primary)" }}
                      >
                        {truncateFileName(attachedFile.name)}
                      </span>
                      <span style={{ color: "var(--color-ink-tertiary)", opacity: 0.5 }}>·</span>
                      <span className="shrink-0" style={{ color: "var(--color-ink-tertiary)" }}>
                        {formatFileSize(attachedFile.size)} ·{" "}
                        {formatTokenCount(getAttachmentTokenCount(attachedFile))}
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
              backgroundColor: focused && isDark
                ? "var(--color-input-border)"
                : "color-mix(in oklch, var(--color-border-light) 45%, transparent)",
              transform: "translateY(-1px)",
              transition: "background-color 220ms var(--theme-ease)",
            }}
          />

          <div className="flex min-h-9 items-center gap-3 px-4 pt-2 pb-2">
            <div className="flex min-w-0 flex-1 items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  if (fileUploadDisabled) return;
                  fileInputRef.current?.click();
                }}
                onMouseEnter={() => setFileButtonHover(true)}
                onMouseLeave={() => setFileButtonHover(false)}
                onFocus={() => setFileButtonHover(true)}
                onBlur={() => setFileButtonHover(false)}
                disabled={disabled || fileUploadDisabled}
                title={
                  fileUploadDisabled
                    ? "Disable Weather to attach files"
                    : "Attach text file"
                }
                aria-label={
                  fileUploadDisabled
                    ? "Disable Weather to attach files"
                    : "Attach text file"
                }
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition-[background-color,border-color,color] duration-200 disabled:cursor-not-allowed disabled:opacity-30"
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
                  icon={FileAddIcon}
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
                className="flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium transition-[background-color,border-color,color,transform] duration-200"
                style={{
                  backgroundColor: agentMode
                    ? `color-mix(in oklch, ${exaActiveColor} 10%, transparent)`
                    : "transparent",
                  color: agentControlColor,
                  border: "1px solid",
                  borderColor: agentMode
                    ? `color-mix(in oklch, ${exaActiveColor} 28%, transparent)`
                    : "transparent",
                  transitionTimingFunction: "var(--theme-ease)",
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  width={13}
                  height={13}
                  style={{
                    flexShrink: 0,
                    transform: agentMode ? "scale(1.05)" : "scale(1)",
                    transition: "transform 200ms var(--theme-ease)",
                  }}
                >
                  <path
                    clipRule="evenodd"
                    d="M3 0h19v1.791L13.892 12 22 22.209V24H3V0zm9.62 10.348l6.589-8.557H6.03l6.59 8.557zM5.138 3.935v7.17h5.52l-5.52-7.17zm5.52 8.96h-5.52v7.17l5.52-7.17zM6.03 22.21l6.59-8.557 6.589 8.557H6.03z"
                    fill={exaIconColor}
                    style={{ transition: "fill 200ms var(--theme-ease)" }}
                    fillRule="evenodd"
                  />
                </svg>
                <span
                  className="transition-colors duration-200"
                  style={{
                    letterSpacing: 0,
                    transitionTimingFunction: "var(--theme-ease)",
                  }}
                >
                  Deep Research
                </span>
                <motion.span
                  animate={{
                    scale: agentMode ? 1 : 0.6,
                    opacity: agentMode ? 1 : 0,
                  }}
                  transition={{ type: "spring", stiffness: 500, damping: 25 }}
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{
                    background: `color-mix(in oklch, ${exaActiveColor} 65%, transparent)`,
                  }}
                />
              </button>
            </div>

            <div className="ml-auto flex shrink-0 items-center justify-end gap-2">
              <button
                type="button"
                onClick={onSettingsClick}
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition-colors duration-200"
                style={{
                  color: showSettings
                    ? "var(--color-ink-primary)"
                    : "var(--color-ink-tertiary)",
                  backgroundColor: "transparent",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "var(--color-ink-primary)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = showSettings
                    ? "var(--color-ink-primary)"
                    : "var(--color-ink-tertiary)";
                }}
                aria-label="Settings"
                title="Settings"
              >
                <HugeiconsIcon
                  icon={Setting07Icon}
                  size={13}
                  strokeWidth={1.8}
                  primaryColor="currentColor"
                />
              </button>
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="9" viewBox="0 0 256 171" style={{ flexShrink: 0 }}>
                <defs>
                  <linearGradient id="meta-a" x1="13.878%" x2="89.144%" y1="55.934%" y2="58.694%">
                    <stop offset="0%" stopColor="#0064E1" />
                    <stop offset="40%" stopColor="#0064E1" />
                    <stop offset="83%" stopColor="#0073EE" />
                    <stop offset="100%" stopColor="#0082FB" />
                  </linearGradient>
                  <linearGradient id="meta-b" x1="54.315%" x2="54.315%" y1="82.782%" y2="39.307%">
                    <stop offset="0%" stopColor="#0082FB" />
                    <stop offset="100%" stopColor="#0064E0" />
                  </linearGradient>
                </defs>
                <path fill="#0081FB" d="M27.651 112.136c0 9.775 2.146 17.28 4.95 21.82 3.677 5.947 9.16 8.466 14.751 8.466 7.211 0 13.808-1.79 26.52-19.372 10.185-14.092 22.186-33.874 30.26-46.275l13.675-21.01c9.499-14.591 20.493-30.811 33.1-41.806C161.196 4.985 172.298 0 183.47 0c18.758 0 36.625 10.87 50.3 31.257C248.735 53.584 256 81.707 256 110.729c0 17.253-3.4 29.93-9.187 39.946-5.591 9.686-16.488 19.363-34.818 19.363v-27.616c15.695 0 19.612-14.422 19.612-30.927 0-23.52-5.484-49.623-17.564-68.273-8.574-13.23-19.684-21.313-31.907-21.313-13.22 0-23.859 9.97-35.815 27.75-6.356 9.445-12.882 20.956-20.208 33.944l-8.066 14.289c-16.203 28.728-20.307 35.271-28.408 46.07-14.2 18.91-26.324 26.076-42.287 26.076-18.935 0-30.91-8.2-38.325-20.556C2.973 139.413 0 126.202 0 111.148l27.651.988Z" />
                <path fill="url(#meta-a)" d="M21.802 33.206C34.48 13.666 52.774 0 73.757 0 85.91 0 97.99 3.597 110.605 13.897c13.798 11.261 28.505 29.805 46.853 60.368l6.58 10.967c15.881 26.459 24.917 40.07 30.205 46.49 6.802 8.243 11.565 10.7 17.752 10.7 15.695 0 19.612-14.422 19.612-30.927l24.393-.766c0 17.253-3.4 29.93-9.187 39.946-5.591 9.686-16.488 19.363-34.818 19.363-11.395 0-21.49-2.475-32.654-13.007-8.582-8.083-18.615-22.443-26.334-35.352l-22.96-38.352C118.528 64.08 107.96 49.73 101.845 43.23c-6.578-6.988-15.036-15.428-28.532-15.428-10.923 0-20.2 7.666-27.963 19.39L21.802 33.206Z" />
                <path fill="url(#meta-b)" d="M73.312 27.802c-10.923 0-20.2 7.666-27.963 19.39-10.976 16.568-17.698 41.245-17.698 64.944 0 9.775 2.146 17.28 4.95 21.82L9.027 149.482C2.973 139.413 0 126.202 0 111.148 0 83.772 7.514 55.24 21.802 33.206 34.48 13.666 52.774 0 73.757 0l-.445 27.802Z" />
              </svg>
              <span
                className="inline-block max-w-30 truncate text-right text-[12px] font-medium"
                style={{
                  color: "var(--color-ink-secondary)",
                  opacity: 0.55,
                }}
                title={modelName}
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

"use client";

import type { ComponentPropsWithoutRef } from "react";
import { useCallback, useRef, useSyncExternalStore } from "react";
import { Moon02Icon, Sun01Icon, Tv01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { flushSync } from "react-dom";

import { cn } from "@/lib/utils";

const THEME_STORAGE_KEY = "aikit-theme";
const LEGACY_THEME_STORAGE_KEY = "theme";
const THEME_CHANGE_EVENT = "aikit-theme-change";
const THEME_MODES = ["system", "light", "dark"] as const;

type ThemeMode = (typeof THEME_MODES)[number];

type ViewTransitionLike = {
  ready?: Promise<void>;
  finished?: Promise<void>;
};

type DocumentWithViewTransition = Document & {
  startViewTransition?: (callback: () => void) => ViewTransitionLike;
};

export type TransitionVariant =
  | "circle"
  | "square"
  | "triangle"
  | "diamond"
  | "hexagon"
  | "rectangle"
  | "star";

interface AnimatedThemeTogglerProps extends ComponentPropsWithoutRef<"button"> {
  duration?: number;
  variant?: TransitionVariant;
  /** When true, the transition expands from the viewport center instead of the button center. */
  fromCenter?: boolean;
  iconSize?: number;
}

function polygonCollapsed(cx: number, cy: number, vertexCount: number): string {
  const pairs = Array.from(
    { length: vertexCount },
    () => `${cx}px ${cy}px`
  ).join(", ");
  return `polygon(${pairs})`;
}

function getThemeTransitionClipPaths(
  variant: TransitionVariant,
  cx: number,
  cy: number,
  maxRadius: number,
  viewportWidth: number,
  viewportHeight: number
): [string, string] {
  switch (variant) {
    case "circle":
      return [
        `circle(0px at ${cx}px ${cy}px)`,
        `circle(${maxRadius}px at ${cx}px ${cy}px)`,
      ];
    case "square": {
      const halfW = Math.max(cx, viewportWidth - cx);
      const halfH = Math.max(cy, viewportHeight - cy);
      const halfSide = Math.max(halfW, halfH) * 1.05;
      const end = [
        `${cx - halfSide}px ${cy - halfSide}px`,
        `${cx + halfSide}px ${cy - halfSide}px`,
        `${cx + halfSide}px ${cy + halfSide}px`,
        `${cx - halfSide}px ${cy + halfSide}px`,
      ].join(", ");
      return [polygonCollapsed(cx, cy, 4), `polygon(${end})`];
    }
    case "triangle": {
      const scale = maxRadius * 2.2;
      const dx = (Math.sqrt(3) / 2) * scale;
      const verts = [
        `${cx}px ${cy - scale}px`,
        `${cx + dx}px ${cy + 0.5 * scale}px`,
        `${cx - dx}px ${cy + 0.5 * scale}px`,
      ].join(", ");
      return [polygonCollapsed(cx, cy, 3), `polygon(${verts})`];
    }
    case "diamond": {
      const radius = maxRadius * Math.SQRT2;
      const end = [
        `${cx}px ${cy - radius}px`,
        `${cx + radius}px ${cy}px`,
        `${cx}px ${cy + radius}px`,
        `${cx - radius}px ${cy}px`,
      ].join(", ");
      return [polygonCollapsed(cx, cy, 4), `polygon(${end})`];
    }
    case "hexagon": {
      const radius = maxRadius * Math.SQRT2;
      const verts: string[] = [];
      for (let i = 0; i < 6; i++) {
        const angle = -Math.PI / 2 + (i * Math.PI) / 3;
        verts.push(
          `${cx + radius * Math.cos(angle)}px ${cy + radius * Math.sin(angle)}px`
        );
      }
      return [polygonCollapsed(cx, cy, 6), `polygon(${verts.join(", ")})`];
    }
    case "rectangle": {
      const halfW = Math.max(cx, viewportWidth - cx);
      const halfH = Math.max(cy, viewportHeight - cy);
      const end = [
        `${cx - halfW}px ${cy - halfH}px`,
        `${cx + halfW}px ${cy - halfH}px`,
        `${cx + halfW}px ${cy + halfH}px`,
        `${cx - halfW}px ${cy + halfH}px`,
      ].join(", ");
      return [polygonCollapsed(cx, cy, 4), `polygon(${end})`];
    }
    case "star": {
      const radius = maxRadius * Math.SQRT2 * 1.03;
      const innerRatio = 0.42;
      const starPolygon = (starRadius: number) => {
        const verts: string[] = [];
        for (let i = 0; i < 5; i++) {
          const outerAngle = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
          verts.push(
            `${cx + starRadius * Math.cos(outerAngle)}px ${cy + starRadius * Math.sin(outerAngle)}px`
          );
          const innerAngle = outerAngle + Math.PI / 5;
          verts.push(
            `${cx + starRadius * innerRatio * Math.cos(innerAngle)}px ${cy + starRadius * innerRatio * Math.sin(innerAngle)}px`
          );
        }
        return `polygon(${verts.join(", ")})`;
      };
      const startRadius = Math.max(2, radius * 0.025);
      return [starPolygon(startRadius), starPolygon(radius)];
    }
    default:
      return [
        `circle(0px at ${cx}px ${cy}px)`,
        `circle(${maxRadius}px at ${cx}px ${cy}px)`,
      ];
  }
}

function isThemeMode(value: string | null | undefined): value is ThemeMode {
  return THEME_MODES.includes(value as ThemeMode);
}

function getStoredThemeMode(): ThemeMode {
  if (typeof window === "undefined") return "system";

  const rootTheme = document.documentElement.dataset.theme;
  if (isThemeMode(rootTheme)) return rootTheme;

  const storedTheme =
    window.localStorage.getItem(THEME_STORAGE_KEY) ??
    window.localStorage.getItem(LEGACY_THEME_STORAGE_KEY);

  return isThemeMode(storedTheme) ? storedTheme : "system";
}

function getServerThemeModeSnapshot(): ThemeMode {
  return "system";
}

function getIsDarkThemeSnapshot() {
  if (typeof window === "undefined") return false;

  const themeMode = getStoredThemeMode();
  if (themeMode === "dark") return true;
  if (themeMode === "light") return false;

  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function getNextThemeMode(mode: ThemeMode): ThemeMode {
  const index = THEME_MODES.indexOf(mode);
  return THEME_MODES[(index + 1) % THEME_MODES.length];
}

function notifyThemeChanged() {
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

function setStoredThemeMode(mode: ThemeMode) {
  if (typeof window === "undefined") return;

  const root = document.documentElement;
  const isDark =
    mode === "dark" ||
    (mode === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  root.dataset.theme = mode;
  root.classList.toggle("dark", isDark);
  window.localStorage.setItem(THEME_STORAGE_KEY, mode);
  window.localStorage.setItem(LEGACY_THEME_STORAGE_KEY, mode);
  notifyThemeChanged();
}

function subscribeToThemeChanges(callback: () => void) {
  if (typeof window === "undefined") return () => { };

  const root = document.documentElement;
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const observer = new MutationObserver(callback);
  const handleColorSchemeChange = () => {
    if (getStoredThemeMode() === "system") {
      root.classList.toggle("dark", getIsDarkThemeSnapshot());
    }
    callback();
  };
  const handleStorage = (event: StorageEvent) => {
    if (
      event.key === THEME_STORAGE_KEY ||
      event.key === LEGACY_THEME_STORAGE_KEY
    ) {
      callback();
    }
  };

  observer.observe(root, {
    attributes: true,
    attributeFilter: ["class", "data-theme"],
  });
  mediaQuery.addEventListener("change", handleColorSchemeChange);
  window.addEventListener("storage", handleStorage);
  window.addEventListener(THEME_CHANGE_EVENT, callback);

  return () => {
    observer.disconnect();
    mediaQuery.removeEventListener("change", handleColorSchemeChange);
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(THEME_CHANGE_EVENT, callback);
  };
}

export function useThemeMode() {
  return useSyncExternalStore(
    subscribeToThemeChanges,
    getStoredThemeMode,
    getServerThemeModeSnapshot
  );
}

export function useIsDarkTheme() {
  return useSyncExternalStore(
    subscribeToThemeChanges,
    getIsDarkThemeSnapshot,
    () => false
  );
}

export const AnimatedThemeToggler = ({
  className,
  duration = 400,
  variant,
  fromCenter = false,
  iconSize = 18,
  onClick,
  type = "button",
  ...props
}: AnimatedThemeTogglerProps) => {
  const shape = variant ?? "circle";
  const themeMode = useThemeMode();
  const nextThemeMode = getNextThemeMode(themeMode);
  const themeIcon =
    themeMode === "system"
      ? Tv01Icon
      : themeMode === "light"
        ? Sun01Icon
        : Moon02Icon;
  const buttonRef = useRef<HTMLButtonElement>(null);

  const toggleTheme = useCallback(() => {
    const button = buttonRef.current;
    if (!button) return;

    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      button.querySelector<HTMLElement>(".theme-toggle-icon")?.animate(
        [
          { transform: "rotate(0deg) scale(1)" },
          { transform: "rotate(150deg) scale(0.92)" },
          { transform: "rotate(360deg) scale(1)" },
        ],
        {
          duration: 280,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        }
      );
    }

    const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
    const viewportHeight = window.visualViewport?.height ?? window.innerHeight;

    let x: number;
    let y: number;
    if (fromCenter) {
      x = viewportWidth / 2;
      y = viewportHeight / 2;
    } else {
      const { top, left, width, height } = button.getBoundingClientRect();
      x = left + width / 2;
      y = top + height / 2;
    }

    const maxRadius = Math.hypot(
      Math.max(x, viewportWidth - x),
      Math.max(y, viewportHeight - y)
    );

    const applyTheme = () => {
      setStoredThemeMode(nextThemeMode);
    };

    const viewTransitionDocument = document as DocumentWithViewTransition;
    if (typeof viewTransitionDocument.startViewTransition !== "function") {
      applyTheme();
      return;
    }

    const root = document.documentElement;
    root.dataset.magicuiThemeVt = "active";
    root.style.setProperty(
      "--magicui-theme-toggle-vt-duration",
      `${duration}ms`
    );

    const cleanup = () => {
      delete root.dataset.magicuiThemeVt;
      root.style.removeProperty("--magicui-theme-toggle-vt-duration");
    };

    const transition = viewTransitionDocument.startViewTransition(() => {
      flushSync(applyTheme);
    });

    if (typeof transition?.finished?.finally === "function") {
      transition.finished.finally(cleanup);
    } else {
      cleanup();
    }

    const ready = transition?.ready;
    if (ready && typeof ready.then === "function") {
      const clipPath = getThemeTransitionClipPaths(
        shape,
        x,
        y,
        maxRadius,
        viewportWidth,
        viewportHeight
      );

      ready.then(() => {
        document.documentElement.animate(
          {
            clipPath,
          },
          {
            duration,
            easing: shape === "star" ? "linear" : "ease-in-out",
            fill: "forwards",
            pseudoElement: "::view-transition-new(root)",
          }
        );
      });
    }
  }, [shape, fromCenter, duration, nextThemeMode]);

  return (
    <button
      {...props}
      type={type}
      ref={buttonRef}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) {
          toggleTheme();
        }
      }}
      className={cn(
        "header-action-button theme-toggle-button",
        className
      )}
    >
      <span className="theme-toggle-icon inline-flex items-center justify-center">
        <HugeiconsIcon
          icon={themeIcon}
          size={iconSize}
          strokeWidth={1.9}
          primaryColor="currentColor"
        />
      </span>
      <span className="sr-only">Toggle theme</span>
    </button>
  );
};

export const ThemeToggler = AnimatedThemeToggler;

export default AnimatedThemeToggler;

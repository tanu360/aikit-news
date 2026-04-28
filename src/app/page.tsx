"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  ArrowDown01Icon,
  ArrowUp01Icon,
  PencilEdit01Icon,
  ArtificialIntelligence04Icon,
  GithubIcon,
  Search01Icon,
  MessageSearch01Icon,
  SunCloud01Icon,
} from "@hugeicons/core-free-icons";
import type {
  AttachedFile,
  Chat,
  ChatContextCompaction,
  GenerationStats,
  Message,
  MessageResponseMode,
  MessageVersion,
  SearchResult,
  ResearchStep,
  WeatherCardData,
} from "@/lib/types";
import type { ChatToolSettings } from "@/lib/toolSettings";
import {
  DEFAULT_CHAT_TOOL_SETTINGS,
  normalizeChatToolSettings,
} from "@/lib/toolSettings";
import {
  generateChatId,
  generateId,
  parseSSEStream,
  stripCitations,
} from "@/lib/utils";
import {
  clearAllChats as clearStoredChats,
  loadAllChats,
  persistChat,
  removeChat,
} from "@/lib/chatStore";
import {
  AUTO_COMPACT_TRIGGER_TOKEN_LIMIT,
  COMPACTED_CONTEXT_TOKEN_LIMIT,
  MODEL_CONTEXT_TOKEN_LIMIT,
  getAttachmentTokenCount,
  getSiteTokenCount,
} from "@/lib/tokenCount";
import { SVG3D } from "3dsvg";
import ChatInput from "@/components/ChatInput";
import MessageBubble from "@/components/MessageBubble";
import Sidebar from "@/components/Sidebar";
import ThemeToggler, { useIsDarkTheme } from "@/components/ui/ThemeToggler";

const LOGO_PATH =
  "m256 0c-141.38 0-256 114.62-256 256s114.62 256 256 256 256-114.62 256-256-114.62-256-256-256zm0 375.36a119.36 119.36 0 1 1 119.36-119.36 119.36 119.36 0 0 1 -119.36 119.36z";
const getLogoSvg = (color: string) =>
  `<svg aria-hidden="true" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><path fill="${color}" d="${LOGO_PATH}"></path></svg>`;
const LOGO_3D_THEME = {
  light: {
    color: "#202227",
    metalness: 1,
    roughness: 0.05,
    ambientIntensity: 0.3,
    lightIntensity: 1.2,
  },
  dark: {
    color: "#f4f6f8",
    metalness: 0.25,
    roughness: 0.18,
    ambientIntensity: 0.85,
    lightIntensity: 1.65,
  },
} as const;

const MASCOT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1024" height="1024" viewBox="0 0 1024 1024"><path fill="#273842" d="M347.128 8.21877C349.591 8.05428 353.835 7.78809 356.19 8.3426C374.036 12.5452 375.84 37.5945 395.84 38.5485C404.928 38.9821 416.21 36.8834 425.316 35.407C435.297 33.7547 445.292 32.1896 455.301 30.7118C474.146 27.8741 493.141 26.146 512.189 25.5365C531.545 25.0946 565.839 25.5162 584.315 28.7749C654.348 41.5175 722.883 74.9781 771.027 128.162C787.393 146.242 799.72 166.282 816.895 183.339C823.654 190.278 834.121 191.871 841.883 196.255C911.056 235.327 940.572 318.528 924.973 394.467C921.475 411.5 912.187 433.169 913.559 449.96C920.429 459.871 934.628 469.855 940.614 480.187C974.435 538.561 958.061 621.505 904.116 662.306C896.881 667.778 886.188 671.46 878.662 677.036C876.19 685.807 875.505 705.048 874.325 715.222C871.348 739.95 865.425 765.609 856.164 788.84C830.157 854.077 777.169 907.503 721.165 948.116C699.294 963.976 672.161 976.701 647.447 987.015C583.124 1010.99 520.386 1018.02 452.113 1013.36C420.141 1011.19 377.864 1002.77 347.555 992.31C237.466 954.325 129.323 877.759 88.2263 764.668C82.4969 748.901 76.8002 733.462 73.336 716.919C68.1465 692.088 66.3215 666.671 67.9103 641.353C71.3321 585.135 97.2516 520.366 135.049 478.063C150.28 461.018 166.121 449.786 182.89 434.979C182.641 412.421 187.438 390.155 192.162 368.365C207.647 296.942 241.372 239.783 288.338 184.641C296.577 174.967 305.495 166.354 313.932 157.071C310.833 152.852 306.834 148.742 303.593 144.444C293.672 131.287 285.478 118.674 281.612 102.398C276.433 80.6024 285.779 61.6809 296.662 43.4362C306.506 26.9321 328.263 12.3639 347.128 8.21877Z"/><path fill="#FCBD90" d="M331.685 173.291C362.624 180.015 387.116 190.334 420.339 188.171C455.937 186.288 488.055 171.194 522.139 163.236C560.649 154.245 607.225 151.955 645.937 162.7C685.761 173.753 757.666 211.534 751.188 261.67C749.834 272.15 736.985 292.161 731.746 301.72C708.282 344.909 705.139 395.036 732.897 437.074C737.708 444.359 743.064 452.082 746.252 460.291C753.582 480.642 756.433 508.821 773.167 524.49L779.515 524.567C790.536 513.964 793.548 508.556 802.586 496.708C819.773 474.176 839.417 461.007 868.617 461.435C885.91 462.063 895.94 467.473 907.649 479.543C924.263 496.111 930.351 512.647 932.43 535.596C935.233 566.542 930.404 592.059 913.348 618.356C897.914 642.152 877.562 653.602 848.929 653.92C840.21 654.017 832.462 653.704 823.73 655.443C824.399 663.099 828.982 678.824 828.616 684.631C827.631 700.227 829.135 718.659 826.701 733.671C820.697 771.407 797.52 814.598 773.021 843.587C739.179 883.632 687.557 925.202 639.098 946.037C601.493 962.206 536.498 980.019 495.609 979.041C495.581 981.145 495.976 980.346 494.677 981.651C489.277 983.41 479.258 982.849 473.715 980.961C473.268 980.809 472.535 979.957 472.105 979.743C469.605 979.985 467.101 980.173 464.593 980.305C453.795 980.777 438.556 979.106 427.455 977.944C397.587 974.715 368.17 968.183 339.743 958.467C327.163 954.088 317.71 949.642 305.648 944.184C262.828 924.811 221.902 899.097 187.178 867.267C150.924 833.604 123.108 791.876 105.983 745.462C99.5905 728.138 96.0095 714.729 93.9233 696.423C92.7933 686.507 90.0861 675.778 90.0345 665.673C91.3015 657.965 88.4915 641.427 90.4156 634.469C94.2941 620.445 95.8637 605.618 99.1755 591.412C100.829 584.32 103.539 577.539 105.317 570.779C108.769 557.659 113.604 546.277 120.312 534.543C131.85 511.013 143.056 495.654 162.508 477.974C175.025 466.596 192.507 460.161 201.04 446.04C209.321 427.638 209.074 402.325 212.077 382.244C220.41 326.515 240.992 273.789 276.47 229.642C280.886 224.111 287.999 214.282 292.804 209.369C300.067 201.941 307.646 195.365 314.971 187.578C318.465 183.433 320.864 181.486 325.212 178.294C327.122 176.772 329.704 174.586 331.685 173.291Z"/><path fill="#735C57" d="M472.105 979.743C477.233 977.877 490.23 978.28 495.609 979.041C495.581 981.145 495.976 980.346 494.677 981.651C489.277 983.41 479.258 982.849 473.715 980.961C473.268 980.809 472.535 979.957 472.105 979.743Z"/><path fill="#C39A7E" d="M325.212 178.294C324.915 182.558 321.155 187.256 317.013 188.284C316.378 188.071 315.576 187.828 314.971 187.578C318.465 183.433 320.864 181.486 325.212 178.294Z"/><path fill="#273842" d="M583.787 529.65C596.658 529.039 619.615 539.27 629.688 547.53C637.868 554.237 649.631 574.972 643.594 585.496C640.243 591.336 627.641 595.907 624.697 602.774C623.381 606.641 622.509 614.864 621.816 618.992C620.648 626.082 619.163 633.116 617.367 640.073C609.842 669.016 595.21 702.267 577.286 726.565C564.309 744.155 541.369 761.3 522.899 772.57C481.471 797.848 426.208 808.532 381.845 784.379C348.642 766.815 327.946 747.396 308.997 715.039C303.097 704.194 294.606 685.868 293.698 673.57C293.131 665.885 293.5 651.885 293.493 643.717C283.338 634.829 273.748 635.265 263.382 627.297C249.874 616.839 235.373 603.286 232.717 585.515C232.033 580.942 233.3 575.809 238.852 575.497C246.948 575.042 251.266 584.557 256.322 589.378C276.615 608.729 301.287 620.973 328.55 627.09C352.516 633.336 369.174 636.031 394.432 635.337C409.412 634.925 423.535 634.519 438.432 632.487C474.699 627.541 506.841 612.401 539.106 596.058C549.442 590.822 572.432 577.916 580.245 569.745C580.95 565.487 581.015 563.736 581.02 559.385C579.391 557.016 577.671 554.667 576.103 552.261C569.598 542.282 571.373 532.536 583.787 529.65Z"/><path fill="#D76C34" d="M524.43 682.216C536.139 681.387 556.209 685.344 555.615 700.534C555.032 715.411 539.332 730.455 527.868 738.484C518.846 744.422 508.081 752.621 497.834 756.097C488.128 759.39 477.794 763.403 468.3 766.702C461.47 769.075 445.087 771.024 437.732 771.012C410.342 770.972 394.268 758.743 416.187 733.222C428.867 719.897 446.939 706.085 464.127 699.123C482.536 691.665 504.897 683.601 524.43 682.216Z"/><path fill="#273842" d="M272.416 511.746C279.005 466.384 339.038 453.084 377.248 458.457C390.053 460.258 403.73 464.013 415.054 470.31C421.534 473.913 429.053 484.688 422.666 491.291C417.723 493.667 401.939 484.867 396.599 483.489C376.611 478.33 356.885 476.249 336.601 481.3C330.577 482.744 326.353 482.899 320.422 485.695C308.738 491.123 299.808 501.128 295.739 513.352C290.969 527.298 305.786 548.824 316.748 556.106C355.084 581.357 406.624 573.535 441.174 545.469C444.258 542.964 450.397 537.796 453.595 536.365C464.174 531.632 466.477 541.016 466.318 548.671C462.869 554.946 448.733 568.229 442.605 572.236C404.558 597.116 358.848 601.664 317.956 580.85C298.092 570.74 278.868 555.291 272.645 532.87C269.233 528.026 265.07 514.463 272.416 511.746Z"/><path fill="#C39A7E" d="M272.645 532.87C269.233 528.026 265.07 514.463 272.416 511.746C272.095 518.803 272.428 525.811 272.645 532.87Z"/><path fill="#273842" d="M290.544 811.531C294.459 811.243 298.362 812.243 301.655 814.38C307.149 818.02 318.854 833.846 326.264 839.994C359.905 868.211 401.728 877.023 444.588 872.19C467.125 869.649 480.134 865.885 500.143 854.959C506.79 851.329 534.483 831.184 536.278 848.706C536.761 853.425 532.228 859.41 529.071 862.745C525.544 866.148 517.513 872.891 513.359 875.882C494.902 888.64 469.545 896.398 447.367 899.217C435.059 900.781 414.755 900.412 402.259 899.176C395.666 898.524 382.714 895.905 376.491 894.141C352.811 887.425 329.746 874.082 310.941 858.355C307.649 855.567 301.451 847.776 298.603 843.981C292.904 836.389 285.933 824.976 287.621 814.987C287.927 813.176 289.085 812.55 290.544 811.531Z"/><path fill="#273842" d="M523.788 371.655C544.552 370.903 549.68 381.93 557.168 399.073C565.859 418.971 555.118 456.547 533.801 464.467C527.261 465.546 521.283 465.324 515.863 461.32C492.125 443.782 491.744 403.739 508.934 381.621C512.929 376.482 517.172 372.613 523.788 371.655Z"/><path fill="#273842" d="M302.602 367.578C323.04 365.862 329.347 381.098 334.632 397.325C340.328 414.813 336.438 429.144 328.47 445.243C325.041 452.171 318.907 456.987 311.581 459.098C274.699 464.4 268.878 402.388 285.18 380.934C290.193 374.336 295.168 370.727 302.602 367.578Z"/><path fill="#273842" d="M533.339 256.209C563.739 252.412 609.448 277.257 612.246 311.942C612.656 317.024 607.633 321.396 604.029 324.525C592.625 320.086 588.68 317.919 581.22 308.457C579.981 307.101 578.689 305.796 577.346 304.545C561.081 289.162 542.803 284.962 521.286 290.059C508.357 293.121 502.435 298.654 491.547 287.855C491.403 282.151 492.212 277.386 496.438 273.162C506.653 262.949 519.35 257.245 533.339 256.209Z"/><path fill="#273842" d="M311.952 259.169C321.346 258.112 343.373 259.108 348.097 268.928C351.11 275.191 354.104 290.622 346.362 294.751C340.405 297.928 334.291 292.651 328.727 291.105C316.465 287.147 302.729 289.376 291.569 295.528C284.216 299.99 270.652 311.42 260.86 308.886C259.82 308.617 258.413 306.566 258.372 305.419C257.921 292.716 266.656 281.889 276.398 274.705C288.775 264.768 296.588 261.705 311.952 259.169Z"/><path fill="#273842" d="M876.322 506.6C882.938 505.843 883.53 507.21 886.904 512.598C883.102 518.145 876.548 523.406 872.28 530.128C855.31 556.856 871.273 559.735 875.698 579.604C872.234 590.21 866.827 593.022 857.626 586.584C851.887 581.991 846.822 571.222 841.392 565.264C838.75 562.365 834.011 559.145 832.693 556.668C831.76 546.229 839.854 538.182 845.445 530.423C853.578 519.135 862.482 510.318 876.322 506.6Z"/></svg>`;

let lastRequestEndWall = 0;
const DESKTOP_MEDIA_QUERY = "(min-width: 1024px)";
const SIDEBAR_EDGE_SWIPE_WIDTH = 72;
const SIDEBAR_SWIPE_TRIGGER_DISTANCE = 42;
const SIDEBAR_SWIPE_DIRECTION_RATIO = 1.15;
const TOOL_SETTINGS_STORAGE_KEY = "aikit-tool-settings";
const CHAT_ID_PATTERN =
  /^aikit-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const EMPTY_STATE_SUGGESTIONS = [
  {
    label: "Deep research on latest AI news",
    icon: ArtificialIntelligence04Icon,
    mode: "deepResearch",
  },
  {
    label: "Search latest tech headlines",
    icon: Search01Icon,
    mode: "search",
  },
  {
    label: "Delhi weather today",
    icon: SunCloud01Icon,
    mode: "weather",
  },
] as const;

function parseServerTiming(header: string | null): Record<string, number> {
  if (!header) return {};
  const out: Record<string, number> = {};
  for (const entry of header.split(",")) {
    const parts = entry.trim().split(";");
    const name = parts[0]?.trim();
    const durPart = parts.find((p) => p.trim().startsWith("dur="));
    if (name && durPart) {
      const val = parseFloat(durPart.trim().slice(4));
      if (!isNaN(val)) out[name] = val;
    }
  }
  return out;
}

function logTiming(
  label: string,
  meta: {
    query?: string;
    tStartWall: number;
    tFirstByteWall: number;
    tEndWall: number;
    serverTiming: string | null;
    vercelId: string | null;
  }
) {
  const clientTotal = meta.tEndWall - meta.tStartWall;
  const firstByte = meta.tFirstByteWall - meta.tStartWall;
  const bodyRead = meta.tEndWall - meta.tFirstByteWall;
  const idleBefore =
    lastRequestEndWall > 0
      ? Math.round((meta.tStartWall - lastRequestEndWall) / 1000)
      : null;

  const isSlow = clientTotal > 1500;
  const isFast = clientTotal < 600;
  const color = isSlow ? "#e11d48" : isFast ? "#16a34a" : "#f59e0b";
  const weight = isSlow ? "bold" : "normal";
  const slowTag = isSlow ? " ⚠ SLOW" : "";

  const st = parseServerTiming(meta.serverTiming);
  const queryFrag = meta.query ? ` "${meta.query.slice(0, 50)}"` : "";
  const idleFrag = idleBefore !== null ? ` · idle ${idleBefore}s` : "";

  console.groupCollapsed(
    `%c[${label}]%c ${clientTotal.toFixed(0)}ms%c${queryFrag}${idleFrag}${slowTag}`,
    "color: #888; font-weight: normal",
    `color: ${color}; font-weight: ${weight}`,
    "color: #666; font-weight: normal"
  );

  console.log("%cClient (DevTools-measured)", "font-weight: bold; color: #0ea5e9");
  console.log(`  total:        ${clientTotal}ms`);
  console.log(`  first_byte:   ${firstByte}ms  (fetch → response headers)`);
  console.log(`  body_read:    ${bodyRead}ms  (headers → body fully received)`);

  if (Object.keys(st).length > 0) {
    console.log(
      "%cServer (Server-Timing header from Vercel edge route)",
      "font-weight: bold; color: #8b5cf6"
    );
    for (const [k, v] of Object.entries(st)) {
      const isBottleneck = v > clientTotal * 0.5;
      console.log(
        `  %c${k.padEnd(14)}%c ${v}ms${isBottleneck ? " ← bottleneck" : ""}`,
        isBottleneck ? "color: #e11d48; font-weight: bold" : "",
        ""
      );
    }
    const clientOnly = clientTotal - (st["total"] ?? 0);
    console.log(
      `  ${"(network)".padEnd(14)} ~${clientOnly}ms  (client ↔ Vercel edge, i.e. your ISP path)`
    );
  } else {
    console.log(
      "%c(no Server-Timing header — old deployment or error response)",
      "color: #999"
    );
  }

  console.log("%cInfra", "font-weight: bold; color: #f97316");
  console.log(`  vercel-id:    ${meta.vercelId ?? "—"}`);
  console.log(`  timestamp:    ${new Date(meta.tEndWall).toISOString()}`);
  if (idleBefore !== null) {
    console.log(`  idle_before:  ${idleBefore}s since previous request`);
  } else {
    console.log(`  idle_before:  (first request this session)`);
  }

  console.groupEnd();

  lastRequestEndWall = meta.tEndWall;
}

function createEmptyChat(id = generateChatId()): Chat {
  return {
    id,
    title: "",
    messages: [],
    createdAt: nowMs(),
    updatedAt: nowMs(),
  };
}

function getChatIdFromUrl(): string {
  if (typeof window === "undefined") return "";
  const [segment] = window.location.pathname.split("/").filter(Boolean);
  if (!segment) return "";

  const chatId = decodeURIComponent(segment);
  return CHAT_ID_PATTERN.test(chatId) ? chatId : "";
}

function hasRouteSegment(): boolean {
  if (typeof window === "undefined") return false;
  return window.location.pathname.split("/").filter(Boolean).length > 0;
}

function writeChatUrl(chatId: string, mode: "push" | "replace" = "push") {
  if (typeof window === "undefined" || !CHAT_ID_PATTERN.test(chatId)) return;
  const nextPath = `/${chatId}`;
  if (window.location.pathname === nextPath) return;

  const method = mode === "replace" ? "replaceState" : "pushState";
  window.history[method]({}, "", nextPath);
}

function writeHomeUrl(mode: "push" | "replace" = "push") {
  if (typeof window === "undefined" || window.location.pathname === "/") return;

  const method = mode === "replace" ? "replaceState" : "pushState";
  window.history[method]({}, "", "/");
}

function extractSearchControlQuery(content: string): string | null {
  const [firstLine = ""] = content.trimStart().split(/\r?\n/);
  const unwrappedFirstLine = firstLine
    .trim()
    .replace(/^[-*>*`\s]+/, "")
    .replace(/[`*\s]+$/, "")
    .trim();
  const match = unwrappedFirstLine.match(/^search\s*:\s*(.+)$/i);
  return match?.[1]?.trim() || null;
}

function isHorizontalSidebarSwipe(deltaX: number, deltaY: number) {
  return (
    Math.abs(deltaX) >= SIDEBAR_SWIPE_TRIGGER_DISTANCE &&
    Math.abs(deltaX) > Math.abs(deltaY) * SIDEBAR_SWIPE_DIRECTION_RATIO
  );
}

type ApiContentPart =
  | { type: "text"; text: string }
  | { type: "file"; name: string; content: string; size?: number };

type ApiChatMessage = {
  role: string;
  content: string | ApiContentPart[];
};

function buildContentWithAttachments(
  content: string,
  attachments?: AttachedFile[]
) {
  if (!attachments?.length) return content;
  const typedMessage = content.trim();
  const parts: ApiContentPart[] = [];
  if (typedMessage) {
    parts.push({ type: "text", text: typedMessage });
  }
  attachments.forEach((file) => {
    parts.push({
      type: "file",
      name: file.name,
      size: file.size,
      content: file.content,
    });
  });
  return parts;
}

function buildApiAttachment(file: AttachedFile | null) {
  if (!file) return undefined;
  return {
    name: file.name,
    size: file.size,
    content: file.content,
  };
}

function buildApiContent(message: Message) {
  if (message.role === "assistant") return stripCitations(message.content);
  return buildContentWithAttachments(message.content, message.attachments);
}

function formatCompactionSystemContent(summary: string) {
  return [
    "Previous conversation memory summary:",
    summary.trim(),
    "",
    "Use this as durable context for earlier visible chat messages that are intentionally omitted from this API request.",
  ].join("\n");
}

function getCompactionBoundaryIndex(
  messages: Message[],
  compaction: ChatContextCompaction | null
): number {
  if (!compaction?.compactedThroughMessageId) return -1;
  const idIndex = messages.findIndex(
    (message) => message.id === compaction.compactedThroughMessageId
  );
  if (idIndex >= 0) return idIndex;

  if (!compaction.compactedThroughTimestamp) return -1;
  let timestampIndex = -1;
  messages.forEach((message, index) => {
    if (message.timestamp <= compaction.compactedThroughTimestamp) {
      timestampIndex = index;
    }
  });
  return timestampIndex;
}

function getMessagesAfterCompaction(
  messages: Message[],
  compaction: ChatContextCompaction | null
): Message[] {
  const boundaryIndex = getCompactionBoundaryIndex(messages, compaction);
  return boundaryIndex >= 0 ? messages.slice(boundaryIndex + 1) : messages;
}

function getScopedCompaction(
  messages: Message[],
  compaction: ChatContextCompaction | null
): ChatContextCompaction | null {
  if (!compaction?.summary) return null;
  return getCompactionBoundaryIndex(messages, compaction) >= 0
    ? compaction
    : null;
}

function buildModelConversationHistory(
  messages: Message[],
  compaction: ChatContextCompaction | null
): ApiChatMessage[] {
  const history: ApiChatMessage[] = [];
  if (compaction?.summary) {
    history.push({
      role: "system",
      content: formatCompactionSystemContent(compaction.summary),
    });
  }

  getMessagesAfterCompaction(messages, compaction)
    .filter((message) => message.content || (message.attachments?.length ?? 0) > 0)
    .forEach((message) => {
      history.push({
        role: message.role,
        content: buildApiContent(message),
      });
    });

  return history;
}

function parseGenerationStats(
  value: unknown
): GenerationStats | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const stats = value as Record<string, unknown>;
  if (
    stats.provider !== "chatjimmy" ||
    typeof stats.decodeTokens !== "number" ||
    typeof stats.decodeRate !== "number" ||
    typeof stats.decodeTimeSeconds !== "number" ||
    !Number.isFinite(stats.decodeTokens) ||
    !Number.isFinite(stats.decodeRate) ||
    !Number.isFinite(stats.decodeTimeSeconds)
  ) {
    return undefined;
  }

  return {
    provider: "chatjimmy",
    decodeTokens: stats.decodeTokens,
    decodeRate: stats.decodeRate,
    decodeTimeSeconds: stats.decodeTimeSeconds,
    promptTokens:
      typeof stats.promptTokens === "number" &&
        Number.isFinite(stats.promptTokens)
        ? stats.promptTokens
        : undefined,
    totalTokens:
      typeof stats.totalTokens === "number" &&
        Number.isFinite(stats.totalTokens)
        ? stats.totalTokens
        : undefined,
  };
}

function getGenerationStatsEvent(
  event: Record<string, unknown>
): GenerationStats | undefined {
  if (event.type !== "generation_stats") return undefined;
  return parseGenerationStats(event.stats);
}

function captureAssistantVersion(message: Message): MessageVersion {
  return {
    content: message.content,
    responseMode: message.responseMode ?? "chat",
    generationStats: message.generationStats,
    weather: message.weather,
    searchQuery: message.searchQuery,
    searchResults: message.searchResults,
    searchStatus: message.searchStatus,
    isDeepResearch: message.isDeepResearch,
    researchSteps: message.researchSteps,
    researchStatus: message.researchStatus,
    allSources: message.allSources,
  };
}

function normalizeMessageVersions(message: Message): MessageVersion[] {
  if (!message.versions?.length) return [captureAssistantVersion(message)];
  return message.versions;
}

function applyAssistantVersion(
  message: Message,
  version: MessageVersion,
  versions: MessageVersion[],
  versionIndex: number
): Message {
  return {
    ...message,
    content: version.content,
    responseMode: version.responseMode ?? "chat",
    generationStats: version.generationStats,
    weather: version.weather,
    searchQuery: version.searchQuery,
    searchResults: version.searchResults,
    searchStatus: version.searchStatus,
    isDeepResearch: version.isDeepResearch,
    researchSteps: version.researchSteps,
    researchStatus: version.researchStatus,
    allSources: version.allSources,
    versions,
    versionIndex,
  };
}

function appendAssistantVersion(
  message: Message,
  existingVersions: MessageVersion[],
  version: MessageVersion
): Message {
  const versions = [...existingVersions, version];
  return applyAssistantVersion(message, version, versions, versions.length - 1);
}

function readTotalTokens(message: Message): number | undefined {
  if (message.role !== "assistant") return undefined;
  const stats = message.generationStats;
  const totalTokens = stats?.totalTokens;
  const fallbackTotalTokens =
    typeof stats?.promptTokens === "number" &&
      Number.isFinite(stats.promptTokens) &&
      Number.isFinite(stats.decodeTokens)
      ? stats.promptTokens + stats.decodeTokens
      : undefined;
  const resolvedTotalTokens =
    typeof totalTokens === "number" && Number.isFinite(totalTokens)
      ? totalTokens
      : fallbackTotalTokens;
  return typeof resolvedTotalTokens === "number" &&
    Number.isFinite(resolvedTotalTokens)
    ? Math.max(0, Math.round(resolvedTotalTokens))
    : undefined;
}

function estimateMessageTokens(message: Message): number {
  const content =
    message.role === "assistant"
      ? stripCitations(message.content)
      : message.content;
  const contentTokens = getSiteTokenCount(content);
  const attachmentTokens = (message.attachments ?? []).reduce(
    (sum, file) => sum + getAttachmentTokenCount(file),
    0
  );

  return contentTokens + attachmentTokens;
}

function estimateModelContextTokens(
  messages: Message[],
  draft: string,
  draftFile: AttachedFile | null,
  compaction: ChatContextCompaction | null = null
): number {
  if (compaction?.summary) {
    const recentMessages = getMessagesAfterCompaction(messages, compaction);
    let committedTokens = getSiteTokenCount(
      formatCompactionSystemContent(compaction.summary)
    );
    let lastUsageIndex = -1;

    for (let i = recentMessages.length - 1; i >= 0; i--) {
      const totalTokens = readTotalTokens(recentMessages[i]);
      if (totalTokens === undefined) continue;
      committedTokens = totalTokens;
      lastUsageIndex = i;
      break;
    }

    const messagesToEstimate =
      lastUsageIndex >= 0
        ? recentMessages.slice(lastUsageIndex + 1)
        : recentMessages;

    committedTokens += messagesToEstimate.reduce(
      (sum, message) => sum + estimateMessageTokens(message),
      0
    );

    const draftTokens = getSiteTokenCount(draft);
    const draftFileTokens = draftFile ? getAttachmentTokenCount(draftFile) : 0;

    return committedTokens + draftTokens + draftFileTokens;
  }

  let committedTokens = 0;
  let lastUsageIndex = -1;

  for (let i = messages.length - 1; i >= 0; i--) {
    const totalTokens = readTotalTokens(messages[i]);
    if (totalTokens === undefined) continue;
    committedTokens = totalTokens;
    lastUsageIndex = i;
    break;
  }

  const messagesToEstimate =
    lastUsageIndex >= 0 ? messages.slice(lastUsageIndex + 1) : messages;

  committedTokens += messagesToEstimate.reduce(
    (sum, message) => sum + estimateMessageTokens(message),
    0
  );

  const draftTokens = getSiteTokenCount(draft);
  const draftFileTokens = draftFile ? getAttachmentTokenCount(draftFile) : 0;

  return committedTokens + draftTokens + draftFileTokens;
}

function readLatestResponseTokenCount(messages: Message[]): number {
  for (let i = messages.length - 1; i >= 0; i--) {
    const totalTokens = readTotalTokens(messages[i]);
    if (totalTokens !== undefined) return totalTokens;
  }
  return 0;
}

function getVisibleContextTokens({
  messages,
  draft,
  draftFile,
  rejectedFileTokenCount,
}: {
  messages: Message[];
  draft: string;
  draftFile: AttachedFile | null;
  rejectedFileTokenCount: number | null;
}): number {
  const committedResponseTokens = readLatestResponseTokenCount(messages);
  const draftTokens = getSiteTokenCount(draft);
  const fileTokens = draftFile
    ? getAttachmentTokenCount(draftFile)
    : rejectedFileTokenCount ?? 0;

  return committedResponseTokens + draftTokens + fileTokens;
}

function TokenCounterChip({
  count,
  limit,
  trigger,
  hasCompaction,
  compacting,
  error,
}: {
  count: number;
  limit: number;
  trigger: number;
  hasCompaction: boolean;
  compacting: boolean;
  error?: string | null;
}) {
  const safeCount = Math.max(0, Math.round(Number.isFinite(count) ? count : 0));
  const safeLimit = Math.max(1, Math.round(Number.isFinite(limit) ? limit : 1));
  const safeTrigger = Math.max(1, Math.round(Number.isFinite(trigger) ? trigger : 1));
  const ratio = safeCount / safeLimit;
  const percent = Math.min(100, ratio * 100);
  const remaining = Math.max(0, safeLimit - safeCount);
  const overflow = Math.max(0, safeCount - safeLimit);
  const isOverLimit = overflow > 0;
  const isAtCompactionLine = safeCount >= safeTrigger;
  const tone = (() => {
    if (isOverLimit) return "oklch(98.5% 0.008 27)";
    if (compacting) return "oklch(78% 0.14 255)";
    if (ratio >= 1) return "oklch(58% 0.22 27)";
    if (isAtCompactionLine || ratio >= 0.82) return "oklch(70% 0.16 73)";
    return "oklch(62% 0.16 160)";
  })();
  const track = isOverLimit
    ? "color-mix(in oklch, oklch(34% 0.12 27) 38%, transparent)"
    : "var(--color-token-ring-track)";
  const chipBackground = isOverLimit
    ? "oklch(0.58 0.23 27)"
    : "var(--color-ink-primary)";
  const chipForeground = isOverLimit
    ? "oklch(99% 0.004 27)"
    : "var(--color-surface-primary)";
  const tokenStatus = isOverLimit
    ? `${overflow.toLocaleString()} over limit`
    : `${remaining.toLocaleString()} left`;
  const label = compacting
    ? "Compacting"
    : hasCompaction
      ? "Summary Active"
      : "Total Tokens";
  const shortLabel = compacting
    ? "Compact"
    : hasCompaction
      ? "Summary"
      : "Tokens";
  const title = [
    `Context Tokens: ${safeCount.toLocaleString()} / ${safeLimit.toLocaleString()} (${tokenStatus})`,
    `Auto compact starts at ${safeTrigger.toLocaleString()} tokens.`,
    hasCompaction ? "Older chat turns are represented by compact memory." : "",
    error || "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className="absolute right-11 bottom-full z-10 mb-2 flex max-w-[calc(100%-52px)] items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[10px] sm:right-14.5 sm:mb-3 sm:max-w-[calc(100%-68px)] sm:gap-2 sm:px-3.5 sm:py-2 sm:text-[11px]"
      style={{
        backgroundColor: chipBackground,
        border:
          isOverLimit
            ? "1px solid oklch(72% 0.19 27 / 0.42)"
            : "1px solid color-mix(in oklch, var(--color-surface-primary) 18%, transparent)",
        boxShadow: isOverLimit
          ? "0 12px 28px oklch(58% 0.23 27 / 0.24)"
          : "0 12px 26px oklch(35% 0.03 255 / 0.14)",
        color: chipForeground,
      }}
      title={title}
      aria-label={`Total Tokens ${safeCount.toLocaleString()} out of ${safeLimit.toLocaleString()}`}
    >
      <span
        aria-hidden="true"
        className="grid h-6 w-6 shrink-0 place-items-center rounded-full sm:h-7 sm:w-7"
        style={{
          background: `conic-gradient(${tone} ${percent}%, ${track} 0)`,
        }}
      >
        <span
          className="h-3.5 w-3.5 rounded-full sm:h-4.5 sm:w-4.5"
          style={{ backgroundColor: chipBackground }}
        />
      </span>
      <span className="grid place-items-center gap-0.5 text-center leading-tight sm:gap-1">
        <span
          className="block w-full text-center text-[10px] leading-none tabular-nums sm:text-[13px]"
          style={{ color: "currentColor", fontWeight: 600 }}
        >
          {safeCount.toLocaleString()}/{safeLimit.toLocaleString()}
        </span>
        <span
          className="block w-full text-center text-[9px] leading-none sm:text-[10px]"
          style={{ color: "currentColor", opacity: 0.68 }}
        >
          <span className="sm:hidden">
            {isOverLimit ? "Over" : shortLabel}
          </span>
          <span className="hidden sm:inline">
            {isOverLimit ? "Over Limit" : label}
          </span>
        </span>
      </span>
    </div>
  );
}

function getClientDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function nowMs() {
  return Date.now();
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(
    null
  );
  const [agentMode, setAgentMode] = useState(false);
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null);
  const [rejectedFileTokenCount, setRejectedFileTokenCount] = useState<
    number | null
  >(null);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [topK, setTopK] = useState(8);
  const [toolSettings, setToolSettings] = useState<ChatToolSettings>(
    DEFAULT_CHAT_TOOL_SETTINGS
  );
  const [toolSettingsLoaded, setToolSettingsLoaded] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);
  const [chatStoreReady, setChatStoreReady] = useState(false);
  const [activeChatId, setActiveChatId] = useState<string>("");
  const [showSettings, setShowSettings] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeSearchMatchIndex, setActiveSearchMatchIndex] = useState(0);
  const [searchMatchCount, setSearchMatchCount] = useState(0);
  const [isCompactViewport, setIsCompactViewport] = useState(false);
  const [contextCompaction, setContextCompaction] =
    useState<ChatContextCompaction | null>(null);
  const [isCompactingContext, setIsCompactingContext] = useState(false);
  const [contextCompactionError, setContextCompactionError] =
    useState<string | null>(null);
  const isDark = useIsDarkTheme();
  const githubColor = isDark ? "oklch(96% 0.004 255)" : "oklch(18% 0.004 255)";
  const githubHoverColor = isDark
    ? "oklch(100% 0 0)"
    : "oklch(8% 0.004 255)";
  const logo3DTheme = isDark ? LOGO_3D_THEME.dark : LOGO_3D_THEME.light;
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const scrollTargetRef = useRef<string | null>(null);
  const shouldAutoScrollRef = useRef(true);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chatsRef = useRef<Chat[]>([]);
  const activeChatIdRef = useRef("");
  const messagesRef = useRef<Message[]>([]);
  const contextCompactionRef = useRef<ChatContextCompaction | null>(null);
  const isCompactingContextRef = useRef(false);
  const isLoadingRef = useRef(false);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const touchHandledRef = useRef(false);
  const logoSvgRef = useRef<SVGSVGElement>(null);

  const clearAttachedFile = useCallback(() => {
    setAttachedFile(null);
    setRejectedFileTokenCount(null);
  }, []);

  const finishResponse = () => {
    isLoadingRef.current = false;
    setIsLoading(false);
    setStreamingMessageId(null);
  };

  const applyGenerationStats = useCallback(
    (messageId: string, generationStats: GenerationStats) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, generationStats } : m
        )
      );
    },
    []
  );

  const scrollChatToBottom = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      const container = chatContainerRef.current;
      if (!container) return;
      container.scrollTo({
        top: container.scrollHeight,
        behavior,
      });
    },
    []
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia(DESKTOP_MEDIA_QUERY);
    const syncSidebarForViewport = () => {
      setIsCompactViewport(!mediaQuery.matches);
      setSidebarOpen(false);
    };

    syncSidebarForViewport();
    mediaQuery.addEventListener("change", syncSidebarForViewport);
    return () => {
      mediaQuery.removeEventListener("change", syncSidebarForViewport);
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const stored = window.localStorage.getItem(TOOL_SETTINGS_STORAGE_KEY);
        if (stored) {
          setToolSettings(normalizeChatToolSettings(JSON.parse(stored)));
        }
      } catch {
        setToolSettings(DEFAULT_CHAT_TOOL_SETTINGS);
      } finally {
        setToolSettingsLoaded(true);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!toolSettingsLoaded) return;
    window.localStorage.setItem(
      TOOL_SETTINGS_STORAGE_KEY,
      JSON.stringify(toolSettings)
    );
  }, [toolSettings, toolSettingsLoaded]);

  useEffect(() => {
    activeChatIdRef.current = activeChatId;
  }, [activeChatId]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    contextCompactionRef.current = contextCompaction;
  }, [contextCompaction]);

  useEffect(() => {
    if (!scrollTargetRef.current) return;
    scrollTargetRef.current = null;
    shouldAutoScrollRef.current = true;
    requestAnimationFrame(() => {
      scrollChatToBottom("smooth");
    });
  }, [messages, scrollChatToBottom]);

  useEffect(() => {
    if (!messages.length || !shouldAutoScrollRef.current) return;
    requestAnimationFrame(() => {
      scrollChatToBottom(isLoading ? "auto" : "smooth");
    });
  }, [isLoading, messages, scrollChatToBottom, streamingMessageId]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const query = searchQuery.trim();
      if (!query) {
        setSearchMatchCount(0);
        setActiveSearchMatchIndex(0);
        return;
      }

      const count = document.querySelectorAll(
        "mark.search-match, mark.search-match-user"
      ).length;
      setSearchMatchCount(count);
      setActiveSearchMatchIndex((index) =>
        count > 0 ? Math.min(index, count - 1) : 0
      );
    });

    return () => window.cancelAnimationFrame(frame);
  }, [messages, searchQuery]);

  useEffect(() => {
    const matches = Array.from(
      document.querySelectorAll<HTMLElement>(
        "mark.search-match, mark.search-match-user"
      )
    );

    matches.forEach((match) => {
      match.classList.remove("search-match-active");
    });

    if (!searchQuery.trim() || matches.length === 0) return;

    const index = Math.min(activeSearchMatchIndex, matches.length - 1);
    const activeMatch = matches[index];
    activeMatch.classList.add("search-match-active");
    activeMatch.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "nearest",
    });
  }, [activeSearchMatchIndex, messages, searchMatchCount, searchQuery]);

  const cancelPendingSave = useCallback(() => {
    if (!saveTimeoutRef.current) return;
    clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = null;
  }, []);

  const flushActiveChat = useCallback(() => {
    cancelPendingSave();

    const chatId = activeChatIdRef.current;
    if (!chatId) return;

    const currentChat = chatsRef.current.find((chat) => chat.id === chatId);
    if (!currentChat) return;

    const flushedChat: Chat = {
      ...currentChat,
      messages: messagesRef.current,
      contextCompaction: contextCompactionRef.current ?? undefined,
      updatedAt: nowMs(),
    };
    const nextChats = chatsRef.current.map((chat) =>
      chat.id === chatId ? flushedChat : chat
    );
    chatsRef.current = nextChats;
    setChats(nextChats);
    void persistChat(flushedChat);
  }, [cancelPendingSave]);

  const commitContextCompaction = useCallback(
    (nextCompaction: ChatContextCompaction | null) => {
      contextCompactionRef.current = nextCompaction;
      setContextCompaction(nextCompaction);

      const chatId = activeChatIdRef.current;
      if (!chatId) return;

      setChats((prev) => {
        const nextChats = prev.map((chat) =>
          chat.id === chatId
            ? {
              ...chat,
              contextCompaction: nextCompaction ?? undefined,
              updatedAt: nowMs(),
            }
            : chat
        );
        chatsRef.current = nextChats;
        const updatedChat = nextChats.find((chat) => chat.id === chatId);
        if (updatedChat) void persistChat(updatedChat);
        return nextChats;
      });
    },
    []
  );

  const resetDraftConversation = useCallback(
    (
      historyMode: "push" | "replace" = "push",
      options: { flush?: boolean } = {}
    ) => {
      if (options.flush !== false) flushActiveChat();
      activeChatIdRef.current = "";
      messagesRef.current = [];
      contextCompactionRef.current = null;
      setActiveChatId("");
      setMessages([]);
      setContextCompaction(null);
      setContextCompactionError(null);
      setInput("");
      clearAttachedFile();
      writeHomeUrl(historyMode);
    },
    [clearAttachedFile, flushActiveChat]
  );

  function startNewChat(historyMode: "push" | "replace" = "push") {
    setShowSettings(false);
    resetDraftConversation(historyMode);
  }

  function materializeDraftChat(
    historyMode: "push" | "replace" = "replace"
  ): string {
    const existingChat = chatsRef.current.find(
      (chat) => chat.id === activeChatId
    );

    if (existingChat && CHAT_ID_PATTERN.test(existingChat.id)) {
      writeChatUrl(existingChat.id, historyMode);
      return existingChat.id;
    }

    const chat = createEmptyChat();
    const nextChats = [chat, ...chatsRef.current];
    chatsRef.current = nextChats;
    setChats(nextChats);
    activeChatIdRef.current = chat.id;
    setActiveChatId(chat.id);
    writeChatUrl(chat.id, historyMode);
    return chat.id;
  }

  function loadChat(id: string) {
    flushActiveChat();
    const chat = chatsRef.current.find((c) => c.id === id);
    if (!chat) return;
    activeChatIdRef.current = id;
    messagesRef.current = chat.messages;
    contextCompactionRef.current = chat.contextCompaction ?? null;
    setActiveChatId(id);
    setMessages(chat.messages);
    setContextCompaction(chat.contextCompaction ?? null);
    setContextCompactionError(null);
    setInput("");
    clearAttachedFile();
    writeChatUrl(id);
  }

  function deleteChat(id: string) {
    if (id === activeChatIdRef.current) {
      cancelPendingSave();
    }

    void removeChat(id);
    const nextChats = chatsRef.current.filter((c) => c.id !== id);
    chatsRef.current = nextChats;
    setChats(nextChats);

    if (id !== activeChatId) return;

    setInput("");
    clearAttachedFile();

    if (nextChats.length > 0) {
      activeChatIdRef.current = nextChats[0].id;
      messagesRef.current = nextChats[0].messages;
      contextCompactionRef.current = nextChats[0].contextCompaction ?? null;
      setActiveChatId(nextChats[0].id);
      setMessages(nextChats[0].messages);
      setContextCompaction(nextChats[0].contextCompaction ?? null);
      setContextCompactionError(null);
      writeChatUrl(nextChats[0].id, "replace");
    } else {
      resetDraftConversation("replace", { flush: false });
    }
  }

  function clearAllChats() {
    if (
      isLoadingRef.current ||
      isCompactingContextRef.current ||
      !chatStoreReady ||
      chatsRef.current.length === 0
    ) {
      return;
    }

    const confirmed = window.confirm(
      "Clear all chats? This cannot be undone."
    );
    if (!confirmed) return;

    cancelPendingSave();
    void clearStoredChats();
    chatsRef.current = [];
    activeChatIdRef.current = "";
    messagesRef.current = [];
    contextCompactionRef.current = null;
    setChats([]);
    setActiveChatId("");
    setMessages([]);
    setContextCompaction(null);
    setContextCompactionError(null);
    setSearchQuery("");
    setSearchOpen(false);
    setActiveSearchMatchIndex(0);
    setSearchMatchCount(0);
    setInput("");
    setShowSettings(false);
    clearAttachedFile();
    writeHomeUrl("replace");
  }

  async function generateTitle(firstUserMsg: string, chatId: string) {
    try {
      const res = await fetch("/api/title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: firstUserMsg }),
      });
      if (!res.ok) return;
      const { title } = (await res.json()) as { title: string };
      if (title) {
        setChats((prev) => {
          const next = prev.map((c) => (c.id === chatId ? { ...c, title } : c));
          chatsRef.current = next;
          const updated = next.find((c) => c.id === chatId);
          if (updated) void persistChat(updated);
          return next;
        });
      }
    } catch { }
  }

  const compactContextIfNeeded = useCallback(
    async (
      candidateMessages: Message[],
      draft: string,
      draftFile: AttachedFile | null,
      options: { force?: boolean } = {}
    ): Promise<ChatContextCompaction | null> => {
      const currentCompaction = contextCompactionRef.current;
      const estimatedTokens = estimateModelContextTokens(
        candidateMessages,
        draft,
        draftFile,
        currentCompaction
      );

      if (!options.force && estimatedTokens < AUTO_COMPACT_TRIGGER_TOKEN_LIMIT) {
        return currentCompaction;
      }

      if (isCompactingContextRef.current) return currentCompaction;

      const compactableMessages = getMessagesAfterCompaction(
        candidateMessages,
        currentCompaction
      ).filter(
        (message) => message.content || (message.attachments?.length ?? 0) > 0
      );
      const compactThrough = compactableMessages[compactableMessages.length - 1];
      if (!compactThrough) return currentCompaction;

      isCompactingContextRef.current = true;
      setIsCompactingContext(true);
      setContextCompactionError(null);

      try {
        const response = await fetch("/api/compact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            previousSummary: currentCompaction?.summary,
            messages: compactableMessages.map((message) => ({
              role: message.role,
              content: buildApiContent(message),
            })),
            maxSummaryTokens: COMPACTED_CONTEXT_TOKEN_LIMIT,
          }),
        });

        const body = (await response.json().catch(() => null)) as {
          summary?: unknown;
          tokenCount?: unknown;
          error?: unknown;
        } | null;

        if (!response.ok || typeof body?.summary !== "string") {
          const message =
            typeof body?.error === "string"
              ? body.error
              : "Auto compact failed before returning a summary.";
          throw new Error(message);
        }

        const nextCompaction: ChatContextCompaction = {
          summary: body.summary.trim(),
          tokenCount:
            typeof body.tokenCount === "number" && Number.isFinite(body.tokenCount)
              ? Math.max(0, Math.round(body.tokenCount))
              : getSiteTokenCount(body.summary),
          sourceMessageCount:
            (currentCompaction?.sourceMessageCount ?? 0) +
            compactableMessages.length,
          compactedAt: nowMs(),
          compactedThroughMessageId: compactThrough.id,
          compactedThroughTimestamp: compactThrough.timestamp,
        };

        commitContextCompaction(nextCompaction);
        return nextCompaction;
      } catch (error) {
        console.error("Context compaction failed:", error);
        setContextCompactionError(
          error instanceof Error
            ? error.message
            : "Auto compact failed. Try again in a moment."
        );
        return currentCompaction;
      } finally {
        isCompactingContextRef.current = false;
        setIsCompactingContext(false);
      }
    },
    [commitContextCompaction]
  );

  const queuePostTurnCompaction = useCallback(() => {
    window.setTimeout(() => {
      void compactContextIfNeeded(messagesRef.current, "", null);
    }, 0);
  }, [compactContextIfNeeded]);

  useEffect(() => {
    loadAllChats()
      .then((stored) => {
        const urlChatId = getChatIdFromUrl();
        const urlChat = stored.find((chat) => chat.id === urlChatId);

        chatsRef.current = stored;
        setChats(stored);

        if (urlChat) {
          activeChatIdRef.current = urlChat.id;
          messagesRef.current = urlChat.messages;
          contextCompactionRef.current = urlChat.contextCompaction ?? null;
          setActiveChatId(urlChat.id);
          setMessages(urlChat.messages);
          setContextCompaction(urlChat.contextCompaction ?? null);
          return;
        }

        if (urlChatId) {
          resetDraftConversation("replace");
          return;
        }

        if (hasRouteSegment()) {
          writeHomeUrl("replace");
        }

        activeChatIdRef.current = "";
        messagesRef.current = [];
        contextCompactionRef.current = null;
        setActiveChatId("");
        setMessages([]);
        setContextCompaction(null);
      })
      .catch(() => {
        chatsRef.current = [];
        setChats([]);
        resetDraftConversation("replace");
      })
      .finally(() => {
        setChatStoreReady(true);
      });
  }, [resetDraftConversation]);

  useEffect(() => {
    const handlePopState = () => {
      const urlChatId = getChatIdFromUrl();
      if (!urlChatId) {
        flushActiveChat();
        activeChatIdRef.current = "";
        messagesRef.current = [];
        contextCompactionRef.current = null;
        setActiveChatId("");
        setMessages([]);
        setContextCompaction(null);
        setContextCompactionError(null);
        setInput("");
        clearAttachedFile();
        return;
      }

      const chat = chatsRef.current.find((item) => item.id === urlChatId);
      if (!chat) {
        resetDraftConversation("replace");
        return;
      }

      flushActiveChat();
      activeChatIdRef.current = chat.id;
      messagesRef.current = chat.messages;
      contextCompactionRef.current = chat.contextCompaction ?? null;
      setActiveChatId(chat.id);
      setMessages(chat.messages);
      setContextCompaction(chat.contextCompaction ?? null);
      setContextCompactionError(null);
      setInput("");
      clearAttachedFile();
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [clearAttachedFile, flushActiveChat, resetDraftConversation]);

  useEffect(() => {
    const flushOnExit = () => {
      flushActiveChat();
    };
    const flushOnHidden = () => {
      if (document.visibilityState === "hidden") flushActiveChat();
    };

    window.addEventListener("pagehide", flushOnExit);
    document.addEventListener("visibilitychange", flushOnHidden);
    return () => {
      window.removeEventListener("pagehide", flushOnExit);
      document.removeEventListener("visibilitychange", flushOnHidden);
    };
  }, [flushActiveChat]);

  useEffect(() => {
    if (!activeChatId) return;
    setChats((prev) => {
      const next = prev.map((c) =>
        c.id === activeChatId
          ? {
            ...c,
            messages,
            contextCompaction: contextCompactionRef.current ?? undefined,
            updatedAt: nowMs(),
          }
          : c
      );
      chatsRef.current = next;
      return next;
    });
  }, [messages, activeChatId]);

  useEffect(() => {
    if (!activeChatId) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    const chatId = activeChatId;
    saveTimeoutRef.current = setTimeout(() => {
      saveTimeoutRef.current = null;
      const chat = chatsRef.current.find((c) => c.id === chatId);
      if (chat) void persistChat(chat);
    }, 800);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [messages, activeChatId]);

  const handleInstantSubmit = async (
    query: string,
    fileForSubmit: AttachedFile | null
  ) => {
    let retryDepth = 0;
    let activeCompaction = contextCompactionRef.current;
    const assistantId = generateId();
    const assistantMessage: Message = {
      id: assistantId,
      role: "assistant",
      content: "",
      responseMode: "chat",
      timestamp: nowMs(),
    };
    const attachments = fileForSubmit ? [fileForSubmit] : undefined;
    const apiAttachment = buildApiAttachment(fileForSubmit);
    const clientDate = getClientDate();

    const userMsgId = generateId();
    scrollTargetRef.current = userMsgId;
    setStreamingMessageId(assistantId);

    setMessages((prev) => [
      ...prev,
      {
        id: userMsgId,
        role: "user",
        content: query,
        attachments,
        timestamp: nowMs(),
      },
      assistantMessage,
    ]);

    const prepareForcedCompactionRetry = async (
      retryPatch?: Partial<Message>
    ): Promise<boolean> => {
      if (retryDepth >= 1) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                ...m,
                responseMode: "chat",
                content:
                  "The model returned an empty response even after compacting the older context. Please retry your last message.",
                searchStatus: "done" as const,
              }
              : m
          )
        );
        finishResponse();
        return false;
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
              ...m,
              responseMode: "chat",
              content: "",
              generationStats: undefined,
              weather: undefined,
              searchQuery: undefined,
              searchResults: undefined,
              searchStatus: undefined,
              isDeepResearch: undefined,
              researchSteps: undefined,
              researchStatus: undefined,
              allSources: undefined,
              ...retryPatch,
            }
            : m
        )
      );

      activeCompaction = await compactContextIfNeeded(
        messages,
        "",
        null,
        { force: true }
      );
      retryDepth += 1;
      return true;
    };

    while (true) {
      const buildAttemptConversationHistory = () => {
        const conversationHistory = buildModelConversationHistory(
          messages,
          activeCompaction
        );
        conversationHistory.push({
          role: "user",
          content: query,
        });
        return conversationHistory;
      };
      const conversationHistory = buildAttemptConversationHistory();

      if (retryDepth > 0) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                ...m,
                content: "",
                responseMode: "chat",
              }
              : m
          )
        );
      }

      try {
        const tRouterStartWall = nowMs();
        const routerRes = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: conversationHistory,
            mode: "router",
            topK,
            toolSettings,
            clientDate,
            ...(apiAttachment ? { attachment: apiAttachment } : {}),
            ...(systemPrompt.trim() ? { systemPrompt: systemPrompt.trim() } : {}),
          }),
        });
        const tRouterFirstByteWall = nowMs();

        if (!routerRes.ok || !routerRes.body) throw new Error("Router failed");

        const routerServerTiming =
          routerRes.headers.get("Server-Timing") ??
          routerRes.headers.get("x-debug-timing");
        const routerVercelId = routerRes.headers.get("x-vercel-id");

        const routerReader = routerRes.body.getReader();
        const routerDecoder = new TextDecoder();
        let routerContent = "";
        let routerDecision:
          | "direct"
          | "search"
          | "context_compaction_required"
          | null = null;
        let directResponseMode: MessageResponseMode = "chat";
        let routerGenerationStats: GenerationStats | undefined;
        let routerNeedsCompactionRetry = false;

        const routerParser = parseSSEStream(
          (text) => {
            routerContent += text;

            if (
              routerDecision === null &&
              routerContent.trimStart().length >= 10
            ) {
              routerDecision =
                extractSearchControlQuery(routerContent) !== null
                  ? "search"
                  : "direct";
            }

            if (routerDecision === "direct") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? {
                      ...m,
                      content: routerContent,
                      responseMode: directResponseMode,
                    }
                    : m
                )
              );
            }
          },
          () => { },
          (event) => {
            if (event.type === "context_compaction_required") {
              routerNeedsCompactionRetry = true;
              routerDecision = "context_compaction_required";
              return;
            }

            const stats = getGenerationStatsEvent(event);
            if (stats) {
              routerGenerationStats = stats;
              if (routerDecision === "direct") {
                applyGenerationStats(assistantId, stats);
              }
              return;
            }

            if (event.type !== "weather") return;
            routerDecision = "direct";
            directResponseMode = "weather";
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? {
                    ...m,
                    weather: event.weather as WeatherCardData,
                    responseMode: "weather",
                  }
                  : m
              )
            );
          }
        );

        while (true) {
          const { done, value } = await routerReader.read();
          if (done) break;
          routerParser.processChunk(routerDecoder.decode(value, { stream: true }));
        }

        const tRouterEndWall = nowMs();

        if (routerNeedsCompactionRetry) {
          logTiming(`Chat:router`, {
            query,
            tStartWall: tRouterStartWall,
            tFirstByteWall: tRouterFirstByteWall,
            tEndWall: tRouterEndWall,
            serverTiming: routerServerTiming,
            vercelId: routerVercelId,
          });
          if (await prepareForcedCompactionRetry()) continue;
          return;
        }

        if (routerDecision === null) {
          routerDecision = "direct";
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                  ...m,
                  content: routerContent || "…",
                  responseMode: directResponseMode,
                }
                : m
            )
          );
        }

        if (routerDecision === "direct" && routerGenerationStats) {
          applyGenerationStats(assistantId, routerGenerationStats);
        }

        logTiming(`Chat:router`, {
          query,
          tStartWall: tRouterStartWall,
          tFirstByteWall: tRouterFirstByteWall,
          tEndWall: tRouterEndWall,
          serverTiming: routerServerTiming,
          vercelId: routerVercelId,
        });

        if (routerDecision === "direct") {
          finishResponse();
          return;
        }

        if (!toolSettings.search) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                  ...m,
                  responseMode: "chat",
                  content:
                    "Search is disabled. Enable Search in Tools settings to use live web results, or I can continue with a normal answer from existing context.",
                }
                : m
            )
          );
          finishResponse();
          return;
        }

        const refinedQuery = extractSearchControlQuery(routerContent) || query;

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                ...m,
                responseMode: "search",
                content: "",
                searchQuery: refinedQuery,
                searchResults: [],
                searchStatus: "searching" as const,
              }
              : m
          )
        );

        let searchResults: SearchResult[] = [];
        let searchError: string | undefined;
        try {
          const tSearchStartWall = nowMs();
          const searchRes = await fetch("/api/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: refinedQuery, toolSettings }),
          });
          const tSearchFirstByteWall = nowMs();
          const body = await searchRes.json().catch(() => null);
          const tSearchEndWall = nowMs();
          if (body && Array.isArray(body.results)) {
            searchResults = body.results;
          }
          if (body && typeof body.searchError === "string") {
            searchError = body.searchError;
          }
          if (!searchRes.ok && !searchError) {
            searchError = "Search failed before returning usable sources.";
          }
          logTiming("Search", {
            query: refinedQuery,
            tStartWall: tSearchStartWall,
            tFirstByteWall: tSearchFirstByteWall,
            tEndWall: tSearchEndWall,
            serverTiming:
              searchRes.headers.get("Server-Timing") ??
              searchRes.headers.get("x-debug-timing"),
            vercelId: searchRes.headers.get("x-vercel-id"),
          });
        } catch (e) {
          console.error("Search failed:", e);
          searchError = "Search failed before returning usable sources.";
        }

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                ...m,
                responseMode: "search",
                searchResults,
                searchStatus: "done" as const,
              }
              : m
          )
        );

        while (true) {
          const tAnswerStartWall = nowMs();
          const answerRes = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              messages: buildAttemptConversationHistory(),
              searchResults: searchResults.map((r) => ({
                title: r.title,
                url: r.url,
                text: r.text,
                highlights: r.highlights,
              })),
              mode: "answer",
              topK,
              toolSettings,
              clientDate,
              searchAttempted: true,
              ...(searchError ? { searchError } : {}),
              ...(apiAttachment ? { attachment: apiAttachment } : {}),
              ...(systemPrompt.trim() ? { systemPrompt: systemPrompt.trim() } : {}),
            }),
          });
          const tAnswerFirstByteWall = nowMs();

          if (!answerRes.ok || !answerRes.body) throw new Error("Answer failed");

          const answerServerTiming =
            answerRes.headers.get("Server-Timing") ??
            answerRes.headers.get("x-debug-timing");
          const answerVercelId = answerRes.headers.get("x-vercel-id");

          const answerReader = answerRes.body.getReader();
          const answerDecoder = new TextDecoder();
          let answerContent = "";
          let answerGenerationStats: GenerationStats | undefined;
          let answerNeedsCompactionRetry = false;

          const answerParser = parseSSEStream(
            (text) => {
              answerContent += text;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: answerContent, responseMode: "search" }
                    : m
                )
              );
            },
            () => { },
            (event) => {
              if (event.type === "context_compaction_required") {
                answerNeedsCompactionRetry = true;
                return;
              }

              const stats = getGenerationStatsEvent(event);
              if (!stats) return;
              answerGenerationStats = stats;
              applyGenerationStats(assistantId, stats);
            }
          );

          while (true) {
            const { done, value } = await answerReader.read();
            if (done) break;
            answerParser.processChunk(answerDecoder.decode(value, { stream: true }));
          }

          const tAnswerEndWall = nowMs();
          if (answerNeedsCompactionRetry) {
            logTiming("Chat:answer", {
              query: refinedQuery,
              tStartWall: tAnswerStartWall,
              tFirstByteWall: tAnswerFirstByteWall,
              tEndWall: tAnswerEndWall,
              serverTiming: answerServerTiming,
              vercelId: answerVercelId,
            });
            const canRetry = await prepareForcedCompactionRetry({
              responseMode: "search",
              searchQuery: refinedQuery,
              searchResults,
              searchStatus: "done",
            });
            if (!canRetry) return;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: "", responseMode: "search" }
                  : m
              )
            );
            continue;
          }

          if (answerGenerationStats) {
            applyGenerationStats(assistantId, answerGenerationStats);
          }
          logTiming("Chat:answer", {
            query: refinedQuery,
            tStartWall: tAnswerStartWall,
            tFirstByteWall: tAnswerFirstByteWall,
            tEndWall: tAnswerEndWall,
            serverTiming: answerServerTiming,
            vercelId: answerVercelId,
          });

          finishResponse();
          return;
        }
      } catch (e) {
        console.error("Chat failed:", e);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                ...m,
                content:
                  "Failed to connect to chat service. ChatJimmy may be temporarily unavailable.",
                searchStatus: "done" as const,
              }
              : m
          )
        );
        finishResponse();
        return;
      }
    }
  };

  const handleNavigateVersion = (messageId: string, dir: -1 | 1) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId || !m.versions) return m;
        const versions = normalizeMessageVersions(m);
        const newIdx = Math.max(
          0,
          Math.min((m.versionIndex ?? 0) + dir, versions.length - 1)
        );
        return applyAssistantVersion(m, versions[newIdx], versions, newIdx);
      })
    );
  };

  const handleRegenerate = async (assistantMessageId: string) => {
    if (isLoading || isLoadingRef.current) return;

    const currentMessages = messages;
    const assistantIdx = currentMessages.findIndex(
      (m) => m.id === assistantMessageId
    );
    if (assistantIdx === -1) return;

    const userMsg = currentMessages[assistantIdx - 1];
    if (!userMsg || userMsg.role !== "user") return;

    const assistantMsg = currentMessages[assistantIdx];
    const responseMode = assistantMsg.responseMode ?? "chat";
    const existingVersions = normalizeMessageVersions(assistantMsg);

    const historyBefore = currentMessages.slice(0, assistantIdx - 1);
    let regenerateRetryDepth = 0;
    let activeRegenerateCompaction = getScopedCompaction(
      historyBefore,
      contextCompactionRef.current
    );
    const apiAttachment = buildApiAttachment(userMsg.attachments?.[0] ?? null);
    const clientDate = getClientDate();

    const buildRegenerateHistoryBeforeUser = () =>
      buildModelConversationHistory(historyBefore, activeRegenerateCompaction);

    const buildRegenerateConversationHistory = () => {
      const conversationHistory = buildRegenerateHistoryBeforeUser();
      conversationHistory.push({
        role: "user",
        content: buildApiContent(userMsg),
      });
      return conversationHistory;
    };

    const prepareRegenerateCompactionRetry = async (
      retryPatch?: Partial<Message>
    ): Promise<boolean> => {
      if (regenerateRetryDepth >= 1) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId
              ? {
                ...m,
                responseMode: "chat",
                content:
                  "The model returned an empty response even after compacting the older context. Please retry your last message.",
                searchStatus: "done" as const,
                ...retryPatch,
              }
              : m
          )
        );
        finishResponse();
        return false;
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessageId
            ? {
              ...m,
              responseMode: "chat",
              content: "",
              generationStats: undefined,
              weather: undefined,
              searchQuery: undefined,
              searchResults: undefined,
              searchStatus: undefined,
              isDeepResearch: undefined,
              researchSteps: undefined,
              researchStatus: undefined,
              allSources: undefined,
              ...retryPatch,
            }
            : m
        )
      );

      const nextCompaction = await compactContextIfNeeded(
        historyBefore,
        userMsg.content,
        userMsg.attachments?.[0] ?? null,
        { force: true }
      );
      activeRegenerateCompaction = getScopedCompaction(
        historyBefore,
        nextCompaction
      );
      regenerateRetryDepth += 1;
      return true;
    };

    isLoadingRef.current = true;
    setIsLoading(true);
    setStreamingMessageId(assistantMessageId);

    if (responseMode === "deepResearch") {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessageId
            ? {
              ...m,
              content: "",
              responseMode: "deepResearch",
              generationStats: undefined,
              weather: undefined,
              searchQuery: undefined,
              searchResults: undefined,
              searchStatus: undefined,
              isDeepResearch: true,
              researchSteps: [],
              researchStatus: "researching" as const,
              allSources: [],
              versions: existingVersions,
              versionIndex: existingVersions.length - 1,
            }
            : m
        )
      );

      let fullContent = "";
      let allSources: SearchResult[] = [];
      let researchSteps: ResearchStep[] = [];
      let generationStats: GenerationStats | undefined;
      let completed = false;

      const update = (patch: Partial<Message>) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId ? { ...m, ...patch } : m
          )
        );
      };

      const updateStep = (
        stepId: string,
        stepPatch: Partial<ResearchStep>
      ) => {
        researchSteps = researchSteps.map((s) =>
          s.id === stepId ? { ...s, ...stepPatch } : s
        );
        update({ researchSteps });
      };

      const commitDeepResearchVersion = (content: string) => {
        const version: MessageVersion = {
          content,
          responseMode: "deepResearch",
          generationStats,
          isDeepResearch: true,
          researchSteps,
          researchStatus: "done",
          allSources,
        };
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId
              ? appendAssistantVersion(m, existingVersions, version)
              : m
          )
        );
      };

      try {
        const res = await fetch("/api/deep-research", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: userMsg.content,
            contextMessages: buildRegenerateHistoryBeforeUser(),
            topK,
            clientDate,
            ...(apiAttachment ? { attachment: apiAttachment } : {}),
            ...(systemPrompt.trim() ? { systemPrompt: systemPrompt.trim() } : {}),
          }),
        });

        if (!res.ok || !res.body) throw new Error("Deep research failed");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data: ")) continue;
            const raw = trimmed.slice(6);

            let event: { type: string;[key: string]: unknown };
            try {
              event = JSON.parse(raw);
            } catch {
              continue;
            }

            switch (event.type) {
              case "step_start": {
                const newStep: ResearchStep = {
                  id: event.stepId as string,
                  query: event.query as string,
                  status: "searching",
                  results: [],
                  synthesis: "",
                  depth: event.depth as number,
                };
                researchSteps = [...researchSteps, newStep];
                update({ researchSteps });
                break;
              }

              case "search_complete": {
                updateStep(event.stepId as string, {
                  results: (event.results || []) as SearchResult[],
                });
                break;
              }

              case "synthesizing": {
                updateStep(event.stepId as string, { status: "synthesizing" });
                break;
              }

              case "step_done": {
                updateStep(event.stepId as string, {
                  status: "done",
                  synthesis: event.synthesis as string,
                });
                break;
              }

              case "research_complete":
              case "answer_start": {
                update({ researchStatus: "answering" });
                break;
              }

              case "answer_chunk": {
                fullContent += event.content as string;
                update({ content: fullContent });
                break;
              }

              case "all_sources": {
                allSources = (event.sources || []) as SearchResult[];
                update({ allSources });
                break;
              }

              case "generation_stats": {
                const stats = parseGenerationStats(event.stats);
                if (stats) {
                  generationStats = stats;
                  update({ generationStats: stats });
                }
                break;
              }

              case "done": {
                completed = true;
                commitDeepResearchVersion(fullContent);
                finishResponse();
                break;
              }

              case "error": {
                completed = true;
                const errorMessage = `Research failed: ${event.message}`;
                fullContent = errorMessage;
                update({ content: errorMessage });
                commitDeepResearchVersion(errorMessage);
                finishResponse();
                break;
              }
            }
          }
        }

        if (!completed) {
          commitDeepResearchVersion(fullContent || "Deep research finished without an answer.");
          finishResponse();
        }
      } catch (e) {
        console.error("Deep research regenerate failed:", e);
        const errorMessage =
          "Failed to run deep research. ChatJimmy may be temporarily unavailable.";
        fullContent = errorMessage;
        update({ content: errorMessage, researchStatus: "done" });
        commitDeepResearchVersion(errorMessage);
        finishResponse();
      }
      return;
    }

    if (responseMode === "search") {
      const refinedQuery = assistantMsg.searchQuery?.trim() || userMsg.content;
      const searchToolSettings = { ...toolSettings, search: true };

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessageId
            ? {
              ...m,
              content: "",
              responseMode: "search",
              generationStats: undefined,
              weather: undefined,
              searchQuery: refinedQuery,
              searchResults: [],
              searchStatus: "searching" as const,
              isDeepResearch: undefined,
              researchSteps: undefined,
              researchStatus: undefined,
              allSources: undefined,
              versions: existingVersions,
              versionIndex: existingVersions.length - 1,
            }
            : m
        )
      );

      let answerContent = "";
      let answerGenerationStats: GenerationStats | undefined;
      let searchResults: SearchResult[] = [];
      let searchError: string | undefined;

      try {
        const searchRes = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: refinedQuery,
            toolSettings: searchToolSettings,
          }),
        });
        const body = await searchRes.json().catch(() => null);
        if (body && Array.isArray(body.results)) searchResults = body.results;
        if (body && typeof body.searchError === "string") {
          searchError = body.searchError;
        }
        if (!searchRes.ok && !searchError) {
          searchError = "Search failed before returning usable sources.";
        }

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId
              ? {
                ...m,
                responseMode: "search",
                searchResults,
                searchStatus: "done" as const,
              }
              : m
          )
        );

        while (true) {
          answerContent = "";
          answerGenerationStats = undefined;
          let answerNeedsCompactionRetry = false;

          const answerRes = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              messages: buildRegenerateConversationHistory(),
              searchResults: searchResults.map((r) => ({
                title: r.title,
                url: r.url,
                text: r.text,
                highlights: r.highlights,
              })),
              mode: "answer",
              topK,
              toolSettings: searchToolSettings,
              clientDate,
              searchAttempted: true,
              ...(searchError ? { searchError } : {}),
              ...(apiAttachment ? { attachment: apiAttachment } : {}),
              ...(systemPrompt.trim() ? { systemPrompt: systemPrompt.trim() } : {}),
            }),
          });

          if (!answerRes.ok || !answerRes.body) throw new Error("Answer failed");

          const answerReader = answerRes.body.getReader();
          const answerDecoder = new TextDecoder();
          const answerParser = parseSSEStream(
            (text) => {
              answerContent += text;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMessageId
                    ? { ...m, content: answerContent, responseMode: "search" }
                    : m
                )
              );
            },
            () => { },
            (event) => {
              if (event.type === "context_compaction_required") {
                answerNeedsCompactionRetry = true;
                return;
              }

              const stats = getGenerationStatsEvent(event);
              if (!stats) return;
              answerGenerationStats = stats;
              applyGenerationStats(assistantMessageId, stats);
            }
          );

          while (true) {
            const { done, value } = await answerReader.read();
            if (done) break;
            answerParser.processChunk(answerDecoder.decode(value, { stream: true }));
          }

          if (!answerNeedsCompactionRetry) break;
          const canRetry = await prepareRegenerateCompactionRetry({
            responseMode: "search",
            searchQuery: refinedQuery,
            searchResults,
            searchStatus: "done",
          });
          if (!canRetry) return;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessageId
                ? { ...m, content: "", responseMode: "search" }
                : m
            )
          );
        }

        const version: MessageVersion = {
          content: answerContent,
          responseMode: "search",
          generationStats: answerGenerationStats,
          searchQuery: refinedQuery,
          searchResults,
          searchStatus: "done",
        };
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId
              ? appendAssistantVersion(m, existingVersions, version)
              : m
          )
        );
        finishResponse();
      } catch (e) {
        console.error("Search regenerate failed:", e);
        const version: MessageVersion = {
          content:
            "Failed to connect to chat service. ChatJimmy may be temporarily unavailable.",
          responseMode: "search",
          searchQuery: refinedQuery,
          searchResults,
          searchStatus: "done",
        };
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId
              ? appendAssistantVersion(m, existingVersions, version)
              : m
          )
        );
        finishResponse();
      }
      return;
    }

    const regenerationToolSettings: ChatToolSettings =
      responseMode === "weather"
        ? { ...toolSettings, search: false, weather: true }
        : { ...toolSettings, search: false, weather: false };

    setMessages((prev) =>
      prev.map((m) =>
        m.id === assistantMessageId
          ? {
            ...m,
            content: "",
            responseMode: responseMode === "weather" ? "weather" : "chat",
            generationStats: undefined,
            weather: undefined,
            searchQuery: undefined,
            searchResults: undefined,
            searchStatus: undefined,
            isDeepResearch: undefined,
            researchSteps: undefined,
            researchStatus: undefined,
            allSources: undefined,
            versions: existingVersions,
            versionIndex: existingVersions.length - 1,
          }
          : m
      )
    );

    let answerContent = "";
    let answerGenerationStats: GenerationStats | undefined;
    let routerGenerationStats: GenerationStats | undefined;
    let routerContent = "";
    let routerDecision: "direct" | "search" | null = null;
    let weather: WeatherCardData | undefined;
    let directResponseMode: MessageResponseMode =
      responseMode === "weather" ? "weather" : "chat";

    try {
      while (true) {
        answerContent = "";
        routerGenerationStats = undefined;
        routerContent = "";
        routerDecision = null;
        weather = undefined;
        directResponseMode = responseMode === "weather" ? "weather" : "chat";
        let routerNeedsCompactionRetry = false;

        const routerRes = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: buildRegenerateConversationHistory(),
            mode: "router",
            topK,
            toolSettings: regenerationToolSettings,
            clientDate,
            ...(apiAttachment ? { attachment: apiAttachment } : {}),
            ...(systemPrompt.trim() ? { systemPrompt: systemPrompt.trim() } : {}),
          }),
        });

        if (!routerRes.ok || !routerRes.body) throw new Error("Router failed");

        const routerReader = routerRes.body.getReader();
        const routerDecoder = new TextDecoder();

        const routerParser = parseSSEStream(
          (text) => {
            routerContent += text;
            if (routerDecision === null && routerContent.trimStart().length >= 10) {
              routerDecision =
                extractSearchControlQuery(routerContent) !== null
                  ? "search"
                  : "direct";
            }
            if (routerDecision === "direct") {
              answerContent = routerContent;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMessageId
                    ? {
                      ...m,
                      content: routerContent,
                      responseMode: directResponseMode,
                    }
                    : m
                )
              );
            }
          },
          () => { },
          (event) => {
            if (event.type === "context_compaction_required") {
              routerNeedsCompactionRetry = true;
              return;
            }

            const stats = getGenerationStatsEvent(event);
            if (stats) {
              routerGenerationStats = stats;
              if (routerDecision === "direct") {
                applyGenerationStats(assistantMessageId, stats);
              }
              return;
            }

            if (event.type !== "weather") return;
            routerDecision = "direct";
            weather = event.weather as WeatherCardData;
            directResponseMode = "weather";
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMessageId
                  ? { ...m, weather, responseMode: "weather" }
                  : m
              )
            );
          }
        );

        while (true) {
          const { done, value } = await routerReader.read();
          if (done) break;
          routerParser.processChunk(routerDecoder.decode(value, { stream: true }));
        }

        if (!routerNeedsCompactionRetry) break;
        const retryMode = responseMode === "weather" ? "weather" : "chat";
        const canRetry = await prepareRegenerateCompactionRetry({
          responseMode: retryMode,
        });
        if (!canRetry) return;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId
              ? { ...m, content: "", responseMode: retryMode }
              : m
          )
        );
      }

      if (routerDecision === null) {
        routerDecision = "direct";
        answerContent = routerContent || "…";
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId
              ? {
                ...m,
                content: routerContent || "…",
                responseMode: directResponseMode,
              }
              : m
          )
        );
      }

      if (routerDecision === "direct" && routerGenerationStats) {
        applyGenerationStats(assistantMessageId, routerGenerationStats);
      }

      if (routerDecision === "direct") {
        const version: MessageVersion = {
          content: answerContent,
          responseMode: directResponseMode,
          generationStats: routerGenerationStats,
          weather,
        };
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId
              ? appendAssistantVersion(m, existingVersions, version)
              : m
          )
        );
        finishResponse();
        return;
      }

      if (!regenerationToolSettings.search) {
        const msg =
          "Search is disabled. Enable Search in Tools settings to use live web results, or I can continue with a normal answer from existing context.";
        const version: MessageVersion = { content: msg, responseMode: "chat" };
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId
              ? appendAssistantVersion(m, existingVersions, version)
              : m
          )
        );
        finishResponse();
        return;
      }

      const refinedQuery =
        extractSearchControlQuery(routerContent) || userMsg.content;

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessageId
            ? {
              ...m,
              content: "",
              responseMode: "search",
              generationStats: undefined,
              searchQuery: refinedQuery,
              searchResults: [],
              searchStatus: "searching" as const,
            }
            : m
        )
      );

      let searchResults: SearchResult[] = [];
      let searchError: string | undefined;
      try {
        const searchRes = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: refinedQuery,
            toolSettings: regenerationToolSettings,
          }),
        });
        const body = await searchRes.json().catch(() => null);
        if (body && Array.isArray(body.results)) searchResults = body.results;
        if (body && typeof body.searchError === "string") searchError = body.searchError;
        if (!searchRes.ok && !searchError) searchError = "Search failed before returning usable sources.";
      } catch (e) {
        console.error("Search failed:", e);
        searchError = "Search failed before returning usable sources.";
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessageId
            ? {
              ...m,
              responseMode: "search",
              searchResults,
              searchStatus: "done" as const,
            }
            : m
        )
      );

      const answerRes = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: buildRegenerateConversationHistory(),
          searchResults: searchResults.map((r) => ({
            title: r.title,
            url: r.url,
            text: r.text,
            highlights: r.highlights,
          })),
          mode: "answer",
          topK,
          toolSettings: regenerationToolSettings,
          clientDate,
          searchAttempted: true,
          ...(searchError ? { searchError } : {}),
          ...(apiAttachment ? { attachment: apiAttachment } : {}),
          ...(systemPrompt.trim() ? { systemPrompt: systemPrompt.trim() } : {}),
        }),
      });

      if (!answerRes.ok || !answerRes.body) throw new Error("Answer failed");

      const answerReader = answerRes.body.getReader();
      const answerDecoder = new TextDecoder();

      const answerParser = parseSSEStream(
        (text) => {
          answerContent += text;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessageId ? { ...m, content: answerContent } : m
            )
          );
        },
        () => { },
        (event) => {
          const stats = getGenerationStatsEvent(event);
          if (!stats) return;
          answerGenerationStats = stats;
          applyGenerationStats(assistantMessageId, stats);
        }
      );

      while (true) {
        const { done, value } = await answerReader.read();
        if (done) break;
        answerParser.processChunk(answerDecoder.decode(value, { stream: true }));
      }

      const version: MessageVersion = {
        content: answerContent,
        responseMode: "search",
        generationStats: answerGenerationStats,
        searchQuery: refinedQuery,
        searchResults,
        searchStatus: "done",
      };
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessageId
            ? appendAssistantVersion(m, existingVersions, version)
            : m
        )
      );
      finishResponse();
    } catch (e) {
      console.error("Regenerate failed:", e);
      const version: MessageVersion = {
        content:
          "Failed to connect to chat service. ChatJimmy may be temporarily unavailable.",
        responseMode: responseMode === "weather" ? "weather" : "chat",
      };
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessageId
            ? appendAssistantVersion(m, existingVersions, version)
            : m
        )
      );
      finishResponse();
    }
  };

  const handleDeepResearch = async (
    query: string,
    fileForSubmit: AttachedFile | null
  ) => {
    const assistantId = generateId();
    const attachments = fileForSubmit ? [fileForSubmit] : undefined;
    const apiAttachment = buildApiAttachment(fileForSubmit);
    const clientDate = getClientDate();
    const contextMessages = buildModelConversationHistory(
      messages,
      getScopedCompaction(messages, contextCompactionRef.current)
    );

    const userMsgId = generateId();
    scrollTargetRef.current = userMsgId;
    setStreamingMessageId(assistantId);

    if (!query && fileForSubmit) {
      setMessages((prev) => [
        ...prev,
        {
          id: userMsgId,
          role: "user",
          content: query,
          attachments,
          timestamp: nowMs(),
        },
        {
          id: assistantId,
          role: "assistant",
          responseMode: "chat",
          content:
            "Please add a research question for the attached file before running Deep Research.",
          timestamp: nowMs(),
        },
      ]);
      finishResponse();
      return;
    }

    setMessages((prev) => [
      ...prev,
      {
        id: userMsgId,
        role: "user",
        content: query,
        attachments,
        timestamp: nowMs(),
      },
      {
        id: assistantId,
        role: "assistant",
        content: "",
        responseMode: "deepResearch",
        isDeepResearch: true,
        researchSteps: [],
        researchStatus: "researching",
        allSources: [],
        timestamp: nowMs(),
      },
    ]);

    try {
      const res = await fetch("/api/deep-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          contextMessages,
          topK,
          clientDate,
          ...(apiAttachment ? { attachment: apiAttachment } : {}),
          ...(systemPrompt.trim() ? { systemPrompt: systemPrompt.trim() } : {}),
        }),
      });

      if (!res.ok || !res.body) throw new Error("Deep research failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullContent = "";
      let allSources: SearchResult[] = [];
      let generationStats: GenerationStats | undefined;

      const update = (patch: Partial<Message>) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, ...patch } : m
          )
        );
      };

      const updateStep = (
        stepId: string,
        stepPatch: Partial<ResearchStep>
      ) => {
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== assistantId) return m;
            return {
              ...m,
              researchSteps: (m.researchSteps || []).map((s) =>
                s.id === stepId ? { ...s, ...stepPatch } : s
              ),
            };
          })
        );
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;
          const raw = trimmed.slice(6);

          let event: { type: string;[key: string]: unknown };
          try {
            event = JSON.parse(raw);
          } catch {
            continue;
          }

          switch (event.type) {
            case "step_start": {
              const newStep: ResearchStep = {
                id: event.stepId as string,
                query: event.query as string,
                status: "searching",
                results: [],
                synthesis: "",
                depth: event.depth as number,
              };
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? {
                      ...m,
                      researchSteps: [...(m.researchSteps || []), newStep],
                    }
                    : m
                )
              );
              break;
            }

            case "search_complete": {
              const results = (event.results || []) as SearchResult[];
              updateStep(event.stepId as string, { results });
              break;
            }

            case "synthesizing": {
              updateStep(event.stepId as string, { status: "synthesizing" });
              break;
            }

            case "step_done": {
              updateStep(event.stepId as string, {
                status: "done",
                synthesis: event.synthesis as string,
              });
              break;
            }

            case "research_complete": {
              update({ researchStatus: "answering" });
              break;
            }

            case "answer_start": {
              update({ researchStatus: "answering" });
              break;
            }

            case "answer_chunk": {
              fullContent += event.content as string;
              const c = fullContent;
              update({ content: c });
              break;
            }

            case "all_sources": {
              allSources = (event.sources || []) as SearchResult[];
              update({ allSources });
              break;
            }

            case "generation_stats": {
              const stats = parseGenerationStats(event.stats);
              if (stats) {
                generationStats = stats;
                update({ generationStats: stats });
              }
              break;
            }

            case "done": {
              update({ researchStatus: "done", allSources, generationStats });
              finishResponse();
              break;
            }

            case "error": {
              update({
                content: `Research failed: ${event.message}`,
                researchStatus: "done",
              });
              finishResponse();
              break;
            }
          }
        }
      }

      finishResponse();
    } catch (e) {
      console.error("Deep research failed:", e);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
              ...m,
              content: "Failed to run deep research. ChatJimmy may be temporarily unavailable.",
              researchStatus: "done" as const,
            }
            : m
        )
      );
      finishResponse();
    }
  };

  const handleSubmit = async () => {
    const query = input.trim();
    const fileForSubmit = attachedFile;
    if (
      (!query && !fileForSubmit) ||
      isLoading ||
      isLoadingRef.current ||
      isCompactingContext ||
      !chatStoreReady
    ) {
      return;
    }

    const isFirstMessage = messages.length === 0;

    setIsLoading(true);
    isLoadingRef.current = true;
    setShowSettings(false);

    const effectiveCompaction = await compactContextIfNeeded(
      messages,
      query,
      fileForSubmit
    );
    const nextContextTokens = estimateModelContextTokens(
      messages,
      query,
      fileForSubmit,
      effectiveCompaction
    );

    if (nextContextTokens > MODEL_CONTEXT_TOKEN_LIMIT) {
      setContextCompactionError(
        `This request is still ${(
          nextContextTokens - MODEL_CONTEXT_TOKEN_LIMIT
        ).toLocaleString()} tokens over the 6,144 token limit after compacting. Shorten the message or attach a smaller file.`
      );
      isLoadingRef.current = false;
      setIsLoading(false);
      return;
    }

    const currentChatId = materializeDraftChat("replace");

    setInput("");
    clearAttachedFile();

    if (agentMode) {
      await handleDeepResearch(query, fileForSubmit);
    } else {
      await handleInstantSubmit(query, fileForSubmit);
    }

    queuePostTurnCompaction();

    if (isFirstMessage && currentChatId) {
      void generateTitle(
        query || fileForSubmit?.name || "Attached file",
        currentChatId
      );
    }
  };

  function applyEmptyStateSuggestion(
    suggestion: (typeof EMPTY_STATE_SUGGESTIONS)[number]
  ) {
    setInput(suggestion.label);
    setShowSettings(false);

    if (suggestion.mode === "deepResearch") {
      setAgentMode(true);
      setToolSettings({ search: false, weather: false });
      return;
    }

    setAgentMode(false);
    setToolSettings({
      search: suggestion.mode === "search",
      weather: suggestion.mode === "weather",
    });

    if (suggestion.mode === "weather") {
      clearAttachedFile();
    }
  }

  const trackSidebarTouchStart = (touch: React.Touch) => {
    if (!isCompactViewport) return;

    const canOpenFromEdge =
      !sidebarOpen && touch.clientX <= SIDEBAR_EDGE_SWIPE_WIDTH;
    const canCloseOpenSidebar = sidebarOpen;

    if (!canOpenFromEdge && !canCloseOpenSidebar) {
      touchStartXRef.current = null;
      touchStartYRef.current = null;
      touchHandledRef.current = false;
      return;
    }

    touchStartXRef.current = touch.clientX;
    touchStartYRef.current = touch.clientY;
    touchHandledRef.current = false;
  };

  const handleTrackedSidebarSwipe = (touch: React.Touch) => {
    const startX = touchStartXRef.current;
    const startY = touchStartYRef.current;
    if (!isCompactViewport || startX == null || startY == null) return false;

    const deltaX = touch.clientX - startX;
    const deltaY = touch.clientY - startY;
    if (!isHorizontalSidebarSwipe(deltaX, deltaY)) return false;

    if (!sidebarOpen && startX <= SIDEBAR_EDGE_SWIPE_WIDTH && deltaX > 0) {
      setSidebarOpen(true);
      return true;
    }

    if (sidebarOpen && deltaX < 0) {
      setSidebarOpen(false);
      return true;
    }

    return false;
  };

  const resetSidebarTouchTracking = () => {
    touchStartXRef.current = null;
    touchStartYRef.current = null;
    touchHandledRef.current = false;
  };

  const handleChatScroll = () => {
    const container = chatContainerRef.current;
    if (!container) return;
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    shouldAutoScrollRef.current = distanceFromBottom < 96;
  };

  const hasMessages = messages.length > 0;
  const contextTokenCount = useMemo(
    () =>
      getVisibleContextTokens({
        messages,
        draft: input,
        draftFile: attachedFile,
        rejectedFileTokenCount,
      }),
    [attachedFile, input, messages, rejectedFileTokenCount]
  );
  const searchCountLabel =
    searchMatchCount > 0
      ? `${Math.min(activeSearchMatchIndex + 1, searchMatchCount)}/${searchMatchCount}`
      : "0";

  const navigateSearchMatch = (direction: -1 | 1) => {
    if (searchMatchCount === 0) return;
    setActiveSearchMatchIndex((index) =>
      (index + direction + searchMatchCount) % searchMatchCount
    );
  };

  return (
    <div
      className="relative flex h-dvh"
      style={{
        backgroundColor: "var(--color-surface-primary)",
        touchAction: "pan-y",
      }}
      onTouchStart={(event) => {
        const touch = event.touches[0];
        if (!touch) return;
        trackSidebarTouchStart(touch);
      }}
      onTouchMove={(event) => {
        if (touchHandledRef.current) return;
        const touch = event.touches[0];
        if (!touch) return;
        const didHandle = handleTrackedSidebarSwipe(touch);
        if (didHandle) touchHandledRef.current = true;
      }}
      onTouchEnd={(event) => {
        if (touchHandledRef.current) {
          resetSidebarTouchTracking();
          return;
        }
        const touch = event.changedTouches[0];
        if (touch) {
          handleTrackedSidebarSwipe(touch);
        }
        resetSidebarTouchTracking();
      }}
      onTouchCancel={() => {
        resetSidebarTouchTracking();
      }}
    >
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen((s) => !s)}
        chats={chats}
        activeChatId={activeChatId}
        onSelectChat={loadChat}
        onDeleteChat={deleteChat}
        onClearAllChats={clearAllChats}
        disabled={isLoading || isCompactingContext || !chatStoreReady}
      />
      <div className="square-grid-bg flex min-w-0 flex-1 flex-col">
        <header className="relative z-10 shrink-0 px-3 pt-3 pb-2 sm:px-4 sm:pt-4">
          <nav
            className="mx-auto flex h-12 items-center justify-between border px-2.5 sm:h-13 sm:px-3"
            style={{
              width: "min(100%, 58rem)",
              borderRadius: 22,
              backgroundColor: "var(--color-surface-secondary)",
              borderColor: "var(--color-border-light)",
            }}
          >
            <div className="flex min-w-0 flex-1 items-center">
              <button
                type="button"
                onClick={() => setSidebarOpen((s) => !s)}
                onMouseEnter={() => {
                  logoSvgRef.current?.animate(
                    [
                      { transform: "perspective(200px) rotateY(0deg)" },
                      { transform: "perspective(200px) rotateY(90deg)" },
                      { transform: "perspective(200px) rotateY(180deg)" },
                      { transform: "perspective(200px) rotateY(270deg)" },
                      { transform: "perspective(200px) rotateY(360deg)" },
                    ],
                    { duration: 480, easing: "ease-in-out" }
                  );
                }}
                aria-label="Toggle sidebar"
                title="Toggle sidebar"
                className="flex shrink-0 cursor-pointer items-center justify-center"
                style={{
                  width: 32,
                  height: 32,
                  color: "var(--color-ink-primary)",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                <svg
                  ref={logoSvgRef}
                  aria-hidden="true"
                  viewBox="0 0 512 512"
                  xmlns="http://www.w3.org/2000/svg"
                  style={{ width: 17, height: 17 }}
                >
                  <path fill="currentColor" d={LOGO_PATH} />
                </svg>
              </button>
              <span
                className="select-none font-semibold"
                style={{ fontSize: 16, color: "var(--color-ink-primary)", letterSpacing: 0 }}
              >
                AiKit
              </span>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {searchOpen ? (
                <div
                  className="flex h-8 w-40 shrink-0 items-center gap-1.5 rounded-full px-3 sm:w-56"
                  style={{ backgroundColor: "var(--color-surface-tertiary)" }}
                >
                  <HugeiconsIcon icon={MessageSearch01Icon} size={13} strokeWidth={1.8} primaryColor="var(--color-ink-tertiary)" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setActiveSearchMatchIndex(0);
                    }}
                    onKeyDown={(e) => { if (e.key === "Escape") { setSearchOpen(false); setSearchQuery(""); } }}
                    onBlur={() => { if (!searchQuery) setSearchOpen(false); }}
                    placeholder={isCompactViewport ? "Search.." : "Search chats..."}
                    className="min-w-0 flex-1 bg-transparent text-[12px] outline-none"
                    style={{ color: "var(--color-ink-primary)", letterSpacing: 0 }}
                  />
                  {searchQuery && (
                    <>
                      <div className="flex shrink-0 items-center gap-0.5">
                        <button
                          type="button"
                          aria-label="Previous search match"
                          title="Previous search match"
                          disabled={searchMatchCount === 0}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => navigateSearchMatch(-1)}
                          className="search-nav-button flex h-5 w-5 items-center justify-center p-0 disabled:cursor-not-allowed disabled:opacity-35"
                        >
                          <HugeiconsIcon
                            icon={ArrowUp01Icon}
                            size={16}
                            strokeWidth={2}
                            primaryColor="currentColor"
                          />
                        </button>
                        <button
                          type="button"
                          aria-label="Next search match"
                          title="Next search match"
                          disabled={searchMatchCount === 0}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => navigateSearchMatch(1)}
                          className="search-nav-button flex h-5 w-5 items-center justify-center p-0 disabled:cursor-not-allowed disabled:opacity-35"
                        >
                          <HugeiconsIcon
                            icon={ArrowDown01Icon}
                            size={16}
                            strokeWidth={2}
                            primaryColor="currentColor"
                          />
                        </button>
                      </div>
                      <span
                        className="shrink-0 rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums"
                        style={{
                          backgroundColor: "var(--color-accent)",
                          color: "#fff",
                        }}
                      >
                        {searchCountLabel}
                      </span>
                    </>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => { setSearchOpen(true); setTimeout(() => searchInputRef.current?.focus(), 50); }}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors duration-150"
                  style={{ color: "var(--color-ink-secondary)", backgroundColor: "var(--color-surface-tertiary)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "var(--color-ink-primary)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "var(--color-ink-secondary)"; }}
                  aria-label="Search chats"
                  title="Search chats"
                >
                  <HugeiconsIcon icon={Search01Icon} size={14} strokeWidth={1.8} primaryColor="currentColor" />
                </button>
              )}

              <ThemeToggler
                className="shrink-0 rounded-full transition-colors duration-150"
                iconSize={14}
                style={{
                  width: 32,
                  height: 32,
                  color: "var(--color-ink-secondary)",
                  backgroundColor: "var(--color-surface-tertiary)",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "var(--color-ink-primary)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "var(--color-ink-secondary)"; }}
                aria-label="Toggle theme"
                title="Toggle theme"
              />

              <a
                href="https://github.com/tanu360"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors duration-150"
                style={{
                  color: githubColor,
                  backgroundColor: "var(--color-surface-tertiary)",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = githubHoverColor; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = githubColor; }}
                aria-label="GitHub tanu360"
                title="GitHub tanu360"
              >
                <HugeiconsIcon
                  icon={GithubIcon}
                  size={14}
                  strokeWidth={1.8}
                  primaryColor="currentColor"
                />
              </a>

              <button
                type="button"
                onClick={() => startNewChat()}
                disabled={isLoading || isCompactingContext || !chatStoreReady}
                aria-label="New chat"
                title="New chat"
                className="flex h-8 items-center gap-1 rounded-full px-2 text-[12px] font-medium disabled:opacity-45 sm:px-2.5"
                style={{
                  color: "#fff",
                  backgroundColor: "var(--color-accent)",
                  letterSpacing: 0,
                }}
              >
                <HugeiconsIcon
                  icon={Add01Icon}
                  size={14}
                  strokeWidth={1.9}
                  primaryColor="currentColor"
                />
                <span className="hidden sm:inline">New</span>
                <HugeiconsIcon
                  icon={PencilEdit01Icon}
                  size={13}
                  strokeWidth={2}
                  primaryColor="currentColor"
                  className="hidden sm:block"
                />
              </button>
            </div>
          </nav>
        </header>

        <div
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto"
          onScroll={handleChatScroll}
        >
          {!hasMessages && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="flex h-full flex-col items-center justify-center px-6"
            >
              <div
                className="empty-shell text-center"
                style={{ width: "min(100%, 30rem)" }}
              >
                <div className="mb-4 flex justify-center" style={{ background: "transparent" }}>
                  <SVG3D
                    key={`logo-${isDark ? "dark" : "light"}-${logo3DTheme.color}`}
                    svg={getLogoSvg(logo3DTheme.color)}
                    smoothness={0.75}
                    color={logo3DTheme.color}
                    material="chrome"
                    metalness={logo3DTheme.metalness}
                    roughness={logo3DTheme.roughness}
                    ambientIntensity={logo3DTheme.ambientIntensity}
                    lightIntensity={logo3DTheme.lightIntensity}
                    animate="spin"
                    animateSpeed={2}
                    zoom={6}
                    shadow={false}
                  />
                </div>
                <h2
                  className="mb-3 text-[24px] font-semibold sm:text-[28px]"
                  style={{
                    color: "var(--color-ink-primary)",
                    letterSpacing: 0,
                    lineHeight: 1.2,
                  }}
                >
                  What do you want to know?
                </h2>
                <div className="mb-8" />

                <div className="flex flex-wrap justify-center gap-2">
                  {EMPTY_STATE_SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion.label}
                      onPointerDown={(event) => {
                        event.preventDefault();
                        applyEmptyStateSuggestion(suggestion);
                      }}
                      onClick={() => applyEmptyStateSuggestion(suggestion)}
                      className="suggestion-chip inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[13px]"
                    >
                      <HugeiconsIcon
                        icon={suggestion.icon}
                        size={15}
                        strokeWidth={1.8}
                        primaryColor="currentColor"
                        className="shrink-0"
                      />
                      <span>{suggestion.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {hasMessages && (
            <div
              className="chat-shell mx-auto px-4 py-4 sm:py-6"
              style={{ width: "min(100%, 58rem)" }}
            >
              <div className="flex flex-col gap-4 sm:gap-5">
                {messages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    isStreaming={
                      isLoading &&
                      message.role === "assistant" &&
                      message.id === streamingMessageId
                    }
                    searchQuery={searchQuery}
                    onRegenerate={
                      message.role === "assistant"
                        ? () => handleRegenerate(message.id)
                        : undefined
                    }
                    onNavigateVersion={
                      message.role === "assistant"
                        ? (dir) => handleNavigateVersion(message.id, dir)
                        : undefined
                    }
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="shrink-0 px-4 pb-4 pt-2 sm:pb-5">
          <div
            className="chat-shell relative mx-auto"
            style={{ width: "min(100%, 58rem)" }}
          >
            {contextTokenCount > 0 && (
              <TokenCounterChip
                count={contextTokenCount}
                limit={MODEL_CONTEXT_TOKEN_LIMIT}
                trigger={AUTO_COMPACT_TRIGGER_TOKEN_LIMIT}
                hasCompaction={!!contextCompaction?.summary}
                compacting={isCompactingContext}
                error={contextCompactionError}
              />
            )}
            <motion.div
              className="pointer-events-none absolute right-0 bottom-full mb-1.5 sm:mb-2"
              animate={{ y: [0, -5, 0, -5, 0], rotate: [0, -2, 0, 2, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              <Image
                src={`data:image/svg+xml,${encodeURIComponent(MASCOT_SVG)}`}
                alt=""
                aria-hidden="true"
                width={48}
                height={48}
                className="h-9 w-9 sm:h-12 sm:w-12"
                unoptimized
              />
            </motion.div>
            <ChatInput
              value={input}
              onChange={setInput}
              onSubmit={handleSubmit}
              disabled={isLoading || isCompactingContext || !chatStoreReady}
              agentMode={agentMode}
              onAgentModeChange={setAgentMode}
              attachedFile={attachedFile}
              onFileAttach={setAttachedFile}
              onRejectedFileTokenCountChange={setRejectedFileTokenCount}
              systemPrompt={systemPrompt}
              onSystemPromptChange={setSystemPrompt}
              topK={topK}
              onTopKChange={setTopK}
              toolSettings={toolSettings}
              onToolSettingsChange={setToolSettings}
              showSettings={showSettings}
              onSettingsClick={() => setShowSettings((s) => !s)}
              onSettingsClose={() => setShowSettings(false)}
              placeholder={
                agentMode
                  ? "Ask a complex question for deep research..."
                  : hasMessages
                    ? "Ask a follow-up..."
                    : "Ask anything..."
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}

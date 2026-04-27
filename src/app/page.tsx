"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  ArtificialIntelligence04Icon,
  GithubIcon,
  MarketAnalysisIcon,
  News01Icon,
  Search01Icon,
  StartUp01Icon,
  SunCloud01Icon,
} from "@hugeicons/core-free-icons";
import type {
  AttachedFile,
  Chat,
  Message,
  SearchResult,
  ResearchStep,
  WeatherCardData,
} from "@/lib/types";
import { generateId, parseSSEStream, stripCitations } from "@/lib/utils";
import { loadAllChats, persistChat, removeChat } from "@/lib/chatStore";
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

const EMPTY_STATE_SUGGESTIONS = [
  { label: "Top AI stories today", icon: ArtificialIntelligence04Icon },
  { label: "Latest tech headlines", icon: News01Icon },
  { label: "Startup news in India", icon: StartUp01Icon },
  { label: "Delhi weather today", icon: SunCloud01Icon },
  { label: "Market-moving stories", icon: MarketAnalysisIcon },
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

function isHorizontalSidebarSwipe(deltaX: number, deltaY: number) {
  return (
    Math.abs(deltaX) >= SIDEBAR_SWIPE_TRIGGER_DISTANCE &&
    Math.abs(deltaX) > Math.abs(deltaY) * SIDEBAR_SWIPE_DIRECTION_RATIO
  );
}

function escapeFileNameForPrompt(name: string) {
  return name.replace(/[<>&"]/g, (char) => {
    switch (char) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case "\"":
        return "&quot;";
      default:
        return char;
    }
  });
}

function buildContentWithAttachments(
  content: string,
  attachments?: AttachedFile[]
) {
  if (!attachments?.length) return content;
  const typedMessage = content.trim();
  const fileBlocks = attachments
    .map(
      (file) =>
        `<file name="${escapeFileNameForPrompt(file.name)}">\n${file.content}\n</file>`
    )
    .join("\n\n");
  if (typedMessage) {
    return `<user_message>\n${typedMessage}\n</user_message>\n\n<attached_files>\n${fileBlocks}\n</attached_files>`;
  }
  return `<attached_files_as_message>\n${fileBlocks}\n</attached_files_as_message>`;
}

function buildApiContent(message: Message) {
  if (message.role === "assistant") return stripCitations(message.content);
  return buildContentWithAttachments(message.content, message.attachments);
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [agentMode, setAgentMode] = useState(false);
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [topK, setTopK] = useState(8);
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string>("");
  const [showSettings, setShowSettings] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [isCompactViewport, setIsCompactViewport] = useState(false);
  const isDark = useIsDarkTheme();
  const logo3DTheme = isDark ? LOGO_3D_THEME.dark : LOGO_3D_THEME.light;
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const scrollTargetRef = useRef<string | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chatsRef = useRef<Chat[]>([]);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const touchHandledRef = useRef(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(DESKTOP_MEDIA_QUERY);
    const syncSidebarForViewport = () => {
      setIsCompactViewport(!mediaQuery.matches);
      setSidebarOpen(mediaQuery.matches);
    };

    syncSidebarForViewport();
    mediaQuery.addEventListener("change", syncSidebarForViewport);
    return () => {
      mediaQuery.removeEventListener("change", syncSidebarForViewport);
    };
  }, []);

  useEffect(() => {
    if (!scrollTargetRef.current) return;
    const targetId = scrollTargetRef.current;
    scrollTargetRef.current = null;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = document.querySelector(
          `[data-message-id="${targetId}"]`
        );
        const container = chatContainerRef.current;
        if (!el || !container) return;
        void container.scrollHeight;
        const elRect = el.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const scrollTop =
          container.scrollTop + elRect.top - containerRect.top - 12;
        container.scrollTo({
          top: Math.max(0, scrollTop),
          behavior: "smooth",
        });
      });
    });
  }, [messages]);

  function startNewChat() {
    const id = generateId();
    const chat: Chat = {
      id,
      title: "",
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setChats((prev) => {
      const next = [chat, ...prev];
      chatsRef.current = next;
      return next;
    });
    setActiveChatId(id);
    setMessages([]);
    setInput("");
    setAttachedFile(null);
    void persistChat(chat);
  }

  function loadChat(id: string) {
    const chat = chats.find((c) => c.id === id);
    if (!chat) return;
    setActiveChatId(id);
    setMessages(chat.messages);
    setInput("");
    setAttachedFile(null);
  }

  function deleteChat(id: string) {
    void removeChat(id);
    const nextChats = chats.filter((c) => c.id !== id);
    chatsRef.current = nextChats;
    setChats(nextChats);

    if (id !== activeChatId) return;

    setInput("");
    setAttachedFile(null);

    if (nextChats.length > 0) {
      setActiveChatId(nextChats[0].id);
      setMessages(nextChats[0].messages);
    } else {
      const newId = generateId();
      const fresh: Chat = {
        id: newId,
        title: "",
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      chatsRef.current = [fresh];
      setChats([fresh]);
      setActiveChatId(newId);
      setMessages([]);
      void persistChat(fresh);
    }
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

  useEffect(() => {
    loadAllChats().then((stored) => {
      if (stored.length > 0) {
        chatsRef.current = stored;
        setChats(stored);
        setActiveChatId(stored[0].id);
        setMessages(stored[0].messages);
      } else {
        startNewChat();
      }
    });
  }, []);

  useEffect(() => {
    if (!activeChatId) return;
    setChats((prev) => {
      const next = prev.map((c) =>
        c.id === activeChatId
          ? { ...c, messages, updatedAt: Date.now() }
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
    const assistantId = generateId();
    const assistantMessage: Message = {
      id: assistantId,
      role: "assistant",
      content: "",
      timestamp: Date.now(),
    };
    const attachments = fileForSubmit ? [fileForSubmit] : undefined;

    const userMsgId = generateId();
    scrollTargetRef.current = userMsgId;

    setMessages((prev) => [
      ...prev,
      {
        id: userMsgId,
        role: "user",
        content: query,
        attachments,
        timestamp: Date.now(),
      },
      assistantMessage,
    ]);

    const conversationHistory = messages
      .filter((m) => m.content)
      .map((m) => ({
        role: m.role,
        content: buildApiContent(m),
      }));
    conversationHistory.push({
      role: "user",
      content: buildContentWithAttachments(query, attachments),
    });

    try {
      const tRouterStartWall = Date.now();
      const routerRes = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: conversationHistory,
          mode: "router",
          topK,
          ...(systemPrompt.trim() ? { systemPrompt: systemPrompt.trim() } : {}),
        }),
      });
      const tRouterFirstByteWall = Date.now();

      if (!routerRes.ok || !routerRes.body) throw new Error("Router failed");

      const routerServerTiming =
        routerRes.headers.get("Server-Timing") ??
        routerRes.headers.get("x-debug-timing");
      const routerVercelId = routerRes.headers.get("x-vercel-id");

      const routerReader = routerRes.body.getReader();
      const routerDecoder = new TextDecoder();
      let routerContent = "";
      let routerDecision: "direct" | "search" | null = null;

      const routerParser = parseSSEStream(
        (text) => {
          routerContent += text;

          if (
            routerDecision === null &&
            routerContent.trimStart().length >= 10
          ) {
            const trimmedUpper = routerContent.trimStart().toUpperCase();
            routerDecision = trimmedUpper.startsWith("SEARCH:")
              ? "search"
              : "direct";
          }

          if (routerDecision === "direct") {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: routerContent } : m
              )
            );
          }
        },
        () => { },
        (event) => {
          if (event.type !== "weather") return;
          routerDecision = "direct";
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, weather: event.weather as WeatherCardData }
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

      const tRouterEndWall = Date.now();

      if (routerDecision === null) {
        routerDecision = "direct";
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: routerContent || "…" }
              : m
          )
        );
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
        setIsLoading(false);
        return;
      }

      const trimmed = routerContent.trimStart();
      const afterMarker = trimmed.slice("SEARCH:".length);
      const newlineIdx = afterMarker.indexOf("\n");
      const rawQuery =
        newlineIdx >= 0 ? afterMarker.slice(0, newlineIdx) : afterMarker;
      const refinedQuery = rawQuery.trim() || query;

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
              ...m,
              content: "",
              searchQuery: refinedQuery,
              searchResults: [],
              searchStatus: "searching" as const,
            }
            : m
        )
      );

      let searchResults: SearchResult[] = [];
      try {
        const tSearchStartWall = Date.now();
        const searchRes = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: refinedQuery }),
        });
        const tSearchFirstByteWall = Date.now();
        if (searchRes.ok) {
          const body = await searchRes.json();
          const tSearchEndWall = Date.now();
          searchResults = body.results || [];
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
        }
      } catch (e) {
        console.error("Search failed:", e);
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, searchResults, searchStatus: "done" as const }
            : m
        )
      );

      const tAnswerStartWall = Date.now();
      const answerRes = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: conversationHistory,
          searchResults: searchResults.map((r) => ({
            title: r.title,
            url: r.url,
            text: r.text,
            highlights: r.highlights,
          })),
          mode: "answer",
          topK,
          ...(systemPrompt.trim() ? { systemPrompt: systemPrompt.trim() } : {}),
        }),
      });
      const tAnswerFirstByteWall = Date.now();

      if (!answerRes.ok || !answerRes.body) throw new Error("Answer failed");

      const answerServerTiming =
        answerRes.headers.get("Server-Timing") ??
        answerRes.headers.get("x-debug-timing");
      const answerVercelId = answerRes.headers.get("x-vercel-id");

      const answerReader = answerRes.body.getReader();
      const answerDecoder = new TextDecoder();
      let answerContent = "";

      const answerParser = parseSSEStream(
        (text) => {
          answerContent += text;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: answerContent } : m
            )
          );
        },
        () => { }
      );

      while (true) {
        const { done, value } = await answerReader.read();
        if (done) break;
        answerParser.processChunk(answerDecoder.decode(value, { stream: true }));
      }

      const tAnswerEndWall = Date.now();
      logTiming("Chat:answer", {
        query: refinedQuery,
        tStartWall: tAnswerStartWall,
        tFirstByteWall: tAnswerFirstByteWall,
        tEndWall: tAnswerEndWall,
        serverTiming: answerServerTiming,
        vercelId: answerVercelId,
      });

      setIsLoading(false);
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
      setIsLoading(false);
    }
  };

  const handleDeepResearch = async (
    query: string,
    fileForSubmit: AttachedFile | null
  ) => {
    const assistantId = generateId();
    const attachments = fileForSubmit ? [fileForSubmit] : undefined;

    const userMsgId = generateId();
    scrollTargetRef.current = userMsgId;

    setMessages((prev) => [
      ...prev,
      {
        id: userMsgId,
        role: "user",
        content: query,
        attachments,
        timestamp: Date.now(),
      },
      {
        id: assistantId,
        role: "assistant",
        content: "",
        isDeepResearch: true,
        researchSteps: [],
        researchStatus: "researching",
        allSources: [],
        timestamp: Date.now(),
      },
    ]);

    try {
      const res = await fetch("/api/deep-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: buildContentWithAttachments(query, attachments),
          topK,
          ...(systemPrompt.trim() ? { systemPrompt: systemPrompt.trim() } : {}),
        }),
      });

      if (!res.ok || !res.body) throw new Error("Deep research failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullContent = "";
      let allSources: SearchResult[] = [];

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

            case "done": {
              update({ researchStatus: "done", allSources });
              setIsLoading(false);
              break;
            }

            case "error": {
              update({
                content: `Research failed: ${event.message}`,
                researchStatus: "done",
              });
              setIsLoading(false);
              break;
            }
          }
        }
      }

      setIsLoading(false);
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
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    const query = input.trim();
    const fileForSubmit = attachedFile;
    if ((!query && !fileForSubmit) || isLoading) return;

    const isFirstMessage = messages.length === 0;
    const currentChatId = activeChatId;

    setInput("");
    setAttachedFile(null);
    setIsLoading(true);

    if (agentMode) {
      await handleDeepResearch(query, fileForSubmit);
    } else {
      await handleInstantSubmit(query, fileForSubmit);
    }

    if (isFirstMessage && currentChatId) {
      void generateTitle(
        query || fileForSubmit?.name || "Attached file",
        currentChatId
      );
    }
  };

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

  const hasMessages = messages.length > 0;
  const matchedCount = searchQuery.trim()
    ? messages.filter((m) => m.content.toLowerCase().includes(searchQuery.toLowerCase())).length
    : 0;

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
        onToggle={() => { if (isCompactViewport) setSidebarOpen((s) => !s); }}
        chats={chats}
        activeChatId={activeChatId}
        onSelectChat={loadChat}
        onDeleteChat={deleteChat}
        disabled={isLoading}
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
                onClick={() => { if (isCompactViewport) setSidebarOpen((s) => !s); }}
                aria-label="Toggle sidebar"
                title="Toggle sidebar"
                className="flex shrink-0 items-center justify-center"
                style={{
                  width: 32,
                  height: 32,
                  color: "var(--color-ink-primary)",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                <svg
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

            <div className="flex shrink-0 items-center gap-1.5">
              <a
                href="https://github.com/tanu360"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors duration-150"
                style={{ color: "var(--color-ink-secondary)", backgroundColor: "var(--color-surface-tertiary)" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "var(--color-ink-primary)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "var(--color-ink-secondary)"; }}
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

              {searchOpen ? (
                <div
                  className="flex h-8 w-28 shrink-0 items-center gap-1.5 rounded-full px-3 sm:w-40"
                  style={{ backgroundColor: "var(--color-surface-tertiary)" }}
                >
                  <HugeiconsIcon icon={Search01Icon} size={13} strokeWidth={1.8} primaryColor="var(--color-ink-tertiary)" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Escape") { setSearchOpen(false); setSearchQuery(""); } }}
                    onBlur={() => { if (!searchQuery) setSearchOpen(false); }}
                    placeholder={isCompactViewport ? "Search.." : "Search chats..."}
                    className="min-w-0 flex-1 bg-transparent text-[12px] outline-none"
                    style={{ color: "var(--color-ink-primary)", letterSpacing: 0 }}
                  />
                  {searchQuery && (
                    <span className="shrink-0 rounded-full px-1.5 py-0.5 text-[11px] font-semibold" style={{ backgroundColor: "var(--color-accent)", color: "var(--color-icon-on-fill)" }}>
                      {matchedCount}
                    </span>
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

              <button
                type="button"
                onClick={startNewChat}
                disabled={isLoading}
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
              </button>
            </div>
          </nav>
        </header>

        <div ref={chatContainerRef} className="flex-1 overflow-y-auto">
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
                      onClick={() => setInput(suggestion.label)}
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
                      message.id === messages[messages.length - 1]?.id
                    }
                    searchQuery={searchQuery}
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
            <motion.div
              className="pointer-events-none absolute right-0 bottom-full mb-2"
              animate={{ y: [0, -5, 0, -5, 0], rotate: [0, -2, 0, 2, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              <Image
                src={`data:image/svg+xml,${encodeURIComponent(MASCOT_SVG)}`}
                alt=""
                aria-hidden="true"
                width={48}
                height={48}
                unoptimized
              />
            </motion.div>
            <ChatInput
              value={input}
              onChange={setInput}
              onSubmit={handleSubmit}
              disabled={isLoading}
              agentMode={agentMode}
              onAgentModeChange={setAgentMode}
              attachedFile={attachedFile}
              onFileAttach={setAttachedFile}
              systemPrompt={systemPrompt}
              onSystemPromptChange={setSystemPrompt}
              topK={topK}
              onTopKChange={setTopK}
              showSettings={showSettings}
              onSettingsClick={() => setShowSettings((s) => !s)}
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

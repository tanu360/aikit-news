"use client";

import { motion } from "framer-motion";
import type { PriceCardData } from "@/lib/types";

interface PriceCardProps {
  price: PriceCardData;
}

function formatUpdatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Just now";
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

function formatTradeCount(value: number | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "";
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: string | undefined;
}) {
  if (!value) return null;
  return (
    <div className="price-card-stat p-3 text-center">
      <p className="price-card-subtle truncate text-[10px] font-medium uppercase">
        {label}
      </p>
      <p className="price-card-title mt-0.5 truncate text-xs font-semibold">
        {value}
      </p>
    </div>
  );
}

export default function PriceCard({ price }: PriceCardProps) {
  const isNegative = price.priceChangePercent < 0;
  const changeClass = isNegative
    ? "price-card-negative"
    : "price-card-positive";
  const tradeCount = formatTradeCount(price.tradeCount);
  const stats: Array<[string, string | undefined]> = [
    ["24h high", `${price.highPriceText} ${price.quoteAsset}`],
    ["24h low", `${price.lowPriceText} ${price.quoteAsset}`],
    ["Open", price.openPriceText],
    [
      "Bid",
      price.bidPriceText
        ? `${price.bidPriceText} ${price.quoteAsset}`
        : undefined,
    ],
    [
      "Ask",
      price.askPriceText
        ? `${price.askPriceText} ${price.quoteAsset}`
        : undefined,
    ],
    ["Trades", tradeCount],
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="price-card mb-4 w-full max-w-112.5 overflow-hidden rounded-2xl p-4"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="price-card-live-pill flex min-w-0 items-center gap-2 rounded-full px-3 py-1">
          <span className="price-card-live-dot h-2 w-2 shrink-0 rounded-full" />
          <span className="price-card-title min-w-0 truncate text-xs font-semibold">
            {price.symbol}
          </span>
        </div>
        <p className="price-card-subtle shrink-0 text-right text-xs font-medium">
          {formatUpdatedAt(price.updatedAt)}
        </p>
      </div>

      <div className="mt-6 text-center">
        <div className="mt-2 flex min-w-0 items-baseline justify-center gap-1.5">
          <span className="price-card-title min-w-0 truncate text-[2.3rem] font-bold leading-none tabular-nums sm:text-4xl">
            {price.priceText}
          </span>
        </div>
        <div
          className={`mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${changeClass}`}
        >
          <span>{price.priceChangePercentText}</span>
          <span
            aria-hidden="true"
            className="h-4 w-px bg-current opacity-30"
          />
          <span>
            {price.priceChangeText} {price.quoteAsset}
          </span>
        </div>
      </div>

      <div className="price-card-stat-grid mt-6 grid grid-cols-2 overflow-hidden rounded-xl sm:grid-cols-3">
        {stats.map(([label, value]) => (
          <Stat key={label} label={label} value={value} />
        ))}
      </div>
    </motion.div>
  );
}

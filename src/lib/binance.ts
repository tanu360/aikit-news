import type { PriceCardData } from "@/lib/types";

interface BinanceTicker24hrResponse {
  symbol?: string;
  priceChange?: string;
  priceChangePercent?: string;
  openPrice?: string;
  highPrice?: string;
  lowPrice?: string;
  lastPrice?: string;
  volume?: string;
  quoteVolume?: string;
  bidPrice?: string;
  askPrice?: string;
  closeTime?: number;
  count?: number;
}

interface ResolvedSymbol {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
}

export class BinanceSymbolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BinanceSymbolError";
  }
}

const BINANCE_BASE_URL = "https://data-api.binance.vision";
const DEFAULT_QUOTE_ASSET = "USDT";
const QUOTE_ASSETS = [
  "USDT",
  "FDUSD",
  "USDC",
  "TUSD",
  "BUSD",
  "BTC",
  "ETH",
  "BNB",
  "TRY",
  "EUR",
  "BRL",
  "DAI",
] as const;
type QuoteAsset = (typeof QUOTE_ASSETS)[number];

const ASSET_ALIASES: Record<string, string> = {
  bitcoin: "BTC",
  btc: "BTC",
  ethereum: "ETH",
  ether: "ETH",
  eth: "ETH",
  binancecoin: "BNB",
  binance: "BNB",
  bnb: "BNB",
  solana: "SOL",
  sol: "SOL",
  ripple: "XRP",
  xrp: "XRP",
  cardano: "ADA",
  ada: "ADA",
  dogecoin: "DOGE",
  doge: "DOGE",
  polygon: "POL",
  matic: "POL",
  pol: "POL",
  litecoin: "LTC",
  ltc: "LTC",
  tron: "TRX",
  trx: "TRX",
  chainlink: "LINK",
  link: "LINK",
  avalanche: "AVAX",
  avax: "AVAX",
  shiba: "SHIB",
  shib: "SHIB",
  toncoin: "TON",
  ton: "TON",
};

const SYMBOL_STOP_WORDS = new Set([
  "price",
  "ticker",
  "quote",
  "rate",
  "current",
  "live",
  "latest",
  "last",
  "binance",
  "crypto",
  "spot",
  "pair",
  "market",
  "coin",
  "token",
  "volume",
  "vol",
  "high",
  "low",
  "bid",
  "ask",
  "open",
  "close",
  "change",
  "percent",
  "percentage",
  "24h",
  "what",
  "whats",
  "is",
  "the",
  "a",
  "an",
  "of",
  "in",
  "on",
  "for",
  "to",
  "tell",
  "me",
  "please",
  "check",
  "show",
]);

function cleanToken(value: string): string {
  return value.replace(/[^a-z0-9]/gi, "").toUpperCase();
}

function normalizeAsset(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const compact = cleanToken(value);
  if (!compact) return undefined;
  return ASSET_ALIASES[compact.toLowerCase()] || compact;
}

function normalizeKnownAsset(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const compact = cleanToken(value);
  if (!compact) return undefined;
  return ASSET_ALIASES[compact.toLowerCase()];
}

function isQuoteAsset(value: string | undefined): value is QuoteAsset {
  if (!value) return false;
  return QUOTE_ASSETS.includes(value as QuoteAsset);
}

function splitSymbol(symbol: string): ResolvedSymbol {
  const compact = cleanToken(symbol);
  for (const quoteAsset of QUOTE_ASSETS) {
    if (compact.endsWith(quoteAsset) && compact.length > quoteAsset.length) {
      return {
        symbol: compact,
        baseAsset: compact.slice(0, -quoteAsset.length),
        quoteAsset,
      };
    }
  }

  const baseAsset = normalizeAsset(compact);
  if (!baseAsset) {
    throw new BinanceSymbolError("Which coin or Binance pair should I check?");
  }

  return {
    symbol: `${baseAsset}${DEFAULT_QUOTE_ASSET}`,
    baseAsset,
    quoteAsset: DEFAULT_QUOTE_ASSET,
  };
}

export function resolveBinanceSymbol(input: string): ResolvedSymbol {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new BinanceSymbolError("Which coin or Binance pair should I check?");
  }

  const pairMatch = trimmed.match(
    /\b([a-z0-9]{2,12})\s*[/:-]\s*([a-z0-9]{2,8})\b/i
  );
  if (pairMatch) {
    const baseAsset = normalizeAsset(pairMatch[1]);
    const quoteAsset = normalizeAsset(pairMatch[2]);
    if (baseAsset && isQuoteAsset(quoteAsset)) {
      return {
        symbol: `${baseAsset}${quoteAsset}`,
        baseAsset,
        quoteAsset,
      };
    }
  }

  const words = trimmed
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .filter((word) => !SYMBOL_STOP_WORDS.has(word));

  if (words.length >= 2) {
    for (let index = 0; index < words.length - 1; index += 1) {
      const baseAsset = normalizeAsset(words[index]);
      const quoteAsset = normalizeAsset(words[index + 1]);
      if (!baseAsset || !isQuoteAsset(quoteAsset)) continue;
      return {
        symbol: `${baseAsset}${quoteAsset}`,
        baseAsset,
        quoteAsset,
      };
    }
  }

  const exactCandidate = words.find((word) => {
    const compact = cleanToken(word);
    return QUOTE_ASSETS.some(
      (quoteAsset) => compact.endsWith(quoteAsset) && compact.length > quoteAsset.length
    );
  });
  if (exactCandidate) return splitSymbol(exactCandidate);

  const knownBaseCandidate = words.find((word) => normalizeKnownAsset(word));
  if (knownBaseCandidate) {
    const baseAsset = normalizeKnownAsset(knownBaseCandidate);
    if (baseAsset) return splitSymbol(baseAsset);
  }

  const compactInput = cleanToken(trimmed);
  const inputTokens = trimmed.split(/[^a-z0-9]+/i).filter(Boolean);
  if (compactInput && inputTokens.length === 1) return splitSymbol(compactInput);

  if (words.length === 1) return splitSymbol(words[0]);

  throw new BinanceSymbolError("Which coin or Binance Spot pair should I check?");
}

function readNumber(value: string | undefined, field: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Binance returned an invalid ${field}`);
  }
  return parsed;
}

function formatDecimal(value: number): string {
  const abs = Math.abs(value);
  const maximumFractionDigits = abs >= 1000 ? 2 : abs >= 1 ? 4 : 8;
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: abs >= 1 ? 2 : 0,
    maximumFractionDigits,
  }).format(value);
}

function formatCompact(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatSigned(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatDecimal(value)}`;
}

async function fetchBinanceTicker(
  symbol: string
): Promise<BinanceTicker24hrResponse> {
  const params = new URLSearchParams({ symbol });
  const response = await fetch(
    `${BINANCE_BASE_URL}/api/v3/ticker/24hr?${params.toString()}`,
    { next: { revalidate: 10 } }
  );

  if (!response.ok) {
    throw new BinanceSymbolError(
      `${symbol} was not found on Binance Spot. Try a pair like BTCUSDT.`
    );
  }

  const data = (await response.json()) as BinanceTicker24hrResponse;
  if (!data || typeof data.symbol !== "string") {
    throw new Error("Binance returned an invalid price response");
  }
  return data;
}

export async function getBinancePrice(input: string): Promise<PriceCardData> {
  const resolved = resolveBinanceSymbol(input);
  const ticker = await fetchBinanceTicker(resolved.symbol);
  const symbol = ticker.symbol || resolved.symbol;
  const split = splitSymbol(symbol);

  const price = readNumber(ticker.lastPrice, "last price");
  const priceChange = readNumber(ticker.priceChange, "price change");
  const priceChangePercent = readNumber(
    ticker.priceChangePercent,
    "price change percent"
  );
  const highPrice = readNumber(ticker.highPrice, "high price");
  const lowPrice = readNumber(ticker.lowPrice, "low price");
  const openPrice = readNumber(ticker.openPrice, "open price");
  const volume = readNumber(ticker.volume, "volume");
  const quoteVolume = readNumber(ticker.quoteVolume, "quote volume");
  const bidPrice =
    ticker.bidPrice === undefined ? undefined : readNumber(ticker.bidPrice, "bid price");
  const askPrice =
    ticker.askPrice === undefined ? undefined : readNumber(ticker.askPrice, "ask price");

  return {
    symbol,
    baseAsset: split.baseAsset,
    quoteAsset: split.quoteAsset,
    price,
    priceText: formatDecimal(price),
    priceChange,
    priceChangeText: formatSigned(priceChange),
    priceChangePercent,
    priceChangePercentText: `${formatSigned(priceChangePercent)}%`,
    highPrice,
    highPriceText: formatDecimal(highPrice),
    lowPrice,
    lowPriceText: formatDecimal(lowPrice),
    openPrice,
    openPriceText: formatDecimal(openPrice),
    volume,
    volumeText: formatCompact(volume),
    quoteVolume,
    quoteVolumeText: formatCompact(quoteVolume),
    bidPrice,
    bidPriceText: bidPrice === undefined ? undefined : formatDecimal(bidPrice),
    askPrice,
    askPriceText: askPrice === undefined ? undefined : formatDecimal(askPrice),
    tradeCount: ticker.count,
    updatedAt: new Date(ticker.closeTime || Date.now()).toISOString(),
    source: "Binance Spot",
  };
}

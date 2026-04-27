export interface AttachedFile {
  name: string;
  path?: string;
  content: string;
  size: number;
  tokenCount: number;
  charCount?: number;
}

export interface SearchResult {
  title: string;
  url: string;
  text?: string;
  highlights?: string[];
  publishedDate?: string;
  author?: string;
  score?: number;
}

export interface ResearchStep {
  id: string;
  query: string;
  status: "searching" | "synthesizing" | "done";
  results: SearchResult[];
  synthesis: string;
  depth: number;
}

export interface WeatherHour {
  time: string;
  label: string;
  temperature: number;
  weatherCode: number;
  condition: string;
  isDay: boolean;
}

export interface WeatherCardData {
  location: string;
  region?: string;
  country?: string;
  timezone: string;
  localTime: string;
  temperature: number;
  apparentTemperature?: number;
  humidity?: number;
  windSpeed?: number;
  precipitation?: number;
  weatherCode: number;
  condition: string;
  isDay: boolean;
  high?: number;
  low?: number;
  sunrise?: string;
  sunset?: string;
  hourly: WeatherHour[];
  temperatureUnit: "°C";
  windUnit: "km/h";
  updatedAt: string;
}

export type MessageResponseMode = "chat" | "search" | "weather" | "deepResearch";

export interface GenerationStats {
  provider: "chatjimmy";
  decodeTokens: number;
  decodeRate: number;
  decodeTimeSeconds: number;
  promptTokens?: number;
  totalTokens?: number;
}

export interface MessageVersion {
  content: string;
  responseMode?: MessageResponseMode;
  generationStats?: GenerationStats;
  weather?: WeatherCardData;
  searchQuery?: string;
  searchResults?: SearchResult[];
  searchStatus?: "searching" | "done";
  isDeepResearch?: boolean;
  researchSteps?: ResearchStep[];
  researchStatus?: "researching" | "answering" | "done";
  allSources?: SearchResult[];
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  responseMode?: MessageResponseMode;
  generationStats?: GenerationStats;
  attachments?: AttachedFile[];
  weather?: WeatherCardData;
  searchQuery?: string;
  searchResults?: SearchResult[];
  searchStatus?: "searching" | "done";
  isDeepResearch?: boolean;
  researchSteps?: ResearchStep[];
  researchStatus?: "researching" | "answering" | "done";
  allSources?: SearchResult[];
  versions?: MessageVersion[];
  versionIndex?: number;
  timestamp: number;
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

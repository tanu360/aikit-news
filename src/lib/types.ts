export interface AttachedFile {
  name: string;
  content: string;
  size: number;
  charCount: number;
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

export interface SearchResponse {
  results: SearchResult[];
  autopromptString?: string;
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

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  weather?: WeatherCardData;
  searchQuery?: string;
  searchResults?: SearchResult[];
  searchStatus?: "searching" | "done";
  isDeepResearch?: boolean;
  researchSteps?: ResearchStep[];
  researchStatus?: "researching" | "answering" | "done";
  allSources?: SearchResult[];
  timestamp: number;
}

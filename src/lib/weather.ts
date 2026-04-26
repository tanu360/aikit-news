import type { WeatherCardData, WeatherHour } from "@/lib/types";

interface GeocodingResult {
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
  timezone?: string;
}

interface GeocodingResponse {
  results?: GeocodingResult[];
}

interface ForecastResponse {
  timezone?: string;
  current?: {
    time?: string;
    temperature_2m?: number;
    relative_humidity_2m?: number;
    apparent_temperature?: number;
    is_day?: number;
    precipitation?: number;
    weather_code?: number;
    wind_speed_10m?: number;
  };
  hourly?: {
    time?: string[];
    temperature_2m?: number[];
    weather_code?: number[];
    is_day?: number[];
  };
  daily?: {
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    sunrise?: string[];
    sunset?: string[];
  };
}

const WEATHER_CODES: Record<number, string> = {
  0: "Clear",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Rime fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Dense drizzle",
  56: "Freezing drizzle",
  57: "Freezing drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  66: "Freezing rain",
  67: "Freezing rain",
  71: "Light snow",
  73: "Snow",
  75: "Heavy snow",
  77: "Snow grains",
  80: "Rain showers",
  81: "Rain showers",
  82: "Heavy showers",
  85: "Snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with hail",
  99: "Thunderstorm with hail",
};

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function conditionFor(code: number | undefined): string {
  return WEATHER_CODES[code ?? -1] || "Weather";
}

function roundTemp(value: number | undefined): number {
  return Math.round(typeof value === "number" ? value : 0);
}

function parseLocalParts(value: string | undefined) {
  const fallback = {
    month: 0,
    day: 1,
    hour: 0,
    minute: 0,
  };

  if (!value) return fallback;

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!match) return fallback;

  return {
    month: Number(match[2]) - 1,
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
  };
}

function formatClock(value: string | undefined): string {
  const { hour, minute } = parseLocalParts(value);
  const suffix = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${String(minute).padStart(2, "0")} ${suffix}`;
}

function formatHourLabel(value: string | undefined, index: number): string {
  if (index === 0) return "Now";

  const { hour } = parseLocalParts(value);
  const suffix = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}${suffix}`;
}

function formatDateTime(value: string | undefined): string {
  const { month, day } = parseLocalParts(value);
  return `${MONTHS[month] ?? "Jan"} ${day}, ${formatClock(value)}`;
}

async function geocodeLocation(location: string): Promise<GeocodingResult> {
  const params = new URLSearchParams({
    name: location,
    count: "1",
    language: "en",
    format: "json",
  });

  const response = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`,
    { next: { revalidate: 60 * 60 * 12 } }
  );

  if (!response.ok) {
    throw new Error("Weather location lookup failed");
  }

  const data = (await response.json()) as GeocodingResponse;
  const match = data.results?.[0];

  if (!match) {
    throw new Error(`No weather location found for ${location}`);
  }

  return match;
}

function getHourlyForecast(forecast: ForecastResponse): WeatherHour[] {
  const times = forecast.hourly?.time || [];
  const temps = forecast.hourly?.temperature_2m || [];
  const codes = forecast.hourly?.weather_code || [];
  const isDay = forecast.hourly?.is_day || [];
  const currentTime = forecast.current?.time;
  const currentIndex = currentTime
    ? times.findIndex((time) => time >= currentTime)
    : 0;
  const startIndex = currentIndex >= 0 ? currentIndex : 0;

  return times.slice(startIndex, startIndex + 6).map((time, index) => {
    const sourceIndex = startIndex + index;
    const weatherCode =
      codes[sourceIndex] ?? forecast.current?.weather_code ?? 0;
    return {
      time,
      label: formatHourLabel(time, index),
      temperature: roundTemp(temps[sourceIndex]),
      weatherCode,
      condition: conditionFor(weatherCode),
      isDay: (isDay[sourceIndex] ?? forecast.current?.is_day ?? 1) === 1,
    };
  });
}

export async function getWeather(
  location: string,
  units?: string
): Promise<WeatherCardData> {
  void units;
  const place = await geocodeLocation(location);
  const forecastParams = new URLSearchParams({
    latitude: String(place.latitude),
    longitude: String(place.longitude),
    current:
      "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m",
    hourly: "temperature_2m,weather_code,is_day",
    daily: "temperature_2m_max,temperature_2m_min,sunrise,sunset",
    timezone: "auto",
    forecast_days: "2",
    forecast_hours: "12",
    temperature_unit: "celsius",
    wind_speed_unit: "kmh",
  });

  const response = await fetch(
    `https://api.open-meteo.com/v1/forecast?${forecastParams.toString()}`,
    { next: { revalidate: 60 * 10 } }
  );

  if (!response.ok) {
    throw new Error("Weather forecast lookup failed");
  }

  const forecast = (await response.json()) as ForecastResponse;
  const weatherCode = forecast.current?.weather_code ?? 0;

  return {
    location: place.name,
    region: place.admin1,
    country: place.country,
    timezone: forecast.timezone || place.timezone || "auto",
    localTime: formatDateTime(forecast.current?.time),
    temperature: roundTemp(forecast.current?.temperature_2m),
    apparentTemperature:
      typeof forecast.current?.apparent_temperature === "number"
        ? roundTemp(forecast.current.apparent_temperature)
        : undefined,
    humidity: forecast.current?.relative_humidity_2m,
    windSpeed:
      typeof forecast.current?.wind_speed_10m === "number"
        ? Math.round(forecast.current.wind_speed_10m)
        : undefined,
    precipitation: forecast.current?.precipitation,
    weatherCode,
    condition: conditionFor(weatherCode),
    isDay: forecast.current?.is_day !== 0,
    high:
      typeof forecast.daily?.temperature_2m_max?.[0] === "number"
        ? roundTemp(forecast.daily.temperature_2m_max[0])
        : undefined,
    low:
      typeof forecast.daily?.temperature_2m_min?.[0] === "number"
        ? roundTemp(forecast.daily.temperature_2m_min[0])
        : undefined,
    sunrise: forecast.daily?.sunrise?.[0]
      ? formatClock(forecast.daily.sunrise[0])
      : undefined,
    sunset: forecast.daily?.sunset?.[0]
      ? formatClock(forecast.daily.sunset[0])
      : undefined,
    hourly: getHourlyForecast(forecast),
    temperatureUnit: "°C",
    windUnit: "km/h",
    updatedAt: forecast.current?.time || new Date().toISOString(),
  };
}

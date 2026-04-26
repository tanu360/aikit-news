"use client";

import type { CSSProperties } from "react";
import { motion } from "framer-motion";
import type { WeatherCardData } from "@/lib/types";

interface WeatherCardProps {
  weather: WeatherCardData;
}

function isRain(code: number): boolean {
  return (
    (code >= 51 && code <= 67) ||
    (code >= 80 && code <= 82) ||
    code >= 95
  );
}

function isSnow(code: number): boolean {
  return (code >= 71 && code <= 77) || code === 85 || code === 86;
}

function isCloudy(code: number): boolean {
  return code === 2 || code === 3 || code === 45 || code === 48;
}

function isClear(code: number): boolean {
  return code === 0 || code === 1;
}

function weatherAccent(weather: WeatherCardData): string {
  if (!weather.isDay) {
    return "oklch(88% 0.09 225)";
  }

  if (isRain(weather.weatherCode)) {
    return "oklch(90% 0.11 230)";
  }

  if (isSnow(weather.weatherCode)) {
    return "oklch(95% 0.055 220)";
  }

  if (isCloudy(weather.weatherCode)) {
    return "oklch(89% 0.07 235)";
  }

  if (isClear(weather.weatherCode)) {
    return "oklch(88% 0.13 205)";
  }

  return "oklch(90% 0.09 220)";
}

function WeatherIcon({
  code,
  isDay,
  size = 48,
}: {
  code: number;
  isDay: boolean;
  size?: number;
}) {
  if (isRain(code)) {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
        <path
          d="M21 38h26a10 10 0 0 0 0-20 16 16 0 0 0-30-3A12 12 0 0 0 21 38Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.82"
        />
        <path
          d="M23 47l-4 7M35 47l-4 7M47 47l-4 7"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
          opacity="0.78"
        />
      </svg>
    );
  }

  if (isSnow(code)) {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
        <path
          d="M21 36h26a10 10 0 0 0 0-20 16 16 0 0 0-30-3A12 12 0 0 0 21 36Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.82"
        />
        <path
          d="M26 48h12M32 42v12M27.5 43.5l9 9M36.5 43.5l-9 9"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.78"
        />
      </svg>
    );
  }

  if (!isDay) {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
        <path
          d="M45.5 42.5A22 22 0 0 1 22 19a22.3 22.3 0 0 1 3-11A25 25 0 1 0 56 39.5a22.2 22.2 0 0 1-10.5 3Z"
          fill="currentColor"
        />
      </svg>
    );
  }

  if (isCloudy(code)) {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
        <path
          d="M21 42h28a11 11 0 0 0 0-22 17 17 0 0 0-32-3A13 13 0 0 0 21 42Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.86"
        />
      </svg>
    );
  }

  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r="13" fill="currentColor" />
      <path
        d="M32 5v8M32 51v8M5 32h8M51 32h8M13 13l6 6M45 45l6 6M51 13l-6 6M19 45l-6 6"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        opacity="0.76"
      />
    </svg>
  );
}

export default function WeatherCard({ weather }: WeatherCardProps) {
  const placeMeta = [weather.region, weather.country]
    .filter(Boolean)
    .join(", ");
  const cardVars = {
    "--weather-accent": weatherAccent(weather),
  } as CSSProperties;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="weather-card mb-4 w-full max-w-[450px] overflow-hidden rounded-2xl p-4"
      style={cardVars}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="weather-card-title truncate text-xs font-medium">
            {weather.location}
          </h3>
          {placeMeta && (
            <p className="weather-card-subtle mt-0.5 truncate text-[11px] font-medium">
              {placeMeta}
            </p>
          )}
        </div>
        <p className="weather-card-subtle shrink-0 text-right text-xs font-medium">
          {weather.localTime}
        </p>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="weather-card-icon shrink-0">
            <WeatherIcon
              code={weather.weatherCode}
              isDay={weather.isDay}
              size={32}
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-start">
              <span className="text-3xl font-semibold leading-none">
                {weather.temperature}
              </span>
              <span className="weather-card-title ml-0.5 pt-0.5 text-lg font-medium">
                {weather.temperatureUnit}
              </span>
            </div>
            <p className="weather-card-muted mt-0.5 truncate text-xs font-normal">
              {weather.condition}
            </p>
          </div>
        </div>

        <div className="shrink-0 text-right text-xs leading-relaxed">
          {typeof weather.high === "number" && (
            <p className="weather-card-title font-normal">
              <span className="weather-card-muted">H:</span> {weather.high}
              {weather.temperatureUnit}
            </p>
          )}
          {typeof weather.low === "number" && (
            <p className="weather-card-muted">
              <span className="weather-card-subtle">L:</span> {weather.low}
              {weather.temperatureUnit}
            </p>
          )}
        </div>
      </div>

      <div
        className="weather-card-panel mt-3 rounded-xl p-3 backdrop-blur-sm"
      >
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="weather-card-title text-xs font-medium">
            Hourly Forecast
          </p>
          {typeof weather.apparentTemperature === "number" && (
            <p className="weather-card-subtle hidden text-xs font-normal sm:block">
              Feels like {weather.apparentTemperature}
              {weather.temperatureUnit}
            </p>
          )}
        </div>

        <div className="flex justify-between gap-1">
          {weather.hourly.map((hour, index) => (
            <div
              key={hour.time}
              className={`weather-card-hour min-w-0 flex-1 flex-col items-center gap-1 rounded-md px-1 py-1.5 text-center transition-colors duration-200 ${
                index >= 5 ? "hidden sm:flex" : "flex"
              }`}
            >
              <span className="weather-card-muted text-xs font-normal">
                {hour.label}
              </span>
              <span className="weather-card-icon">
                <WeatherIcon
                  code={hour.weatherCode}
                  isDay={hour.isDay}
                  size={16}
                />
              </span>
              <span className="weather-card-strong text-xs font-normal">
                {hour.temperature}
                {weather.temperatureUnit}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="weather-card-subtle mt-2 flex justify-between gap-3 text-xs">
        <div className="min-w-0 truncate">
          Sunrise:{" "}
          <span className="weather-card-muted">
            {weather.sunrise || "N/A"}
          </span>
        </div>
        <div className="min-w-0 truncate text-right">
          Sunset:{" "}
          <span className="weather-card-muted">{weather.sunset || "N/A"}</span>
        </div>
      </div>
    </motion.div>
  );
}

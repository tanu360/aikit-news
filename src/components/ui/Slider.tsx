"use client"

import * as React from "react"
import { Slider as SliderPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root>) {
  const values = React.useMemo(
    () =>
      Array.isArray(value)
        ? value
        : Array.isArray(defaultValue)
          ? defaultValue
          : [min, max],
    [value, defaultValue, min, max]
  )

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      className={cn(
        "relative flex w-full touch-none items-center select-none data-disabled:opacity-50 data-vertical:h-full data-vertical:min-h-40 data-vertical:w-auto data-vertical:flex-col",
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className="relative h-1.5 w-full grow overflow-hidden rounded-full"
        style={{
          backgroundColor: "var(--color-border-default)",
          boxShadow:
            "inset 0 0 0 1px color-mix(in oklch, var(--color-ink-primary) 10%, var(--color-border-default))",
        }}
      >
        <SliderPrimitive.Range
          data-slot="slider-range"
          className="absolute left-0 top-0 h-full"
          style={{
            backgroundColor: "var(--color-ink-primary)",
          }}
        />
      </SliderPrimitive.Track>
      {Array.from({ length: values.length }, (_, index) => (
        <SliderPrimitive.Thumb
          data-slot="slider-thumb"
          key={index}
          className="relative block h-3.5 w-3.5 shrink-0 rounded-full transition-[box-shadow,color] select-none focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
          style={{
            backgroundColor: "var(--color-ink-primary)",
            boxShadow:
              "0 0 0 1.5px var(--color-input-bg-focus), 0 1px 2px oklch(0 0 0 / 0.16)",
          }}
        />
      ))}
    </SliderPrimitive.Root>
  )
}

export { Slider }

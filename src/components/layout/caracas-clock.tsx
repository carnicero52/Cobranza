'use client'

import { useState, useEffect } from 'react'
import { Clock } from 'lucide-react'

const TIMEZONE = 'America/Caracas'

function getCaracasTime(): { time: string; date: string; seconds: number } {
  const now = new Date()
  const time = now.toLocaleTimeString('es-VE', {
    timeZone: TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  })
  const date = now.toLocaleDateString('es-VE', {
    timeZone: TIMEZONE,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
  const seconds = now.getSeconds()
  return { time, date, seconds }
}

export function CaracasClock() {
  const [{ time, date, seconds }, setTime] = useState(getCaracasTime)

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(getCaracasTime())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground" title={`Hora de Caracas, Venezuela (${TIMEZONE})`}>
      <Clock className="size-4 text-amber-500" />
      <span className="font-mono font-medium tabular-nums tracking-wide">
        {time}
      </span>
      <span className="hidden sm:inline text-xs">•</span>
      <span className="hidden sm:inline text-xs capitalize">
        {date}
      </span>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { Clock } from 'lucide-react'

const TIMEZONE = 'America/Caracas'

function getTime() {
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
  return { time, date }
}

export function SidebarClock() {
  const [t, setT] = useState(getTime)

  useEffect(() => {
    const id = setInterval(() => setT(getTime()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="flex items-center gap-2.5 rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800 px-3 py-2.5">
      <Clock className="size-5 text-amber-600 dark:text-amber-400" />
      <div className="min-w-0">
        <p className="font-mono font-bold text-sm text-amber-800 dark:text-amber-200 tabular-nums leading-tight">
          {t.time}
        </p>
        <p className="text-[11px] text-amber-600 dark:text-amber-400 capitalize leading-tight">
          🇻🇪 Caracas • {t.date}
        </p>
      </div>
    </div>
  )
}

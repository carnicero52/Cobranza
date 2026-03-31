'use client'

import { useEffect } from 'react'

/**
 * Hook that listens for the 'app:auto-refresh' custom event
 * (dispatched every 10 seconds from DashboardLayout)
 * and calls the provided refetch function.
 *
 * Usage:
 *   useAutoRefresh(fetchData)
 */
export function useAutoRefresh(refetch: () => void | Promise<void>) {
  useEffect(() => {
    const handler = () => {
      refetch()
    }
    window.addEventListener('app:auto-refresh', handler)
    return () => window.removeEventListener('app:auto-refresh', handler)
  }, [refetch])
}

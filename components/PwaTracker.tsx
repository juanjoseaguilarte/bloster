'use client'
import { useEffect } from 'react'

export default function PwaTracker() {
  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      fetch('/api/pwa/installed', { method: 'POST' }).catch(() => {})
    }
  }, [])

  return null
}

'use client'

import { Moon, Sun, Monitor } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function ThemeToggle({ className, showLabel }: { className?: string; showLabel?: boolean }) {
  const setTheme = (theme: string) => {
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      try { localStorage.setItem('royalty-qr-theme', theme) } catch {}
      document.documentElement.classList.toggle('dark', prefersDark)
    } else {
      try { localStorage.setItem('royalty-qr-theme', theme) } catch {}
      document.documentElement.classList.toggle('dark', theme === 'dark')
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size={showLabel ? 'default' : 'icon'} className={className}>
          <Sun className="size-5 block dark:hidden" />
          <Moon className="size-5 hidden dark:block" />
          {showLabel && <span className="ml-2">Tema</span>}
          {!showLabel && <span className="sr-only">Cambiar tema</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={showLabel ? 'start' : 'end'}>
        <DropdownMenuItem onClick={() => setTheme('light')}>
          <Sun className="size-4 mr-2" />
          Claro
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}>
          <Moon className="size-4 mr-2" />
          Oscuro
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')}>
          <Monitor className="size-4 mr-2" />
          Sistema
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

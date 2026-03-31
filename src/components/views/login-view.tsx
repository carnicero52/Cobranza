'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { QrCode, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { useAppStore } from '@/store/app-store'
import { useAuthStore } from '@/store/auth-store'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { ThemeToggle } from '@/components/theme-toggle'

export function LoginView() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { setView } = useAppStore()
  const { setAuth } = useAuthStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error('Por favor, completa todos los campos')
      return
    }
    setLoading(true)
    try {
      const res = await api.login(email, password)
      setAuth(res.user, res.token)
      toast.success('¡Bienvenido de vuelta!')
      setView('dashboard')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al iniciar sesión'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/3 w-72 h-72 bg-amber-200/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-orange-200/15 rounded-full blur-3xl" />
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="flex items-center justify-between w-full mb-8">
            <div />
            <ThemeToggle />
          </div>
          <div className="flex flex-col items-center mb-8">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-amber-500 text-white mb-4">
              <QrCode className="size-7" />
            </div>
            <h1 className="text-2xl font-bold">Royalty QR</h1>
            <p className="text-muted-foreground text-sm mt-1">Inicia sesión en tu cuenta</p>
            <p className="text-xs text-emerald-600 font-bold mt-1 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded">🇻🇪 v2.0 — ACTUALIZADO</p>
          </div>

          <Card className="border-0 shadow-lg">
            <form onSubmit={handleSubmit}>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Correo electrónico</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@negocio.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </CardContent>
              <CardFooter className="flex-col gap-4">
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
                >
                  {loading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Iniciando sesión...
                    </>
                  ) : (
                    'Iniciar Sesión'
                  )}
                </Button>
                <p className="text-sm text-muted-foreground">
                  ¿No tienes cuenta?{' '}
                  <button
                    type="button"
                    className="text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 font-medium"
                    onClick={() => setView('register')}
                  >
                    Regístrate gratis
                  </button>
                </p>
              </CardFooter>
            </form>
          </Card>
        </motion.div>
      </div>

      <footer className="border-t py-6 px-6 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Royalty QR. Todos los derechos reservados.</p>
      </footer>
    </div>
  )
}

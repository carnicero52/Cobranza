'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { QrCode, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { useAppStore } from '@/store/app-store'
import { useAuthStore } from '@/store/auth-store'
import { api } from '@/lib/api'
import { toast } from 'sonner'

export function RegisterView() {
  const [businessName, setBusinessName] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { setView } = useAppStore()
  const { setAuth } = useAuthStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!businessName || !name || !email || !password) {
      toast.error('Por favor, completa los campos obligatorios')
      return
    }
    setLoading(true)
    try {
      const res = await api.register({
        businessName,
        name,
        email,
        password,
        phone: phone || undefined,
      })
      setAuth(res.user, res.token)
      toast.success('¡Cuenta creada exitosamente!')
      setView('dashboard')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al crear la cuenta'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 right-1/3 w-72 h-72 bg-amber-200/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-orange-200/15 rounded-full blur-3xl" />
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-amber-500 text-white mb-4">
              <QrCode className="size-7" />
            </div>
            <h1 className="text-2xl font-bold">Crear Cuenta</h1>
            <p className="text-muted-foreground text-sm mt-1">Configura tu programa de lealtad en minutos</p>
          </div>

          <Card className="border-0 shadow-lg">
            <form onSubmit={handleSubmit}>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="businessName">Nombre del Negocio *</Label>
                  <Input
                    id="businessName"
                    placeholder="Mi Negocio"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Tu Nombre *</Label>
                  <Input
                    id="name"
                    placeholder="Juan Pérez"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Correo electrónico *</Label>
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
                  <Label htmlFor="phone">Teléfono (opcional)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+52 55 1234 5678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña *</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
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
                      Creando cuenta...
                    </>
                  ) : (
                    'Crear Cuenta'
                  )}
                </Button>
                <p className="text-sm text-muted-foreground">
                  ¿Ya tienes cuenta?{' '}
                  <button
                    type="button"
                    className="text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 font-medium"
                    onClick={() => setView('login')}
                  >
                    Inicia sesión
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

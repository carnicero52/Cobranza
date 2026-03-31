'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, Star, CheckCircle, Loader2, UserCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { api } from '@/lib/api'
import type { Customer, BusinessSettings } from '@/lib/types'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

export function StaffPanelView() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [points, setPoints] = useState('1')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [registering, setRegistering] = useState(false)
  const [success, setSuccess] = useState(false)
  const [resultPoints, setResultPoints] = useState(0)
  const [settings, setSettings] = useState<BusinessSettings | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)

  const fetchCustomers = useCallback(async () => {
    try {
      const res = await api.getCustomers(search || undefined)
      setCustomers(res.data)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.getBusinessSettings()
        setSettings(res.data)
        setPoints(String(res.data.pointsPerPurchase || 1))
      } catch {
        // silent
      }
    }
    fetchSettings()
  }, [])

  useEffect(() => {
    if (search.length > 0) {
      setLoading(true)
      fetchCustomers()
      setShowDropdown(true)
    } else {
      setCustomers([])
      setShowDropdown(false)
    }
  }, [search, fetchCustomers])

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer)
    setSearch(customer.name)
    setShowDropdown(false)
  }

  const handleRegister = async () => {
    if (!selectedCustomer) {
      toast.error('Selecciona un cliente')
      return
    }
    if (!points || Number(points) <= 0) {
      toast.error('Ingresa puntos válidos')
      return
    }
    setRegistering(true)
    try {
      await api.earnPoints(selectedCustomer.id, Number(points), description || undefined)
      setResultPoints(selectedCustomer.totalPoints + Number(points))
      setSuccess(true)
      toast.success(`+${points} puntos otorgados a ${selectedCustomer.name}`)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al registrar visita'
      toast.error(message)
    } finally {
      setRegistering(false)
    }
  }

  const handleReset = () => {
    setSelectedCustomer(null)
    setSearch('')
    setDescription('')
    setSuccess(false)
    setResultPoints(0)
    if (settings?.pointsPerPurchase) {
      setPoints(String(settings.pointsPerPurchase))
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Panel Staff</h2>
        <p className="text-muted-foreground text-sm mt-1">Registra visitas y otorga puntos rápidamente</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserCircle className="size-5 text-amber-500" />
            Registrar Visita
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Customer Search */}
          <div className="space-y-2">
            <Label>Buscar Cliente</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o email..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  if (selectedCustomer) setSelectedCustomer(null)
                }}
                className="pl-10"
                disabled={success}
              />
              {showDropdown && customers.length > 0 && !selectedCustomer && (
                <div className="absolute top-full left-0 right-0 z-20 mt-1 max-h-48 overflow-y-auto rounded-lg border bg-popover shadow-md">
                  {customers.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => handleSelectCustomer(c)}
                      className="flex items-center gap-3 w-full px-3 py-2 text-left hover:bg-accent transition-colors"
                    >
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-bold">
                        {c.name.split(' ').map((n) => n.charAt(0)).join('').toUpperCase().slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.email}</p>
                      </div>
                      <Badge className="ml-auto bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 text-xs">
                        {c.totalPoints} pts
                      </Badge>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selectedCustomer && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-bold">
                  {selectedCustomer.name.split(' ').map((n) => n.charAt(0)).join('').toUpperCase().slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{selectedCustomer.name}</p>
                  <p className="text-xs text-muted-foreground">{selectedCustomer.totalPoints} pts actuales</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setSelectedCustomer(null); setSearch('') }}>
                  Cambiar
                </Button>
              </div>
            )}
          </div>

          {/* Points */}
          <div className="space-y-2">
            <Label htmlFor="staff-pts">Puntos a Otorgar</Label>
            <Input
              id="staff-pts"
              type="number"
              min="1"
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              disabled={success}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="staff-desc">Descripción (opcional)</Label>
            <Input
              id="staff-desc"
              placeholder="Visita, compra, etc."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={success}
            />
          </div>

          <Separator />

          {/* Action Button */}
          <AnimatePresence mode="wait">
            {success ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-3"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                  <CheckCircle className="size-16 text-emerald-500 mx-auto" />
                </motion.div>
                <h3 className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                  ¡Visita Registrada!
                </h3>
                <p className="text-sm text-muted-foreground">
                  {selectedCustomer?.name} ahora tiene{' '}
                  <span className="font-bold text-amber-600 dark:text-amber-400">{resultPoints} puntos</span>
                </p>
                <Button onClick={handleReset} className="bg-amber-500 hover:bg-amber-600 text-white">
                  Registrar Otra Visita
                </Button>
              </motion.div>
            ) : (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Button
                  onClick={handleRegister}
                  disabled={registering || !selectedCustomer}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white h-12 text-base"
                >
                  {registering ? (
                    <>
                      <Loader2 className="size-5 animate-spin" />
                      Registrando...
                    </>
                  ) : (
                    <>
                      <Star className="size-5" />
                      Registrar Visita
                    </>
                  )}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  )
}

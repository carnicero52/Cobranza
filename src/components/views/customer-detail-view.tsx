'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Star, Mail, Phone, Calendar, ArrowUpRight, ArrowDownRight, Gift, Plus, Pencil, Send, MessageCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { api } from '@/lib/api'
import { useAppStore } from '@/store/app-store'
import type { Customer, Transaction, Reward, BusinessSettings } from '@/lib/types'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'

export function CustomerDetailView() {
  const { selectedCustomerId, setView } = useAppStore()
  const [customer, setCustomer] = useState<(Customer & { transactions?: Transaction[] }) | null>(null)
  const [rewards, setRewards] = useState<Reward[]>([])
  const [settings, setSettings] = useState<BusinessSettings | null>(null)
  const [loading, setLoading] = useState(true)

  // Earn points dialog
  const [earnDialogOpen, setEarnDialogOpen] = useState(false)
  const [earnPoints, setEarnPoints] = useState('')
  const [earnDescription, setEarnDescription] = useState('')
  const [earning, setEarning] = useState(false)

  // Redeem dialog
  const [redeemDialogOpen, setRedeemDialogOpen] = useState(false)
  const [selectedReward, setSelectedReward] = useState('')
  const [redeeming, setRedeeming] = useState(false)

  // Edit dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editTelegramId, setEditTelegramId] = useState('')
  const [editWhatsappPhone, setEditWhatsappPhone] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      if (!selectedCustomerId) return
      try {
        const [custRes, rewardsRes, settingsRes] = await Promise.all([
          api.getCustomer(selectedCustomerId),
          api.getRewards(),
          api.getBusinessSettings(),
        ])
        setCustomer(custRes.data)
        setRewards(rewardsRes.data)
        setSettings(settingsRes.data)
        if (settingsRes.data.pointsPerPurchase) {
          setEarnPoints(String(settingsRes.data.pointsPerPurchase))
        }
      } catch {
        toast.error('Error al cargar datos del cliente')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [selectedCustomerId])

  const handleEarn = async () => {
    if (!selectedCustomerId || !earnPoints || Number(earnPoints) <= 0) {
      toast.error('Ingresa una cantidad válida de puntos')
      return
    }
    setEarning(true)
    try {
      await api.earnPoints(selectedCustomerId, Number(earnPoints), earnDescription || undefined)
      toast.success(`+${earnPoints} puntos otorgados a ${customer?.name}`)
      setEarnDialogOpen(false)
      setEarnDescription('')
      // Refetch
      const res = await api.getCustomer(selectedCustomerId)
      setCustomer(res.data)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al otorgar puntos'
      toast.error(message)
    } finally {
      setEarning(false)
    }
  }

  const handleRedeem = async () => {
    if (!selectedCustomerId || !selectedReward) {
      toast.error('Selecciona una recompensa')
      return
    }
    const reward = rewards.find((r) => r.id === selectedReward)
    if (!reward) return
    if ((customer?.totalPoints ?? 0) < reward.requiredPoints) {
      toast.error('El cliente no tiene suficientes puntos')
      return
    }
    setRedeeming(true)
    try {
      await api.redeemReward(selectedCustomerId, selectedReward)
      toast.success(`Recompensa "${reward.name}" canjeada exitosamente`)
      setRedeemDialogOpen(false)
      setSelectedReward('')
      const res = await api.getCustomer(selectedCustomerId)
      setCustomer(res.data)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al canjear recompensa'
      toast.error(message)
    } finally {
      setRedeeming(false)
    }
  }

  const openEdit = () => {
    if (!customer) return
    setEditName(customer.name)
    setEditEmail(customer.email)
    setEditPhone(customer.phone || '')
    setEditTelegramId(customer.telegramChatId || '')
    setEditWhatsappPhone(customer.whatsappPhone || '')
    setEditDialogOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!selectedCustomerId || !editName || !editEmail) {
      toast.error('Nombre y correo son obligatorios')
      return
    }
    setSaving(true)
    try {
      await api.updateCustomer(selectedCustomerId, {
        name: editName,
        email: editEmail,
        phone: editPhone || undefined,
        telegramChatId: editTelegramId || undefined,
        whatsappPhone: editWhatsappPhone || undefined,
      })
      toast.success('Cliente actualizado')
      setEditDialogOpen(false)
      const res = await api.getCustomer(selectedCustomerId)
      setCustomer(res.data)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al guardar'
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p>Cliente no encontrado</p>
        <Button variant="link" onClick={() => setView('customers')} className="mt-2">
          Volver a clientes
        </Button>
      </div>
    )
  }

  const progressPercent = settings?.rewardGoal
    ? Math.min((customer.totalPoints / settings.rewardGoal) * 100, 100)
    : 0

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button variant="ghost" onClick={() => setView('customers')} className="gap-2">
        <ArrowLeft className="size-4" />
        Volver a Clientes
      </Button>

      {/* Customer Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-bold text-xl shrink-0">
              {customer.name.split(' ').map((n) => n.charAt(0)).join('').toUpperCase().slice(0, 2)}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold">{customer.name}</h2>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Mail className="size-3" /> {customer.email}</span>
                {customer.phone && (
                  <span className="flex items-center gap-1"><Phone className="size-3" /> {customer.phone}</span>
                )}
                <span className="flex items-center gap-1"><Calendar className="size-3" /> {format(new Date(customer.registeredAt), "d 'de' MMM, yyyy", { locale: es })}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={openEdit} className="size-9" title="Editar cliente">
                <Pencil className="size-4" />
              </Button>
              <Button onClick={() => setEarnDialogOpen(true)} className="bg-amber-500 hover:bg-amber-600 text-white">
                <Plus className="size-4" />
                Otorgar Puntos
              </Button>
              <Button variant="outline" onClick={() => setRedeemDialogOpen(true)}>
                <Gift className="size-4" />
                Canjear Recompensa
              </Button>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{customer.totalPoints}</p>
              <p className="text-xs text-muted-foreground">Puntos Totales</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold">{customer.visitsCount}</p>
              <p className="text-xs text-muted-foreground">Visitas</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50 col-span-2">
              <p className="text-sm font-medium mb-1">
                Progreso: {customer.totalPoints} / {settings?.rewardGoal || 10} pts
              </p>
              <Progress value={progressPercent} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historial de Transacciones</CardTitle>
        </CardHeader>
        <CardContent>
          {(!customer.transactions || customer.transactions.length === 0) ? (
            <div className="text-center py-8 text-muted-foreground">
              <Star className="size-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No hay transacciones</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {customer.transactions.map((tx) => (
                <div key={tx.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-full shrink-0 ${
                      tx.type === 'earn'
                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                        : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                    }`}
                  >
                    {tx.type === 'earn' ? <ArrowUpRight className="size-4" /> : <ArrowDownRight className="size-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{tx.description || (tx.type === 'earn' ? 'Puntos ganados' : 'Recompensa canjeada')}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(tx.createdAt), "d 'de' MMM yyyy, HH:mm", { locale: es })}</p>
                  </div>
                  <Badge variant={tx.type === 'earn' ? 'default' : 'destructive'} className={tx.type === 'earn' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200' : ''}>
                    {tx.type === 'earn' ? '+' : '-'}{tx.points}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Earn Points Dialog */}
      <Dialog open={earnDialogOpen} onOpenChange={setEarnDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Otorgar Puntos</DialogTitle>
            <DialogDescription>
              Añadir puntos a {customer.name} (actual: {customer.totalPoints} pts)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="earn-pts">Puntos</Label>
              <Input
                id="earn-pts"
                type="number"
                min="1"
                value={earnPoints}
                onChange={(e) => setEarnPoints(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="earn-desc">Descripción (opcional)</Label>
              <Input
                id="earn-desc"
                placeholder="Visita, compra, etc."
                value={earnDescription}
                onChange={(e) => setEarnDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEarnDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleEarn} disabled={earning} className="bg-amber-500 hover:bg-amber-600 text-white">
              {earning ? 'Otorgando...' : 'Otorgar Puntos'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Redeem Reward Dialog */}
      <Dialog open={redeemDialogOpen} onOpenChange={setRedeemDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Canjear Recompensa</DialogTitle>
            <DialogDescription>
              Selecciona una recompensa para {customer.name} ({customer.totalPoints} pts disponibles)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Recompensa</Label>
              <Select value={selectedReward} onValueChange={setSelectedReward}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar recompensa" />
                </SelectTrigger>
                <SelectContent>
                  {rewards.filter((r) => r.isActive).map((r) => (
                    <SelectItem key={r.id} value={r.id} disabled={customer.totalPoints < r.requiredPoints}>
                      {r.name} ({r.requiredPoints} pts)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRedeemDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleRedeem} disabled={redeeming || !selectedReward} className="bg-amber-500 hover:bg-amber-600 text-white">
              {redeeming ? 'Canjeando...' : 'Canjear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Customer Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
            <DialogDescription>Modifica los datos de {customer.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nombre *</Label>
              <Input id="edit-name" value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Correo electrónico *</Label>
              <Input id="edit-email" type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone" className="flex items-center gap-2">
                <Phone className="size-3.5" /> Teléfono
              </Label>
              <Input id="edit-phone" type="tel" placeholder="+58 412 1234567" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-telegram" className="flex items-center gap-2">
                <Send className="size-3.5 text-blue-500" /> ID de Telegram
              </Label>
              <Input id="edit-telegram" placeholder="@usuario o ID numérico" value={editTelegramId} onChange={(e) => setEditTelegramId(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-whatsapp" className="flex items-center gap-2">
                <MessageCircle className="size-3.5 text-green-500" /> WhatsApp
              </Label>
              <Input id="edit-whatsapp" type="tel" placeholder="+584121234567" value={editWhatsappPhone} onChange={(e) => setEditWhatsappPhone(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveEdit} disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-white">
              {saving ? <><Loader2 className="size-4 animate-spin" /> Guardando...</> : <><Pencil className="size-4" /> Guardar</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

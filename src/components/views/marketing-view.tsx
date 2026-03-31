'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, Loader2, Send, Megaphone, Calendar, Target, Radio, Clock, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { api } from '@/lib/api'
import type { MarketingCampaign } from '@/lib/types'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: 'Borrador', className: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700' },
  scheduled: { label: 'Programada', className: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800' },
  active: { label: 'Activa', className: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800' },
  paused: { label: 'Pausada', className: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800' },
  completed: { label: 'Completada', className: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800' },
  cancelled: { label: 'Cancelada', className: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800' },
}

const typeLabels: Record<string, string> = {
  promo: 'Promoción',
  announcement: 'Anuncio',
  referral: 'Referidos',
  event: 'Evento',
  reminder: 'Recordatorio',
}

const targetLabels: Record<string, string> = {
  all: 'Todos los clientes',
  new: 'Nuevos clientes',
  inactive: 'Inactivos',
  top: 'Top clientes',
  vip: 'VIP',
  custom: 'Personalizado',
}

const channelLabels: Record<string, string> = {
  in_app: 'In-App',
  email: 'Email',
  whatsapp: 'WhatsApp',
  telegram: 'Telegram',
  sms: 'SMS',
}

export function MarketingView() {
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<MarketingCampaign | null>(null)

  // Form state
  const [formName, setFormName] = useState('')
  const [formType, setFormType] = useState('promo')
  const [formTarget, setFormTarget] = useState('all')
  const [formChannel, setFormChannel] = useState('in_app')
  const [formMessage, setFormMessage] = useState('')
  const [formStartDate, setFormStartDate] = useState('')
  const [formStartTime, setFormStartTime] = useState('')
  const [formEndDate, setFormEndDate] = useState('')
  const [formEndTime, setFormEndTime] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchCampaigns = useCallback(async () => {
    try {
      const res = await api.getCampaigns()
      setCampaigns(res.data)
    } catch {
      toast.error('Error al cargar campañas')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCampaigns()
  }, [fetchCampaigns])

  const openCreate = () => {
    setEditingCampaign(null)
    setFormName('')
    setFormType('promo')
    setFormTarget('all')
    setFormChannel('in_app')
    setFormMessage('')
    setFormStartDate('')
    setFormStartTime('')
    setFormEndDate('')
    setFormEndTime('')
    setDialogOpen(true)
  }

  const openEdit = (campaign: MarketingCampaign) => {
    setEditingCampaign(campaign)
    setFormName(campaign.name)
    setFormType(campaign.type)
    setFormTarget(campaign.target)
    setFormChannel(campaign.channel)
    setFormMessage(campaign.message)

    // Parse dates for editing
    if (campaign.startsAt) {
      const d = new Date(campaign.startsAt)
      setFormStartDate(formatDateForInput(d))
      setFormStartTime(formatTimeForInput(d))
    } else {
      setFormStartDate('')
      setFormStartTime('')
    }

    if (campaign.endsAt) {
      const d = new Date(campaign.endsAt)
      setFormEndDate(formatDateForInput(d))
      setFormEndTime(formatTimeForInput(d))
    } else {
      setFormEndDate('')
      setFormEndTime('')
    }

    setDialogOpen(true)
  }

  const buildStartsAt = (): string | undefined => {
    if (formStartDate) {
      const time = formStartTime || '00:00'
      return new Date(`${formStartDate}T${time}:00`).toISOString()
    }
    return undefined
  }

  const buildEndsAt = (): string | undefined => {
    if (formEndDate) {
      const time = formEndTime || '23:59'
      return new Date(`${formEndDate}T${time}:00`).toISOString()
    }
    return undefined
  }

  const handleSave = async () => {
    if (!formName || !formMessage) {
      toast.error('Nombre y mensaje son obligatorios')
      return
    }

    // Validate dates
    const startsAt = buildStartsAt()
    const endsAt = buildEndsAt()
    if (startsAt && endsAt && new Date(startsAt) >= new Date(endsAt)) {
      toast.error('La fecha de fin debe ser posterior a la de inicio')
      return
    }

    setSaving(true)
    try {
      if (editingCampaign) {
        await api.updateCampaign(editingCampaign.id, {
          name: formName,
          type: formType,
          target: formTarget,
          channel: formChannel,
          message: formMessage,
          startsAt,
          endsAt,
        })
        toast.success('Campaña actualizada')
      } else {
        await api.createCampaign({
          name: formName,
          type: formType,
          target: formTarget,
          channel: formChannel,
          message: formMessage,
          startsAt,
          endsAt,
        })
        toast.success('Campaña creada exitosamente')
      }
      setDialogOpen(false)
      fetchCampaigns()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al guardar campaña'
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await api.updateCampaign(id, { status })
      toast.success('Estado actualizado')
      fetchCampaigns()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al actualizar estado'
      toast.error(message)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await api.deleteCampaign(id)
      toast.success('Campaña eliminada')
      fetchCampaigns()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al eliminar campaña'
      toast.error(message)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Marketing</h2>
          <p className="text-muted-foreground text-sm mt-1">{campaigns.length} campaña{campaigns.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={openCreate} className="bg-amber-500 hover:bg-amber-600 text-white">
          <Plus className="size-4" />
          Crear Campaña
        </Button>
      </div>

      {/* Campaigns grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-72 w-full rounded-xl" />
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Megaphone className="size-12 mb-3 opacity-30" />
          <p className="text-lg font-medium">No hay campañas</p>
          <p className="text-sm">Crea tu primera campaña de marketing</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {campaigns.map((campaign) => {
            const status = statusConfig[campaign.status] || statusConfig.draft

            return (
              <Card key={campaign.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 space-y-3">
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-sm">{campaign.name}</h3>
                      <Badge variant="outline" className="text-xs px-1.5 py-0">
                        {typeLabels[campaign.type] || campaign.type}
                      </Badge>
                    </div>
                    <Badge variant="outline" className={cn('text-xs shrink-0', status.className)}>
                      {status.label}
                    </Badge>
                  </div>

                  {/* Message preview */}
                  <p className="text-sm text-muted-foreground line-clamp-2">{campaign.message}</p>

                  {/* Date/time range */}
                  {(campaign.startsAt || campaign.endsAt) && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
                      <Clock className="size-3.5 shrink-0" />
                      <span className="truncate">
                        {campaign.startsAt && (
                          <span>
                            {new Date(campaign.startsAt).toLocaleDateString('es', { day: 'numeric', month: 'short' })}
                            {new Date(campaign.startsAt).getHours() > 0 || new Date(campaign.startsAt).getMinutes() > 0
                              ? ` ${new Date(campaign.startsAt).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}`
                              : ''}
                          </span>
                        )}
                        {campaign.startsAt && campaign.endsAt && ' → '}
                        {campaign.endsAt && (
                          <span>
                            {new Date(campaign.endsAt).toLocaleDateString('es', { day: 'numeric', month: 'short' })}
                            {new Date(campaign.endsAt).getHours() > 0 || new Date(campaign.endsAt).getMinutes() > 0
                              ? ` ${new Date(campaign.endsAt).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}`
                              : ''}
                          </span>
                        )}
                        {!campaign.startsAt && !campaign.endsAt && 'Sin fecha programada'}
                      </span>
                    </div>
                  )}

                  {/* Meta info */}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1">
                      <Target className="size-3" />
                      {targetLabels[campaign.target] || campaign.target}
                    </span>
                    <span className="flex items-center gap-1">
                      <Radio className="size-3" />
                      {channelLabels[campaign.channel] || campaign.channel}
                    </span>
                    <span className="flex items-center gap-1">
                      <Send className="size-3" />
                      {campaign.sentCount} enviados
                    </span>
                  </div>

                  {/* Created date */}
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="size-3" />
                    <span>
                      Creada: {new Date(campaign.createdAt).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 pt-2 border-t">
                    {/* Status quick actions */}
                    {campaign.status === 'draft' && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStatusChange(campaign.id, 'scheduled')}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 text-xs"
                        >
                          <Clock className="size-3" />
                          Programar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStatusChange(campaign.id, 'active')}
                          className="text-green-600 hover:text-green-700 hover:bg-green-50 text-xs"
                        >
                          <Send className="size-3" />
                          Activar
                        </Button>
                      </>
                    )}
                    {campaign.status === 'scheduled' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleStatusChange(campaign.id, 'active')}
                        className="text-green-600 hover:text-green-700 hover:bg-green-50 text-xs"
                      >
                        <Send className="size-3" />
                        Activar ahora
                      </Button>
                    )}
                    {campaign.status === 'active' && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStatusChange(campaign.id, 'paused')}
                          className="text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50 text-xs"
                        >
                          Pausar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStatusChange(campaign.id, 'completed')}
                          className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 text-xs"
                        >
                          Finalizar
                        </Button>
                      </>
                    )}
                    {campaign.status === 'paused' && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStatusChange(campaign.id, 'active')}
                          className="text-green-600 hover:text-green-700 hover:bg-green-50 text-xs"
                        >
                          Reanudar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStatusChange(campaign.id, 'cancelled')}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs"
                        >
                          Cancelar
                        </Button>
                      </>
                    )}

                    <div className="flex-1" />

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(campaign)}
                      className="text-muted-foreground hover:text-foreground text-xs"
                    >
                      <Pencil className="size-3" />
                      Editar
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive text-xs">
                          <Trash2 className="size-3" />
                          Eliminar
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Eliminar campaña?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción eliminará &quot;{campaign.name}&quot; permanentemente.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(campaign.id)}
                            className="bg-destructive text-white hover:bg-destructive/90"
                          >
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCampaign ? 'Editar Campaña' : 'Crear Campaña'}</DialogTitle>
            <DialogDescription>
              {editingCampaign ? 'Modifica los datos de la campaña' : 'Configura una nueva campaña de marketing'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="camp-name">Nombre *</Label>
              <Input
                id="camp-name"
                placeholder="Ej: Promoción de Verano"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>

            {/* Type + Channel */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={formType} onValueChange={setFormType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="promo">Promoción</SelectItem>
                    <SelectItem value="announcement">Anuncio</SelectItem>
                    <SelectItem value="event">Evento</SelectItem>
                    <SelectItem value="referral">Referidos</SelectItem>
                    <SelectItem value="reminder">Recordatorio</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Canal</Label>
                <Select value={formChannel} onValueChange={setFormChannel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_app">In-App</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="telegram">Telegram</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Audience */}
            <div className="space-y-2">
              <Label>Audiencia</Label>
              <Select value={formTarget} onValueChange={setFormTarget}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los clientes</SelectItem>
                  <SelectItem value="new">Nuevos clientes</SelectItem>
                  <SelectItem value="inactive">Clientes inactivos</SelectItem>
                  <SelectItem value="top">Top clientes</SelectItem>
                  <SelectItem value="vip">Clientes VIP</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date & Time Range */}
            <div className="rounded-lg border p-4 space-y-4 bg-muted/30">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Calendar className="size-4 text-amber-500" />
                Programación de Fecha y Hora
              </div>

              {/* Start date/time */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Fecha y hora de inicio (opcional)</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="date"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="text-sm"
                  />
                  <Input
                    type="time"
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    className="text-sm"
                  />
                </div>
              </div>

              {/* End date/time */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Fecha y hora de fin (opcional)</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="date"
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    className="text-sm"
                  />
                  <Input
                    type="time"
                    value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)}
                    className="text-sm"
                  />
                </div>
              </div>

              {formStartDate && formEndDate && formStartDate > formEndDate && (
                <div className="flex items-center gap-2 text-xs text-destructive">
                  <AlertCircle className="size-3" />
                  La fecha de fin debe ser posterior a la de inicio
                </div>
              )}
            </div>

            {/* Message */}
            <div className="space-y-2">
              <Label htmlFor="camp-msg">Mensaje *</Label>
              <Textarea
                id="camp-msg"
                placeholder="Escribe el mensaje de tu campaña..."
                rows={4}
                value={formMessage}
                onChange={(e) => setFormMessage(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {formMessage.length} caracteres
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-white">
              {saving ? <Loader2 className="size-4 animate-spin" /> : editingCampaign ? 'Actualizar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Helpers
function formatDateForInput(d: Date): string {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function formatTimeForInput(d: Date): string {
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${min}`
}

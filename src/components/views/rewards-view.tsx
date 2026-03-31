'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, Gift, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { api } from '@/lib/api'
import type { Reward } from '@/lib/types'
import { toast } from 'sonner'

export function RewardsView() {
  const [rewards, setRewards] = useState<Reward[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingReward, setEditingReward] = useState<Reward | null>(null)

  // Form state
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formImageUrl, setFormImageUrl] = useState('')
  const [formPoints, setFormPoints] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchRewards = useCallback(async () => {
    try {
      const res = await api.getRewards()
      setRewards(res.data)
    } catch {
      toast.error('Error al cargar recompensas')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRewards()
  }, [fetchRewards])

  const openCreate = () => {
    setEditingReward(null)
    setFormName('')
    setFormDescription('')
    setFormImageUrl('')
    setFormPoints('')
    setDialogOpen(true)
  }

  const openEdit = (reward: Reward) => {
    setEditingReward(reward)
    setFormName(reward.name)
    setFormDescription(reward.description || '')
    setFormImageUrl(reward.imageUrl || '')
    setFormPoints(String(reward.requiredPoints))
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formName || !formPoints || Number(formPoints) <= 0) {
      toast.error('Nombre y puntos requeridos son obligatorios')
      return
    }
    setSaving(true)
    try {
      if (editingReward) {
        await api.updateReward(editingReward.id, {
          name: formName,
          description: formDescription || undefined,
          imageUrl: formImageUrl || undefined,
          requiredPoints: Number(formPoints),
        })
        toast.success('Recompensa actualizada')
      } else {
        await api.createReward({
          name: formName,
          description: formDescription || undefined,
          imageUrl: formImageUrl || undefined,
          requiredPoints: Number(formPoints),
        })
        toast.success('Recompensa creada exitosamente')
      }
      setDialogOpen(false)
      fetchRewards()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al guardar recompensa'
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await api.deleteReward(id)
      toast.success('Recompensa eliminada')
      fetchRewards()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al eliminar recompensa'
      toast.error(message)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Recompensas</h2>
          <p className="text-muted-foreground text-sm mt-1">{rewards.length} recompensas disponibles</p>
        </div>
        <Button onClick={openCreate} className="bg-amber-500 hover:bg-amber-600 text-white">
          <Plus className="size-4" />
          Crear Recompensa
        </Button>
      </div>

      {/* Reward Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      ) : rewards.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Gift className="size-12 mb-3 opacity-30" />
          <p className="text-lg font-medium">No hay recompensas</p>
          <p className="text-sm">Crea tu primera recompensa para tus clientes</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rewards.map((reward) => (
            <Card key={reward.id} className="relative group hover:shadow-md transition-shadow">
              <div className={`absolute top-0 left-0 w-full h-1 rounded-t-xl ${reward.isActive ? 'bg-gradient-to-r from-amber-400 to-orange-400' : 'bg-gray-300 dark:bg-gray-600'}`} />
              <CardContent className="p-4 pt-5">
                {reward.imageUrl && (
                  <img src={reward.imageUrl} alt={reward.name} className="w-full h-32 object-cover rounded-lg mb-3" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                )}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 shrink-0">
                    <Gift className="size-5" />
                  </div>
                  <Badge className={`shrink-0 ${reward.isActive ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-700'}`}>
                    {reward.requiredPoints} pts
                  </Badge>
                </div>
                <h3 className="font-semibold mt-3">{reward.name}</h3>
                {reward.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{reward.description}</p>
                )}
                {!reward.isActive && (
                  <Badge variant="secondary" className="mt-2">Inactiva</Badge>
                )}
                <div className="flex items-center gap-2 mt-4 pt-3 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEdit(reward)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="size-3.5" />
                    Editar
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="size-3.5" />
                        Eliminar
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar recompensa?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta acción eliminará &quot;{reward.name}&quot; permanentemente. Los clientes que hayan canjeado esta recompensa no serán afectados.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(reward.id)} className="bg-destructive text-white hover:bg-destructive/90">
                          Eliminar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingReward ? 'Editar Recompensa' : 'Crear Recompensa'}</DialogTitle>
            <DialogDescription>
              {editingReward ? 'Modifica los datos de la recompensa' : 'Configura una nueva recompensa para tus clientes'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="reward-name">Nombre *</Label>
              <Input
                id="reward-name"
                placeholder="Ej: Café Gratis"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reward-desc">Descripción (opcional)</Label>
              <Input
                id="reward-desc"
                placeholder="Descripción de la recompensa"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reward-img">URL de Imagen</Label>
              <Input
                id="reward-img"
                placeholder="https://ejemplo.com/imagen.jpg"
                value={formImageUrl}
                onChange={(e) => setFormImageUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Pega la URL de la imagen del premio</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reward-pts">Puntos Requeridos *</Label>
              <Input
                id="reward-pts"
                type="number"
                min="1"
                placeholder="10"
                value={formPoints}
                onChange={(e) => setFormPoints(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-white">
              {saving ? 'Guardando...' : editingReward ? 'Actualizar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

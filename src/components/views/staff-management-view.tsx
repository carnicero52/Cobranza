'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Shield, UserCheck, Mail } from 'lucide-react'
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
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import type { Staff } from '@/lib/types'
import { toast } from 'sonner'

export function StaffManagementView() {
  const [staff, setStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'admin' | 'staff'>('staff')
  const [creating, setCreating] = useState(false)

  const fetchStaff = useCallback(async () => {
    try {
      const res = await api.getStaff()
      setStaff(res.data)
    } catch {
      toast.error('Error al cargar personal')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStaff()
  }, [fetchStaff])

  const handleCreate = async () => {
    if (!name || !email || !password) {
      toast.error('Todos los campos son obligatorios')
      return
    }
    setCreating(true)
    try {
      await api.createStaff({ name, email, password, role })
      toast.success('Personal agregado exitosamente')
      setDialogOpen(false)
      setName('')
      setEmail('')
      setPassword('')
      setRole('staff')
      fetchStaff()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al crear personal'
      toast.error(message)
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await api.deleteStaff(id)
      toast.success('Personal eliminado')
      fetchStaff()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al eliminar personal'
      toast.error(message)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Equipo</h2>
          <p className="text-muted-foreground text-sm mt-1">{staff.length} miembros del equipo</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-amber-500 hover:bg-amber-600 text-white">
              <Plus className="size-4" />
              Agregar Personal
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Agregar Personal</DialogTitle>
              <DialogDescription>Crea una cuenta para un nuevo miembro del equipo</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="staff-name">Nombre</Label>
                <Input
                  id="staff-name"
                  placeholder="Nombre completo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="staff-email">Correo electrónico</Label>
                <Input
                  id="staff-email"
                  type="email"
                  placeholder="personal@negocio.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="staff-pass">Contraseña</Label>
                <Input
                  id="staff-pass"
                  type="password"
                  placeholder="Contraseña temporal"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Rol</Label>
                <Select value={role} onValueChange={(v) => setRole(v as 'admin' | 'staff')}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreate} disabled={creating} className="bg-amber-500 hover:bg-amber-600 text-white">
                {creating ? 'Creando...' : 'Agregar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Staff Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      ) : staff.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <UserCheck className="size-12 mb-3 opacity-30" />
          <p className="text-lg font-medium">No hay personal</p>
          <p className="text-sm">Agrega miembros a tu equipo</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {staff.map((member) => (
            <Card key={member.id} className="relative hover:shadow-md transition-shadow">
              <div className={`absolute top-0 left-0 w-full h-1 rounded-t-xl ${member.role === 'admin' ? 'bg-gradient-to-r from-amber-400 to-orange-400' : 'bg-gradient-to-r from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700'}`} />
              <CardContent className="p-4 pt-5">
                <div className="flex items-start gap-3">
                  <div
                    className={`flex items-center justify-center w-11 h-11 rounded-full font-bold text-sm shrink-0 ${
                      member.role === 'admin'
                        ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {member.name.split(' ').map((n) => n.charAt(0)).join('').toUpperCase().slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{member.name}</h3>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                      <Mail className="size-3" />
                      <span className="truncate">{member.email}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4 pt-3 border-t">
                  <div className="flex items-center gap-2">
                    <Badge
                      className={
                        member.role === 'admin'
                          ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700'
                      }
                    >
                      {member.role === 'admin' ? (
                        <><Shield className="size-3" /> Admin</>
                      ) : (
                        <><UserCheck className="size-3" /> Staff</>
                      )}
                    </Badge>
                    <Badge variant={member.active ? 'default' : 'secondary'} className={member.active ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' : ''}>
                      {member.active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="size-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar miembro?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Se eliminará a {member.name} del equipo. Esta acción no se puede deshacer.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(member.id)} className="bg-destructive text-white hover:bg-destructive/90">
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
    </div>
  )
}

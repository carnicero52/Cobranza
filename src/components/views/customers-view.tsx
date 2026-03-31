'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, UserPlus, Mail, Phone, Star, Eye, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
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
import { Label } from '@/components/ui/label'
import { api } from '@/lib/api'
import { useAppStore } from '@/store/app-store'
import type { Customer } from '@/lib/types'
import { toast } from 'sonner'

export function CustomersView() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const { setCustomerDetail } = useAppStore()

  const fetchCustomers = useCallback(async () => {
    try {
      const res = await api.getCustomers(search || undefined)
      setCustomers(res.data)
    } catch {
      toast.error('Error al cargar clientes')
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])

  const handleDelete = async (id: string, name: string) => {
    setDeletingId(id)
    try {
      await fetch(`/api/customers/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      toast.success(`Cliente "${name}" eliminado`)
      fetchCustomers()
    } catch {
      toast.error('Error al eliminar cliente')
    } finally {
      setDeletingId(null)
    }
  }

  const handleCreate = async () => {
    if (!newName || !newEmail) {
      toast.error('Nombre y correo son obligatorios')
      return
    }
    setCreating(true)
    try {
      await api.createCustomer({ name: newName, email: newEmail, phone: newPhone || undefined })
      toast.success('Cliente agregado exitosamente')
      setDialogOpen(false)
      setNewName('')
      setNewEmail('')
      setNewPhone('')
      fetchCustomers()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al crear cliente'
      toast.error(message)
    } finally {
      setCreating(false)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Clientes</h2>
          <p className="text-muted-foreground text-sm mt-1">{customers.length} clientes registrados</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-amber-500 hover:bg-amber-600 text-white">
              <UserPlus className="size-4" />
              Agregar Cliente
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Agregar Cliente</DialogTitle>
              <DialogDescription>Registra un nuevo cliente en tu programa de lealtad</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="cust-name">Nombre *</Label>
                <Input
                  id="cust-name"
                  placeholder="Nombre del cliente"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cust-email">Correo electrónico *</Label>
                <Input
                  id="cust-email"
                  type="email"
                  placeholder="cliente@email.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cust-phone">Teléfono (opcional)</Label>
                <Input
                  id="cust-phone"
                  type="tel"
                  placeholder="+52 55 1234 5678"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                />
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

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Buscar clientes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Customer Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36 w-full rounded-xl" />
          ))}
        </div>
      ) : customers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Search className="size-12 mb-3 opacity-30" />
          <p className="text-lg font-medium">No se encontraron clientes</p>
          <p className="text-sm">Intenta con otro término de búsqueda</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {customers.map((customer) => (
            <Card key={customer.id} className="group hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-bold text-sm shrink-0">
                    {getInitials(customer.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{customer.name}</h3>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                      <Mail className="size-3" />
                      <span className="truncate">{customer.email}</span>
                    </div>
                    {customer.phone && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <Phone className="size-3" />
                        <span>{customer.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-4 pt-3 border-t">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800">
                      <Star className="size-3" />
                      {customer.totalPoints} pts
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {customer.visitsCount} visitas
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCustomerDetail(customer.id)}
                      className="text-amber-600 hover:text-amber-700 dark:text-amber-400"
                    >
                      <Eye className="size-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={deletingId === customer.id}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          {deletingId === customer.id ? (
                            <div className="size-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Trash2 className="size-4" />
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Eliminar cliente</AlertDialogTitle>
                          <AlertDialogDescription>
                            ¿Estás seguro de que quieres eliminar a <strong>{customer.name}</strong>? Esta acción no se puede deshacer. Se eliminarán todos sus puntos y transacciones.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(customer.id, customer.name)}
                            className="bg-red-500 hover:bg-red-600 text-white"
                          >
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

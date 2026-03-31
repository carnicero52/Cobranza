'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, Loader2, FileText, DollarSign, Calendar, Clock, MessageSquare, AlertCircle, CheckCircle2, XCircle, Eye, Send, UserCheck, Users, Search, Bell, BellOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { api } from '@/lib/api'
import type { Invoice, Customer } from '@/lib/types'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useAutoRefresh } from '@/hooks/use-auto-refresh'

const statusConfig: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  pending: { label: 'Pendiente', className: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800', icon: Clock },
  paid: { label: 'Pagada', className: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800', icon: CheckCircle2 },
  overdue: { label: 'Vencida', className: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800', icon: XCircle },
  cancelled: { label: 'Cancelada', className: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700', icon: XCircle },
  partial: { label: 'Pago Parcial', className: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800', icon: Clock },
}

const currencySymbols: Record<string, string> = {
  USD: '$', EUR: '€', COP: '$', VES: 'Bs.', MXN: '$', ARS: '$', PEN: 'S/.', CLP: '$', BRL: 'R$',
}

function parseCustomerIds(raw: string | null): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return raw.split(',').map(s => s.trim()).filter(Boolean)
  }
}

function stringifyCustomerIds(ids: string[]): string {
  return JSON.stringify(ids)
}

export function BillingView() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [notifyOpen, setNotifyOpen] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null)
  const [filterStatus, setFilterStatus] = useState('all')

  // Form state
  const [formConcept, setFormConcept] = useState('')
  const [formAmount, setFormAmount] = useState('')
  const [formCurrency, setFormCurrency] = useState('USD')
  const [formStatus, setFormStatus] = useState('pending')
  const [formIssueDate, setFormIssueDate] = useState('')
  const [formDueDate, setFormDueDate] = useState('')
  const [formDueHour, setFormDueHour] = useState('')
  const [formMessage, setFormMessage] = useState('')
  const [formSelectedCustomers, setFormSelectedCustomers] = useState<Set<string>>(new Set())
  const [formCustomerSearch, setFormCustomerSearch] = useState('')
  const [saving, setSaving] = useState(false)

  // Notify form
  const [notifySearch, setNotifySearch] = useState('')
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set())
  const [sendingNotif, setSendingNotif] = useState(false)

  const today = new Date().toISOString().split('T')[0]

  const fetchInvoices = useCallback(async () => {
    try {
      const res = await api.getInvoices()
      setInvoices(res.data)
    } catch {
      toast.error('Error al cargar cobranzas')
    } finally {
      setLoading(false)
    }
  }, [])

  useAutoRefresh(fetchInvoices)

  const fetchCustomers = useCallback(async () => {
    try {
      const res = await api.getCustomers()
      setCustomers(res.data)
    } catch {
      // silent
    }
  }, [])

  useEffect(() => {
    Promise.all([fetchInvoices(), fetchCustomers()])
  }, [fetchInvoices, fetchCustomers])

  const openCreate = () => {
    setEditingInvoice(null)
    setFormConcept('')
    setFormAmount('')
    setFormCurrency('USD')
    setFormStatus('pending')
    setFormIssueDate(today)
    setFormDueDate('')
    setFormDueHour('')
    setFormMessage('')
    setFormSelectedCustomers(new Set())
    setFormCustomerSearch('')
    setDialogOpen(true)
  }

  const openEdit = (invoice: Invoice) => {
    setEditingInvoice(invoice)
    setFormConcept(invoice.concept)
    setFormAmount(String(invoice.amount))
    setFormCurrency(invoice.currency)
    setFormStatus(invoice.status)
    setFormIssueDate(invoice.issueDate)
    setFormDueDate(invoice.dueDate || '')
    setFormDueHour(invoice.dueHour || '')
    setFormMessage(invoice.message || '')
    setFormSelectedCustomers(new Set(parseCustomerIds(invoice.customerIds)))
    setFormCustomerSearch('')
    setDialogOpen(true)
  }

  const openDetail = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setDetailOpen(true)
  }

  const openNotify = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setSelectedCustomers(new Set(parseCustomerIds(invoice.customerIds)))
    setNotifySearch('')
    setNotifyOpen(true)
  }

  const handleSave = async () => {
    if (!formConcept || formConcept.trim().length < 2) {
      toast.error('El concepto es obligatorio (mínimo 2 caracteres)')
      return
    }
    if (!formAmount || isNaN(Number(formAmount)) || Number(formAmount) <= 0) {
      toast.error('El monto debe ser un número mayor a 0')
      return
    }
    if (!formIssueDate) {
      toast.error('La fecha de emisión es obligatoria')
      return
    }

    const customerIdsStr = formSelectedCustomers.size > 0 ? stringifyCustomerIds(Array.from(formSelectedCustomers)) : null

    setSaving(true)
    try {
      if (editingInvoice) {
        await api.updateInvoice(editingInvoice.id, {
          concept: formConcept,
          amount: Number(formAmount),
          currency: formCurrency,
          status: formStatus,
          issueDate: formIssueDate,
          dueDate: formDueDate || null,
          dueHour: formDueHour || null,
          message: formMessage || null,
          customerIds: customerIdsStr,
        })
        toast.success('Cobranza actualizada')
      } else {
        await api.createInvoice({
          concept: formConcept,
          amount: Number(formAmount),
          currency: formCurrency,
          status: formStatus,
          issueDate: formIssueDate,
          dueDate: formDueDate || undefined,
          dueHour: formDueHour || undefined,
          message: formMessage || undefined,
          customerIds: customerIdsStr || undefined,
        })
        toast.success('Cobranza creada exitosamente')
      }
      setDialogOpen(false)
      fetchInvoices()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al guardar cobranza'
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await api.updateInvoice(id, { status })
      toast.success('Estado actualizado')
      fetchInvoices()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al actualizar estado'
      toast.error(message)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await api.deleteInvoice(id)
      toast.success('Cobranza eliminada')
      fetchInvoices()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al eliminar cobranza'
      toast.error(message)
    }
  }

  const toggleFormCustomer = (id: string) => {
    setFormSelectedCustomers(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAllFormCustomers = () => {
    const filtered = filteredFormCustomers
    if (formSelectedCustomers.size === filtered.length) {
      setFormSelectedCustomers(new Set())
    } else {
      setFormSelectedCustomers(new Set(filtered.map(c => c.id)))
    }
  }

  const toggleNotifyCustomer = (id: string) => {
    setSelectedCustomers(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAllNotifyCustomers = () => {
    const filtered = filteredNotifyCustomers
    if (selectedCustomers.size === filtered.length) {
      setSelectedCustomers(new Set())
    } else {
      setSelectedCustomers(new Set(filtered.map(c => c.id)))
    }
  }

  const handleSendNotification = async () => {
    if (selectedCustomers.size === 0) {
      toast.error('Selecciona al menos un cliente')
      return
    }
    if (!selectedInvoice) return

    setSendingNotif(true)
    try {
      const ids = Array.from(selectedCustomers)
      const res = await api.sendNotifications(ids, 'invoice_reminder', {
        concept: selectedInvoice.concept,
        amount: `${selectedInvoice.currency} ${selectedInvoice.amount}`,
        dueDate: selectedInvoice.dueDate || '',
      })
      toast.success(res.data.message)
      setNotifyOpen(false)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al enviar notificación'
      toast.error(message)
    } finally {
      setSendingNotif(false)
    }
  }

  // Stats
  const totalPending = invoices
    .filter(i => i.status === 'pending' || i.status === 'overdue' || i.status === 'partial')
    .reduce((sum, i) => sum + i.amount, 0)
  const totalPaid = invoices
    .filter(i => i.status === 'paid')
    .reduce((sum, i) => sum + i.amount, 0)
  const pendingCount = invoices.filter(i => i.status === 'pending' || i.status === 'overdue').length

  const filteredInvoices = filterStatus === 'all'
    ? invoices
    : invoices.filter(i => i.status === filterStatus)

  const filteredFormCustomers = formCustomerSearch
    ? customers.filter(c =>
        c.name.toLowerCase().includes(formCustomerSearch.toLowerCase()) ||
        c.email.toLowerCase().includes(formCustomerSearch.toLowerCase())
      )
    : customers

  const filteredNotifyCustomers = notifySearch
    ? customers.filter(c =>
        c.name.toLowerCase().includes(notifySearch.toLowerCase()) ||
        c.email.toLowerCase().includes(notifySearch.toLowerCase())
      )
    : customers

  const getCustomerNames = (invoice: Invoice): string[] => {
    const ids = parseCustomerIds(invoice.customerIds)
    return ids.map(id => customers.find(c => c.id === id)?.name).filter(Boolean) as string[]
  }

  const formatCurrency = (amount: number, currency: string) => {
    const symbol = currencySymbols[currency] || '$'
    return `${symbol}${amount.toLocaleString('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  // Customer list component for both form and notify dialogs
  const CustomerList = ({
    customers: list,
    selected,
    onToggle,
    onSelectAll,
    search,
    onSearchChange,
  }: {
    customers: Customer[]
    selected: Set<string>
    onToggle: (id: string) => void
    onSelectAll: () => void
    search: string
    onSearchChange: (val: string) => void
  }) => (
    <div className="space-y-3">
      <div className="rounded-lg border p-3 space-y-3 bg-muted/30">
        <div className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-400">
          <Users className="size-4" />
          Clientes a Notificar ({selected.size} seleccionado{selected.size !== 1 ? 's' : ''})
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o email..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 text-sm"
          />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={selected.size === list.length && list.length > 0}
              onCheckedChange={onSelectAll}
            />
            <span className="text-xs font-medium text-muted-foreground">
              Seleccionar todos ({list.length})
            </span>
          </div>
          <Badge variant="outline" className="text-xs">
            <UserCheck className="size-3 mr-1" />
            {selected.size}
          </Badge>
        </div>
      </div>
      <div className="rounded-lg border max-h-48 overflow-y-auto divide-y dark:divide-gray-800">
        {list.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            {customers.length === 0 ? 'No hay clientes registrados' : 'No se encontraron clientes'}
          </div>
        ) : (
          list.map((customer) => (
            <label
              key={customer.id}
              className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 cursor-pointer transition-colors"
            >
              <Checkbox
                checked={selected.has(customer.id)}
                onCheckedChange={() => onToggle(customer.id)}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{customer.name}</p>
                <p className="text-xs text-muted-foreground truncate">{customer.email}</p>
              </div>
              <span className="text-xs text-muted-foreground shrink-0">{customer.totalPoints} pts</span>
            </label>
          ))
        )}
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Cobranzas</h2>
          <p className="text-muted-foreground text-sm mt-1">{invoices.length} registro{invoices.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={openCreate} className="bg-amber-500 hover:bg-amber-600 text-white">
          <Plus className="size-4" />
          Nueva Cobranza
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-amber-400" />
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Pendientes</p>
                <p className="text-xl font-bold text-amber-600">{formatCurrency(totalPending, 'USD')}</p>
                <p className="text-xs text-muted-foreground">{pendingCount} cobro{pendingCount !== 1 ? 's' : ''}</p>
              </div>
              <div className="size-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Clock className="size-5 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-green-400" />
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Cobradas</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(totalPaid, 'USD')}</p>
                <p className="text-xs text-muted-foreground">{invoices.filter(i => i.status === 'paid').length} pagadas</p>
              </div>
              <div className="size-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle2 className="size-5 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-blue-400" />
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Total General</p>
                <p className="text-xl font-bold">{formatCurrency(totalPending + totalPaid, 'USD')}</p>
                <p className="text-xs text-muted-foreground">{invoices.length} registros</p>
              </div>
              <div className="size-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <DollarSign className="size-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-muted-foreground">Filtrar:</span>
        <Button variant={filterStatus === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setFilterStatus('all')} className={cn('text-xs', filterStatus === 'all' && 'bg-amber-500 hover:bg-amber-600')}>
          Todas
        </Button>
        {Object.entries(statusConfig).map(([key, cfg]) => (
          <Button key={key} variant="outline" size="sm" onClick={() => setFilterStatus(key)} className={cn('text-xs', filterStatus === key && 'bg-amber-500 hover:bg-amber-600 text-white')}>
            {cfg.label}
          </Button>
        ))}
      </div>

      {/* Invoices list */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <FileText className="size-12 mb-3 opacity-30" />
          <p className="text-lg font-medium">No hay cobranzas</p>
          <p className="text-sm">{filterStatus !== 'all' ? 'No hay cobros con este estado' : 'Crea tu primera cobranza'}</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
          {filteredInvoices.map((invoice) => {
            const status = statusConfig[invoice.status] || statusConfig.pending
            const StatusIcon = status.icon
            const customerNames = getCustomerNames(invoice)
            return (
              <Card key={invoice.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm truncate">{invoice.concept}</h3>
                        <Badge variant="outline" className={cn('text-xs shrink-0', status.className)}>
                          <StatusIcon className="size-3 mr-1" />
                          {status.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1"><Calendar className="size-3" /> Emisión: {invoice.issueDate}</span>
                        {invoice.dueDate && <span className="flex items-center gap-1"><Calendar className="size-3" /> Vence: {invoice.dueDate}</span>}
                        {invoice.dueHour && <span className="flex items-center gap-1"><Clock className="size-3" /> Hora: {invoice.dueHour}</span>}
                      </div>
                      {invoice.message && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5 flex items-center gap-1">
                          <MessageSquare className="size-3 shrink-0" /> {invoice.message}
                        </p>
                      )}
                      {invoice.reminderSent && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1" title={invoice.reminderSentAt ? `Recordatorio enviado: ${new Date(invoice.reminderSentAt).toLocaleString('es')}` : 'Recordatorio enviado'}>
                          <Bell className="size-3 text-green-500" />
                          Recordado
                        </span>
                      )}
                      {customerNames.length > 0 && (
                        <p className="text-xs text-green-700 dark:text-green-400 mt-0.5 flex items-center gap-1">
                          <Users className="size-3 shrink-0" />
                          {customerNames.join(', ')}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className={cn('text-lg font-bold', invoice.status === 'paid' ? 'text-green-600' : invoice.status === 'overdue' ? 'text-red-600' : 'text-foreground')}>
                          {formatCurrency(invoice.amount, invoice.currency)}
                        </p>
                        <p className="text-xs text-muted-foreground">{invoice.currency}</p>
                      </div>
                      <div className="flex items-center gap-0.5 border-l pl-3">
                        <Button variant="ghost" size="sm" onClick={() => openNotify(invoice)} className={cn("text-green-600 hover:text-green-700 hover:bg-green-50 size-8", invoice.reminderSent && "opacity-50")} title={invoice.reminderSent ? 'Recordatorio ya enviado (reenviar)' : 'Notificar clientes'}>
                        <Send className="size-4" />
                      </Button>
                        <Button variant="ghost" size="sm" onClick={() => openDetail(invoice)} className="text-muted-foreground hover:text-foreground size-8">
                          <Eye className="size-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(invoice)} className="text-muted-foreground hover:text-foreground size-8">
                          <Pencil className="size-4" />
                        </Button>
                        {invoice.status === 'pending' && (
                          <Button variant="ghost" size="sm" onClick={() => handleStatusChange(invoice.id, 'paid')} className="text-green-600 hover:text-green-700 hover:bg-green-50 text-xs size-8" title="Marcar como pagada">
                            <CheckCircle2 className="size-4" />
                          </Button>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive size-8">
                              <Trash2 className="size-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Eliminar cobranza?</AlertDialogTitle>
                              <AlertDialogDescription>Se eliminará &quot;{invoice.concept}&quot; permanentemente.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(invoice.id)} className="bg-destructive text-white hover:bg-destructive/90">Eliminar</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
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
            <DialogTitle>{editingInvoice ? 'Editar Cobranza' : 'Nueva Cobranza'}</DialogTitle>
            <DialogDescription>{editingInvoice ? 'Modifica los datos de la cobranza' : 'Registra un nuevo cobro o factura'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="inv-concept">Concepto *</Label>
              <Input id="inv-concept" placeholder="Ej: Mensualidad Plan Pro" value={formConcept} onChange={(e) => setFormConcept(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="inv-amount">Monto *</Label>
                <Input id="inv-amount" type="number" step="0.01" min="0.01" placeholder="0.00" value={formAmount} onChange={(e) => setFormAmount(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Moneda</Label>
                <Select value={formCurrency} onValueChange={setFormCurrency}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="COP">COP ($)</SelectItem>
                    <SelectItem value="VES">VES (Bs.)</SelectItem>
                    <SelectItem value="MXN">MXN ($)</SelectItem>
                    <SelectItem value="ARS">ARS ($)</SelectItem>
                    <SelectItem value="PEN">PEN (S/.)</SelectItem>
                    <SelectItem value="CLP">CLP ($)</SelectItem>
                    <SelectItem value="BRL">BRL (R$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {editingInvoice && (
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={formStatus} onValueChange={setFormStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendiente</SelectItem>
                    <SelectItem value="paid">Pagada</SelectItem>
                    <SelectItem value="overdue">Vencida</SelectItem>
                    <SelectItem value="partial">Pago Parcial</SelectItem>
                    <SelectItem value="cancelled">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="rounded-lg border p-4 space-y-4 bg-muted/30">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Calendar className="size-4 text-amber-500" /> Fechas y Hora
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Fecha de Emisión *</Label>
                  <Input type="date" value={formIssueDate} onChange={(e) => setFormIssueDate(e.target.value)} className="text-sm" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Fecha de Vencimiento</Label>
                  <Input type="date" value={formDueDate} onChange={(e) => setFormDueDate(e.target.value)} className="text-sm" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Hora de Vencimiento (opcional)</Label>
                <Input type="time" value={formDueHour} onChange={(e) => setFormDueHour(e.target.value)} className="text-sm max-w-[200px]" />
              </div>
              {formDueDate && formIssueDate && formDueDate < formIssueDate && (
                <div className="flex items-center gap-2 text-xs text-destructive">
                  <AlertCircle className="size-3" /> La fecha de vencimiento no puede ser anterior a la de emisión
                </div>
              )}
            </div>

            {/* Customer Selection in Form */}
            <CustomerList
              customers={filteredFormCustomers}
              selected={formSelectedCustomers}
              onToggle={toggleFormCustomer}
              onSelectAll={selectAllFormCustomers}
              search={formCustomerSearch}
              onSearchChange={setFormCustomerSearch}
            />

            <div className="space-y-2">
              <Label htmlFor="inv-msg" className="flex items-center gap-2"><MessageSquare className="size-4" /> Mensaje / Nota (opcional)</Label>
              <Textarea id="inv-msg" placeholder="Notas adicionales, condiciones..." rows={3} value={formMessage} onChange={(e) => setFormMessage(e.target.value)} />
              <p className="text-xs text-muted-foreground">{formMessage.length} caracteres</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-white">
              {saving ? <Loader2 className="size-4 animate-spin" /> : editingInvoice ? 'Actualizar' : 'Crear Cobranza'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FileText className="size-5 text-amber-500" /> Detalle de Cobranza</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4 py-2">
              {(() => {
                const status = statusConfig[selectedInvoice.status] || statusConfig.pending
                const StatusIcon = status.icon
                return (
                  <Badge variant="outline" className={cn('text-sm px-3 py-1', status.className)}>
                    <StatusIcon className="size-4 mr-1" /> {status.label}
                  </Badge>
                )
              })()}
              <div>
                <p className="text-xs text-muted-foreground">Concepto</p>
                <p className="text-lg font-semibold">{selectedInvoice.concept}</p>
              </div>
              <div className="rounded-lg bg-gradient-to-r from-amber-500 to-orange-400 p-4 text-white text-center">
                <p className="text-sm font-medium opacity-90">Monto</p>
                <p className="text-3xl font-bold">{formatCurrency(selectedInvoice.amount, selectedInvoice.currency)}</p>
                <p className="text-xs opacity-75">{selectedInvoice.currency}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="size-3" /> Emisión</p>
                  <p className="text-sm font-medium mt-1">{selectedInvoice.issueDate}</p>
                </div>
                {selectedInvoice.dueDate && (
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="size-3" /> Vencimiento</p>
                    <p className="text-sm font-medium mt-1">{selectedInvoice.dueDate}</p>
                    {selectedInvoice.dueHour && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><Clock className="size-3" /> {selectedInvoice.dueHour}</p>}
                  </div>
                )}
              </div>
              {/* Show associated customers */}
              {(() => {
                const names = getCustomerNames(selectedInvoice)
                if (names.length > 0) return (
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2"><Users className="size-3" /> Clientes asignados</p>
                    <div className="flex flex-wrap gap-1">
                      {names.map((name, i) => (
                        <Badge key={i} variant="outline" className="text-xs bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800">
                          {name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )
                return null
              })()}
              {selectedInvoice.message && (
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1"><MessageSquare className="size-3" /> Mensaje</p>
                  <p className="text-sm whitespace-pre-wrap">{selectedInvoice.message}</p>
                </div>
              )}
              {selectedInvoice.status !== 'paid' && selectedInvoice.status !== 'cancelled' && (
                <div className="flex gap-2 pt-2 border-t">
                  <Button size="sm" onClick={() => { handleStatusChange(selectedInvoice.id, 'paid'); setDetailOpen(false) }} className="flex-1 bg-green-500 hover:bg-green-600 text-white">
                    <CheckCircle2 className="size-4" /> Marcar Pagada
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { handleStatusChange(selectedInvoice.id, 'overdue'); setDetailOpen(false) }} className="flex-1 border-red-300 text-red-600 hover:bg-red-50">
                    <AlertCircle className="size-4" /> Marcar Vencida
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Notify Customers Dialog */}
      <Dialog open={notifyOpen} onOpenChange={setNotifyOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="size-5 text-green-500" />
              Notificar Cobro
            </DialogTitle>
            <DialogDescription>
              Selecciona los clientes a quienes notificar sobre esta cobranza
            </DialogDescription>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4 py-2">
              {/* Invoice summary */}
              <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{selectedInvoice.concept}</span>
                  <span className="text-sm font-bold text-amber-600">{formatCurrency(selectedInvoice.amount, selectedInvoice.currency)}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Vence: {selectedInvoice.dueDate || 'Sin fecha'} {selectedInvoice.dueHour || ''}
                </p>
              </div>

              <CustomerList
                customers={filteredNotifyCustomers}
                selected={selectedCustomers}
                onToggle={toggleNotifyCustomer}
                onSelectAll={selectAllNotifyCustomers}
                search={notifySearch}
                onSearchChange={setNotifySearch}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotifyOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleSendNotification}
              disabled={sendingNotif || selectedCustomers.size === 0}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              {sendingNotif ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              Enviar Notificación ({selectedCustomers.size})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

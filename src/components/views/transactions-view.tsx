'use client'

import { useState, useEffect, useCallback } from 'react'
import { ArrowUpRight, ArrowDownRight, ArrowLeftRight, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { api } from '@/lib/api'
import type { Transaction } from '@/lib/types'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'

export function TransactionsView() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [total, setTotal] = useState(0)

  const fetchTransactions = useCallback(async (pageNum: number, type?: string, reset?: boolean) => {
    try {
      const params: { page: string; limit: string; type?: string } = {
        page: String(pageNum),
        limit: '20',
      }
      if (type && type !== 'all') params.type = type

      const res = await api.getTransactions(params)
      if (reset) {
        setTransactions(res.data)
      } else {
        setTransactions((prev) => [...prev, ...res.data])
      }
      setTotal(res.pagination.total)
      setHasMore(res.data.length === 20)
    } catch {
      toast.error('Error al cargar transacciones')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setPage(1)
    setLoading(true)
    fetchTransactions(1, activeTab, true)
  }, [activeTab, fetchTransactions])

  const loadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchTransactions(nextPage, activeTab)
  }

  const renderTransaction = (tx: Transaction) => (
    <div
      key={tx.id}
      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
    >
      <div
        className={`flex items-center justify-center w-9 h-9 rounded-full shrink-0 ${
          tx.type === 'earn'
            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
            : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
        }`}
      >
        {tx.type === 'earn' ? (
          <ArrowUpRight className="size-4" />
        ) : (
          <ArrowDownRight className="size-4" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">
          {tx.customer?.name || 'Cliente'}
        </p>
        <p className="text-xs text-muted-foreground">
          {tx.description || (tx.type === 'earn' ? 'Puntos ganados' : 'Recompensa canjeada')}
        </p>
        <p className="text-xs text-muted-foreground">
          {format(new Date(tx.createdAt), "d 'de' MMM yyyy, HH:mm", { locale: es })}
        </p>
      </div>
      <Badge
        className={`shrink-0 ${
          tx.type === 'earn'
            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
            : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800'
        }`}
      >
        {tx.type === 'earn' ? '+' : '-'}{tx.points}
      </Badge>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Transacciones</h2>
        <p className="text-muted-foreground text-sm mt-1">{total} transacciones en total</p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="earn">Ganadas</TabsTrigger>
          <TabsTrigger value="redeem">Canjeadas</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <Card>
            <CardContent className="p-4">
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : transactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <ArrowLeftRight className="size-12 mb-3 opacity-30" />
                  <p className="text-lg font-medium">No hay transacciones</p>
                  <p className="text-sm">Las transacciones aparecerán cuando se registren visitas</p>
                </div>
              ) : (
                <div className="space-y-1 max-h-[600px] overflow-y-auto">
                  {transactions.map(renderTransaction)}
                  {hasMore && (
                    <div className="pt-4 text-center">
                      <Button variant="outline" onClick={loadMore} className="gap-2">
                        <Loader2 className="size-4" />
                        Cargar más
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

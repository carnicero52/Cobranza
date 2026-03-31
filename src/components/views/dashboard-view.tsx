'use client'

import { useState, useEffect } from 'react'
import { Users, Star, ShoppingBag, Gift, TrendingUp, UserPlus, ArrowUpRight, ArrowDownRight, Store } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/api'
import { useAppStore } from '@/store/app-store'
import type { DashboardStats, Transaction, Business } from '@/lib/types'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface StatCardProps {
  icon: React.ElementType
  label: string
  value: number | string
  loading: boolean
}

function StatCard({ icon: Icon, label, value, loading }: StatCardProps) {
  return (
    <Card className="relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 to-orange-400" />
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground font-medium">{label}</p>
            {loading ? (
              <Skeleton className="h-8 w-20 mt-1" />
            ) : (
              <p className="text-2xl sm:text-3xl font-bold mt-1">{value}</p>
            )}
          </div>
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
            <Icon className="size-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function DashboardView() {
  const [business, setBusiness] = useState<Business | null>(null)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [chartData, setChartData] = useState<{ date: string; points: number }[]>([])
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const { setCustomerDetail } = useAppStore()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [bizRes, statsRes, chartRes] = await Promise.all([
          api.getBusiness(),
          api.getDashboardStats(),
          api.getDashboardChart(),
        ])
        setBusiness(bizRes.data)
        setStats(statsRes.data)
        setChartData(chartRes.data)

        const txRes = await api.getTransactions({ page: '1', limit: '5' })
        setRecentTransactions(txRes.data)
      } catch {
        // silently handle
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // Fetch promoMessage (slogan) from settings
  const [promoMessage, setPromoMessage] = useState<string | null>(null)
  useEffect(() => {
    api.getBusinessSettings().then(res => {
      setPromoMessage(res.data.promoEnabled ? res.data.promoMessage : null)
    }).catch(() => {})
  }, [])

  return (
    <div className="space-y-6">
      {/* Business Header Card */}
      <Card className="relative overflow-hidden bg-gradient-to-r from-amber-500 to-orange-400 border-0 text-white">
        <CardContent className="p-5 sm:p-6">
          <div className="flex items-center gap-4">
            {loading ? (
              <Skeleton className="size-14 sm:size-16 rounded-xl flex-shrink-0 bg-white/20" />
            ) : business?.logo ? (
              <img
                src={business.logo}
                alt={business.name}
                className="size-14 sm:size-16 rounded-xl object-cover shadow-lg border-2 border-white/30 flex-shrink-0"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            ) : (
              <div className="size-14 sm:size-16 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <Store className="size-7 text-white" />
              </div>
            )}
            <div className="min-w-0">
              {loading ? (
                <>
                  <Skeleton className="h-7 w-48 bg-white/20 mb-1" />
                  <Skeleton className="h-4 w-64 bg-white/15" />
                </>
              ) : (
                <>
                  <h1 className="text-xl sm:text-2xl font-bold truncate">{business?.name}</h1>
                  <p className="text-sm text-white/80 truncate mt-0.5">
                    {promoMessage || business?.description || 'Programa de Lealtad'}
                  </p>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard icon={Users} label="Total Clientes" value={stats?.totalCustomers ?? 0} loading={loading} />
        <StatCard icon={Star} label="Puntos Totales" value={stats?.totalPoints ?? 0} loading={loading} />
        <StatCard icon={ShoppingBag} label="Transacciones Hoy" value={stats?.transactionsToday ?? 0} loading={loading} />
        <StatCard icon={Gift} label="Recompensas Canjeadas" value={stats?.rewardsRedeemed ?? 0} loading={loading} />
        <StatCard icon={TrendingUp} label="Puntos Esta Semana" value={stats?.pointsEarnedThisWeek ?? 0} loading={loading} />
        <StatCard icon={UserPlus} label="Nuevos Clientes Mes" value={stats?.newCustomersThisMonth ?? 0} loading={loading} />
      </div>

      {/* Chart + Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Chart */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Tendencia de Puntos (14 días)</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="amberGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(val: string) => {
                        try {
                          return format(new Date(val), 'dd/MM')
                        } catch {
                          return val
                        }
                      }}
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                      labelFormatter={(val: string) => {
                        try {
                          return format(new Date(val), "EEEE d 'de' MMMM", { locale: es })
                        } catch {
                          return val
                        }
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="points"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      fill="url(#amberGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Transacciones Recientes</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : recentTransactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <ShoppingBag className="size-10 mb-2 opacity-40" />
                <p className="text-sm">No hay transacciones aún</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {recentTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => {
                      if (tx.customer) setCustomerDetail(tx.customerId)
                    }}
                  >
                    <div
                      className={`flex items-center justify-center w-8 h-8 rounded-full shrink-0 ${
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
                      <p className="text-sm font-medium truncate">
                        {tx.customer?.name || 'Cliente'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {tx.description || (tx.type === 'earn' ? 'Puntos ganados' : 'Recompensa canjeada')}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p
                        className={`text-sm font-semibold ${
                          tx.type === 'earn' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {tx.type === 'earn' ? '+' : '-'}{tx.points}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(tx.createdAt), 'dd/MM', { locale: es })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

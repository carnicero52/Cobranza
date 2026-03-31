'use client'

import { useState, useEffect } from 'react'
import { Mail, Gift, ArrowLeft, Star, Trophy, Clock, Loader2, ShoppingCart, CheckCircle2, AlertCircle, Timer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import { useAppStore } from '@/store/app-store'
import type { PublicBusinessInfo, PublicCustomerData } from '@/lib/types'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

function CircularProgress({ value, max, size = 120 }: { value: number; max: number; size?: number }) {
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0
  const strokeWidth = 8
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (percentage / 100) * circumference

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-amber-100 dark:text-amber-900/30"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="text-amber-500 transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">{value}</span>
        <span className="text-xs text-muted-foreground">de {max} pts</span>
      </div>
    </div>
  )
}

// Countdown timer component
function CooldownTimer({ minutes, onComplete }: { minutes: number; onComplete: () => void }) {
  const [secondsLeft, setSecondsLeft] = useState(minutes * 60)

  useEffect(() => {
    if (secondsLeft <= 0) {
      onComplete()
      return
    }
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [secondsLeft, onComplete])

  const mins = Math.floor(secondsLeft / 60)
  const secs = secondsLeft % 60

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Timer className="size-4 text-orange-500" />
      <span className="font-mono font-medium">
        {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
      </span>
      <span>antes de la próxima compra</span>
    </div>
  )
}

export function CustomerPortalView() {
  const { businessSlug, setBusinessSlug } = useAppStore()
  const [business, setBusiness] = useState<PublicBusinessInfo | null>(null)
  const [customer, setCustomer] = useState<PublicCustomerData | null>(null)
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [lookingUp, setLookingUp] = useState(false)
  const [notFound, setNotFound] = useState(false)

  // Purchase marking state
  const [earning, setEarning] = useState(false)
  const [lastEarnResult, setLastEarnResult] = useState<{
    success: boolean
    pointsEarned: number
    totalPoints: number
    goalReached: boolean
    error?: string
    cooldownMinutes?: number
  } | null>(null)
  const [cooldownActive, setCooldownActive] = useState(false)
  const [cooldownMinutes, setCooldownMinutes] = useState(0)

  // Detect slug from URL if accessed via QR scan (?portal=slug)
  const effectiveSlug = (() => {
    if (businessSlug) return businessSlug
    try {
      const params = new URLSearchParams(window.location.search)
      const fromUrl = params.get('portal')
      if (fromUrl) return fromUrl
    } catch {}
    return ''
  })()

  // Sync slug to store
  useEffect(() => {
    if (effectiveSlug && businessSlug !== effectiveSlug) {
      setBusinessSlug(effectiveSlug)
    }
  }, [effectiveSlug, businessSlug, setBusinessSlug])

  // Re-fetch customer data
  const refetchCustomer = async () => {
    if (!customer || !business) return
    try {
      const res = await api.lookupCustomer(email, business.id)
      setCustomer(res.data)
    } catch {
      // silent
    }
  }

  useEffect(() => {
    if (!effectiveSlug) {
      setLoading(false)
      return
    }
    const fetchBusiness = async () => {
      try {
        const res = await api.getPublicBusiness(effectiveSlug)
        setBusiness(res.data)
      } catch {
        toast.error('Negocio no encontrado')
      } finally {
        setLoading(false)
      }
    }
    fetchBusiness()
  }, [effectiveSlug])

  const handleLookup = async () => {
    if (!email || !business) return
    setLookingUp(true)
    setNotFound(false)
    setLastEarnResult(null)
    setCooldownActive(false)
    try {
      const res = await api.lookupCustomer(email, business.id)
      setCustomer(res.data)
    } catch {
      setNotFound(true)
    } finally {
      setLookingUp(false)
    }
  }

  const handleEarnPoints = async () => {
    if (!email || !business || earning) return
    setEarning(true)
    setLastEarnResult(null)
    try {
      const res = await api.publicEarnPoints(email, business.id)
      setLastEarnResult({
        success: true,
        pointsEarned: res.data.pointsEarned,
        totalPoints: res.data.totalPoints,
        goalReached: res.data.goalReached,
      })
      // Refresh customer data to show updated points
      setCustomer((prev) => prev ? {
        ...prev,
        totalPoints: res.data.totalPoints,
        visitsCount: res.data.visitsCount,
      } : prev)
      toast.success(`¡+${res.data.pointsEarned} puntos!`)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al registrar compra'
      // Check if it's a cooldown error
      if (message.includes('esperar') || message.includes('minuto')) {
        const match = message.match(/(\d+)\s*minuto/)
        const waitMin = match ? parseInt(match[1]) : business.cooldownMinutes
        setCooldownActive(true)
        setCooldownMinutes(waitMin)
        setLastEarnResult({
          success: false,
          pointsEarned: 0,
          totalPoints: customer?.totalPoints || 0,
          goalReached: false,
          error: message,
          cooldownMinutes: waitMin,
        })
      } else {
        setLastEarnResult({
          success: false,
          pointsEarned: 0,
          totalPoints: customer?.totalPoints || 0,
          goalReached: false,
          error: message,
        })
      }
      toast.error(message)
    } finally {
      setEarning(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white dark:from-gray-950 dark:to-gray-900">
        <div className="max-w-lg mx-auto p-6 space-y-6">
          <Skeleton className="h-16 w-48 mx-auto" />
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    )
  }

  // Email lookup step
  if (!customer && !notFound) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white dark:from-gray-950 dark:to-gray-900">
        <div className="max-w-md mx-auto p-6 flex flex-col items-center justify-center min-h-screen">
          <div className="text-center space-y-3 mb-8">
            {business?.logo && (
              <img
                src={business.logo}
                alt={business.name}
                className="w-20 h-20 rounded-2xl mx-auto object-cover shadow-md"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            )}
            <h1 className="text-2xl font-bold text-amber-900 dark:text-amber-100">{business?.name || 'Royalty QR'}</h1>
            {business?.promoEnabled && business.promoMessage && (
              <div className="bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 px-4 py-2 rounded-full text-sm font-medium">
                🎉 {business.promoMessage}
              </div>
            )}
          </div>

          <Card className="w-full shadow-lg border-amber-200/50 dark:border-amber-800/50">
            <CardContent className="p-6 space-y-4">
              <div className="text-center space-y-1">
                <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-3">
                  <Mail className="size-7 text-amber-500" />
                </div>
                <h2 className="text-lg font-semibold">Consulta tus Puntos</h2>
                <p className="text-sm text-muted-foreground">Ingresa tu email para ver tu progreso</p>
              </div>

              <div className="space-y-2">
                <Input
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
                  className="h-12 text-center text-lg"
                />
              </div>

              <Button
                onClick={handleLookup}
                disabled={!email || lookingUp}
                className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-white text-base font-medium"
              >
                {lookingUp ? <Loader2 className="size-5 animate-spin" /> : 'Buscar'}
              </Button>
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground mt-4 text-center">
            Powered by Royalty QR
          </p>
        </div>
      </div>
    )
  }

  // Not found
  if (notFound) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white dark:from-gray-950 dark:to-gray-900">
        <div className="max-w-md mx-auto p-6 flex flex-col items-center justify-center min-h-screen">
          <div className="text-center space-y-3 mb-8">
            {business?.logo && (
              <img
                src={business.logo}
                alt={business.name}
                className="w-20 h-20 rounded-2xl mx-auto object-cover shadow-md"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            )}
            <h1 className="text-2xl font-bold text-amber-900 dark:text-amber-100">{business?.name || 'Royalty QR'}</h1>
          </div>

          <Card className="w-full shadow-lg border-amber-200/50 dark:border-amber-800/50">
            <CardContent className="p-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto">
                <Mail className="size-8 text-amber-400" />
              </div>
              <h2 className="text-lg font-semibold">No estás registrado aún</h2>
              <p className="text-sm text-muted-foreground">
                Pide al personal que te registre para empezar a acumular puntos.
              </p>
              <Button
                variant="outline"
                onClick={() => { setNotFound(false); setEmail('') }}
                className="border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-300"
              >
                <ArrowLeft className="size-4" />
                Intentar con otro email
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Customer dashboard
  const pointsEarned = business?.pointsPerPurchase || 1
  const cooldown = business?.cooldownMinutes || 0

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white dark:from-gray-950 dark:to-gray-900 pb-8">
      <div className="max-w-lg mx-auto p-4 sm:p-6 space-y-6">
        {/* Business header */}
        <div className="text-center space-y-3 pt-2">
          <div className="flex items-center justify-center gap-3">
            {business?.logo && (
              <img
                src={business.logo}
                alt={business.name}
                className="w-12 h-12 rounded-xl object-cover shadow-md"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            )}
            <div className="text-left">
              <h1 className="text-xl font-bold text-amber-900 dark:text-amber-100">{business?.name || 'Royalty QR'}</h1>
              <p className="text-xs text-muted-foreground">Programa de Lealtad</p>
            </div>
          </div>
          {business?.promoEnabled && business.promoMessage && (
            <div className="bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 px-4 py-2 rounded-full text-sm font-medium inline-block">
              🎉 {business.promoMessage}
            </div>
          )}
        </div>

        {/* Customer greeting */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold dark:text-white">¡Hola, {customer.name}!</h2>
            <p className="text-sm text-muted-foreground">{customer.visitsCount} visitas registradas</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setCustomer(null)
              setEmail('')
              setLastEarnResult(null)
              setCooldownActive(false)
            }}
            className="text-muted-foreground"
          >
            <ArrowLeft className="size-4" />
          </Button>
        </div>

        {/* ===== MARCAR COMPRA BUTTON ===== */}
        <Card className="shadow-lg border-amber-200/50 dark:border-amber-800/50 overflow-hidden">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shrink-0">
                <ShoppingCart className="size-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-base dark:text-white">Registrar Compra</h3>
                <p className="text-xs text-muted-foreground">
                  Gana <span className="font-semibold text-amber-600 dark:text-amber-400">{pointsEarned} punto{pointsEarned > 1 ? 's' : ''}</span> por cada compra
                </p>
              </div>
            </div>

            {/* Cooldown timer */}
            {cooldownActive && cooldownMinutes > 0 && (
              <CooldownTimer
                minutes={cooldownMinutes}
                onComplete={() => setCooldownActive(false)}
              />
            )}

            {/* Last earn result feedback */}
            <AnimatePresence mode="wait">
              {lastEarnResult && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className={cn(
                    'flex items-center gap-2 rounded-lg p-3 text-sm',
                    lastEarnResult.success
                      ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                      : 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300'
                  )}
                >
                  {lastEarnResult.success ? (
                    <>
                      <CheckCircle2 className="size-4 shrink-0" />
                      <span className="font-medium">¡+{lastEarnResult.pointsEarned} puntos registrados!</span>
                      {lastEarnResult.goalReached && (
                        <Badge className="bg-green-500 text-white ml-auto shrink-0">¡Meta cumplida!</Badge>
                      )}
                    </>
                  ) : (
                    <>
                      <AlertCircle className="size-4 shrink-0" />
                      <span className="text-xs">{lastEarnResult.error}</span>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <Button
              onClick={handleEarnPoints}
              disabled={earning || cooldownActive}
              className={cn(
                'w-full h-12 text-base font-semibold transition-all',
                cooldownActive
                  ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-500/20 active:scale-[0.98]'
              )}
            >
              {earning ? (
                <>
                  <Loader2 className="size-5 animate-spin" />
                  Registrando...
                </>
              ) : cooldownActive ? (
                <>
                  <Timer className="size-5" />
                  Espera el tiempo de cooldown
                </>
              ) : (
                <>
                  <ShoppingCart className="size-5" />
                  Marcar Compra (+{pointsEarned} pts)
                </>
              )}
            </Button>

            {cooldown > 0 && !cooldownActive && (
              <p className="text-xs text-center text-muted-foreground">
                Tiempo de espera entre compras: <span className="font-medium">{cooldown} min</span>
              </p>
            )}
          </CardContent>
        </Card>

        {/* Points card */}
        <Card className="shadow-lg border-amber-200/50 dark:border-amber-800/50 overflow-hidden">
          <div className="bg-gradient-to-r from-amber-500 to-orange-400 p-6 text-center text-white">
            <p className="text-sm font-medium opacity-90">Tus Puntos</p>
            <CircularProgress value={customer.totalPoints} max={customer.rewardGoal} size={140} />
            <p className="text-sm font-medium mt-2 opacity-90">
              {Math.round(customer.rewardGoal > 0 ? Math.min((customer.totalPoints / customer.rewardGoal) * 100, 100) : 0)}% hacia tu meta
            </p>
          </div>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Star className="size-4 text-amber-500" />
                <span>Total: {customer.totalPoints} puntos</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Trophy className="size-4 text-amber-500" />
                <span>Meta: {customer.rewardGoal} puntos</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Referral banner */}
        {business?.referralEnabled && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-center">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              🎁 ¡Refiere amigos y gana {business.referralBonusPoints} puntos extra!
            </p>
          </div>
        )}

        {/* Rewards gallery */}
        <div>
          <h3 className="text-lg font-bold mb-3 flex items-center gap-2 dark:text-white">
            <Gift className="size-5 text-amber-500" />
            Recompensas Disponibles
          </h3>
          {customer.rewards.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No hay recompensas disponibles</p>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {customer.rewards.map((reward) => {
                const canRedeem = customer.totalPoints >= reward.requiredPoints
                const progress = reward.requiredPoints > 0
                  ? Math.min((customer.totalPoints / reward.requiredPoints) * 100, 100)
                  : 0

                return (
                  <Card
                    key={reward.id}
                    className={cn(
                      'overflow-hidden transition-all',
                      canRedeem && 'ring-2 ring-green-400 shadow-md shadow-green-100'
                    )}
                  >
                    <div className="flex flex-col sm:flex-row">
                      <div className="sm:w-32 h-32 sm:h-auto bg-amber-50 dark:bg-amber-900/20 flex-shrink-0 relative overflow-hidden">
                        {reward.imageUrl ? (
                          <img
                            src={reward.imageUrl}
                            alt={reward.name}
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Gift className="size-10 text-amber-300" />
                          </div>
                        )}
                        {canRedeem && (
                          <Badge className="absolute top-2 right-2 bg-green-500 text-white text-xs">
                            ¡Disponible!
                          </Badge>
                        )}
                      </div>

                      <CardContent className="p-4 flex-1 flex flex-col justify-between">
                        <div>
                          <h4 className="font-semibold text-sm dark:text-white">{reward.name}</h4>
                          {reward.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{reward.description}</p>
                          )}
                        </div>
                        <div className="mt-3 space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">{customer.totalPoints} / {reward.requiredPoints} pts</span>
                            <span className={cn('font-medium', canRedeem ? 'text-green-600' : 'text-amber-600')}>
                              {canRedeem ? '¡Canjeable!' : `${reward.requiredPoints - customer.totalPoints} pts más`}
                            </span>
                          </div>
                          <Progress
                            value={progress}
                            className={cn(
                              'h-2',
                              canRedeem ? '[&>div]:bg-green-500' : '[&>div]:bg-amber-500'
                            )}
                          />
                        </div>
                      </CardContent>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>

        {/* Recent activity */}
        {customer.recentTransactions.length > 0 && (
          <div>
            <h3 className="text-lg font-bold mb-3 flex items-center gap-2 dark:text-white">
              <Clock className="size-5 text-amber-500" />
              Actividad Reciente
            </h3>
            <Card>
              <CardContent className="p-2 divide-y dark:divide-gray-800">
                {customer.recentTransactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between py-3 px-2">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold',
                        tx.type === 'earn'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                      )}>
                        {tx.type === 'earn' ? '+' : '-'}
                      </div>
                      <div>
                        <p className="text-sm font-medium dark:text-gray-200">{tx.description || (tx.type === 'earn' ? 'Puntos ganados' : 'Premio canjeado')}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(tx.createdAt).toLocaleDateString('es', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                    </div>
                    <span className={cn(
                      'text-sm font-bold',
                      tx.type === 'earn' ? 'text-green-600' : 'text-orange-600'
                    )}>
                      {tx.type === 'earn' ? '+' : '-'}{tx.points} pts
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center pt-2">
          Powered by Royalty QR
        </p>
      </div>
    </div>
  )
}

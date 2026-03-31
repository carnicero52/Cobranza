'use client'

import { useState, useEffect } from 'react'
import { Building2, Heart, Bell, Mail, Loader2, Save, Send, Shield, Megaphone, Image as ImageIcon, AlertTriangle, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import type { Business, BusinessSettings } from '@/lib/types'
import { toast } from 'sonner'

export function SettingsView() {
  const [business, setBusiness] = useState<Business | null>(null)
  const [settings, setSettings] = useState<BusinessSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [savingBiz, setSavingBiz] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)
  const [savingNotif, setSavingNotif] = useState(false)
  const [savingTelegram, setSavingTelegram] = useState(false)
  const [savingWhatsApp, setSavingWhatsApp] = useState(false)
  const [savingSecurity, setSavingSecurity] = useState(false)
  const [savingMarketing, setSavingMarketing] = useState(false)
  const [savingLogo, setSavingLogo] = useState(false)

  // Test notification states
  const [testingEmail, setTestingEmail] = useState(false)
  const [testingTelegram, setTestingTelegram] = useState(false)
  const [testingWhatsApp, setTestingWhatsApp] = useState(false)

  // Business form
  const [bizName, setBizName] = useState('')
  const [bizDesc, setBizDesc] = useState('')
  const [bizEmail, setBizEmail] = useState('')
  const [bizPhone, setBizPhone] = useState('')
  const [bizAddress, setBizAddress] = useState('')

  // Loyalty settings form
  const [ptsPerPurchase, setPtsPerPurchase] = useState('1')
  const [rewardGoal, setRewardGoal] = useState('10')
  const [notifyOnReward, setNotifyOnReward] = useState(true)

  // Notification settings form
  const [emailEnabled, setEmailEnabled] = useState(false)
  const [whatsappEnabled, setWhatsappEnabled] = useState(false)
  const [smtpHost, setSmtpHost] = useState('')
  const [smtpPort, setSmtpPort] = useState('')
  const [smtpUser, setSmtpUser] = useState('')
  const [smtpPass, setSmtpPass] = useState('')
  const [smtpFrom, setSmtpFrom] = useState('')

  // Telegram form
  const [tgBotToken, setTgBotToken] = useState('')
  const [tgChatId, setTgChatId] = useState('')
  const [tgWelcomeMsg, setTgWelcomeMsg] = useState('')
  const [tgRewardMsg, setTgRewardMsg] = useState('')

  // WhatsApp CallMeBot form
  const [waApiUrl, setWaApiUrl] = useState('')
  const [waApiKey, setWaApiKey] = useState('')
  const [waPhone, setWaPhone] = useState('')

  // Security form
  const [antiCheatEnabled, setAntiCheatEnabled] = useState(false)
  const [cooldownMinutes, setCooldownMinutes] = useState('60')
  const [maxPointsPerDay, setMaxPointsPerDay] = useState('0')
  const [maxPointsPerVisit, setMaxPointsPerVisit] = useState('0')

  // Marketing form
  const [promoEnabled, setPromoEnabled] = useState(false)
  const [promoMessage, setPromoMessage] = useState('')
  const [referralEnabled, setReferralEnabled] = useState(false)
  const [referralBonusPoints, setReferralBonusPoints] = useState('50')

  // Logo form
  const [logoUrl, setLogoUrl] = useState('')
  const [logoPreview, setLogoPreview] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [bizRes, settingsRes] = await Promise.all([
          api.getBusiness(),
          api.getBusinessSettings(),
        ])
        const biz = bizRes.data
        const set = settingsRes.data

        setBusiness(biz)
        setSettings(set)

        setBizName(biz.name)
        setBizDesc(biz.description || '')
        setBizEmail(biz.email)
        setBizPhone(biz.phone || '')
        setBizAddress(biz.address || '')
        setLogoUrl(biz.logo || '')

        setPtsPerPurchase(String(set.pointsPerPurchase))
        setRewardGoal(String(set.rewardGoal))
        setNotifyOnReward(set.notifyOnReward)

        setEmailEnabled(set.emailEnabled)
        setWhatsappEnabled(set.whatsappEnabled)
        setSmtpHost(set.smtpHost || '')
        setSmtpPort(set.smtpPort ? String(set.smtpPort) : '')
        setSmtpUser(set.smtpUser || '')
        setSmtpPass(set.smtpPass || '')
        setSmtpFrom(set.smtpFrom || '')

        setTgBotToken(set.telegramBotToken || '')
        setTgChatId(set.telegramChatId || '')
        setTgWelcomeMsg(set.telegramWelcomeMsg || '')
        setTgRewardMsg(set.telegramRewardMsg || '')

        setWaApiUrl(set.whatsappApiUrl || '')
        setWaApiKey(set.whatsappApiKey || '')
        setWaPhone(set.whatsappPhone || '')

        setAntiCheatEnabled(set.antiCheatEnabled)
        setCooldownMinutes(String(set.cooldownMinutes))
        setMaxPointsPerDay(String(set.maxPointsPerDay))
        setMaxPointsPerVisit(String(set.maxPointsPerVisit))

        setPromoEnabled(set.promoEnabled)
        setPromoMessage(set.promoMessage || '')
        setReferralEnabled(set.referralEnabled)
        setReferralBonusPoints(String(set.referralBonusPoints))
      } catch {
        toast.error('Error al cargar configuración')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const saveBusiness = async () => {
    setSavingBiz(true)
    try {
      await api.updateBusiness({
        name: bizName,
        description: bizDesc || undefined,
        email: bizEmail,
        phone: bizPhone || undefined,
        address: bizAddress || undefined,
      })
      toast.success('Información del negocio actualizada')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al guardar'
      toast.error(message)
    } finally {
      setSavingBiz(false)
    }
  }

  const saveLoyaltySettings = async () => {
    setSavingSettings(true)
    try {
      await api.updateBusinessSettings({
        pointsPerPurchase: Number(ptsPerPurchase),
        rewardGoal: Number(rewardGoal),
        notifyOnReward,
      })
      toast.success('Configuración de lealtad actualizada')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al guardar'
      toast.error(message)
    } finally {
      setSavingSettings(false)
    }
  }

  const saveNotificationSettings = async () => {
    setSavingNotif(true)
    try {
      await api.updateBusinessSettings({
        emailEnabled,
        whatsappEnabled,
        smtpHost: smtpHost || undefined,
        smtpPort: smtpPort ? Number(smtpPort) : undefined,
        smtpUser: smtpUser || undefined,
        smtpPass: smtpPass || undefined,
        smtpFrom: smtpFrom || undefined,
      })
      toast.success('Configuración de notificaciones actualizada')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al guardar'
      toast.error(message)
    } finally {
      setSavingNotif(false)
    }
  }

  const saveTelegramSettings = async () => {
    setSavingTelegram(true)
    try {
      await api.updateBusinessSettings({
        telegramBotToken: tgBotToken || undefined,
        telegramChatId: tgChatId || undefined,
        telegramWelcomeMsg: tgWelcomeMsg || undefined,
        telegramRewardMsg: tgRewardMsg || undefined,
      })
      toast.success('Configuración de Telegram actualizada')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al guardar'
      toast.error(message)
    } finally {
      setSavingTelegram(false)
    }
  }

  const saveWhatsAppSettings = async () => {
    setSavingWhatsApp(true)
    try {
      await api.updateBusinessSettings({
        whatsappEnabled,
        whatsappApiUrl: waApiUrl || undefined,
        whatsappApiKey: waApiKey || undefined,
        whatsappPhone: waPhone || undefined,
      })
      toast.success('Configuración de WhatsApp actualizada')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al guardar'
      toast.error(message)
    } finally {
      setSavingWhatsApp(false)
    }
  }

  const saveSecuritySettings = async () => {
    setSavingSecurity(true)
    try {
      await api.updateBusinessSettings({
        antiCheatEnabled,
        cooldownMinutes: Number(cooldownMinutes),
        maxPointsPerDay: Number(maxPointsPerDay),
        maxPointsPerVisit: Number(maxPointsPerVisit),
      })
      toast.success('Configuración de seguridad actualizada')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al guardar'
      toast.error(message)
    } finally {
      setSavingSecurity(false)
    }
  }

  const saveMarketingSettings = async () => {
    setSavingMarketing(true)
    try {
      await api.updateBusinessSettings({
        promoEnabled,
        promoMessage: promoMessage || undefined,
        referralEnabled,
        referralBonusPoints: Number(referralBonusPoints),
      })
      toast.success('Configuración de marketing actualizada')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al guardar'
      toast.error(message)
    } finally {
      setSavingMarketing(false)
    }
  }

  const saveLogo = async () => {
    setSavingLogo(true)
    try {
      await api.updateBusiness({ logo: logoUrl || undefined })
      toast.success('Logo actualizado')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al guardar'
      toast.error(message)
    } finally {
      setSavingLogo(false)
    }
  }

  const handleTestEmail = async () => {
    setTestingEmail(true)
    try {
      const res = await api.testNotification('email')
      toast.success(res.message || 'Email de prueba enviado')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al enviar prueba'
      toast.error(message)
    } finally {
      setTestingEmail(false)
    }
  }

  const handleTestTelegram = async () => {
    setTestingTelegram(true)
    try {
      const res = await api.testNotification('telegram')
      toast.success(res.message || 'Mensaje de prueba enviado por Telegram')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al enviar prueba'
      toast.error(message)
    } finally {
      setTestingTelegram(false)
    }
  }

  const handleTestWhatsApp = async () => {
    setTestingWhatsApp(true)
    try {
      const res = await api.testNotification('whatsapp')
      toast.success(res.message || 'WhatsApp de prueba enviado')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al enviar prueba'
      toast.error(message)
    } finally {
      setTestingWhatsApp(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-2xl">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  const SaveButton = ({ loading, onClick }: { loading: boolean; onClick: () => void }) => (
    <Button onClick={onClick} disabled={loading} className="bg-amber-500 hover:bg-amber-600 text-white">
      {loading ? <><Loader2 className="size-4 animate-spin" /> Guardando...</> : <><Save className="size-4" /> Guardar</>}
    </Button>
  )

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Configuración</h2>
        <p className="text-muted-foreground text-sm mt-1">Administra la configuración de tu negocio</p>
      </div>

      {/* Business Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="size-5 text-amber-500" />
            Información del Negocio
          </CardTitle>
          <CardDescription>Datos públicos de tu empresa</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="s-biz-name">Nombre del Negocio</Label>
            <Input id="s-biz-name" value={bizName} onChange={(e) => setBizName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="s-biz-desc">Descripción</Label>
            <Input id="s-biz-desc" placeholder="Descripción de tu negocio" value={bizDesc} onChange={(e) => setBizDesc(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="s-biz-email">Correo Electrónico</Label>
              <Input id="s-biz-email" type="email" value={bizEmail} onChange={(e) => setBizEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="s-biz-phone">Teléfono</Label>
              <Input id="s-biz-phone" type="tel" value={bizPhone} onChange={(e) => setBizPhone(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="s-biz-address">Dirección</Label>
            <Input id="s-biz-address" placeholder="Dirección del negocio" value={bizAddress} onChange={(e) => setBizAddress(e.target.value)} />
          </div>
          <div className="flex justify-end">
            <SaveButton loading={savingBiz} onClick={saveBusiness} />
          </div>
        </CardContent>
      </Card>

      {/* Loyalty Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Heart className="size-5 text-amber-500" />
            Configuración de Lealtad
          </CardTitle>
          <CardDescription>Personaliza cómo funciona tu programa de puntos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="s-pts-purchase">Puntos por Visita/Compra</Label>
              <Input
                id="s-pts-purchase"
                type="number"
                min="1"
                value={ptsPerPurchase}
                onChange={(e) => setPtsPerPurchase(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="s-reward-goal">Meta de Recompensa (puntos)</Label>
              <Input
                id="s-reward-goal"
                type="number"
                min="1"
                value={rewardGoal}
                onChange={(e) => setRewardGoal(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <Label>Notificar al canjear recompensa</Label>
              <p className="text-xs text-muted-foreground">Enviar notificación cuando un cliente canjea</p>
            </div>
            <Switch checked={notifyOnReward} onCheckedChange={setNotifyOnReward} />
          </div>
          <div className="flex justify-end">
            <SaveButton loading={savingSettings} onClick={saveLoyaltySettings} />
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="size-5 text-amber-500" />
            Notificaciones
          </CardTitle>
          <CardDescription>Configura canales de comunicación con tus clientes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <Label>Notificaciones por Email</Label>
              <p className="text-xs text-muted-foreground">Enviar emails automáticos a clientes</p>
            </div>
            <Switch checked={emailEnabled} onCheckedChange={setEmailEnabled} />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Mail className="size-4" />
              Configuración SMTP
            </Label>
            <p className="text-xs text-muted-foreground">Configura el servidor de correo para envío de emails</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="s-smtp-host">Servidor SMTP</Label>
              <Input id="s-smtp-host" placeholder="smtp.gmail.com" value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="s-smtp-port">Puerto</Label>
              <Input id="s-smtp-port" placeholder="587" value={smtpPort} onChange={(e) => setSmtpPort(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="s-smtp-user">Usuario SMTP</Label>
              <Input id="s-smtp-user" placeholder="tu@email.com" value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="s-smtp-pass">Contraseña SMTP</Label>
              <Input id="s-smtp-pass" type="password" value={smtpPass} onChange={(e) => setSmtpPass(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="s-smtp-from">Email Remitente</Label>
            <Input id="s-smtp-from" placeholder="noreply@tudominio.com" value={smtpFrom} onChange={(e) => setSmtpFrom(e.target.value)} />
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t">
            <Button
              variant="outline"
              disabled={testingEmail || !emailEnabled}
              onClick={handleTestEmail}
              className="border-amber-300 text-amber-700 hover:bg-amber-50"
            >
              {testingEmail ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
              {testingEmail ? 'Enviando...' : 'Probar Email'}
            </Button>
            <p className="text-xs text-muted-foreground self-center">Envía un email de prueba a tu correo SMTP</p>
          </div>

          <div className="flex justify-end">
            <SaveButton loading={savingNotif} onClick={saveNotificationSettings} />
          </div>
        </CardContent>
      </Card>

      {/* Section 4: Telegram Bot */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Send className="size-5 text-amber-500" />
            Telegram Bot
          </CardTitle>
          <CardDescription>Configura notificaciones automáticas por Telegram</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="s-tg-token">Bot Token</Label>
              <Input
                id="s-tg-token"
                type="password"
                placeholder="123456:ABC-DEF..."
                value={tgBotToken}
                onChange={(e) => setTgBotToken(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="s-tg-chat">Chat ID</Label>
              <Input
                id="s-tg-chat"
                placeholder="-1001234567890"
                value={tgChatId}
                onChange={(e) => setTgChatId(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="s-tg-welcome">Mensaje de Bienvenida</Label>
            <Textarea
              id="s-tg-welcome"
              placeholder="¡Bienvenido a nuestro programa de lealtad, {name}!"
              rows={3}
              value={tgWelcomeMsg}
              onChange={(e) => setTgWelcomeMsg(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Usa {`{name}`} para el nombre del cliente y {`{points}`} para sus puntos</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="s-tg-reward">Mensaje al Canjear Premio</Label>
            <Textarea
              id="s-tg-reward"
              placeholder="¡Felicidades {name}! Has canjeado: {reward}"
              rows={3}
              value={tgRewardMsg}
              onChange={(e) => setTgRewardMsg(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Usa {`{name}`}, {`{reward}`} y {`{points}`}</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t">
            <Button
              variant="outline"
              disabled={testingTelegram || !tgBotToken || !tgChatId}
              onClick={handleTestTelegram}
              className="border-blue-300 text-blue-700 hover:bg-blue-50"
            >
              {testingTelegram ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              {testingTelegram ? 'Enviando...' : 'Probar Telegram'}
            </Button>
            <p className="text-xs text-muted-foreground self-center">
              Envía un mensaje de prueba al Chat ID configurado
            </p>
          </div>

          <div className="flex justify-end">
            <SaveButton loading={savingTelegram} onClick={saveTelegramSettings} />
          </div>
        </CardContent>
      </Card>

      {/* Section 4.5: WhatsApp CallMeBot */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageCircle className="size-5 text-amber-500" />
            WhatsApp (CallMeBot)
          </CardTitle>
          <CardDescription>Envía notificaciones por WhatsApp usando CallMeBot</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 p-3 text-sm text-amber-800 dark:text-amber-200">
            <AlertTriangle className="size-4 shrink-0" />
            <span>
              Primero activa WhatsApp en tu número desde{' '}
              <a href="https://www.callmebot.com/blog/free-api-whatsapp-messages/" target="_blank" rel="noopener noreferrer" className="underline font-medium">
                callmebot.com
              </a>
              {' '}y obtén tu API Key
            </span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="s-wa-phone">Tu número de WhatsApp (con código de país)</Label>
            <Input
              id="s-wa-phone"
              placeholder="+584121234567"
              value={waPhone}
              onChange={(e) => setWaPhone(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">El número donde recibes WhatsApp (incluye código de país)</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="s-wa-apikey">API Key de CallMeBot</Label>
            <Input
              id="s-wa-apikey"
              type="password"
              placeholder="123456"
              value={waApiKey}
              onChange={(e) => setWaApiKey(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">La clave que te dio CallMeBot al activar tu número</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="s-wa-url">URL personalizada (opcional)</Label>
            <Input
              id="s-wa-url"
              placeholder="https://api.callmebot.com/whatsapp.php"
              value={waApiUrl}
              onChange={(e) => setWaApiUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Deja vacío para usar la URL por defecto de CallMeBot</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t">
            <Button
              variant="outline"
              disabled={testingWhatsApp || !waPhone || !waApiKey}
              onClick={handleTestWhatsApp}
              className="border-green-300 text-green-700 hover:bg-green-50"
            >
              {testingWhatsApp ? <Loader2 className="size-4 animate-spin" /> : <MessageCircle className="size-4" />}
              {testingWhatsApp ? 'Enviando...' : 'Probar WhatsApp'}
            </Button>
            <p className="text-xs text-muted-foreground self-center">
              Envía un WhatsApp de prueba a tu número
            </p>
          </div>

          <div className="flex justify-end">
            <SaveButton loading={savingWhatsApp} onClick={saveWhatsAppSettings} />
          </div>
        </CardContent>
      </Card>

      {/* Section 5: Anti-Trampas / Seguridad */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="size-5 text-amber-500" />
            Anti-Trampas / Seguridad
          </CardTitle>
          <CardDescription>Protege tu programa de lealtad contra abusos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <Label>Anti-trampas activado</Label>
              <p className="text-xs text-muted-foreground">Habilitar reglas anti-abuso</p>
            </div>
            <Switch checked={antiCheatEnabled} onCheckedChange={setAntiCheatEnabled} />
          </div>

          <Separator />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="s-cooldown">Cooldown entre visitas (minutos)</Label>
              <Input
                id="s-cooldown"
                type="number"
                min="0"
                value={cooldownMinutes}
                onChange={(e) => setCooldownMinutes(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Tiempo mínimo entre visitas del mismo cliente</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="s-max-day">Máximo puntos por día</Label>
              <Input
                id="s-max-day"
                type="number"
                min="0"
                value={maxPointsPerDay}
                onChange={(e) => setMaxPointsPerDay(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">0 = ilimitado</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="s-max-visit">Máximo puntos por visita</Label>
            <Input
              id="s-max-visit"
              type="number"
              min="0"
              value={maxPointsPerVisit}
              onChange={(e) => setMaxPointsPerVisit(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">0 = ilimitado</p>
          </div>

          <div className="flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 p-3 text-sm text-amber-800 dark:text-amber-200">
            <AlertTriangle className="size-4 shrink-0" />
            <span>Estas reglas se aplican automáticamente al registrar puntos</span>
          </div>

          <div className="flex justify-end">
            <SaveButton loading={savingSecurity} onClick={saveSecuritySettings} />
          </div>
        </CardContent>
      </Card>

      {/* Section 6: Marketing / Promociones */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Megaphone className="size-5 text-amber-500" />
            Marketing / Promociones
          </CardTitle>
          <CardDescription>Gestiona promociones y programa de referidos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <Label>Promoción activa</Label>
              <p className="text-xs text-muted-foreground">Mostrar mensaje promocional en el portal del cliente</p>
            </div>
            <Switch checked={promoEnabled} onCheckedChange={setPromoEnabled} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="s-promo-msg">Mensaje promocional</Label>
            <Textarea
              id="s-promo-msg"
              placeholder="¡30% de descuento en tu próxima compra!"
              rows={2}
              value={promoMessage}
              onChange={(e) => setPromoMessage(e.target.value)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between py-2">
            <div>
              <Label>Programa de referidos</Label>
              <p className="text-xs text-muted-foreground">Los clientes ganan puntos al referir amigos</p>
            </div>
            <Switch checked={referralEnabled} onCheckedChange={setReferralEnabled} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="s-referral-pts">Bonus por referido (puntos)</Label>
            <Input
              id="s-referral-pts"
              type="number"
              min="1"
              value={referralBonusPoints}
              onChange={(e) => setReferralBonusPoints(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Puntos que gana el cliente al referir a alguien nuevo</p>
          </div>

          <div className="flex justify-end">
            <SaveButton loading={savingMarketing} onClick={saveMarketingSettings} />
          </div>
        </CardContent>
      </Card>

      {/* Section 7: Logo del Negocio */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ImageIcon className="size-5 text-amber-500" />
            Logo del Negocio
          </CardTitle>
          <CardDescription>Personaliza el logo visible en el portal del cliente</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="s-logo-url">URL del Logo</Label>
            <Input
              id="s-logo-url"
              placeholder="https://ejemplo.com/logo.png"
              value={logoUrl}
              onChange={(e) => {
                setLogoUrl(e.target.value)
                setLogoPreview(false)
              }}
            />
            <p className="text-xs text-muted-foreground">Pega la URL de la imagen de tu logo</p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setLogoPreview(!logoPreview)}
              disabled={!logoUrl}
              className="border-amber-300 text-amber-700 hover:bg-amber-50"
            >
              <ImageIcon className="size-4" />
              Previsualizar
            </Button>
          </div>

          {(logoPreview || business?.logo) && logoUrl && (
            <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/50 dark:bg-amber-900/10 p-4 flex items-center justify-center">
              <img
                src={logoUrl}
                alt="Logo preview"
                className="max-h-32 max-w-full object-contain rounded-lg"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none'
                  toast.error('No se pudo cargar la imagen')
                }}
              />
            </div>
          )}

          <div className="flex justify-end">
            <SaveButton loading={savingLogo} onClick={saveLogo} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

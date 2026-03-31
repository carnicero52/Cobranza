'use client'

import { useState, useEffect, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Download, Copy, QrCode, Check, Building2, Mail, Phone, MapPin, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { api } from '@/lib/api'
import { useAppStore } from '@/store/app-store'
import type { Business } from '@/lib/types'
import { toast } from 'sonner'

export function QrcodeView() {
  const [business, setBusiness] = useState<Business | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const qrRef = useRef<HTMLDivElement>(null)
  const { setView, setBusinessSlug } = useAppStore()

  useEffect(() => {
    const fetchBusiness = async () => {
      try {
        const res = await api.getBusiness()
        setBusiness(res.data)
      } catch {
        toast.error('Error al cargar datos del negocio')
      } finally {
        setLoading(false)
      }
    }
    fetchBusiness()
  }, [])

  // QR links to the customer portal using the business slug
  const portalUrl = business
    ? `${window.location.origin}/?portal=${business.slug}`
    : ''

  const qrData = business
    ? portalUrl
    : ''

  const handleDownload = () => {
    if (!qrRef.current) return
    const svg = qrRef.current.querySelector('svg')
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      canvas.width = img.width * 2
      canvas.height = img.height * 2
      ctx?.scale(2, 2)
      ctx?.drawImage(img, 0, 0)

      const link = document.createElement('a')
      link.download = `royalty-qr-${business?.slug || 'code'}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
      toast.success('Código QR descargado')
    }

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(portalUrl)
      setCopied(true)
      toast.success('Enlace del portal copiado al portapapeles')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('No se pudo copiar el enlace')
    }
  }

  const handleOpenPortal = () => {
    if (!business) return
    setBusinessSlug(business.slug)
    setView('customer-portal')
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Business Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="size-5 text-amber-500" />
            Tu Negocio
          </CardTitle>
        </CardHeader>
        <CardContent>
          {business && (
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex items-center gap-3">
                {business.logo && (
                  <img
                    src={business.logo}
                    alt={business.name}
                    className="w-12 h-12 rounded-xl object-cover shadow-sm border"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                )}
                <h3 className="text-lg font-bold">{business.name}</h3>
              </div>
              {business.description && (
                <p className="text-muted-foreground">{business.description}</p>
              )}
              <div className="flex items-center gap-1 text-muted-foreground">
                <Mail className="size-3.5" />
                {business.email}
              </div>
              {business.phone && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Phone className="size-3.5" />
                  {business.phone}
                </div>
              )}
              {business.address && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <MapPin className="size-3.5" />
                  {business.address}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* QR Code Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <QrCode className="size-5 text-amber-500" />
            Código QR del Portal del Cliente
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          <div
            ref={qrRef}
            className="bg-white p-6 rounded-xl shadow-sm border mb-6"
          >
            {business && (
              <QRCodeSVG
                value={qrData}
                size={256}
                level="H"
                includeMargin={false}
                fgColor="#1a1a1a"
                bgColor="#ffffff"
              />
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm mb-4">
            <Button onClick={handleDownload} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white">
              <Download className="size-4" />
              Descargar QR
            </Button>
            <Button variant="outline" onClick={handleCopy} className="flex-1">
              {copied ? (
                <>
                  <Check className="size-4 text-emerald-500" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy className="size-4" />
                  Copiar enlace
                </>
              )}
            </Button>
          </div>

          <Button
            onClick={handleOpenPortal}
            variant="outline"
            className="w-full max-w-sm border-amber-300 text-amber-700 hover:bg-amber-50 mb-6"
          >
            <ExternalLink className="size-4" />
            Abrir Portal del Cliente
          </Button>

          <Separator className="my-4" />

          <div className="text-center text-sm text-muted-foreground max-w-md">
            <p>
              Los clientes escanean este código con su teléfono para ver sus puntos, recompensas y progreso.
            </p>
            <p className="mt-2 font-medium text-amber-600 dark:text-amber-400">
              Imprime este código y colócalo en tu negocio
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

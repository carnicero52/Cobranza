'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Users, ShoppingCart, DollarSign, TrendingUp, Activity, Search } from 'lucide-react'

interface Business {
  id: string
  name: string
  slug: string
  email: string
  active: boolean
  createdAt: string
}

interface Stats {
  totalBusinesses: number
  activeBusinesses: number
  totalCustomers: number
  totalInvoices: number
  totalRevenue: number
}

export default function SuperAdminPage() {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const res = await fetch('/api/superadmin/businesses', {
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('token')}` 
        }
      })
      const data = await res.json()
      
      if (data.businesses) setBusinesses(data.businesses)
      if (data.stats) setStats(data.stats)
    } catch (e) {
      console.error('Error loading:', e)
    } finally {
      setLoading(false)
    }
  }

  const toggleBusiness = async (id: string, active: boolean) => {
    try {
      await fetch(`/api/superadmin/businesses/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` 
        },
        body: JSON.stringify({ active: !active })
      })
      loadData()
    } catch (e) {
      console.error('Error toggling:', e)
    }
  }

  const filteredBusinesses = businesses.filter(b => 
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    b.email.toLowerCase().includes(search.toLowerCase()) ||
    b.slug.toLowerCase().includes(search.lower())
  )

  if (loading) return <div className="p-8">Cargando...</div>

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Super Admin - Todos los Negocios</h1>
          <Badge variant="outline" className="border-yellow-500 text-yellow-500">
            Panel de Control Global
          </Badge>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-500/20 rounded-lg">
                    <Activity className="h-6 w-6 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Total Negocios</p>
                    <p className="text-2xl font-bold">{stats.totalBusinesses}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-500/20 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Activos</p>
                    <p className="text-2xl font-bold">{stats.activeBusinesses}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-500/20 rounded-lg">
                    <Users className="h-6 w-6 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Clientes Totales</p>
                    <p className="text-2xl font-bold">{stats.totalCustomers}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-yellow-500/20 rounded-lg">
                    <DollarSign className="h-6 w-6 text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Ingresos Totales</p>
                    <p className="text-2xl font-bold">${stats.totalRevenue.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input 
            placeholder="Buscar negocios..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-gray-900 border-gray-800"
          />
        </div>

        {/* Businesses Table */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle>Todos los Negocios ({filteredBusinesses.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left p-3">Negocio</th>
                    <th className="text-left p-3">Slug</th>
                    <th className="text-left p-3">Email</th>
                    <th className="text-left p-3">Estado</th>
                    <th className="text-left p-3">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBusinesses.map(business => (
                    <tr key={business.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                      <td className="p-3 font-medium">{business.name}</td>
                      <td className="p-3 text-gray-400">{business.slug}</td>
                      <td className="p-3 text-gray-400">{business.email}</td>
                      <td className="p-3">
                        <Badge className={business.active ? 'bg-green-500' : 'bg-gray-500'}>
                          {business.active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Button 
                          size="sm" 
                          variant={business.active ? "destructive" : "default"}
                          onClick={() => toggleBusiness(business.id, business.active)}
                        >
                          {business.active ? 'Desactivar' : 'Activar'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
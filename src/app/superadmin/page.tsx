'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Users, DollarSign, TrendingUp, Activity, Search } from 'lucide-react'

interface Business {
  id: string
  name: string
  slug: string
  email: string
  active: boolean
}

export default function SuperAdminPage() {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/superadmin/businesses')
      const data = await res.json()
      
      if (data.error) {
        setError(data.error)
      } else {
        setBusinesses(data.businesses || [])
      }
    } catch (e) {
      setError('Error cargando datos')
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const toggleBusiness = async (id: string, active: boolean) => {
    try {
      await fetch(`/api/superadmin/businesses/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !active })
      })
      loadData()
    } catch (e) {
      console.error('Error toggling:', e)
    }
  }

  const filteredBusinesses = businesses.filter(b => 
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    b.email.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <div className="p-8 text-white">Cargando...</div>
  if (error) return <div className="p-8 text-red-500">Error: {error}</div>

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Super Admin</h1>
          <Badge variant="outline" className="border-yellow-500 text-yellow-500">
            Panel Global
          </Badge>
        </div>

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

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="p-3 bg-blue-500/20 rounded-lg"><Activity className="h-6 w-6 text-blue-500"/></div>
              <div><p className="text-sm text-gray-400">Total Negocios</p><p className="text-2xl font-bold">{businesses.length}</p></div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="p-3 bg-green-500/20 rounded-lg"><TrendingUp className="h-6 w-6 text-green-500"/></div>
              <div><p className="text-sm text-gray-400">Activos</p><p className="text-2xl font-bold">{businesses.filter(b => b.active).length}</p></div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="p-3 bg-purple-500/20 rounded-lg"><Users className="h-6 w-6 text-purple-500"/></div>
              <div><p className="text-sm text-gray-400">Inactivos</p><p className="text-2xl font-bold">{businesses.filter(b => !b.active).length}</p></div>
            </CardContent>
          </Card>
        </div>

        {/* Businesses Table */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader><CardTitle>Negocios ({filteredBusinesses.length})</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left p-3">Nombre</th>
                  <th className="text-left p-3">Slug</th>
                  <th className="text-left p-3">Email</th>
                  <th className="text-left p-3">Estado</th>
                  <th className="text-left p-3">Acción</th>
                </tr>
              </thead>
              <tbody>
                {filteredBusinesses.map(b => (
                  <tr key={b.id} className="border-b border-gray-800">
                    <td className="p-3 font-medium">{b.name}</td>
                    <td className="p-3 text-gray-400">{b.slug}</td>
                    <td className="p-3 text-gray-400">{b.email}</td>
                    <td className="p-3">
                      <Badge className={b.active ? 'bg-green-500' : 'bg-gray-500'}>
                        {b.active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <Button 
                        size="sm" 
                        variant={b.active ? "destructive" : "default"}
                        onClick={() => toggleBusiness(b.id, b.active)}
                      >
                        {b.active ? 'Desactivar' : 'Activar'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
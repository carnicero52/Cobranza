'use client'

import { motion } from 'framer-motion'
import { QrCode, Users, Gift, ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/store/app-store'

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.6, ease: 'easeOut' },
  }),
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 },
  },
}

const features = [
  {
    icon: QrCode,
    title: 'QR Fácil',
    description: 'Genera códigos QR únicos para tu negocio. Los clientes escanean, se registran y comienzan a acumular puntos al instante.',
  },
  {
    icon: Users,
    title: 'Multi-Negocio',
    description: 'Gestiona múltiples negocios desde una sola plataforma. Cada uno con su propio programa de lealtad independiente.',
  },
  {
    icon: Gift,
    title: 'Recompensas',
    description: 'Crea recompensas personalizadas que tus clientes pueden canjear con sus puntos. Aumenta la fidelidad y las ventas.',
  },
]

export function LandingView() {
  const { setView } = useAppStore()

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-between px-6 py-4 sm:px-8"
      >
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-amber-500 text-white">
            <QrCode className="size-5" />
          </div>
          <span className="text-xl font-bold tracking-tight">Royalty QR</span>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => setView('login')} className="text-sm">
            Iniciar Sesión
          </Button>
          <Button
            onClick={() => setView('register')}
            className="bg-amber-500 hover:bg-amber-600 text-white text-sm"
          >
            Comenzar Gratis
          </Button>
        </div>
      </motion.header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col">
        <section className="relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-20 left-1/4 w-72 h-72 bg-amber-200/30 rounded-full blur-3xl" />
            <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-orange-200/20 rounded-full blur-3xl" />
          </div>

          <div className="max-w-6xl mx-auto px-6 sm:px-8 pt-16 sm:pt-24 pb-16">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
              className="text-center"
            >
              <motion.div variants={fadeInUp} custom={0} className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-sm font-medium">
                <Sparkles className="size-4" />
                Plataforma de Fidelización #1
              </motion.div>

              <motion.h1
                variants={fadeInUp}
                custom={1}
                className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight"
              >
                Fideliza a tus clientes{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-500">
                  con QR
                </span>
              </motion.h1>

              <motion.p
                variants={fadeInUp}
                custom={2}
                className="mt-6 max-w-2xl mx-auto text-lg sm:text-xl text-muted-foreground leading-relaxed"
              >
                Crea programas de lealtad personalizados con códigos QR.
                Tus clientes acumulan puntos en cada visita y canjean recompensas.
                Simple, rápido y efectivo.
              </motion.p>

              <motion.div
                variants={fadeInUp}
                custom={3}
                className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
              >
                <Button
                  size="lg"
                  onClick={() => setView('register')}
                  className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-base px-8 py-6 shadow-lg shadow-amber-500/25"
                >
                  Comenzar Gratis
                  <ArrowRight className="size-5" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => setView('login')}
                  className="text-base px-8 py-6"
                >
                  Iniciar Sesión
                </Button>
              </motion.div>

              <motion.p
                variants={fadeInUp}
                custom={4}
                className="mt-4 text-sm text-muted-foreground"
              >
                Sin tarjeta de crédito. Configura en 2 minutos.
              </motion.p>
            </motion.div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 sm:py-24 bg-muted/30">
          <div className="max-w-6xl mx-auto px-6 sm:px-8">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-100px' }}
              variants={staggerContainer}
              className="text-center mb-12"
            >
              <motion.h2
                variants={fadeInUp}
                custom={0}
                className="text-3xl sm:text-4xl font-bold tracking-tight"
              >
                Todo lo que necesitas para{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-500">
                  fidelizar
                </span>
              </motion.h2>
              <motion.p
                variants={fadeInUp}
                custom={1}
                className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto"
              >
                Herramientas poderosas diseñadas para hacer crecer tu negocio
              </motion.p>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-100px' }}
              variants={staggerContainer}
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  variants={fadeInUp}
                  custom={index}
                >
                  <div className="relative group h-full rounded-xl border bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
                    <div className="absolute top-0 left-0 right-0 h-1 rounded-t-xl bg-gradient-to-r from-amber-500 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 mb-4">
                      <feature.icon className="size-6" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 sm:py-24">
          <div className="max-w-4xl mx-auto px-6 sm:px-8 text-center">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={staggerContainer}
            >
              <motion.h2
                variants={fadeInUp}
                custom={0}
                className="text-3xl sm:text-4xl font-bold tracking-tight"
              >
                ¿Listo para empezar a fidelizar?
              </motion.h2>
              <motion.p
                variants={fadeInUp}
                custom={1}
                className="mt-4 text-lg text-muted-foreground"
              >
                Únete a cientos de negocios que ya usan Royalty QR
              </motion.p>
              <motion.div
                variants={fadeInUp}
                custom={2}
                className="mt-8"
              >
                <Button
                  size="lg"
                  onClick={() => setView('register')}
                  className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-base px-8 py-6 shadow-lg shadow-amber-500/25"
                >
                  Crear mi cuenta gratis
                  <ArrowRight className="size-5" />
                </Button>
              </motion.div>
            </motion.div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-6 px-6 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Royalty QR. Todos los derechos reservados.</p>
      </footer>
    </div>
  )
}

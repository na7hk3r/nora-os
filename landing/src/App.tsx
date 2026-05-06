// Reformado: usa nuevo Navbar y reordena secciones para flujo Hero → emocional → beneficios → modular → demo → screenshots → devs → conversión.
import { Navbar } from './components/Navbar'
import { Hero } from './sections/Hero'
import { HowItWorks } from './sections/HowItWorks'
import { Features } from './sections/Features'
import { CopilotDemo } from './sections/CopilotDemo'
import { Plugins } from './sections/Plugins'
import { Screenshots } from './sections/Screenshots'
import { ForDevs } from './sections/ForDevs'
import { Download_ } from './sections/Download'
import { FAQ } from './sections/FAQ'
import { Footer } from './sections/Footer'
import { useI18n } from './i18n'

export default function App() {
  const { t } = useI18n()

  return (
    <div className="min-h-screen flex flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-3 focus:py-2 focus:bg-accent focus:text-white focus:rounded-lg"
      >
        {t.common.skipContent}
      </a>

      <Navbar />

      <main id="main" className="flex-1">
        <Hero />
        <Features />
        <HowItWorks />
        <Plugins />
        <CopilotDemo />
        <Screenshots />
        <ForDevs />
        <Download_ />
        <FAQ />
      </main>

      <Footer />
    </div>
  )
}

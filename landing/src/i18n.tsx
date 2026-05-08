import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export const languageOptions = [
  { code: 'es', shortLabel: 'ES', label: 'Español', htmlLang: 'es' },
  { code: 'en', shortLabel: 'EN', label: 'English', htmlLang: 'en' },
  { code: 'pt', shortLabel: 'PT', label: 'Português', htmlLang: 'pt-BR' },
] as const

export type LandingLanguage = (typeof languageOptions)[number]['code']

interface ReplyCopy {
  body: string
  bullets?: string[]
  closing?: string
}

interface LandingCopy {
  locale: string
  meta: {
    title: string
    description: string
  }
  common: {
    skipContent: string
    github: string
    downloadFor: string
    loadingLatest: string
    yourSystem: string
    switchToDark: string
    switchToLight: string
  }
  language: {
    label: string
    aria: string
  }
  nav: {
    homeAria: string
    repoAria: string
    releaseAria: string
    openMenu: string
    closeMenu: string
    mobileLabel: string
    links: Array<{ href: string; label: string }>
  }
  hero: {
    badge: string
    titlePrefix: string
    titleAccent: string
    mantra: string
    description: string
    githubCta: string
    proof: string[]
    copilotLine: string
    floatingLabels: string[]
    mockupTitle: string
    mockupTime: string
    mockupSidebar: string[]
    copilotNow: string
    stats: Array<{ k: string; v: string; sub: string }>
    feelingEyebrow: string
    feelingLines: string[]
  }
  features: {
    eyebrow: string
    title: string
    description: string
    cards: Array<{ tag?: string; title: string; description: string }>
  }
  how: {
    eyebrow: string
    title: string
    description: string
    steps: Array<{ number: string; title: string; description: string }>
  }
  plugins: {
    eyebrow: string
    title: string
    description: string
    cards: Record<string, { name: string; description: string; domainLabel: string }>
    roadmapPrefix: string
    roadmapItems: string[]
    roadmapLink: string
  }
  copilot: {
    eyebrow: string
    title: string
    description: string
    headerTitle: string
    status: string
    demoLabel: string
    initial: ReplyCopy
    actions: Array<{ label: string; reply: ReplyCopy }>
    badges: string[]
    privacyLine: string
  }
  screenshots: {
    eyebrow: string
    title: string
    description: string
    tabAria: string
    missing: string
    tabs: Array<{
      id: string
      label: string
      src: string
      compareSrc?: string
      alt: string
      compareAlt?: string
      caption: string
    }>
  }
  devs: {
    eyebrow: string
    title: string
    description: string
    cards: Array<{ title: string; description: string; linkText: string }>
    openDocs: string
    closeDocs: string
  }
  docs: {
    eyebrow: string
    emptyTitle: string
    emptyMessage: string
    title: string
    description: string
    searchLabel: string
    searchPlaceholder: string
    navLabel: string
    noResults: string
    github: string
  }
  download: {
    eyebrow: string
    titlePrefix: string
    titleAccent: string
    intro: string
    version: string
    published: string
    loading: string
    error: string
    releaseLink: string
    table: { os: string; type: string; size: string; download: string }
    download: string
    unavailable: string
    footerMeta: string
    previousQuestion: string
    history: string
  }
  faq: {
    eyebrow: string
    title: string
    description: string
    items: Array<{ q: string; a: string }>
  }
  footer: {
    line1: string
    accent: string
    line2: string
    body: string
    by: string
  }
}

export const copy = {
  es: {
    locale: 'es-ES',
    meta: {
      title: 'Nora OS - Copiloto local para organizar tu vida',
      description:
        'Nora OS conecta trabajo, salud, hábitos y finanzas en una app local-first, privada y extensible.',
    },
    common: {
      skipContent: 'Saltar al contenido',
      github: 'GitHub',
      downloadFor: 'Descargar para {os}',
      loadingLatest: 'Cargando última versión',
      yourSystem: 'tu sistema',
      switchToDark: 'Cambiar a tema oscuro',
      switchToLight: 'Cambiar a tema claro',
    },
    language: {
      label: 'Idioma',
      aria: 'Cambiar idioma',
    },
    nav: {
      homeAria: 'Nora OS, inicio',
      repoAria: 'Repositorio en GitHub',
      releaseAria: 'Versión {version}',
      openMenu: 'Abrir menú',
      closeMenu: 'Cerrar menú',
      mobileLabel: 'Menú móvil',
      links: [
        { href: '#features', label: 'Para vos' },
        { href: '#how-it-works', label: 'Cómo funciona' },
        { href: '#plugins', label: 'Plugins' },
        { href: '#copilot-demo', label: 'Copiloto' },
        { href: '#faq', label: 'FAQ' },
      ],
    },
    hero: {
      badge: 'Copiloto local · Sin nube · Open source',
      titlePrefix: 'El copiloto que conoce',
      titleAccent: 'toda tu vida.',
      mantra: 'Tu sistema · Tu vida · Una sola IA',
      description:
        'Nora OS conecta tu trabajo, salud, hábitos y finanzas para decirte qué hacer hoy sin enviar tus datos a ningún servidor.',
      githubCta: 'Ver en GitHub',
      proof: ['Sin cuenta requerida', 'Cifrado AES-256-GCM', '100% local · Licencia ISC'],
      copilotLine:
        'Hoy estás 18% por debajo de tu foco semanal. Tenés 2 tareas que vencen hoy.',
      floatingLabels: ['Productividad', 'Hábitos', 'Finanzas', 'Tiempo', 'Conocimiento', 'Copiloto IA'],
      mockupTitle: 'nora-os · daily brief',
      mockupTime: 'Hoy · 09:14',
      mockupSidebar: ['Daily', 'Work', 'Hábitos', 'Fitness', 'Finanzas', 'Knowledge'],
      copilotNow: 'Copiloto · ahora',
      stats: [
        { k: 'Foco', v: '2h 40m', sub: 'objetivo 4h' },
        { k: 'Hábitos', v: '4/6', sub: 'racha activa' },
        { k: 'Finanzas', v: '+12%', sub: 'sobre presupuesto' },
        { k: 'Sueño', v: '6h 10m', sub: 'objetivo 7h' },
      ],
      feelingEyebrow: 'Así se siente Nora OS',
      feelingLines: [
        'Abrís Nora y todo está ahí.',
        'Sin logins. Sin sincronizar. Sin esperar.',
        'Tu work en progreso, tus hábitos de la semana, tu balance del mes.',
        'Todo tuyo. Solo tuyo.',
      ],
    },
    features: {
      eyebrow: 'Para vos',
      title: 'Lo que vas a notar desde el primer día',
      description:
        'Sin checklist técnica. Beneficios reales en tu rutina, sin sacrificar tu privacidad.',
      cards: [
        {
          tag: 'Local-first',
          title: 'Tus datos nunca salen de tu máquina',
          description:
            'SQLite en tu disco. Sin nube, sin sincronización, sin telemetría. Ni siquiera nosotros podemos verlos.',
        },
        {
          tag: 'Modular',
          title: 'Todo lo que necesitás, nada de lo que no',
          description:
            'Activás solo los módulos que usás y ordenás el dashboard arrastrando widgets, sin romper tu flujo.',
        },
        {
          tag: 'Auto-update',
          title: 'Siempre actualizado, sin que lo notes',
          description:
            'Releases en GitHub, instalación en un clic. Sin pop-ups molestos ni interrupciones de tu flujo.',
        },
        {
          tag: 'Seguro',
          title: 'Privacidad real, no marketing',
          description:
            'Cifrado AES-256-GCM opcional sobre la base completa. Tu vida no es un asset para vender.',
        },
        {
          tag: 'Multiusuario',
          title: 'Varios perfiles, cero cloud',
          description:
            'Cada usuario del equipo tiene su propia base cifrable. Sin cuentas online, todo separado en disco.',
        },
        {
          tag: 'IA opcional',
          title: 'Un copiloto que no espía',
          description:
            'Ollama corre en tu equipo. El modelo te conoce, pero nunca le manda nada a OpenAI ni a la nube.',
        },
      ],
    },
    how: {
      eyebrow: 'Cómo funciona',
      title: 'Tres pasos. Diez segundos.',
      description:
        'Sin tutorial de 40 minutos. Sin onboarding eterno. Bajás, instalás y empieza a servirte.',
      steps: [
        {
          number: '01',
          title: 'Descargá e instalá',
          description: 'Sin cuentas. Sin servidores. Bajás el instalador y abrís la app. Listo.',
        },
        {
          number: '02',
          title: 'Activá lo que necesitás',
          description:
            'Elegís entre módulos de trabajo, hábitos, finanzas, salud y tiempo. Solo lo que vas a usar.',
        },
        {
          number: '03',
          title: 'Tu vida, organizada',
          description: 'Todo en un lugar. Con un copiloto IA opcional que vive en tu máquina.',
        },
      ],
    },
    plugins: {
      eyebrow: 'Plugins',
      title: 'Tu sistema, modular.',
      description:
        'No es una app. Es una plataforma para organizar tu vida: activás lo que usás, ignorás el resto.',
      cards: {
        work: {
          name: 'Work',
          domainLabel: 'Productividad',
          description:
            'Kanban con prioridades, vencimientos, WIP limit y edición rápida con Enter. Focus Engine 2.0, notas y enlaces con búsqueda.',
        },
        fitness: {
          name: 'Fitness',
          domainLabel: 'Fitness',
          description:
            'Tracking diario de peso, comidas, ejercicios y sueño. Medidas corporales, resúmenes mensuales y seguimiento opcional para dejar de fumar.',
        },
        finance: {
          name: 'Finanzas',
          domainLabel: 'Finanzas',
          description:
            'Cuentas, transacciones, transferencias, presupuestos y recurrentes configurables. Insights IA opcionales en moneda local.',
        },
        habits: {
          name: 'Hábitos',
          domainLabel: 'Hábitos',
          description:
            'Hábitos diarios, semanales y mensuales con racha, heatmap, detección de riesgo y proveedor IA con top streaks.',
        },
        journal: {
          name: 'Journal',
          domainLabel: 'Conocimiento',
          description:
            'Diario con prompts, mood, tags, búsqueda y pin. Una entrada por día, undo en borrado y enfoque privacy-first.',
        },
        knowledge: {
          name: 'Conocimiento',
          domainLabel: 'Conocimiento',
          description:
            'PKM ligero: recursos, highlights y flashcards con algoritmo SM-2. Repaso espaciado para retener lo que aprendés.',
        },
        time: {
          name: 'Tiempo',
          domainLabel: 'Tiempo',
          description:
            'Cronómetro y timesheet con un único timer activo, proyectos con tarifa por hora y auto-entries desde sesiones de Focus.',
        },
      },
      roadmapPrefix: 'Próximamente:',
      roadmapItems: ['Goals & OKRs', 'Calendario externo (.ics, Google)'],
      roadmapLink: 'Ver roadmap completo',
    },
    copilot: {
      eyebrow: 'Copiloto IA local',
      title: 'Preguntale a tu propia app.',
      description:
        'Tu copiloto conoce tu trabajo, hábitos, salud y finanzas. No es un chatbot genérico: opera sobre tus datos reales y nunca los manda afuera.',
      headerTitle: 'Nora OS Copiloto',
      status: 'Local · Ollama detectado',
      demoLabel: 'Demo',
      initial: {
        body: 'Buenos días. Hoy estás al 71% de tu score semanal.',
        bullets: [
          'Foco: 2h 40m esta semana (objetivo: 4h)',
          'Ejercicio: 4 días consecutivos, racha activa',
          'Finanzas: 12% por encima del presupuesto',
        ],
        closing:
          'Para volver a baseline hoy:\n→ Completar "Propuesta cliente X" (vence hoy)\n→ 45 min de foco antes de las 14hs',
      },
      actions: [
        {
          label: '¿En qué enfocarme?',
          reply: {
            body:
              'Hoy lo más urgente es cerrar la propuesta del cliente X. Vence en 6 horas y bloquea tu KR de Q2.',
            bullets: ['1 tarea crítica · 2 importantes · 5 menores', 'Bloque sugerido: 90 min de foco profundo'],
            closing: 'Arrancá con la propuesta. Las menores las hacemos después de las 17hs.',
          },
        },
        {
          label: 'Organizame el día',
          reply: {
            body: 'Plan armado en base a tu energía habitual y vencimientos:',
            bullets: [
              '09:00 - 10:30 · Foco profundo · Propuesta cliente X',
              '10:30 - 11:00 · Break + email triage',
              '11:00 - 12:30 · Code review + arquitectura',
              '13:00 - 14:00 · Almuerzo',
              '18:00 - 19:00 · Entrenamiento (día 5 de racha)',
            ],
          },
        },
        {
          label: '¿Qué estoy descuidando?',
          reply: {
            body: 'Mirando los últimos 14 días, tres áreas en rojo:',
            bullets: [
              'Knowledge: sin sesiones de estudio hace 8 días',
              'Sueño: promedio 6h 10m (objetivo: 7h)',
              'Finance: gastos en delivery +34% vs mes pasado',
            ],
            closing: 'Sugerencia: hoy 30 min de lectura + dormirte antes de medianoche.',
          },
        },
        {
          label: 'Review rápido',
          reply: {
            body: 'Resumen de la semana, sin floja:',
            bullets: [
              '12 tareas completadas (vs 9 promedio)',
              'Racha de hábitos: 4/6 mantenidos',
              'Foco semanal: 67% del objetivo',
              'Goal Q2 "Lanzar v2": 38%, vas atrasado',
            ],
            closing: 'Próxima semana: priorizar 2 sesiones de foco diario para recuperar Goal Q2.',
          },
        },
      ],
      badges: ['Requiere Ollama', '100% offline', 'Sin API keys', 'Sin envío de datos'],
      privacyLine: 'Tus datos reales. Tu modelo local. Sin internet.',
    },
    screenshots: {
      eyebrow: 'Capturas',
      title: 'Pensada para usarla todos los días.',
      description: 'Atajos globales, palette de comandos y temas dark/light cuidados al detalle.',
      tabAria: 'Capturas de Nora OS',
      missing: 'Captura próximamente',
      tabs: [
        {
          id: 'dashboard',
          label: 'Dashboard',
          src: 'screenshots/screenshot-dashboard.png',
          alt: 'Dashboard de Nora OS con Daily Score y misiones',
          caption: 'Daily Score, misiones del día y resumen de hábitos en una sola vista.',
        },
        {
          id: 'copilot',
          label: 'Copiloto',
          src: 'screenshots/screenshot-copiloto.png',
          alt: 'Panel del copiloto IA local',
          caption:
            'Copiloto IA local. Respuestas en lenguaje natural sobre tus datos reales, sin enviar nada a la nube.',
        },
        {
          id: 'themes',
          label: 'Temas',
          src: 'screenshots/screenshot-temas.png',
          compareSrc: 'screenshots/screenshot-temas-light.png',
          alt: 'Tema oscuro de Nora OS',
          compareAlt: 'Tema claro de Nora OS',
          caption: 'Galería de temas: dark y light cuidados al detalle, switch instantáneo.',
        },
        {
          id: 'work',
          label: 'Work',
          src: 'screenshots/screenshot-work.png',
          alt: 'Plugin Work con kanban y Focus Engine',
          caption: 'Plugin Work: kanban con WIP limit y Focus Engine 2.0 con Pomodoro nativo.',
        },
      ],
    },
    devs: {
      eyebrow: 'Para desarrolladores',
      title: 'Una plataforma, no una app cerrada.',
      description:
        'Nora OS está diseñado para extenderse. Si sabés TypeScript, podés agregar un módulo nuevo en una tarde.',
      cards: [
        {
          title: 'Plugin system',
          description:
            'Creá un plugin nuevo en 2 minutos con el scaffolding. npm run create-plugin -- mi-plugin y listo.',
          linkText: 'docs/PLUGIN_BASE_STRUCTURE',
        },
        {
          title: 'CoreAPI',
          description:
            'Acceso completo a storage, EventBus, gamificación, IA context y settings. Una API estable, tipada, testeada.',
          linkText: 'docs/PLUGIN_API',
        },
        {
          title: 'Open source',
          description:
            'MIT/ISC. Forkeable. Auditeable. Contribuible. Sin vendor lock-in, sin dependencias propietarias.',
          linkText: 'github.com/na7hk3r/nora-os',
        },
      ],
      openDocs: 'Explorar documentación técnica completa',
      closeDocs: 'Ocultar documentación técnica',
    },
    docs: {
      eyebrow: 'Documentación',
      emptyTitle: 'Sin documentos disponibles',
      emptyMessage: 'No se encontraron archivos en /docs.',
      title: 'Explora la documentación técnica',
      description: 'Arquitectura, plugins, autenticación y más, directo desde el repositorio.',
      searchLabel: 'Buscar en la documentación',
      searchPlaceholder: 'Buscar...',
      navLabel: 'Documentos',
      noResults: 'Sin resultados.',
      github: 'Ver en GitHub',
    },
    download: {
      eyebrow: 'Descargar',
      titlePrefix: 'Descargá Nora OS.',
      titleAccent: 'Es gratis.',
      intro: 'Sin cuentas. Sin suscripciones. Sin sorpresas.',
      version: 'Versión',
      published: 'publicada el',
      loading: 'Cargando información del último release...',
      error: 'No pudimos consultar GitHub ahora mismo. Podés ver todos los binarios manualmente:',
      releaseLink: 'Abrir página de releases',
      table: { os: 'SO', type: 'Tipo', size: 'Tamaño', download: 'Descarga' },
      download: 'Descargar',
      unavailable: 'No disponible',
      footerMeta: 'Open source · Licencia ISC · Auto-update incluido · GitHub Releases',
      previousQuestion: '¿Buscás versiones anteriores?',
      history: 'Ver historial de releases',
    },
    faq: {
      eyebrow: 'Preguntas frecuentes',
      title: 'Lo que vas a preguntarte.',
      description: 'Anticipamos las dudas más reales, sin marketing fluff.',
      items: [
        {
          q: '¿Es realmente gratis?',
          a: 'Sí. Open source bajo licencia ISC. Sin tier "Pro", sin freemium, sin paywall escondido. El que quiera puede forkearlo.',
        },
        {
          q: '¿Mis datos están seguros?',
          a: 'Viven en tu máquina, en una base SQLite local. Cifrado AES-256-GCM opcional sobre toda la base. Sin nube, sin servidor, sin telemetría.',
        },
        {
          q: '¿Funciona sin internet?',
          a: 'Al 100%. Solo necesitás internet para descargar la app y, si querés, para recibir auto-updates. Todo lo demás es offline.',
        },
        {
          q: '¿Qué es Ollama y necesito usarlo?',
          a: 'Es un motor de IA local que corre en tu máquina. Es totalmente opcional: la app funciona sin él. Si lo instalás, el copiloto IA se activa automáticamente y nunca manda nada a la nube.',
        },
        {
          q: '¿Está disponible para Mac y Linux?',
          a: 'Windows está estable hoy (instalador y portable). Mac (.dmg) y Linux (AppImage / .deb) están en la página de releases, con soporte oficial completo en próximas versiones.',
        },
        {
          q: '¿Puedo crear mis propios plugins?',
          a: 'Sí. Hay un CLI de scaffolding (npm run create-plugin -- mi-plugin) y documentación completa de la CoreAPI. Cada plugin es un módulo TypeScript con manifest, eventos, repo y UI.',
        },
      ],
    },
    footer: {
      line1: 'Hecho con convicción.',
      accent: 'Local-first.',
      line2: 'Sin telemetría. Sin VC money.',
      body: 'Una herramienta que vive donde tienen que vivir las cosas tuyas: en tu máquina.',
      by: 'por',
    },
  },
  en: {
    locale: 'en-US',
    meta: {
      title: 'Nora OS - Local copilot for organizing your life',
      description:
        'Nora OS connects work, health, habits, and finances in a private, extensible, local-first app.',
    },
    common: {
      skipContent: 'Skip to content',
      github: 'GitHub',
      downloadFor: 'Download for {os}',
      loadingLatest: 'Loading latest version',
      yourSystem: 'your system',
      switchToDark: 'Switch to dark theme',
      switchToLight: 'Switch to light theme',
    },
    language: {
      label: 'Language',
      aria: 'Change language',
    },
    nav: {
      homeAria: 'Nora OS, home',
      repoAria: 'GitHub repository',
      releaseAria: 'Version {version}',
      openMenu: 'Open menu',
      closeMenu: 'Close menu',
      mobileLabel: 'Mobile menu',
      links: [
        { href: '#features', label: 'For you' },
        { href: '#how-it-works', label: 'How it works' },
        { href: '#plugins', label: 'Plugins' },
        { href: '#copilot-demo', label: 'Copilot' },
        { href: '#faq', label: 'FAQ' },
      ],
    },
    hero: {
      badge: 'Local copilot · No cloud · Open source',
      titlePrefix: 'The copilot that knows',
      titleAccent: 'your whole life.',
      mantra: 'Your system · Your life · One AI',
      description:
        'Nora OS connects your work, health, habits, and finances to tell you what to do today without sending your data to any server.',
      githubCta: 'View on GitHub',
      proof: ['No account required', 'AES-256-GCM encryption', '100% local · ISC license'],
      copilotLine: 'Today you are 18% below your weekly focus. You have 2 tasks due today.',
      floatingLabels: ['Productivity', 'Habits', 'Finance', 'Time', 'Knowledge', 'AI Copilot'],
      mockupTitle: 'nora-os · daily brief',
      mockupTime: 'Today · 09:14',
      mockupSidebar: ['Daily', 'Work', 'Habits', 'Fitness', 'Finance', 'Knowledge'],
      copilotNow: 'Copilot · now',
      stats: [
        { k: 'Focus', v: '2h 40m', sub: 'goal 4h' },
        { k: 'Habits', v: '4/6', sub: 'active streak' },
        { k: 'Finance', v: '+12%', sub: 'over budget' },
        { k: 'Sleep', v: '6h 10m', sub: 'goal 7h' },
      ],
      feelingEyebrow: 'How Nora OS feels',
      feelingLines: [
        'Open Nora and everything is there.',
        'No logins. No syncing. No waiting.',
        'Your work in progress, your weekly habits, your monthly balance.',
        'All yours. Only yours.',
      ],
    },
    features: {
      eyebrow: 'For you',
      title: 'What you will feel from day one',
      description:
        'No technical checklist. Real benefits in your routine, without trading away your privacy.',
      cards: [
        {
          tag: 'Local-first',
          title: 'Your data never leaves your machine',
          description:
            'SQLite on your disk. No cloud, no sync, no telemetry. Not even we can see it.',
        },
        {
          tag: 'Modular',
          title: 'Everything you need, nothing you do not',
          description:
            'Turn on only the modules you use and arrange the dashboard by dragging widgets without breaking your flow.',
        },
        {
          tag: 'Auto-update',
          title: 'Always up to date, without the noise',
          description:
            'GitHub releases and one-click installation. No annoying pop-ups or flow-breaking interruptions.',
        },
        {
          tag: 'Secure',
          title: 'Real privacy, not marketing',
          description:
            'Optional AES-256-GCM encryption over the full database. Your life is not an asset to sell.',
        },
        {
          tag: 'Multi-user',
          title: 'Several profiles, zero cloud',
          description:
            'Each user gets their own encryptable database. No online accounts, everything separated on disk.',
        },
        {
          tag: 'Optional AI',
          title: 'A copilot that does not spy',
          description:
            'Ollama runs on your computer. The model can know your context without sending anything to OpenAI or the cloud.',
        },
      ],
    },
    how: {
      eyebrow: 'How it works',
      title: 'Three steps. Ten seconds.',
      description:
        'No 40-minute tutorial. No endless onboarding. Download, install, and it starts helping.',
      steps: [
        {
          number: '01',
          title: 'Download and install',
          description: 'No accounts. No servers. Get the installer and open the app. Done.',
        },
        {
          number: '02',
          title: 'Enable what you need',
          description:
            'Choose modules for work, habits, finance, health, and time. Only what you will actually use.',
        },
        {
          number: '03',
          title: 'Your life, organized',
          description: 'Everything in one place, with an optional AI copilot that lives on your machine.',
        },
      ],
    },
    plugins: {
      eyebrow: 'Plugins',
      title: 'Your system, modular.',
      description:
        'It is not just an app. It is a platform for organizing your life: enable what you use, ignore the rest.',
      cards: {
        work: {
          name: 'Work',
          domainLabel: 'Productivity',
          description:
            'Kanban with priorities, due dates, WIP limits, and quick Enter-to-save editing. Focus Engine 2.0 plus searchable notes and links.',
        },
        fitness: {
          name: 'Fitness',
          domainLabel: 'Fitness',
          description:
            'Daily tracking for weight, meals, workouts, and sleep. Body measurements, monthly summaries, and optional quit-smoking tracking.',
        },
        finance: {
          name: 'Finance',
          domainLabel: 'Finance',
          description:
            'Accounts, transactions, transfers, budgets, and recurring tools you can enable as needed. Optional AI insights in your local currency.',
        },
        habits: {
          name: 'Habits',
          domainLabel: 'Habits',
          description:
            'Daily, weekly, and monthly habits with streaks, heatmaps, risk detection, and an AI provider for top streaks.',
        },
        journal: {
          name: 'Journal',
          domainLabel: 'Knowledge',
          description:
            'A journal with prompts, mood, tags, search, and pinning. One entry per day, delete undo, and a privacy-first design.',
        },
        knowledge: {
          name: 'Knowledge',
          domainLabel: 'Knowledge',
          description:
            'Lightweight PKM: resources, highlights, and flashcards with the SM-2 algorithm. Spaced review for what you are learning.',
        },
        time: {
          name: 'Time',
          domainLabel: 'Time',
          description:
            'Stopwatch and timesheet with a single active timer, hourly project rates, and auto-entries from Focus sessions.',
        },
      },
      roadmapPrefix: 'Coming soon:',
      roadmapItems: ['Goals & OKRs', 'External calendars (.ics, Google)'],
      roadmapLink: 'View full roadmap',
    },
    copilot: {
      eyebrow: 'Local AI copilot',
      title: 'Ask your own app.',
      description:
        'Your copilot knows your work, habits, health, and finances. It is not a generic chatbot: it works on your real data and never sends it away.',
      headerTitle: 'Nora OS Copilot',
      status: 'Local · Ollama detected',
      demoLabel: 'Demo',
      initial: {
        body: 'Good morning. Today you are at 71% of your weekly score.',
        bullets: [
          'Focus: 2h 40m this week (goal: 4h)',
          'Exercise: 4 consecutive days, active streak',
          'Finance: 12% over budget',
        ],
        closing:
          'To return to baseline today:\n→ Complete "Client X proposal" (due today)\n→ 45 min of focus before 2pm',
      },
      actions: [
        {
          label: 'What should I focus on?',
          reply: {
            body:
              'The most urgent thing today is closing the Client X proposal. It is due in 6 hours and blocks your Q2 KR.',
            bullets: ['1 critical task · 2 important · 5 minor', 'Suggested block: 90 min of deep focus'],
            closing: 'Start with the proposal. The small tasks can wait until after 5pm.',
          },
        },
        {
          label: 'Plan my day',
          reply: {
            body: 'Plan built from your usual energy and deadlines:',
            bullets: [
              '09:00 - 10:30 · Deep focus · Client X proposal',
              '10:30 - 11:00 · Break + email triage',
              '11:00 - 12:30 · Code review + architecture',
              '13:00 - 14:00 · Lunch',
              '18:00 - 19:00 · Workout (streak day 5)',
            ],
          },
        },
        {
          label: 'What am I neglecting?',
          reply: {
            body: 'Looking at the last 14 days, three areas are red:',
            bullets: [
              'Knowledge: no study sessions for 8 days',
              'Sleep: 6h 10m average (goal: 7h)',
              'Finance: delivery spending +34% vs last month',
            ],
            closing: 'Suggestion: 30 min of reading today and sleep before midnight.',
          },
        },
        {
          label: 'Quick review',
          reply: {
            body: 'Weekly summary, straight up:',
            bullets: [
              '12 completed tasks (vs 9 average)',
              'Habit streaks: 4/6 maintained',
              'Weekly focus: 67% of goal',
              'Q2 goal "Launch v2": 38%, you are behind',
            ],
            closing: 'Next week: prioritize 2 daily focus sessions to recover the Q2 goal.',
          },
        },
      ],
      badges: ['Requires Ollama', '100% offline', 'No API keys', 'No data uploads'],
      privacyLine: 'Your real data. Your local model. No internet.',
    },
    screenshots: {
      eyebrow: 'Screenshots',
      title: 'Designed for daily use.',
      description: 'Global shortcuts, command palette, and carefully tuned dark and light themes.',
      tabAria: 'Nora OS screenshots',
      missing: 'Screenshot coming soon',
      tabs: [
        {
          id: 'dashboard',
          label: 'Dashboard',
          src: 'screenshots/screenshot-dashboard.png',
          alt: 'Nora OS dashboard with Daily Score and missions',
          caption: 'Daily Score, daily missions, and habit summaries in one view.',
        },
        {
          id: 'copilot',
          label: 'Copilot',
          src: 'screenshots/screenshot-copiloto.png',
          alt: 'Local AI copilot panel',
          caption:
            'Local AI copilot. Natural-language answers about your real data, without sending anything to the cloud.',
        },
        {
          id: 'themes',
          label: 'Themes',
          src: 'screenshots/screenshot-temas.png',
          compareSrc: 'screenshots/screenshot-temas-light.png',
          alt: 'Nora OS dark theme',
          compareAlt: 'Nora OS light theme',
          caption: 'Theme gallery: dark and light modes, carefully designed and switched instantly.',
        },
        {
          id: 'work',
          label: 'Work',
          src: 'screenshots/screenshot-work.png',
          alt: 'Work plugin with kanban and Focus Engine',
          caption: 'Work plugin: kanban with WIP limits and Focus Engine 2.0 with native Pomodoro.',
        },
      ],
    },
    devs: {
      eyebrow: 'For developers',
      title: 'A platform, not a closed app.',
      description:
        'Nora OS is designed to be extended. If you know TypeScript, you can add a new module in an afternoon.',
      cards: [
        {
          title: 'Plugin system',
          description:
            'Create a new plugin in 2 minutes with scaffolding. npm run create-plugin -- my-plugin and done.',
          linkText: 'docs/PLUGIN_BASE_STRUCTURE',
        },
        {
          title: 'CoreAPI',
          description:
            'Full access to storage, EventBus, gamification, AI context, and settings. A stable, typed, tested API.',
          linkText: 'docs/PLUGIN_API',
        },
        {
          title: 'Open source',
          description:
            'MIT/ISC. Forkable. Auditable. Contributable. No vendor lock-in, no proprietary dependencies.',
          linkText: 'github.com/na7hk3r/nora-os',
        },
      ],
      openDocs: 'Explore complete technical docs',
      closeDocs: 'Hide technical docs',
    },
    docs: {
      eyebrow: 'Docs',
      emptyTitle: 'No documents available',
      emptyMessage: 'No files were found in /docs.',
      title: 'Explore the technical documentation',
      description: 'Architecture, plugins, authentication, and more, straight from the repository.',
      searchLabel: 'Search the documentation',
      searchPlaceholder: 'Search...',
      navLabel: 'Documents',
      noResults: 'No results.',
      github: 'View on GitHub',
    },
    download: {
      eyebrow: 'Download',
      titlePrefix: 'Download Nora OS.',
      titleAccent: 'It is free.',
      intro: 'No accounts. No subscriptions. No surprises.',
      version: 'Version',
      published: 'published on',
      loading: 'Loading latest release information...',
      error: 'We could not reach GitHub right now. You can view all binaries manually:',
      releaseLink: 'Open releases page',
      table: { os: 'OS', type: 'Type', size: 'Size', download: 'Download' },
      download: 'Download',
      unavailable: 'Unavailable',
      footerMeta: 'Open source · ISC License · Auto-update included · GitHub Releases',
      previousQuestion: 'Looking for older versions?',
      history: 'View release history',
    },
    faq: {
      eyebrow: 'FAQ',
      title: 'What you will wonder.',
      description: 'The real questions answered, without marketing fluff.',
      items: [
        {
          q: 'Is it really free?',
          a: 'Yes. Open source under the ISC license. No Pro tier, no freemium, no hidden paywall. Anyone can fork it.',
        },
        {
          q: 'Is my data safe?',
          a: 'It lives on your machine in a local SQLite database. Optional AES-256-GCM encryption over the full database. No cloud, no server, no telemetry.',
        },
        {
          q: 'Does it work offline?',
          a: 'Yes. You only need internet to download the app and, if you want, to receive auto-updates. Everything else is offline.',
        },
        {
          q: 'What is Ollama, and do I need it?',
          a: 'It is a local AI engine that runs on your machine. It is completely optional: the app works without it. If you install it, the AI copilot turns on and never sends anything to the cloud.',
        },
        {
          q: 'Is it available for Mac and Linux?',
          a: 'Windows is stable today (installer and portable). Mac (.dmg) and Linux (AppImage / .deb) are available on the releases page, with fuller official support in upcoming versions.',
        },
        {
          q: 'Can I create my own plugins?',
          a: 'Yes. There is a scaffolding CLI (npm run create-plugin -- my-plugin) and complete CoreAPI documentation. Each plugin is a TypeScript module with a manifest, events, repository, and UI.',
        },
      ],
    },
    footer: {
      line1: 'Built with conviction.',
      accent: 'Local-first.',
      line2: 'No telemetry. No VC money.',
      body: 'A tool that lives where your things should live: on your machine.',
      by: 'by',
    },
  },
  pt: {
    locale: 'pt-BR',
    meta: {
      title: 'Nora OS - Copiloto local para organizar sua vida',
      description:
        'Nora OS conecta trabalho, saúde, hábitos e finanças em um app local-first, privado e extensível.',
    },
    common: {
      skipContent: 'Ir para o conteúdo',
      github: 'GitHub',
      downloadFor: 'Baixar para {os}',
      loadingLatest: 'Carregando última versão',
      yourSystem: 'seu sistema',
      switchToDark: 'Mudar para tema escuro',
      switchToLight: 'Mudar para tema claro',
    },
    language: {
      label: 'Idioma',
      aria: 'Alterar idioma',
    },
    nav: {
      homeAria: 'Nora OS, início',
      repoAria: 'Repositório no GitHub',
      releaseAria: 'Versão {version}',
      openMenu: 'Abrir menu',
      closeMenu: 'Fechar menu',
      mobileLabel: 'Menu móvel',
      links: [
        { href: '#features', label: 'Para você' },
        { href: '#how-it-works', label: 'Como funciona' },
        { href: '#plugins', label: 'Plugins' },
        { href: '#copilot-demo', label: 'Copiloto' },
        { href: '#faq', label: 'FAQ' },
      ],
    },
    hero: {
      badge: 'Copiloto local · Sem nuvem · Open source',
      titlePrefix: 'O copiloto que entende',
      titleAccent: 'a sua vida inteira.',
      mantra: 'Seu sistema · Sua vida · Uma só IA',
      description:
        'Nora OS conecta trabalho, saúde, hábitos e finanças para dizer o que fazer hoje sem enviar seus dados para nenhum servidor.',
      githubCta: 'Ver no GitHub',
      proof: ['Sem conta obrigatória', 'Criptografia AES-256-GCM', '100% local · Licença ISC'],
      copilotLine:
        'Hoje você está 18% abaixo do seu foco semanal. Você tem 2 tarefas que vencem hoje.',
      floatingLabels: ['Produtividade', 'Hábitos', 'Finanças', 'Tempo', 'Conhecimento', 'Copiloto IA'],
      mockupTitle: 'nora-os · daily brief',
      mockupTime: 'Hoje · 09:14',
      mockupSidebar: ['Daily', 'Work', 'Hábitos', 'Fitness', 'Finanças', 'Knowledge'],
      copilotNow: 'Copiloto · agora',
      stats: [
        { k: 'Foco', v: '2h 40m', sub: 'meta 4h' },
        { k: 'Hábitos', v: '4/6', sub: 'sequência ativa' },
        { k: 'Finanças', v: '+12%', sub: 'acima do orçamento' },
        { k: 'Sono', v: '6h 10m', sub: 'meta 7h' },
      ],
      feelingEyebrow: 'Como Nora OS se sente',
      feelingLines: [
        'Você abre a Nora e tudo está ali.',
        'Sem logins. Sem sincronização. Sem espera.',
        'Seu trabalho em progresso, seus hábitos da semana, seu balanço do mês.',
        'Tudo seu. Só seu.',
      ],
    },
    features: {
      eyebrow: 'Para você',
      title: 'O que você percebe desde o primeiro dia',
      description:
        'Sem checklist técnico. Benefícios reais na sua rotina, sem abrir mão da privacidade.',
      cards: [
        {
          tag: 'Local-first',
          title: 'Seus dados nunca saem da sua máquina',
          description:
            'SQLite no seu disco. Sem nuvem, sem sincronização, sem telemetria. Nem nós conseguimos ver.',
        },
        {
          tag: 'Modular',
          title: 'Tudo o que você precisa, nada do que não precisa',
          description:
            'Ative só os módulos que usa e organize o dashboard arrastando widgets sem quebrar seu fluxo.',
        },
        {
          tag: 'Auto-update',
          title: 'Sempre atualizado, sem atrapalhar',
          description:
            'Releases no GitHub e instalação em um clique. Sem pop-ups irritantes nem interrupções no fluxo.',
        },
        {
          tag: 'Seguro',
          title: 'Privacidade real, não marketing',
          description:
            'Criptografia AES-256-GCM opcional sobre toda a base. Sua vida não é um ativo para vender.',
        },
        {
          tag: 'Multiusuário',
          title: 'Vários perfis, zero nuvem',
          description:
            'Cada usuário tem sua própria base criptografável. Sem contas online, tudo separado no disco.',
        },
        {
          tag: 'IA opcional',
          title: 'Um copiloto que não espiona',
          description:
            'Ollama roda no seu computador. O modelo conhece seu contexto sem enviar nada para OpenAI nem para a nuvem.',
        },
      ],
    },
    how: {
      eyebrow: 'Como funciona',
      title: 'Três passos. Dez segundos.',
      description:
        'Sem tutorial de 40 minutos. Sem onboarding eterno. Baixe, instale e comece a usar.',
      steps: [
        {
          number: '01',
          title: 'Baixe e instale',
          description: 'Sem contas. Sem servidores. Baixe o instalador e abra o app. Pronto.',
        },
        {
          number: '02',
          title: 'Ative o que precisa',
          description:
            'Escolha módulos de trabalho, hábitos, finanças, saúde e tempo. Só o que você vai usar.',
        },
        {
          number: '03',
          title: 'Sua vida organizada',
          description: 'Tudo em um lugar, com um copiloto IA opcional que vive na sua máquina.',
        },
      ],
    },
    plugins: {
      eyebrow: 'Plugins',
      title: 'Seu sistema, modular.',
      description:
        'Não é só um app. É uma plataforma para organizar sua vida: ative o que usa, ignore o resto.',
      cards: {
        work: {
          name: 'Work',
          domainLabel: 'Produtividade',
          description:
            'Kanban com prioridades, vencimentos, WIP limit e edição rápida com Enter. Focus Engine 2.0, notas e links com busca.',
        },
        fitness: {
          name: 'Fitness',
          domainLabel: 'Fitness',
          description:
            'Tracking diário de peso, refeições, exercícios e sono. Medidas corporais, resumos mensais e acompanhamento opcional para parar de fumar.',
        },
        finance: {
          name: 'Finanças',
          domainLabel: 'Finanças',
          description:
            'Contas, transações, transferências, orçamentos e recorrentes configuráveis. Insights IA opcionais em moeda local.',
        },
        habits: {
          name: 'Hábitos',
          domainLabel: 'Hábitos',
          description:
            'Hábitos diários, semanais e mensais com sequência, heatmap, detecção de risco e provedor IA com top streaks.',
        },
        journal: {
          name: 'Journal',
          domainLabel: 'Conhecimento',
          description:
            'Diário com prompts, mood, tags, busca e pin. Uma entrada por dia, undo ao apagar e foco em privacidade.',
        },
        knowledge: {
          name: 'Conhecimento',
          domainLabel: 'Conhecimento',
          description:
            'PKM leve: recursos, highlights e flashcards com algoritmo SM-2. Revisão espaçada para reter o que aprende.',
        },
        time: {
          name: 'Tempo',
          domainLabel: 'Tempo',
          description:
            'Cronômetro e timesheet com um único timer ativo, projetos com valor por hora e auto-entries de sessões Focus.',
        },
      },
      roadmapPrefix: 'Em breve:',
      roadmapItems: ['Goals & OKRs', 'Calendário externo (.ics, Google)'],
      roadmapLink: 'Ver roadmap completo',
    },
    copilot: {
      eyebrow: 'Copiloto IA local',
      title: 'Pergunte ao seu próprio app.',
      description:
        'Seu copiloto conhece trabalho, hábitos, saúde e finanças. Não é um chatbot genérico: opera sobre seus dados reais e nunca os envia.',
      headerTitle: 'Nora OS Copiloto',
      status: 'Local · Ollama detectado',
      demoLabel: 'Demo',
      initial: {
        body: 'Bom dia. Hoje você está em 71% do seu score semanal.',
        bullets: [
          'Foco: 2h 40m esta semana (meta: 4h)',
          'Exercício: 4 dias consecutivos, sequência ativa',
          'Finanças: 12% acima do orçamento',
        ],
        closing:
          'Para voltar ao baseline hoje:\n→ Concluir "Proposta cliente X" (vence hoje)\n→ 45 min de foco antes das 14h',
      },
      actions: [
        {
          label: 'No que focar?',
          reply: {
            body:
              'O mais urgente hoje é fechar a proposta do cliente X. Vence em 6 horas e bloqueia seu KR de Q2.',
            bullets: ['1 tarefa crítica · 2 importantes · 5 menores', 'Bloco sugerido: 90 min de foco profundo'],
            closing: 'Comece pela proposta. As menores ficam para depois das 17h.',
          },
        },
        {
          label: 'Organize meu dia',
          reply: {
            body: 'Plano montado com base na sua energia habitual e nos vencimentos:',
            bullets: [
              '09:00 - 10:30 · Foco profundo · Proposta cliente X',
              '10:30 - 11:00 · Pausa + triagem de e-mail',
              '11:00 - 12:30 · Code review + arquitetura',
              '13:00 - 14:00 · Almoço',
              '18:00 - 19:00 · Treino (dia 5 da sequência)',
            ],
          },
        },
        {
          label: 'O que estou deixando de lado?',
          reply: {
            body: 'Olhando os últimos 14 dias, três áreas estão em vermelho:',
            bullets: [
              'Knowledge: sem sessões de estudo há 8 dias',
              'Sono: média de 6h 10m (meta: 7h)',
              'Finance: gastos com delivery +34% vs mês passado',
            ],
            closing: 'Sugestão: 30 min de leitura hoje e dormir antes da meia-noite.',
          },
        },
        {
          label: 'Review rápido',
          reply: {
            body: 'Resumo da semana, direto:',
            bullets: [
              '12 tarefas concluídas (vs 9 de média)',
              'Sequência de hábitos: 4/6 mantidos',
              'Foco semanal: 67% da meta',
              'Goal Q2 "Lançar v2": 38%, você está atrasado',
            ],
            closing: 'Próxima semana: priorize 2 sessões de foco por dia para recuperar o Goal Q2.',
          },
        },
      ],
      badges: ['Requer Ollama', '100% offline', 'Sem API keys', 'Sem envio de dados'],
      privacyLine: 'Seus dados reais. Seu modelo local. Sem internet.',
    },
    screenshots: {
      eyebrow: 'Capturas',
      title: 'Pensado para uso diário.',
      description: 'Atalhos globais, command palette e temas dark/light cuidados em detalhe.',
      tabAria: 'Capturas do Nora OS',
      missing: 'Captura em breve',
      tabs: [
        {
          id: 'dashboard',
          label: 'Dashboard',
          src: 'screenshots/screenshot-dashboard.png',
          alt: 'Dashboard do Nora OS com Daily Score e missões',
          caption: 'Daily Score, missões do dia e resumo de hábitos em uma só vista.',
        },
        {
          id: 'copilot',
          label: 'Copiloto',
          src: 'screenshots/screenshot-copiloto.png',
          alt: 'Painel do copiloto IA local',
          caption:
            'Copiloto IA local. Respostas em linguagem natural sobre seus dados reais, sem enviar nada para a nuvem.',
        },
        {
          id: 'themes',
          label: 'Temas',
          src: 'screenshots/screenshot-temas.png',
          compareSrc: 'screenshots/screenshot-temas-light.png',
          alt: 'Tema escuro do Nora OS',
          compareAlt: 'Tema claro do Nora OS',
          caption: 'Galeria de temas: dark e light bem cuidados, com troca instantânea.',
        },
        {
          id: 'work',
          label: 'Work',
          src: 'screenshots/screenshot-work.png',
          alt: 'Plugin Work com kanban e Focus Engine',
          caption: 'Plugin Work: kanban com WIP limit e Focus Engine 2.0 com Pomodoro nativo.',
        },
      ],
    },
    devs: {
      eyebrow: 'Para devs',
      title: 'Uma plataforma, não um app fechado.',
      description:
        'Nora OS foi desenhado para ser estendido. Se você sabe TypeScript, pode adicionar um módulo novo em uma tarde.',
      cards: [
        {
          title: 'Plugin system',
          description:
            'Crie um plugin novo em 2 minutos com scaffolding. npm run create-plugin -- meu-plugin e pronto.',
          linkText: 'docs/PLUGIN_BASE_STRUCTURE',
        },
        {
          title: 'CoreAPI',
          description:
            'Acesso completo a storage, EventBus, gamificação, IA context e settings. Uma API estável, tipada e testada.',
          linkText: 'docs/PLUGIN_API',
        },
        {
          title: 'Open source',
          description:
            'MIT/ISC. Forkeável. Auditável. Contribuível. Sem vendor lock-in, sem dependências proprietárias.',
          linkText: 'github.com/na7hk3r/nora-os',
        },
      ],
      openDocs: 'Explorar documentação técnica completa',
      closeDocs: 'Ocultar documentação técnica',
    },
    docs: {
      eyebrow: 'Documentação',
      emptyTitle: 'Sem documentos disponíveis',
      emptyMessage: 'Nenhum arquivo encontrado em /docs.',
      title: 'Explore a documentação técnica',
      description: 'Arquitetura, plugins, autenticação e mais, direto do repositório.',
      searchLabel: 'Buscar na documentação',
      searchPlaceholder: 'Buscar...',
      navLabel: 'Documentos',
      noResults: 'Sem resultados.',
      github: 'Ver no GitHub',
    },
    download: {
      eyebrow: 'Baixar',
      titlePrefix: 'Baixe Nora OS.',
      titleAccent: 'É grátis.',
      intro: 'Sem contas. Sem assinaturas. Sem surpresas.',
      version: 'Versão',
      published: 'publicada em',
      loading: 'Carregando informações do último release...',
      error: 'Não conseguimos consultar o GitHub agora. Você pode ver todos os binários manualmente:',
      releaseLink: 'Abrir página de releases',
      table: { os: 'SO', type: 'Tipo', size: 'Tamanho', download: 'Baixar' },
      download: 'Baixar',
      unavailable: 'Indisponível',
      footerMeta: 'Open source · Licença ISC · Auto-update incluído · GitHub Releases',
      previousQuestion: 'Procurando versões anteriores?',
      history: 'Ver histórico de releases',
    },
    faq: {
      eyebrow: 'Perguntas frequentes',
      title: 'O que você vai se perguntar.',
      description: 'Respondemos às dúvidas reais, sem marketing vazio.',
      items: [
        {
          q: 'É realmente grátis?',
          a: 'Sim. Open source sob licença ISC. Sem tier Pro, sem freemium, sem paywall escondido. Quem quiser pode fazer fork.',
        },
        {
          q: 'Meus dados estão seguros?',
          a: 'Eles vivem na sua máquina, em uma base SQLite local. Criptografia AES-256-GCM opcional sobre toda a base. Sem nuvem, sem servidor, sem telemetria.',
        },
        {
          q: 'Funciona sem internet?',
          a: 'Sim. Você só precisa de internet para baixar o app e, se quiser, receber auto-updates. Todo o resto é offline.',
        },
        {
          q: 'O que é Ollama e preciso usar?',
          a: 'É um motor de IA local que roda na sua máquina. É totalmente opcional: o app funciona sem ele. Se instalar, o copiloto IA é ativado e nunca envia nada para a nuvem.',
        },
        {
          q: 'Está disponível para Mac e Linux?',
          a: 'Windows está estável hoje (instalador e portable). Mac (.dmg) e Linux (AppImage / .deb) estão na página de releases, com suporte oficial completo em próximas versões.',
        },
        {
          q: 'Posso criar meus próprios plugins?',
          a: 'Sim. Há um CLI de scaffolding (npm run create-plugin -- meu-plugin) e documentação completa da CoreAPI. Cada plugin é um módulo TypeScript com manifest, eventos, repo e UI.',
        },
      ],
    },
    footer: {
      line1: 'Feito com convicção.',
      accent: 'Local-first.',
      line2: 'Sem telemetria. Sem VC money.',
      body: 'Uma ferramenta que vive onde suas coisas devem viver: na sua máquina.',
      by: 'por',
    },
  },
} satisfies Record<LandingLanguage, LandingCopy>

interface I18nValue {
  language: LandingLanguage
  setLanguage: (language: LandingLanguage) => void
  t: LandingCopy
}

const STORAGE_KEY = 'nora-landing-language'
const defaultLanguage: LandingLanguage = 'es'

const fallbackValue: I18nValue = {
  language: defaultLanguage,
  setLanguage: () => {},
  t: copy[defaultLanguage],
}

const I18nContext = createContext<I18nValue>(fallbackValue)

function isLanguage(value: string | null | undefined): value is LandingLanguage {
  return languageOptions.some((option) => option.code === value)
}

function detectInitialLanguage(): LandingLanguage {
  if (typeof window === 'undefined') return defaultLanguage
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (isLanguage(stored)) return stored
  } catch {
    // localStorage may be unavailable in private or test environments.
  }

  const candidates = navigator.languages?.length ? navigator.languages : [navigator.language]
  for (const candidate of candidates) {
    const base = candidate.toLowerCase().split('-')[0]
    if (isLanguage(base)) return base
  }
  return defaultLanguage
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<LandingLanguage>(detectInitialLanguage)

  useEffect(() => {
    const option = languageOptions.find((entry) => entry.code === language)
    document.documentElement.lang = option?.htmlLang ?? language
    document.title = copy[language].meta.title
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    if (description) description.content = copy[language].meta.description
    try {
      window.localStorage.setItem(STORAGE_KEY, language)
    } catch {
      // Ignore persistence failures; the selector still works for the session.
    }
  }, [language])

  const value = useMemo<I18nValue>(
    () => ({
      language,
      setLanguage,
      t: copy[language],
    }),
    [language],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nValue {
  return useContext(I18nContext)
}

export interface FAQItem {
  question: string
  answer: string
}

export const faq: FAQItem[] = [
  {
    question: '¿Funciona sin instalar Ollama?',
    answer:
      'Sí. Ollama es completamente opcional. La app funciona al 100% sin IA. Si lo instalás, el copiloto se activa automáticamente.',
  },
  {
    question: '¿Qué tan difícil es empezar?',
    answer:
      'Instalás la app, elegís tus módulos y en 5 minutos tenés datos. No hay configuración compleja ni cuenta que crear.',
  },
  {
    question: '¿Puedo ver el código que maneja mis datos?',
    answer:
      'Todo el código es público en GitHub. Podés auditar exactamente cómo se almacena, cifra y procesa cada dato.',
  },
  {
    question: '¿Es gratis?',
    answer:
      'Sí. Nora OS es open source bajo licencia ISC y gratuito para uso personal. No hay tier "Pro", no hay paywall.',
  },
  {
    question: '¿Mis datos van a la nube?',
    answer:
      'Nunca. Toda tu información vive en tu disco local en una base SQLite cifrable. No hay servidor, no hay telemetría, no hay cuenta requerida.',
  },
  {
    question: '¿Cómo creo un plugin?',
    answer:
      'Cloná el repo, ejecutá npm run create-plugin -- mi-plugin y seguí la guía en docs/PLUGIN_BASE_STRUCTURE.md. Cada plugin es un módulo TypeScript con manifest, eventos, repositorio y UI.',
  },
  {
    question: '¿En qué sistemas operativos corre?',
    answer:
      'Windows 10/11 (instalador NSIS y versión portable), Linux (AppImage y .deb) y macOS (.dmg). Mismo código y mismos datos en todos.',
  },
  {
    question: '¿Cómo me entero de las actualizaciones?',
    answer:
      'La app revisa GitHub Releases al iniciar y cada 6 horas. Cuando hay una versión nueva ves un banner discreto y la instalás con un clic.',
  },
  {
    question: '¿Puedo usar IA sin enviar mis datos a OpenAI?',
    answer:
      'Sí. La integración con IA es opcional y usa Ollama corriendo en tu propia máquina. El modelo nunca sale de tu equipo.',
  },
  {
    question: '¿Es código abierto?',
    answer:
      'Sí. El código completo está en GitHub bajo licencia ISC. Podés auditar, forkear, contribuir o autoempaquetarlo.',
  },
  {
    question: '¿Necesito una cuenta para usarla?',
    answer:
      'No. Nora OS es 100% local y multiusuario por máquina (cada usuario del equipo tiene su propia base cifrable). No hay registro online.',
  },
]

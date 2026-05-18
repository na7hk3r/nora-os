/**
 * Diccionario centralizado de strings de UI.
 *
 * Tono operativo (rioplatense, profesional):
 *  - Voz en segunda persona ("vos", verbos en presente).
 *  - Sin emojis, sin signos de exclamación salvo error grave.
 *  - Frases ≤ 12 palabras siempre que sea posible.
 *  - Estado vacío = invitación. Error = causa + acción. Confirmación destructiva = consecuencia concreta.
 *  - "lo sentimos", "por favor", "ups", "oops" están prohibidos.
 *
 * Convenciones de claves: `dominio.contexto.tipo`.
 *
 * Para mensajes con interpolación, exportá una función pura. Nunca uses concat
 * de strings sueltos en componentes; siempre pasá por este módulo.
 */

export const messages = {
  // ─── Estados vacíos (invitación, no excusa) ──────────────────────────
  empty: {
    fitnessWeight: 'Sin registros de peso. Cargá el primero.',
    fitnessEntries: 'Sin entradas hoy. Registrá la primera.',
    workBoard: 'Tablero vacío. Creá una tarea para arrancar.',
    workNotes: 'Sin notas. Empezá una y guardala con Ctrl+S.',
    plugins: 'Activá un plugin desde Configuración.',
    suggestionsAllClear: 'Todo en orden.',
    notifications: 'Sin notificaciones.',
    activityFeed: 'Sin actividad reciente.',
    tags: 'Sin tags. Creá uno para organizar.',
    automations: 'Sin automatizaciones. Creá la primera.',
    templates: 'Sin plantillas. Creá una para reutilizar.',
    review: 'Cargá actividad durante la semana para tener review.',
    calendar: 'Sin eventos en el rango seleccionado.',
    planner: 'Día vacío. Sumá una tarea al planner.',
    financeAccounts: 'Sin cuentas. Creá una para arrancar.',
    financeTransactions: 'Sin movimientos en el período.',
    financeCategories: 'Sin categorías. Creá la primera.',
    financeRecurring: 'Sin gastos recurrentes configurados.',
    financeBudgets: 'Sin presupuestos. Definí límites por categoría.',
    financeInsights: 'Cargá movimientos durante el mes para tener insights.',
    habitsAll: 'Sin hábitos. Creá el primero para arrancar.',
    habitsHistory: 'Sin actividad en los últimos 30 días.',
    journalEntries: 'Sin entradas. Escribí la primera.',
    journalSearch: 'Sin resultados para esa búsqueda.',
    shortcuts: 'Sin atajos disponibles en este contexto.',
  },

  // ─── Errores (causa + acción) ────────────────────────────────────────
  errors: {
    tagCreate: 'Tag no creado. Revisá nombre y color.',
    tagDelete: 'Tag no eliminado. Reintentá.',
    tagInvalidColor: 'Color inválido. Usá formato #RRGGBB.',
    tagInvalidName: 'Nombre inválido. Usá 1 a 40 caracteres.',
    ollamaDisabled: 'Ollama desactivado. Activalo en Configuración → Ollama.',
    ollamaUnreachable: 'Ollama no responde. Verificá que esté corriendo.',
    ollamaNoModel: 'Sin modelo seleccionado. Elegí uno en Configuración.',
    backupPassphraseShort: 'Passphrase muy corta. Mínimo 8 caracteres.',
    backupRestoreFailed: 'Restauración fallida. El archivo puede estar corrupto o la passphrase ser incorrecta.',
    authInvalidCredentials: 'Usuario o contraseña incorrectos.',
    authUserExists: 'Ese usuario ya existe. Probá con otro.',
    authWeakPassword: 'Contraseña débil. Mínimo 8 caracteres.',
    authRecoveryAnswerWrong: 'Respuesta de recuperación incorrecta.',
    automationConditionInvalid: 'Condición inválida. Revisá la sintaxis.',
    pluginInitFailed: 'El plugin no inicializó. Revisá los logs.',
    sessionExpired: 'Sesión expirada. Volvé a entrar.',
    storageUnavailable: 'Almacenamiento no disponible. Reiniciá la app.',
    notificationDenied: 'Permiso de notificaciones denegado por el sistema.',
    generic: 'Algo salió mal. Reintentá en unos segundos.',
    diagnosticExportFailed: 'No se pudo exportar el diagnóstico.',
    financeAmountInvalid: 'Monto inválido. Usá un número mayor a 0.',
    financeAccountMissing: 'Elegí una cuenta para el movimiento.',
    financeAccountInUse: 'Cuenta con movimientos. Archivala en lugar de borrarla.',
    financeRrule: 'Frecuencia inválida. Revisá el formato.',
    habitNameInvalid: 'Nombre inválido. Usá 1 a 60 caracteres.',
    habitCreate: 'Hábito no creado. Reintentá.',
    journalEmpty: 'No se puede guardar una entrada vacía.',
    dbEncryptionUnavailable: 'Cifrado de base no disponible en este sistema.',
    dbEncryptionWeakPassphrase: 'Passphrase muy débil. Mínimo 12 caracteres y mezcla de tipos.',
  },

  // ─── Confirmaciones destructivas (consecuencia concreta) ─────────────
  confirm: {
    deleteCard: (title: string, count?: number) =>
      count && count > 0
        ? `Borrar "${title}" y sus ${count} subtareas. No se puede deshacer.`
        : `Borrar "${title}". No se puede deshacer.`,
    deleteTag: (name: string, usages: number) =>
      usages > 0
        ? `Borrar tag "${name}". Se va a quitar de ${usages} elementos.`
        : `Borrar tag "${name}".`,
    deleteNote: (title: string) => `Borrar nota "${title}". No se puede deshacer.`,
    deleteAutomation: (name: string) => `Borrar automatización "${name}". No se puede deshacer.`,
    deleteTemplate: (name: string) => `Borrar plantilla "${name}". No se puede deshacer.`,
    deleteHabit: (name: string) =>
      `Borrar hábito "${name}" y todos sus registros. No se puede deshacer.`,
    deleteJournalEntry: (date: string) =>
      `Borrar entrada del ${date}. No se puede deshacer.`,
    enableDbEncryption:
      'Activar cifrado en reposo. Vas a necesitar la passphrase cada vez que abras la app.',
    disableDbEncryption:
      'Quitar cifrado. La base queda en claro hasta el próximo cifrado.',
    restoreBackup: 'Restaurar reemplaza tu base actual. No se puede deshacer.',
    deactivatePlugin: (name: string) =>
      `Desactivar "${name}". Tus datos se conservan, pero el módulo no aparece más.`,
    logout: 'Cerrar sesión en este equipo.',
    deleteAccount: 'Borrar cuenta y todos los datos locales. No se puede deshacer.',
  },

  // ─── Éxito (silencioso si es esperado, claro si no) ──────────────────
  success: {
    focusCompleted: (minutes: number, xp: number) => `${minutes} min de foco. Sumaste ${xp} XP.`,
    backupSaved: (path: string) => `Backup guardado en ${path}.`,
    backupRestored: 'Restauración completa. Reiniciá la app para aplicar los cambios.',
    profileUpdated: 'Perfil actualizado.',
    settingsSaved: 'Preferencias guardadas.',
    tagCreated: 'Tag creado.',
    automationCreated: 'Automatización creada.',
    diagnosticExported: (path: string) => `Diagnóstico exportado en ${path}.`,
    undo: 'Acción deshecha.',
    financeTransactionCreated: 'Movimiento registrado.',
    financeTransactionDeleted: 'Movimiento borrado.',
    financeRecurringMaterialized: (count: number) =>
      count === 1 ? '1 movimiento recurrente generado.' : `${count} movimientos recurrentes generados.`,
    habitLogged: 'Hábito registrado.',
    habitGoalMet: (name: string) => `Meta cumplida: ${name}.`,
    journalEntrySaved: 'Entrada guardada.',
    journalEntryDeleted: 'Entrada borrada.',
    dbEncryptionEnabled: 'Cifrado activado. La passphrase se pide al abrir la app.',
    dbEncryptionDisabled: 'Cifrado desactivado.',
  },

  // ─── Loading (qué está pasando, no spinner mudo) ─────────────────────
  loading: {
    initializing: 'Inicializando Nora OS',
    initializingDetail: 'Cargando módulos, datos y preferencias',
    checkingSession: 'Verificando sesión',
    aiBrief: 'Generando brief con Ollama',
    aiReview: 'Generando review con Ollama',
    aiSuggestions: 'Buscando sugerencias',
    backup: 'Generando backup',
    restore: 'Restaurando base de datos',
    diagnostic: 'Recolectando diagnóstico',
  },

  // ─── Acciones / CTAs ─────────────────────────────────────────────────
  actions: {
    undo: 'Deshacer',
    cancel: 'Cancelar',
    confirm: 'Confirmar',
    delete: 'Borrar',
    save: 'Guardar',
    retry: 'Reintentar',
    continue: 'Continuar',
    back: 'Volver',
    close: 'Cerrar',
    open: 'Abrir',
    create: 'Crear',
    edit: 'Editar',
    exportDiagnostic: 'Exportar diagnóstico',
    restart: 'Reiniciar',
    enable: 'Activar',
    disable: 'Desactivar',
  },

  // ─── Sugerencias del sistema (system guidance) ───────────────────────
  guidance: {
    fitnessMissingDaily: 'Falta tu entrada de Fitness de hoy.',
    workOverdue: (count: number) =>
      count === 1 ? 'Tenés 1 tarea vencida en Work.' : `Tenés ${count} tareas vencidas en Work.`,
    fitnessNoWeight7d: 'No registraste peso esta semana.',
    workNoFocus24h: 'Sin sesiones de foco en 24h.',
    streakAtRisk: (days: number) => `Tu racha de ${days} días está en riesgo. Cargá algo hoy.`,
    dailyBriefHeading: 'Brief de hoy',
    dailyBriefDismiss: 'Listo, no me lo muestres más hoy.',
    focusNudgeHeading: 'Tenés tarjetas listas para arrancar',
    focusNudgeStart: 'Empezar foco',
    focusNudgeDismiss: 'Más tarde',
  },

  // ─── Onboarding ──────────────────────────────────────────────────────
  onboarding: {
    welcomeKicker: 'Bienvenida a',
    welcomeTagline: 'Tu sistema operativo personal. Local-first, sin telemetría.',
    nameHeading: '¿Cómo te llamás?',
    nameHelp: 'Te saludo así cada vez que entrás.',
    pluginsHeading: '¿Qué módulos querés activar?',
    pluginsHelp: 'Podés cambiar esto después en Configuración.',
    fitnessHeading: 'Configurá tu módulo de salud',
    fitnessHelp: 'Para personalizar lo que ves al arrancar.',
    firstActionHeading: 'Hagamos algo concreto',
    firstActionHelp: 'Una acción real para que la app deje de estar vacía.',
    summaryHeading: (name: string) => `Listo, ${name}.`,
    summaryHelp: 'Podés cambiar todo desde Configuración.',
    finish: 'Entrar al sistema',
  },

  // ─── Auth ────────────────────────────────────────────────────────────
  auth: {
    loginHeading: 'Entrá a tu sistema',
    registerHeading: 'Creá tu cuenta local',
    logoutConfirm: 'Cerrar sesión en este equipo.',
    recoveryQuestionRequired: 'Definí una pregunta de recuperación.',
  },
} as const

/**
 * Helper genérico: registra strings ad-hoc usados en un solo lugar pero que
 * pasaron por revisión de tono. Si crece, mové a una sección con clave estable.
 */
type WidenMessageShape<T> = T extends (...args: infer Args) => infer Return
  ? (...args: Args) => Return
  : T extends string
    ? string
    : T extends object
      ? { [Key in keyof T]: WidenMessageShape<T[Key]> }
      : T

export type Messages = WidenMessageShape<typeof messages>

import { messages as esMessages, type Messages } from '@core/ui/messages'

export type AppLanguage = 'es' | 'en'

export interface AppCopy {
  locale: string
  htmlLang: string
  language: {
    label: string
    aria: string
    es: string
    en: string
  }
  common: {
    appName: string
    cancel: string
    close: string
    save: string
    saving: string
    saved: string
    delete: string
    edit: string
    open: string
    active: string
    inactive: string
    error: string
    loading: string
    today: string
    total: string
    all: string
    none: string
    pending: string
    completed: string
    settings: string
    search: string
    back: string
  }
  messages: Messages
  routes: Record<string, string>
  sidebar: {
    aria: string
    main: string
    modules: string
    tools: string
    expand: string
    collapse: string
    lockOrder: string
    unlockOrder: string
    showPages: (name: string) => string
    hidePages: (name: string) => string
    dragToReorder: string
    config: string
    logout: string
    shortcuts: string
    streak: (days: number) => string
    progressTitle: (level: number, points: number) => string
  }
  shell: {
    skipToContent: string
    goBack: string
    goBackAria: string
  }
  workspace: {
    unavailableTitle: string
    unavailableDescription: (path: string) => string
    leftPane: string
    rightPane: string
    closeDual: string
    resizeDual: string
    currentView: string
    unavailable: string
    paneLabel: (side: 'primary' | 'secondary') => string
  }
  commandPalette: {
    aria: string
    placeholder: string
    searchAria: string
    close: string
    closeTip: string
    results: string
    emptyTitle: string
    emptyHint: string
    hintPrefix: string
    footerNavigate: string
    footerOpen: string
    footerOpenBeside: string
    footerClose: string
    resultCount: (count: number) => string
    kinds: Record<'note' | 'link' | 'card' | 'planner' | 'tag' | 'nav' | 'action', string>
    actions: {
      openDual: string
      openDualSubtitle: string
      closeDual: string
      closeDualSubtitle: string
      activatePrimary: string
      activatePrimarySubtitle: string
      activateSecondary: string
      activateSecondarySubtitle: string
    }
    tagConnections: (count: number) => string
  }
  dashboard: {
    recentActivity: string
    fullHistory: string
    viewModule: string
    expandModule: string
    collapseModule: string
    restoreModule: string
    noActiveModulesTitle: string
    noActiveModulesBody: string
    goToSettings: string
    pluginTip: string
    progressMovedPrefix: string
    progressMovedLink: string
    progressMovedSuffix: string
    closeNotice: string
    restoreSize: (title: string) => string
    expandTile: (title: string) => string
    collapseTile: (title: string) => string
    moveTile: (title: string) => string
  }
  auth: {
    titleLogin: string
    titleRegister: string
    titleRecovery: string
    tagline: string
    loginTab: string
    registerTab: string
    recoveryTab: string
    rememberedUsers: string
    forgetAll: string
    rememberedUser: string
    useUser: (username: string) => string
    forgetUser: (username: string) => string
    forgetUserTitle: string
    username: string
    password: string
    passwordMin: string
    recoveryQuestion: string
    recoveryAnswer: string
    recoveryAnswerPrivate: string
    newPassword: string
    rememberUser: string
    entering: string
    enter: string
    creating: string
    createAccount: string
    searching: string
    viewSecretQuestion: string
    updating: string
    updatePassword: string
    userNotFound: string
    passwordUpdated: string
    showPassword: string
    hidePassword: string
  }
  control: {
    eyebrow: string
    title: string
    description: string
    monitoring: string
    nav: Record<string, string>
    unsavedSections: (count: number) => string
    kpis: {
      activeModules: string
      registered: (count: number) => string
      dashboardWidgets: string
      connectedReady: string
    }
    profile: {
      title: string
      description: string
    }
    appearance: {
      title: string
      description: string
      summary: (theme: string) => string
      languageTitle: string
      languageHelp: string
      sidebarCollapsed: string
      sidebarCollapsedHelp: string
      themeTitle: string
      themeGallery: (count: number) => string
      savePreferences: string
      unsaved: string
    }
    plugins: {
      title: string
      description: string
      summary: (selected: number, total: number) => string
      openModule: string
      saving: string
      saveModules: string
      howAddTitle: string
      howAddBody: string
      saved: string
      failedSave: string
      failedActivate: (names: string) => string
    }
    leaveGuard: {
      title: string
      body: string
      stay: string
      discard: string
      saveAll: string
    }
  }
  plugins: {
    meta: Record<string, { name: string; description: string }>
    widgets: Record<string, string>
    pages: Record<string, string>
    nav: Record<string, string>
  }
  gamification: {
    stages: Record<string, { title: string; description: string }>
    rewards: Record<string, { title: string; description: string }>
    achievements: Record<string, { title: string; description: string }>
    missions: Record<string, { title: string; description: string }>
    progressLabels: Record<string, string>
  }
  shortcuts: {
    groups: Record<string, string>
    actions: Record<string, string>
    descriptions: Record<string, string>
    scopes: Record<string, string>
  }
  planner: {
    categories: Record<string, string>
    complexity: Record<string, string>
  }
  staticText: Record<string, string>
}

const enMessages: Messages = {
  empty: {
    fitnessWeight: 'No weight records yet. Add the first one.',
    fitnessEntries: 'No entries today. Add the first one.',
    workBoard: 'Empty board. Create a task to get started.',
    workNotes: 'No notes yet. Start one and save it with Ctrl+S.',
    plugins: 'Enable a plugin from Settings.',
    suggestionsAllClear: 'Everything is in order.',
    notifications: 'No notifications.',
    activityFeed: 'No recent activity.',
    tags: 'No tags. Create one to organize things.',
    automations: 'No automations. Create the first one.',
    templates: 'No templates. Create one to reuse.',
    review: 'Add activity during the week to get a review.',
    calendar: 'No events in the selected range.',
    planner: 'Empty day. Add a task to the planner.',
    financeAccounts: 'No accounts. Create one to get started.',
    financeTransactions: 'No transactions in this period.',
    financeCategories: 'No categories. Create the first one.',
    financeRecurring: 'No recurring expenses configured.',
    financeBudgets: 'No budgets. Define category limits.',
    financeInsights: 'Add transactions during the month to get insights.',
    habitsAll: 'No habits. Create the first one to get started.',
    habitsHistory: 'No activity in the last 30 days.',
    journalEntries: 'No entries yet. Write the first one.',
    journalSearch: 'No results for that search.',
    shortcuts: 'No shortcuts available in this context.',
  },
  errors: {
    tagCreate: 'Tag not created. Check name and color.',
    tagDelete: 'Tag not deleted. Try again.',
    tagInvalidColor: 'Invalid color. Use #RRGGBB format.',
    tagInvalidName: 'Invalid name. Use 1 to 40 characters.',
    ollamaDisabled: 'Ollama is disabled. Enable it in Settings -> Ollama.',
    ollamaUnreachable: 'Ollama is not responding. Check that it is running.',
    ollamaNoModel: 'No model selected. Choose one in Settings.',
    backupPassphraseShort: 'Passphrase is too short. Minimum 8 characters.',
    backupRestoreFailed: 'Restore failed. The file may be corrupted or the passphrase incorrect.',
    authInvalidCredentials: 'Incorrect username or password.',
    authUserExists: 'That user already exists. Try another one.',
    authWeakPassword: 'Weak password. Minimum 8 characters.',
    authRecoveryAnswerWrong: 'Incorrect recovery answer.',
    automationConditionInvalid: 'Invalid condition. Check the syntax.',
    pluginInitFailed: 'The plugin did not initialize. Check the logs.',
    sessionExpired: 'Session expired. Sign in again.',
    storageUnavailable: 'Storage unavailable. Restart the app.',
    notificationDenied: 'Notifications permission was denied by the system.',
    generic: 'Something went wrong. Try again in a few seconds.',
    diagnosticExportFailed: 'Could not export diagnostics.',
    financeAmountInvalid: 'Invalid amount. Use a number greater than 0.',
    financeAccountMissing: 'Choose an account for the transaction.',
    financeAccountInUse: 'Account has transactions. Archive it instead of deleting it.',
    financeRrule: 'Invalid frequency. Check the format.',
    habitNameInvalid: 'Invalid name. Use 1 to 60 characters.',
    habitCreate: 'Habit not created. Try again.',
    journalEmpty: 'Cannot save an empty entry.',
    dbEncryptionUnavailable: 'Database encryption is unavailable on this system.',
    dbEncryptionWeakPassphrase: 'Passphrase is too weak. Minimum 12 characters and mixed character types.',
  },
  confirm: {
    deleteCard: (title, count) =>
      count && count > 0
        ? `Delete "${title}" and its ${count} subtasks. This cannot be undone.`
        : `Delete "${title}". This cannot be undone.`,
    deleteTag: (name, usages) =>
      usages > 0
        ? `Delete tag "${name}". It will be removed from ${usages} items.`
        : `Delete tag "${name}".`,
    deleteNote: (title) => `Delete note "${title}". This cannot be undone.`,
    deleteAutomation: (name) => `Delete automation "${name}". This cannot be undone.`,
    deleteTemplate: (name) => `Delete template "${name}". This cannot be undone.`,
    deleteHabit: (name) => `Delete habit "${name}" and all its records. This cannot be undone.`,
    deleteJournalEntry: (date) => `Delete entry from ${date}. This cannot be undone.`,
    enableDbEncryption:
      'Enable encryption at rest. You will need the passphrase every time you open the app.',
    disableDbEncryption: 'Remove encryption. The database stays clear until the next encryption.',
    restoreBackup: 'Restore replaces your current database. This cannot be undone.',
    deactivatePlugin: (name) =>
      `Deactivate "${name}". Your data is kept, but the module will no longer appear.`,
    logout: 'Sign out on this device.',
    deleteAccount: 'Delete account and all local data. This cannot be undone.',
  },
  success: {
    focusCompleted: (minutes, xp) => `${minutes} min of focus. You earned ${xp} XP.`,
    backupSaved: (path) => `Backup saved to ${path}.`,
    backupRestored: 'Restore complete. Restart the app to apply the changes.',
    profileUpdated: 'Profile updated.',
    settingsSaved: 'Preferences saved.',
    tagCreated: 'Tag created.',
    automationCreated: 'Automation created.',
    diagnosticExported: (path) => `Diagnostics exported to ${path}.`,
    undo: 'Action undone.',
    financeTransactionCreated: 'Transaction recorded.',
    financeTransactionDeleted: 'Transaction deleted.',
    financeRecurringMaterialized: (count) =>
      count === 1 ? '1 recurring transaction generated.' : `${count} recurring transactions generated.`,
    habitLogged: 'Habit recorded.',
    habitGoalMet: (name) => `Goal met: ${name}.`,
    journalEntrySaved: 'Entry saved.',
    journalEntryDeleted: 'Entry deleted.',
    dbEncryptionEnabled: 'Encryption enabled. The passphrase is required when opening the app.',
    dbEncryptionDisabled: 'Encryption disabled.',
  },
  loading: {
    initializing: 'Initializing Nora OS',
    initializingDetail: 'Loading modules, data, and preferences',
    checkingSession: 'Checking session',
    aiBrief: 'Generating brief with Ollama',
    aiReview: 'Generating review with Ollama',
    aiSuggestions: 'Looking for suggestions',
    backup: 'Generating backup',
    restore: 'Restoring database',
    diagnostic: 'Collecting diagnostics',
  },
  actions: {
    undo: 'Undo',
    cancel: 'Cancel',
    confirm: 'Confirm',
    delete: 'Delete',
    save: 'Save',
    retry: 'Retry',
    continue: 'Continue',
    back: 'Back',
    close: 'Close',
    open: 'Open',
    create: 'Create',
    edit: 'Edit',
    exportDiagnostic: 'Export diagnostics',
    restart: 'Restart',
    enable: 'Enable',
    disable: 'Disable',
  },
  guidance: {
    fitnessMissingDaily: 'Your Fitness entry for today is missing.',
    workOverdue: (count) =>
      count === 1 ? 'You have 1 overdue Work task.' : `You have ${count} overdue Work tasks.`,
    fitnessNoWeight7d: 'You have not recorded weight this week.',
    workNoFocus24h: 'No focus sessions in 24h.',
    streakAtRisk: (days) => `Your ${days}-day streak is at risk. Add something today.`,
    dailyBriefHeading: 'Today brief',
    dailyBriefDismiss: 'Done, do not show this again today.',
    focusNudgeHeading: 'You have cards ready to start',
    focusNudgeStart: 'Start focus',
    focusNudgeDismiss: 'Later',
  },
  onboarding: {
    welcomeKicker: 'Welcome to',
    welcomeTagline: 'Your personal operating system. Local-first, no telemetry.',
    nameHeading: 'What is your name?',
    nameHelp: 'I will greet you like this every time you enter.',
    pluginsHeading: 'Which modules do you want to enable?',
    pluginsHelp: 'You can change this later in Settings.',
    fitnessHeading: 'Configure your health module',
    fitnessHelp: 'To personalize what you see when you start.',
    firstActionHeading: 'Let us do something concrete',
    firstActionHelp: 'A real action so the app stops feeling empty.',
    summaryHeading: (name) => `Ready, ${name}.`,
    summaryHelp: 'You can change everything from Settings.',
    finish: 'Enter the system',
  },
  auth: {
    loginHeading: 'Enter your system',
    registerHeading: 'Create your local account',
    logoutConfirm: 'Sign out on this device.',
    recoveryQuestionRequired: 'Define a recovery question.',
  },
}

export const copy: Record<AppLanguage, AppCopy> = {
  es: {
    locale: 'es-UY',
    htmlLang: 'es',
    language: {
      label: 'Idioma',
      aria: 'Cambiar idioma',
      es: 'Español',
      en: 'Inglés',
    },
    common: {
      appName: 'Nora OS',
      cancel: 'Cancelar',
      close: 'Cerrar',
      save: 'Guardar',
      saving: 'Guardando...',
      saved: 'Guardado',
      delete: 'Borrar',
      edit: 'Editar',
      open: 'Abrir',
      active: 'activo',
      inactive: 'inactivo',
      error: 'error',
      loading: 'Cargando...',
      today: 'Hoy',
      total: 'total',
      all: 'Todos',
      none: 'Ninguno',
      pending: 'Pendientes',
      completed: 'Completadas',
      settings: 'Configuración',
      search: 'Buscar',
      back: 'Volver',
    },
    messages: esMessages,
    routes: {
      'core-dashboard': 'Dashboard',
      'core-control': 'Configuración',
      'core-notes': 'Notas',
      'core-links': 'Enlaces',
      'core-planner': 'Planner',
      'core-calendar': 'Calendario',
      'core-review': 'Progreso',
      'core-shortcuts': 'Atajos de teclado',
      'core-themes': 'Temas',
      'core-profile': 'Perfil',
    },
    sidebar: {
      aria: 'Navegación principal',
      main: 'Principal',
      modules: 'Módulos',
      tools: 'Herramientas',
      expand: 'Expandir barra lateral',
      collapse: 'Colapsar barra lateral',
      lockOrder: 'Bloquear reordenamiento',
      unlockOrder: 'Desbloquear reordenamiento',
      showPages: (name) => `Mostrar páginas de ${name}`,
      hidePages: (name) => `Ocultar páginas de ${name}`,
      dragToReorder: 'Arrastrar para reordenar',
      config: 'Config',
      logout: 'Cerrar sesión',
      shortcuts: 'Atajos',
      streak: (days) => `Racha de ${days} días`,
      progressTitle: (level, points) => `Pulso Nora - Nori nivel ${level} - ${points} XP - Ver progreso completo`,
    },
    shell: {
      skipToContent: 'Saltar al contenido principal',
      goBack: 'Volver',
      goBackAria: 'Volver atrás',
    },
    workspace: {
      unavailableTitle: 'Vista no disponible',
      unavailableDescription: (path) => `La ruta ${path} no está registrada o pertenece a un módulo desactivado.`,
      leftPane: 'Izquierda',
      rightPane: 'Derecha',
      closeDual: 'Cerrar vista dual',
      resizeDual: 'Redimensionar vista dual',
      currentView: 'Vista actual',
      unavailable: 'No disponible',
      paneLabel: (side) => `Panel ${side === 'primary' ? 'izquierdo' : 'derecho'}`,
    },
    commandPalette: {
      aria: 'Búsqueda global',
      placeholder: 'Buscar notas, tareas, enlaces, navegación o #tag...',
      searchAria: 'Buscar comandos',
      close: 'Cerrar búsqueda',
      closeTip: 'Cerrar (Esc)',
      results: 'Resultados',
      emptyTitle: 'Nada por ahora',
      emptyHint: 'Probá con una nota, tarea, enlace, sección o #tag.',
      hintPrefix: 'Tip: podés buscar todo con',
      footerNavigate: 'navegar',
      footerOpen: 'abrir',
      footerOpenBeside: 'al lado',
      footerClose: 'cerrar',
      resultCount: (count) => `${count} resultados`,
      kinds: {
        note: 'nota',
        link: 'enlace',
        card: 'tarea',
        planner: 'planner',
        tag: 'tag',
        nav: 'nav',
        action: 'acción',
      },
      actions: {
        openDual: 'Abrir vista dual',
        openDualSubtitle: 'Mostrar dos vistas en simultáneo',
        closeDual: 'Cerrar vista dual',
        closeDualSubtitle: 'Volver a una sola vista',
        activatePrimary: 'Activar panel izquierdo',
        activatePrimarySubtitle: 'La navegación abre en la izquierda',
        activateSecondary: 'Activar panel derecho',
        activateSecondarySubtitle: 'La navegación abre en la derecha',
      },
      tagConnections: (count) => `${count} ${count === 1 ? 'conexión' : 'conexiones'} globales`,
    },
    dashboard: {
      recentActivity: 'Actividad reciente',
      fullHistory: 'Ver historial completo ->',
      viewModule: 'Ver módulo',
      expandModule: 'Expandir módulo',
      collapseModule: 'Colapsar módulo',
      restoreModule: 'Restaurar módulo',
      noActiveModulesTitle: 'Sin módulos activos',
      noActiveModulesBody: 'Activa al menos un plugin para ver contenido en el dashboard',
      goToSettings: 'Ir a Configuración',
      pluginTip: 'Tip: activar un plugin agrega widgets, páginas y navegación automáticamente.',
      progressMovedPrefix: 'Tu progreso global ahora vive en',
      progressMovedLink: 'Progreso',
      progressMovedSuffix: '. El Dashboard se enfoca en lo que tenés que hacer hoy.',
      closeNotice: 'Cerrar aviso',
      restoreSize: (title) => `Restaurar tamaño de ${title}`,
      expandTile: (title) => `Expandir ${title}`,
      collapseTile: (title) => `Colapsar ${title}`,
      moveTile: (title) => `Mover ${title}`,
    },
    auth: {
      titleLogin: 'Iniciar sesión',
      titleRegister: 'Crear cuenta',
      titleRecovery: 'Recuperar acceso',
      tagline: 'Tu sistema. Tu vida. Una sola IA.',
      loginTab: 'Login',
      registerTab: 'Registro',
      recoveryTab: 'Recuperar',
      rememberedUsers: 'Usuarios recordados',
      forgetAll: 'Olvidar todos',
      rememberedUser: 'Usuario recordado',
      useUser: (username) => `Usar usuario ${username}`,
      forgetUser: (username) => `Olvidar usuario ${username}`,
      forgetUserTitle: 'Olvidar usuario',
      username: 'Usuario',
      password: 'Contraseña',
      passwordMin: 'Contraseña (min 8 caracteres)',
      recoveryQuestion: 'Pregunta de recuperación (min 10 caracteres)',
      recoveryAnswer: 'Respuesta',
      recoveryAnswerPrivate: 'Respuesta (será privada y sensible a mayúsculas)',
      newPassword: 'Nueva contraseña (min 8 caracteres)',
      rememberUser: 'Recordar usuario en este equipo',
      entering: 'Ingresando...',
      enter: 'Entrar',
      creating: 'Creando...',
      createAccount: 'Crear cuenta',
      searching: 'Buscando...',
      viewSecretQuestion: 'Ver pregunta secreta',
      updating: 'Actualizando...',
      updatePassword: 'Actualizar contraseña',
      userNotFound: 'Usuario no encontrado.',
      passwordUpdated: 'Contraseña actualizada. Iniciá sesión con tu nueva contraseña.',
      showPassword: 'Mostrar contraseña',
      hidePassword: 'Ocultar contraseña',
    },
    control: {
      eyebrow: 'Configuración',
      title: 'Gobernanza de Nora OS',
      description: 'Administra identidad, preferencias, módulos y salud general de la plataforma desde un único panel.',
      monitoring: 'Monitoreo operativo activo en tiempo real',
      nav: {
        profile: 'Cuenta',
        preferences: 'Apariencia',
        pluginManager: 'Módulos',
        organization: 'Organización',
        aiNotifications: 'IA y avisos',
        securityBackups: 'Backups',
        automations: 'Automatizaciones',
        audit: 'Salud',
      },
      unsavedSections: (count) => `${count} ${count === 1 ? 'sección' : 'secciones'} sin guardar`,
      kpis: {
        activeModules: 'Módulos activos',
        registered: (count) => `de ${count} registrados`,
        dashboardWidgets: 'Widgets en dashboard',
        connectedReady: 'conectados y listos',
      },
      profile: {
        title: 'Cuenta',
        description: 'Identidad local y datos base de perfil.',
      },
      appearance: {
        title: 'Apariencia',
        description: 'Tema visual, idioma y comportamiento de navegación.',
        summary: (theme) => `Tema: ${theme || 'default'}`,
        languageTitle: 'Idioma',
        languageHelp: 'Se aplica inmediatamente y queda guardado en este equipo.',
        sidebarCollapsed: 'Sidebar colapsado por defecto',
        sidebarCollapsedHelp: 'También podés alternarlo desde el botón lateral.',
        themeTitle: 'Tema',
        themeGallery: (count) => `Ver los ${count} temas con previsualización en vivo ->`,
        savePreferences: 'Guardar preferencias',
        unsaved: 'Cambios sin guardar',
      },
      plugins: {
        title: 'Módulos',
        description: 'Activa o desactiva plugins; los cambios se aplican al guardar.',
        summary: (selected, total) => `${selected} de ${total} seleccionados`,
        openModule: 'Abrir módulo',
        saving: 'Guardando...',
        saveModules: 'Guardar módulos',
        howAddTitle: 'Cómo agregar nuevos plugins?',
        howAddBody: 'En esta versión, los plugins se incluyen en el build y se activan/desactivan sin fricción desde aquí.',
        saved: 'Módulos guardados correctamente.',
        failedSave: 'No se pudieron guardar los módulos.',
        failedActivate: (names) => `No se pudieron activar: ${names}.`,
      },
      leaveGuard: {
        title: 'Hay cambios sin guardar',
        body: 'Estas secciones tienen cambios locales. Nada se aplicó todavía.',
        stay: 'Quedarme',
        discard: 'Descartar y salir',
        saveAll: 'Guardar todo y salir',
      },
    },
    plugins: {
      meta: {},
      widgets: {},
      pages: {},
      nav: {},
    },
    gamification: {
      stages: {},
      rewards: {},
      achievements: {},
      missions: {},
      progressLabels: {},
    },
    shortcuts: {
      groups: {},
      actions: {},
      descriptions: {},
      scopes: {},
    },
    planner: {
      categories: {},
      complexity: {},
    },
    staticText: {},
  },
  en: {
    locale: 'en-US',
    htmlLang: 'en',
    language: {
      label: 'Language',
      aria: 'Change language',
      es: 'Spanish',
      en: 'English',
    },
    common: {
      appName: 'Nora OS',
      cancel: 'Cancel',
      close: 'Close',
      save: 'Save',
      saving: 'Saving...',
      saved: 'Saved',
      delete: 'Delete',
      edit: 'Edit',
      open: 'Open',
      active: 'active',
      inactive: 'inactive',
      error: 'error',
      loading: 'Loading...',
      today: 'Today',
      total: 'total',
      all: 'All',
      none: 'None',
      pending: 'Pending',
      completed: 'Completed',
      settings: 'Settings',
      search: 'Search',
      back: 'Back',
    },
    messages: enMessages,
    routes: {
      'core-dashboard': 'Dashboard',
      'core-control': 'Settings',
      'core-notes': 'Notes',
      'core-links': 'Links',
      'core-planner': 'Planner',
      'core-calendar': 'Calendar',
      'core-review': 'Progress',
      'core-shortcuts': 'Keyboard shortcuts',
      'core-themes': 'Themes',
      'core-profile': 'Profile',
    },
    sidebar: {
      aria: 'Main navigation',
      main: 'Main',
      modules: 'Modules',
      tools: 'Tools',
      expand: 'Expand sidebar',
      collapse: 'Collapse sidebar',
      lockOrder: 'Lock reordering',
      unlockOrder: 'Unlock reordering',
      showPages: (name) => `Show ${name} pages`,
      hidePages: (name) => `Hide ${name} pages`,
      dragToReorder: 'Drag to reorder',
      config: 'Settings',
      logout: 'Sign out',
      shortcuts: 'Shortcuts',
      streak: (days) => `${days}-day streak`,
      progressTitle: (level, points) => `Pulso Nora - Nori level ${level} - ${points} XP - View full progress`,
    },
    shell: {
      skipToContent: 'Skip to main content',
      goBack: 'Back',
      goBackAria: 'Go back',
    },
    workspace: {
      unavailableTitle: 'View unavailable',
      unavailableDescription: (path) => `Route ${path} is not registered or belongs to a disabled module.`,
      leftPane: 'Left',
      rightPane: 'Right',
      closeDual: 'Close dual view',
      resizeDual: 'Resize dual view',
      currentView: 'Current view',
      unavailable: 'Unavailable',
      paneLabel: (side) => `${side === 'primary' ? 'Left' : 'Right'} panel`,
    },
    commandPalette: {
      aria: 'Global search',
      placeholder: 'Search notes, tasks, links, navigation, or #tag...',
      searchAria: 'Search commands',
      close: 'Close search',
      closeTip: 'Close (Esc)',
      results: 'Results',
      emptyTitle: 'Nothing yet',
      emptyHint: 'Try a note, task, link, section, or #tag.',
      hintPrefix: 'Tip: search everything with',
      footerNavigate: 'navigate',
      footerOpen: 'open',
      footerOpenBeside: 'beside',
      footerClose: 'close',
      resultCount: (count) => `${count} result${count === 1 ? '' : 's'}`,
      kinds: {
        note: 'note',
        link: 'link',
        card: 'task',
        planner: 'planner',
        tag: 'tag',
        nav: 'nav',
        action: 'action',
      },
      actions: {
        openDual: 'Open dual view',
        openDualSubtitle: 'Show two views at once',
        closeDual: 'Close dual view',
        closeDualSubtitle: 'Return to one view',
        activatePrimary: 'Activate left panel',
        activatePrimarySubtitle: 'Navigation opens on the left',
        activateSecondary: 'Activate right panel',
        activateSecondarySubtitle: 'Navigation opens on the right',
      },
      tagConnections: (count) => `${count} global connection${count === 1 ? '' : 's'}`,
    },
    dashboard: {
      recentActivity: 'Recent activity',
      fullHistory: 'View full history ->',
      viewModule: 'View module',
      expandModule: 'Expand module',
      collapseModule: 'Collapse module',
      restoreModule: 'Restore module',
      noActiveModulesTitle: 'No active modules',
      noActiveModulesBody: 'Enable at least one plugin to see content on the dashboard',
      goToSettings: 'Go to Settings',
      pluginTip: 'Tip: enabling a plugin adds widgets, pages, and navigation automatically.',
      progressMovedPrefix: 'Your global progress now lives in',
      progressMovedLink: 'Progress',
      progressMovedSuffix: '. The Dashboard focuses on what you need to do today.',
      closeNotice: 'Close notice',
      restoreSize: (title) => `Restore ${title} size`,
      expandTile: (title) => `Expand ${title}`,
      collapseTile: (title) => `Collapse ${title}`,
      moveTile: (title) => `Move ${title}`,
    },
    auth: {
      titleLogin: 'Sign in',
      titleRegister: 'Create account',
      titleRecovery: 'Recover access',
      tagline: 'Your system. Your life. One AI.',
      loginTab: 'Login',
      registerTab: 'Register',
      recoveryTab: 'Recover',
      rememberedUsers: 'Remembered users',
      forgetAll: 'Forget all',
      rememberedUser: 'Remembered user',
      useUser: (username) => `Use user ${username}`,
      forgetUser: (username) => `Forget user ${username}`,
      forgetUserTitle: 'Forget user',
      username: 'Username',
      password: 'Password',
      passwordMin: 'Password (min 8 characters)',
      recoveryQuestion: 'Recovery question (min 10 characters)',
      recoveryAnswer: 'Answer',
      recoveryAnswerPrivate: 'Answer (private and case-sensitive)',
      newPassword: 'New password (min 8 characters)',
      rememberUser: 'Remember user on this device',
      entering: 'Signing in...',
      enter: 'Enter',
      creating: 'Creating...',
      createAccount: 'Create account',
      searching: 'Searching...',
      viewSecretQuestion: 'View secret question',
      updating: 'Updating...',
      updatePassword: 'Update password',
      userNotFound: 'User not found.',
      passwordUpdated: 'Password updated. Sign in with your new password.',
      showPassword: 'Show password',
      hidePassword: 'Hide password',
    },
    control: {
      eyebrow: 'Settings',
      title: 'Nora OS Governance',
      description: 'Manage identity, preferences, modules, and platform health from one panel.',
      monitoring: 'Live operational monitoring active',
      nav: {
        profile: 'Account',
        preferences: 'Appearance',
        pluginManager: 'Modules',
        organization: 'Organization',
        aiNotifications: 'AI and alerts',
        securityBackups: 'Backups',
        automations: 'Automations',
        audit: 'Health',
      },
      unsavedSections: (count) => `${count} unsaved section${count === 1 ? '' : 's'}`,
      kpis: {
        activeModules: 'Active modules',
        registered: (count) => `of ${count} registered`,
        dashboardWidgets: 'Dashboard widgets',
        connectedReady: 'connected and ready',
      },
      profile: {
        title: 'Account',
        description: 'Local identity and base profile data.',
      },
      appearance: {
        title: 'Appearance',
        description: 'Visual theme, language, and navigation behavior.',
        summary: (theme) => `Theme: ${theme || 'default'}`,
        languageTitle: 'Language',
        languageHelp: 'Applied immediately and saved on this device.',
        sidebarCollapsed: 'Sidebar collapsed by default',
        sidebarCollapsedHelp: 'You can also toggle it from the sidebar button.',
        themeTitle: 'Theme',
        themeGallery: (count) => `View all ${count} themes with live preview ->`,
        savePreferences: 'Save preferences',
        unsaved: 'Unsaved changes',
      },
      plugins: {
        title: 'Modules',
        description: 'Enable or disable plugins; changes apply when saved.',
        summary: (selected, total) => `${selected} of ${total} selected`,
        openModule: 'Open module',
        saving: 'Saving...',
        saveModules: 'Save modules',
        howAddTitle: 'How do I add new plugins?',
        howAddBody: 'In this version, plugins are included in the build and can be enabled or disabled here.',
        saved: 'Modules saved correctly.',
        failedSave: 'Could not save modules.',
        failedActivate: (names) => `Could not activate: ${names}.`,
      },
      leaveGuard: {
        title: 'You have unsaved changes',
        body: 'These sections have local changes. Nothing has been applied yet.',
        stay: 'Stay',
        discard: 'Discard and leave',
        saveAll: 'Save all and leave',
      },
    },
    plugins: {
      meta: {
        fitness: {
          name: 'Fitness',
          description: 'Weight, meals, workouts, sleep, and body measurements.',
        },
        work: {
          name: 'Work',
          description: 'Kanban boards, notes, and work links.',
        },
        finance: {
          name: 'Finance',
          description: 'Transactions, accounts, budgets, and recurring expenses.',
        },
        habits: {
          name: 'Habits',
          description: 'Daily and weekly habits with streaks and heatmap.',
        },
        journal: {
          name: 'Journal',
          description: 'Personal journal with mood tracking and prompts.',
        },
        goals: {
          name: 'Goals',
          description: 'Quarterly and yearly objectives with Key Results and automatic progress.',
        },
        knowledge: {
          name: 'Knowledge',
          description: 'Resources, highlights, and flashcards with SM-2 for learning what matters.',
        },
        time: {
          name: 'Time',
          description: 'Timer and timesheet with auto-entries from Focus.',
        },
      },
      widgets: {
        'fitness-kpi': 'Fitness KPIs',
        'work-summary': 'Work Summary',
        'work-dashboard': 'Work',
        'work-notes': 'Notes',
        'finance-summary': 'Finance',
        'habits-summary': 'Habits',
        'journal-summary': 'Journal',
        'goals-summary': 'Goals',
        'knowledge-summary': 'Knowledge',
        'time-summary': 'Time',
      },
      pages: {
        'fitness-dashboard': 'Fitness',
        'fitness-tracking': 'Log',
        'fitness-measurements': 'Measurements',
        'work-dashboard': 'Work',
        'work-notes': 'Notes',
        'work-links': 'Links',
        'finance-dashboard': 'Finance',
        'finance-tx': 'Transactions',
        'finance-cat': 'Categories',
        'finance-bud': 'Budgets',
        'finance-rec': 'Recurring',
        'finance-ins': 'Insights',
        'habits-dashboard': 'Habits',
        'habits-history': 'History',
        'habits-manage': 'Manage',
        'journal-dashboard': 'Journal',
        'journal-history': 'History',
        'goals-dashboard': 'Goals',
        'knowledge-dashboard': 'Knowledge',
        'knowledge-resources': 'Library',
        'knowledge-highlights': 'Highlights',
        'knowledge-review': 'Review',
        'time-dashboard': 'Time',
        'time-projects': 'Projects',
        'time-timesheet': 'Timesheet',
      },
      nav: {
        'fitness-nav': 'Fitness',
        'fitness-tracking-nav': 'Log',
        'fitness-measures-nav': 'Measurements',
        'work-nav': 'Work',
        'work-notes-nav': 'Notes',
        'work-links-nav': 'Links',
        'finance-nav': 'Finance',
        'finance-tx-nav': 'Transactions',
        'finance-cat-nav': 'Categories',
        'finance-bud-nav': 'Budgets',
        'finance-rec-nav': 'Recurring',
        'finance-ins-nav': 'Insights',
        'habits-nav': 'Habits',
        'habits-history-nav': 'History',
        'habits-manage-nav': 'Manage',
        'journal-nav': 'Journal',
        'journal-history-nav': 'History',
        'goals-nav': 'Goals',
        'knowledge-nav': 'Knowledge',
        'knowledge-resources-nav': 'Library',
        'knowledge-highlights-nav': 'Highlights',
        'knowledge-review-nav': 'Review',
        'time-nav': 'Time',
        'time-projects-nav': 'Projects',
        'time-timesheet-nav': 'Timesheet',
      },
    },
    gamification: {
      stages: {
        spark: { title: 'Spark', description: 'Nori is waking up and learning your rhythm.' },
        trail: { title: 'Trail', description: 'Nori already recognizes simple patterns in your days.' },
        pulse: { title: 'Pulse', description: 'Nori syncs focus, streaks, and priorities.' },
        orbit: { title: 'Orbit', description: 'Nori connects signals across modules and context.' },
        sync: { title: 'Sync', description: 'Nori works as a complete presence inside Nora.' },
      },
      rewards: {
        'nori-awakens': { title: 'Nori awakens', description: 'Base progress, XP missions, and the first visible evolution.' },
        'daily-brief-tone': { title: 'Brief with Pulso Nora', description: 'The daily brief adopts Nori lively tone.' },
        'next-milestone': { title: 'Next milestone highlighted', description: 'Pulso Nora highlights your nearest achievement or reward.' },
        'focus-nudges': { title: 'Focus nudges', description: 'Nori can suggest where to start a focus session.' },
        'weekly-review': { title: 'AI weekly review', description: 'The Progress view unlocks weekly analysis with local AI.' },
        'copilot-actions': { title: 'Executable actions', description: 'The copilot can propose actions that run from Nora.' },
        'cross-module-context': { title: 'Cross-module context', description: 'AI uses combined signals from your active modules.' },
        'proactive-alerts': { title: 'Proactive alerts', description: 'Nori improves notifications with risk signals.' },
        'recovery-plan': { title: 'Recovery plan', description: 'Daily score gets better hints to return to baseline.' },
        'weekly-patterns': { title: 'Weekly patterns', description: 'Pulso Nora interprets recent trends with more precision.' },
        'streak-personalization': { title: 'Personalized streaks', description: 'Nori adjusts suggestions based on your consistency.' },
        'advanced-priorities': { title: 'Advanced prioritization', description: 'Recommendations weigh urgency, focus, and energy.' },
        'multi-module-recs': { title: 'Multi-module recommendations', description: 'Nori crosses habits, work, fitness, and planner.' },
        'full-coach-mode': { title: 'Full coach mode', description: 'The copilot responds with a more strategic view.' },
        'nori-synced': { title: 'Nori synchronized', description: 'Maximum state: Nori is fully integrated into the system.' },
      },
      achievements: {
        'first-entry': { title: 'First record', description: 'You recorded your first day' },
        'week-streak': { title: 'Weekly streak', description: '7 straight days recording' },
        'month-streak': { title: 'Monthly streak', description: '30 straight days recording' },
        centurion: { title: 'Centurion', description: 'Accumulate 100 points' },
        'workout-10': { title: 'Athlete', description: 'Complete 10 workouts' },
        'tasks-25': { title: 'Productive', description: 'Complete 25 tasks' },
        'focus-master': { title: 'Focus master', description: 'Complete 20 focus sessions' },
        'note-taker': { title: 'Chronicler', description: 'Create 10 notes' },
        'consistency-3': { title: 'Initial consistency', description: 'Maintain a 3-day streak' },
        'points-500': { title: 'Accumulator 500', description: 'Reach 500 total points' },
        'points-1000': { title: 'Accumulator 1000', description: 'Reach 1000 total points' },
        'early-bird': { title: 'Early bird', description: 'Record an action before 9:00' },
      },
      missions: {
        'fitness-entry': { title: 'Record fitness today', description: 'Record your fitness entry for the day' },
        'work-task': { title: 'Complete 1 work task', description: 'Move a task to done to close a mission' },
        'focus-start': { title: 'Start a focus session', description: 'Activate at least one focus session today' },
        'core-planner-task': { title: 'Complete a planner mission', description: 'Close at least one core planner task' },
      },
      progressLabels: {
        registros: 'records',
        'dias de racha': 'streak days',
        'días de racha': 'streak days',
        puntos: 'points',
        entrenamientos: 'workouts',
        tareas: 'tasks',
        'sesiones de foco': 'focus sessions',
        notas: 'notes',
        'acciones antes de 9am': 'actions before 9am',
        progreso: 'progress',
      },
    },
    shortcuts: {
      groups: {
        global: 'Global',
        palette: 'Command Palette',
        modal: 'Modals and dialogs',
        journal: 'Journal',
        kanban: 'Kanban (Work)',
      },
      actions: {
        'palette-open': 'Open Command Palette',
        'global-new-note': 'New note',
        'global-new-task': 'New Kanban task',
        'global-focus': 'Start focus session',
        'global-toggle-sidebar': 'Show/hide sidebar',
        'palette-down': 'Next result',
        'palette-up': 'Previous result',
        'palette-enter': 'Run result',
        'palette-side-open': 'Open result in the right panel',
        'palette-esc': 'Close palette',
        'modal-esc': 'Close active modal or dialog',
        'journal-save': 'Save today entry',
        'kanban-add': 'Add card or column',
        'kanban-cancel': 'Cancel editing',
      },
      descriptions: {
        'palette-open': 'Global search for commands, pages, and quick actions.',
        'global-new-note': 'Navigates to Work > Notes and creates a focused new note for writing.',
        'global-new-task': 'Creates a task in the first column of the main board.',
        'global-focus': 'Starts a free focus session if no other session is active.',
        'global-toggle-sidebar': 'Collapses or expands the sidebar; the preference is persisted.',
        'palette-side-open': 'Enables dual view if needed and loads the selected result beside the current view. On ES/LatAm keyboards it also works as Ctrl/Cmd + Shift + 7.',
        'journal-save': 'Works in the Journal editor while you are writing.',
        'kanban-add': 'When the new card or column input is focused.',
      },
      scopes: {
        global: 'Global',
        palette: 'Palette',
        modal: 'Modal',
        editor: 'Editor',
        kanban: 'Kanban',
        journal: 'Journal',
      },
    },
    planner: {
      categories: {
        domestica: 'Home',
        recordatorio: 'Reminder',
        trabajo: 'Work',
        personal: 'Personal',
      },
      complexity: {
        baja: 'Low',
        media: 'Medium',
        alta: 'High',
      },
    },
    staticText: {
      Dashboard: 'Dashboard',
      Configuracion: 'Settings',
      Configuración: 'Settings',
      Config: 'Settings',
      Notas: 'Notes',
      Enlaces: 'Links',
      Planner: 'Planner',
      Calendario: 'Calendar',
      Progreso: 'Progress',
      Perfil: 'Profile',
      Temas: 'Themes',
      Modulos: 'Modules',
      Módulos: 'Modules',
      Cuenta: 'Account',
      Apariencia: 'Appearance',
      Organizacion: 'Organization',
      Organización: 'Organization',
      'IA y avisos': 'AI and alerts',
      Backups: 'Backups',
      Automatizaciones: 'Automations',
      Salud: 'Health',
      Fitness: 'Fitness',
      Registro: 'Log',
      Registrar: 'Log',
      Medidas: 'Measurements',
      Finanzas: 'Finance',
      Movimientos: 'Transactions',
      Categorias: 'Categories',
      Categorías: 'Categories',
      Presupuestos: 'Budgets',
      Recurrentes: 'Recurring',
      Insights: 'Insights',
      Habitos: 'Habits',
      Hábitos: 'Habits',
      Historial: 'History',
      Administrar: 'Manage',
      Objetivos: 'Goals',
      Conocimiento: 'Knowledge',
      Biblioteca: 'Library',
      Highlights: 'Highlights',
      Repaso: 'Review',
      Tiempo: 'Time',
      Proyectos: 'Projects',
      Timesheet: 'Timesheet',
      'Actividad reciente': 'Recent activity',
      'Acciones rápidas': 'Quick actions',
      'Actualización lista': 'Update ready',
      'Hay una actualización disponible': 'An update is available',
      'Versión': 'Version',
      'Buscar actualizaciones': 'Check for updates',
      'Descargar actualización': 'Download update',
      'Reiniciar e instalar': 'Restart and install',
      'No pudimos conectar con el servidor de actualizaciones. Descargá manualmente la última versión desde el sitio oficial.': 'Could not connect to the update server. Download the latest version manually from the official site.',
      'No pudimos conectar con el servidor de actualizaciones. DescargÃ¡ manualmente la Ãºltima versiÃ³n desde el sitio oficial.': 'Could not connect to the update server. Download the latest version manually from the official site.',
      'Calculando tu día…': 'Calculating your day...',
      'Misiones de acción': 'Action missions',
      'Tareas del día': 'Today tasks',
      'Galería de temas': 'Theme gallery',
      'Análisis del coach (Ollama local)': 'Coach analysis (local Ollama)',
      'Generar review': 'Generate review',
      'Pensando...': 'Thinking...',
      'Semana': 'Week',
      'Mes': 'Month',
      'Tu evolución semanal': 'Your weekly evolution',
      'Tu evolución mensual': 'Your monthly evolution',
      'La app se cayó.': 'The app crashed.',
      'Todas las recompensas de Pulso Nora están activas.': 'All Pulso Nora rewards are active.',
      'Nori sincronizado': 'Nori synchronized',
      'Desbloqueos de Nori': 'Nori unlocks',
      'XP últimos 7 días': 'XP last 7 days',
      'Pulso activo': 'Active pulse',
      'Nivel máximo': 'Max level',
      'Evolución': 'Evolution',
      'Próximo desbloqueo': 'Next unlock',
      'Estado': 'Status',
      'Completo': 'Complete',
      'Racha': 'Streak',
      'Archivo evolutivo': 'Evolution archive',
      'Evoluciones de Nori': 'Nori evolutions',
      'Cerrar evoluciones': 'Close evolutions',
      'Desbloqueo': 'Unlock',
      'Activo': 'Active',
      'Evolución desbloqueada': 'Evolution unlocked',
      'Siguiente evolucion oculta': 'Next evolution hidden',
      'Siguiente evolución oculta': 'Next evolution hidden',
      'Ver evoluciones de Nori': 'View Nori evolutions',
      'Ver menos': 'Show less',
      'Salud del sistema': 'System health',
      'Estado principal': 'Main status',
      'Revisar ahora': 'Review now',
      'Puede esperar': 'Can wait',
      'Todo bien': 'All good',
      'Volver a revisar': 'Review again',
      'Revisando...': 'Reviewing...',
      'Todas las revisiones': 'All reviews',
      'Todos los modulos': 'All modules',
      'Todos los módulos': 'All modules',
      'Limpiar filtros': 'Clear filters',
      'Acción recomendada': 'Recommended action',
      'Ver detalle tecnico': 'View technical detail',
      'Ver detalle técnico': 'View technical detail',
      Regla: 'Rule',
      Modulo: 'Module',
      Módulo: 'Module',
      Ubicacion: 'Location',
      Ubicación: 'Location',
      Mensaje: 'Message',
      Sugerencias: 'Suggestions',
      'Aplicar ajuste seguro': 'Apply safe fix',
      Aplicado: 'Applied',
      'Ocultar de esta revisión': 'Hide from this review',
      'Ignorar esta revisión': 'Ignore this review',
      'Todo bien para los filtros actuales.': 'All good for the current filters.',
      'Sin revisar': 'Not reviewed',
      'sin revisar': 'not reviewed',
      'Guardar cambios': 'Save changes',
      'Guardando…': 'Saving...',
      Guardando: 'Saving',
      Desbloquear: 'Unlock',
      'Desbloqueando…': 'Unlocking...',
      'Cerrar sesión': 'Sign out',
      Salir: 'Exit',
      Nombre: 'Name',
      Edad: 'Age',
      'Altura (cm)': 'Height (cm)',
      'Meta peso (kg)': 'Weight goal (kg)',
      'Fecha de inicio': 'Start date',
      'Sin nombre': 'No name',
      'Guardar perfil': 'Save profile',
      'Perfil guardado correctamente.': 'Profile saved.',
      'No se pudo guardar el perfil. Intenta nuevamente.': 'Could not save the profile. Try again.',
      'No se pudieron guardar. Intenta nuevamente.': 'Could not save preferences. Try again.',
      'Ajustes de modulos guardados.': 'Module settings saved.',
      'Ajustes de módulos guardados.': 'Module settings saved.',
      'Ajustes de modulos': 'Module settings',
      'Ajustes de módulos': 'Module settings',
      'Guardar configuracion de modulos': 'Save module settings',
      'Guardar configuración de módulos': 'Save module settings',
      'Rutas de operacion': 'Operation routes',
      'Rutas de operación': 'Operation routes',
      'Galeria completa': 'Full gallery',
      'Galería completa': 'Full gallery',
      'El tema se previsualiza al instante.': 'Theme preview is instant.',
      'Objetivos y limites para seguimiento diario.': 'Goals and limits for daily tracking.',
      'Objetivos y límites para seguimiento diario.': 'Goals and limits for daily tracking.',
      'Entrenos por semana': 'Workouts per week',
      'Sueño objetivo (h)': 'Sleep target (h)',
      'Max cigarrillos/dia': 'Max cigarettes/day',
      'Max cigarrillos/día': 'Max cigarettes/day',
      'Cumplimiento comidas (%)': 'Meal compliance (%)',
      'Recordatorio de mediciones': 'Measurement reminder',
      'Soy fumador y quiero dejarlo': 'I smoke and want to quit',
      'Guardar Fitness': 'Save Fitness',
      'Preferencias de foco, tablero y carga de trabajo.': 'Focus, board, and workload preferences.',
      'Sesion foco (min)': 'Focus session (min)',
      'Sesión foco (min)': 'Focus session (min)',
      'Descanso (min)': 'Break (min)',
      'Alerta vencimiento (h)': 'Overdue alert (h)',
      'Limite WIP': 'WIP limit',
      'Límite WIP': 'WIP limit',
      'Jornada laboral (horas)': 'Workday (hours)',
      'Vista predeterminada': 'Default view',
      Lista: 'List',
      'Guardar Work': 'Save Work',
      'Moneda predeterminada': 'Default currency',
      Transferencias: 'Transfers',
      'Alertas de gastos inusuales': 'Unusual expense alerts',
      'Contexto IA': 'AI context',
      'Guardar Finanzas': 'Save Finance',
      'Tags globales': 'Global tags',
      'Ollama y notificaciones': 'Ollama and notifications',
      'Seguridad y backups': 'Security and backups',
      'Backups y cifrado': 'Backups and encryption',
      'Fecha': 'Date',
      'Categoría': 'Category',
      'Categoria': 'Category',
      'Título': 'Title',
      'Titulo': 'Title',
      'Descripción breve': 'Short description',
      'Descripcion breve': 'Short description',
      'Descripción (opcional)': 'Description (optional)',
      'Descripcion (opcional)': 'Description (optional)',
      'Estimación (min)': 'Estimate (min)',
      'Estimacion (min)': 'Estimate (min)',
      'Período': 'Period',
      'Periodo': 'Period',
      Año: 'Year',
      Métrica: 'Metric',
      Metrica: 'Metric',
      Dirección: 'Direction',
      Direccion: 'Direction',
      'Métrica de plugin': 'Plugin metric',
      'Sin Key Results todavía.': 'No Key Results yet.',
      'No tenés nada en progreso.': 'Nothing in progress.',
      'No tienes nada en progreso.': 'Nothing in progress.',
      'Empezá un recurso desde la biblioteca.': 'Start a resource from the library.',
      'Aún no registraste tiempo.': 'No time recorded yet.',
      'Iniciá una entrada arriba o completá una sesión de Focus.': 'Start an entry above or complete a Focus session.',
      'Sin proyectos todavía. Creá el primero arriba.': 'No projects yet. Create the first one above.',
      'Definí proyectos y tarifas por hora para reportes facturables.': 'Define projects and hourly rates for billable reports.',
      'Horas por proyecto y día (semana actual, lunes a domingo).': 'Hours by project and day (current week, Monday to Sunday).',
      'Total día': 'Day total',
      'Top categorías': 'Top categories',
      'Sin categoría': 'Uncategorized',
      'Materialización local-first. Se generan al abrir la app.': 'Local-first materialization. Generated when the app opens.',
      'Definí límites por categoría. Sin moralina, solo awareness.': 'Set category limits. No moralizing, just awareness.',
      'Hábitos de hoy': 'Today habits',
      'Historial 30 días': '30-day history',
      'Cada celda es un día. Más opaco = más cumplimiento.': 'Each cell is a day. More opaque means more completion.',
      'Cumplimiento de cada hábito en los últimos 30 días.': 'Completion for each habit over the last 30 days.',
      'Nuevo hábito': 'New habit',
      'Editá, archivá o borrá hábitos. Los logs históricos se conservan al archivar.': 'Edit, archive, or delete habits. Historical logs are kept when archived.',
      'Tocá “Nuevo hábito” para arrancar tu primera racha.': 'Tap "New habit" to start your first streak.',
      'Nuevo objetivo': 'New objective',
      'Definí tu primer objetivo del trimestre con “Nuevo objetivo”.': 'Define your first quarterly objective with "New objective".',
      'Nuevo recurso': 'New resource',
      'Nueva flashcard': 'New flashcard',
      'Nuevo highlight': 'New highlight',
      'Cerrar': 'Close',
      'Editar': 'Edit',
      'Borrar': 'Delete',
      'Crear': 'Create',
      'Guardar': 'Save',
      'Abrir': 'Open',
      activo: 'active',
      inactivo: 'inactive',
      error: 'error',
      'Sin titulo': 'Untitled',
      'Sin título': 'Untitled',
      'Foco libre': 'Free focus',
      'Sin foco activo': 'No active focus',
      'Foco libre en curso': 'Free focus in progress',
      'Nueva tarea': 'New task',
      'Nueva nota': 'New note',
      Baja: 'Low',
      Media: 'Medium',
      Alta: 'High',
      Urgente: 'Urgent',
      Domestica: 'Home',
      Doméstica: 'Home',
      Recordatorio: 'Reminder',
      Trabajo: 'Work',
      Personal: 'Personal',
      Todos: 'All',
      Todas: 'All',
      Pendientes: 'Pending',
      Completadas: 'Completed',
      Pend: 'Pend.',
      Listas: 'Done',
      Hoy: 'Today',
      'Atajos de teclado': 'Keyboard shortcuts',
      'Review semanal/mensual': 'Weekly/monthly review',
      'Perfil (export/import)': 'Profile (export/import)',
    },
  },
}

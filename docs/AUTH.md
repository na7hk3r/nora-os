# Sistema de Autenticación - Nora OS

## Descripción general

Nora OS implementa un **sistema de autenticación multiusuario completamente local** con SQLite. Cada usuario tiene aislamiento total de datos, con su propia base de datos personalizada, sesiones seguras y recuperación de acceso mediante preguntas secretas.

## Características principales

### 🔐 Seguridad
- **Hasheado de contraseñas** con `scrypt` (64 bytes) + salt aleatorio (16 bytes)
- **Constant-time comparison** para evitar timing attacks
- **Sesiones persistentes** en auth.db con revocación de tokens
- **Context isolation** en Electron con preload script seguro
- **Aislamiento de datos** por usuario

### 👥 Multiusuario
- Múltiples usuarios en una sola máquina
- Cada usuario tiene sus propios datos, configuración y plugins
- Auto-login con sesiones persistentes
- Logout explícito cuando el usuario lo desee

### 🔄 Recuperación de acceso
- Pregunta secreta personalizada durante registro
- Respuesta sensible a mayúsculas/minúsculas
- Reseteo de contraseña sin comprometer seguridad
- Revocación automática de todas las sesiones tras reseteo

### 📱 UX-Friendly
- Mensajes de error claros en español
- Validación progresiva con feedback inmediato
- Tres modos: Login, Registro, Recuperación
- Indicadores visuales con iconos

## Arquitectura técnica

### Bases de datos

#### auth.db (Global)
```sql
users:
  id TEXT PRIMARY KEY
  username TEXT UNIQUE
  password_hash TEXT
  recovery_question TEXT
  recovery_answer_hash TEXT
  created_at TEXT
  updated_at TEXT
  last_login_at TEXT

sessions:
  id TEXT PRIMARY KEY
  user_id TEXT FOREIGN KEY -> users.id
  created_at TEXT
  last_seen_at TEXT
  revoked_at TEXT (NULL mientras está activa)
```

#### personal-os-user-{userId}.db (Por usuario)
```sql
profile
settings
plugin_state
events_log
[plugin-specific tables]
```

### Flujos principales

#### 1. Registro
```
Usuario → AuthScreen (registro mode)
  ↓
Validaciones:
  - Username: 3-32 chars, alfanuméricos + . _ -
  - Contraseña: 8+ chars
  - Pregunta: 10+ chars
  - Respuesta: 2+ chars
  ↓
AuthService.register()
  - Hash contraseña + respuesta
  - Crear usuario en auth.db
  - Si es primer usuario: reclamar personal-os.db legacy
  - Crear sesión
  - Activar user db
  ↓
AuthStore: status = 'authenticated'
App Bootstrap ejecuta
```

#### 2. Login
```
Usuario → AuthScreen (login mode)
  ↓
Validaciones: username y password obligatorios
  ↓
AuthService.login()
  - Obtener usuario de auth.db
  - Verificar contraseña con timing-safe comparison
  - Actualizar last_login_at
  - Crear sesión
  - Activar user db
  ↓
AuthStore: status = 'authenticated'
App Bootstrap ejecuta
```

#### 3. Recuperación de acceso
```
Usuario → AuthScreen (recovery mode)
  ↓
Paso 1: Ingresa username
  - AuthService.getRecoveryQuestion()
  - Mostrar pregunta
  ↓
Paso 2: Ingresa respuesta + nueva contraseña
  - AuthService.resetPasswordWithRecovery()
  - Verificar respuesta con timing-safe comparison
  - Hash nueva contraseña
  - Revocar todas las sesiones del usuario
  ↓
Mensaje de éxito: "Contraseña actualizada"
Usuario redirigido a login
```

#### 4. Auto-login (App startup)
```
App monta
  ↓
useEffect: initializeSession()
  ↓
AuthStore.me()
  ↓
AuthService.getCurrentUser()
  - Buscar sesión activa (revoked_at IS NULL)
  - Validar user_id
  - Touch session (update last_seen_at)
  - Activar user db
  ↓
Si existe sesión válida: status = 'authenticated'
Si no: status = 'unauthenticated'
  ↓
App renderiza contenido o AuthScreen
```

### Comunicación Electron

**IPC Channels:**
```typescript
auth:register    → AuthService.register()
auth:login       → AuthService.login()
auth:logout      → AuthService.logout()
auth:me          → AuthService.getCurrentUser()
auth:get-recovery-question    → AuthService.getRecoveryQuestion()
auth:reset-password-with-recovery → AuthService.resetPasswordWithRecovery()
```

**Exposición segura via Preload:**
```typescript
contextBridge.exposeInMainWorld('auth', {
  register: (payload) => ipcRenderer.invoke('auth:register', payload),
  login: (username, password) => ipcRenderer.invoke('auth:login', username, password),
  logout: () => ipcRenderer.invoke('auth:logout'),
  me: () => ipcRenderer.invoke('auth:me'),
  getRecoveryQuestion: (username) => ipcRenderer.invoke('auth:get-recovery-question', username),
  resetPasswordWithRecovery: (payload) => ipcRenderer.invoke('auth:reset-password-with-recovery', payload),
})
```

## Recordar usuarios recientes

La pantalla de login guarda solo usernames en `localStorage`.

- Clave actual: `auth:rememberedUsernames:v2`, JSON array newest-first.
- Clave legacy: `auth:rememberedUsername:v1`, migrada automaticamente si existe.
- Maximo: 5 usernames.
- Login exitoso con "Recordar usuario" activo agrega o mueve el username al inicio.
- Login exitoso con "Recordar usuario" inactivo elimina solo ese username de la lista.
- La UI permite usar, olvidar uno u olvidar todos. No se guardan passwords,
  passphrases ni sesiones adicionales.

## Mensajes de error mejorados

### Validación de username
- "El nombre de usuario no puede estar vacío."
- "El nombre de usuario debe tener al menos 3 caracteres."
- "El nombre de usuario no puede exceder 32 caracteres."
- "El nombre de usuario solo puede contener letras, números, puntos, guiones y guiones bajos."

### Validación de contraseña
- "La contraseña no puede estar vacía."
- "La contraseña debe tener mínimo 8 caracteres."

### Validación de pregunta/respuesta
- "La pregunta de recuperación no puede estar vacía."
- "La pregunta de recuperación debe tener mínimo 10 caracteres."
- "La respuesta de recuperación no puede estar vacía."
- "La respuesta de recuperación debe tener mínimo 2 caracteres."

### Operaciones
- "Este nombre de usuario ya está en uso. Elige otro."
- "No se pudo completar el registro. Intenta de nuevo."
- "El nombre de usuario o contraseña es incorrecto."
- "No encontramos ese nombre de usuario. Verifica e intenta de nuevo."
- "La respuesta de recuperación es incorrecta. Intenta de nuevo."

## Implementación

### Archivos principales

| Archivo | Responsabilidad |
|---------|-----------------|
| `electron/services/auth.ts` | Lógica de autenticación core |
| `electron/services/auth-ipc.ts` | Handlers IPC para operaciones auth |
| `electron/preload.ts` | Puente seguro entre main y renderer |
| `src/core/state/authStore.ts` | Estado global de autenticación (Zustand) |
| `src/core/ui/auth/AuthScreen.tsx` | UI completa de autenticación |
| `src/App.tsx` | Gating de autenticación + bootstrap |

### Dependencias
```json
{
  "crypto": "Node.js built-in",
  "better-sqlite3": "SQLite access",
  "zustand": "State management",
  "electron": "IPC",
  "react": "UI"
}
```

## Seguridad en profundidad

### ✅ Qué está protegido
- Contraseñas nunca se almacenan en texto plano
- Sesiones se almacenan en auth.db con revocación
- Datos de usuario aislados en bd separada por usuario
- IPC validado y tipado
- Context isolation + sandbox en Electron
- Timing-safe comparison para prevenir timing attacks

### ⚠️ Consideraciones
- **Local only**: Sin sincronización en la nube (sin requisito de backend)
- **Single machine**: No hay soporte multi-dispositivo
- **Session storage**: Las sesiones persisten en auth.db (logout explícito requiere llamada a API)
- **Offline**: Funciona 100% sin conexión

## Testing

### Flujo manual
1. Crear cuenta con username/password/pregunta/respuesta
2. Logout
3. Iniciar sesión
4. Verificar que datos sean los mismos
5. Cambiar usuario y verificar aislamiento
6. Recuperación: cambiar password vía pregunta
7. Verificar que sesiones antiguas se revoquen

### Casos edge
- Username existente → error "ya está en uso"
- Contraseña corta → error en registro
- Respuesta incorrecta en recovery → error inmediato
- Usuario no encontrado en recovery → error "no encontramos"

## Migración desde DB legacy

Si existe `personal-os.db` (single-user) al momento del primer registro:
1. Se renombra a `personal-os-user-{userId}.db`
2. Todos los datos existentes quedan disponibles para ese usuario
3. Próximos usuarios crean sus propias bases de datos

## Roadmap futuro

- [ ] Exportar/importar perfil de usuario
- [ ] Soporte para múltiples dispositivos (sincronización E2E)
- [ ] Autenticación biométrica (fingerprint/face)
- [ ] Auditoría de acceso (logs de login/logout)
- [ ] Configuración de políticas de contraseña

## FAQ

**P: ¿Las contraseñas están seguras?**
R: Sí. Usamos scrypt + salt aleatorio + timing-safe comparison.

**P: ¿Puedo sincronizar entre dispositivos?**
R: Actualmente no. Es 100% local. En futuro se puede agregar sincronización E2E.

**P: ¿Qué pasa si olvido la respuesta secreta?**
R: No se puede recuperar sin ella. Asegúrate de elegir una que recuerdes.

**P: ¿Se pierden datos al logout?**
R: No. Los datos permanecen en la base de datos del usuario. Solo se revoca la sesión.

**P: ¿Puedo ver las contraseñas de otros usuarios?**
R: No. Están hasheadas. Ni siquiera el código puede acceder en texto plano.

**P: ¿Qué pasa si otro usuario intenta acceder a mis datos?**
R: El aislamiento de BD por usuario garantiza que solo tú puedas acceder. Sin tu contraseña, no hay acceso.

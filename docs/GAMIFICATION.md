# Pulso Nora

## Vision general

Pulso Nora es el sistema vivo de progreso de Nora OS. Reemplaza la gamificacion
lineal anterior por una mascota evolutiva llamada Nori, 15 niveles maximos,
curva de XP mas lenta y recompensas visibles que activan mejoras de UI e IA.

La fuente de verdad sigue siendo el XP total persistido. El nivel se recalcula
desde ese XP en cada carga, por lo que los perfiles antiguos conservan sus
puntos pero se ajustan automaticamente a la nueva curva.

## Archivos principales

- `src/core/gamification/pulsoNora.ts`: configuracion de niveles, etapas,
  sprites, recompensas y helpers.
- `src/core/gamification/gamificationStore.ts`: estado persistido, historial,
  racha, logros y migracion desde snapshots anteriores.
- `src/core/ui/components/NoriSprite.tsx`: sprite reusable para sidebar,
  progreso y level-up.
- `src/core/ui/GlobalProgress.tsx`: panel principal de Pulso Nora.
- `src/core/ui/Sidebar.tsx`: resumen compacto de Nori, nivel, XP y racha.
- `public/nora-evo/nori-01.png` ... `public/nora-evo/nori-15.png`: evoluciones
  recortadas desde el sprite sheet original.

## Curva de niveles

Pulso Nora tiene 15 niveles. Los valores son XP acumulado minimo para entrar a
cada nivel:

| Nivel | XP acumulado |
| --- | ---: |
| 1 | 0 |
| 2 | 120 |
| 3 | 280 |
| 4 | 480 |
| 5 | 730 |
| 6 | 1030 |
| 7 | 1380 |
| 8 | 1780 |
| 9 | 2230 |
| 10 | 2730 |
| 11 | 3280 |
| 12 | 3880 |
| 13 | 4530 |
| 14 | 5230 |
| 15 | 5980 |

En nivel 15 el progreso queda al 100% y no se muestran previews bloqueados.

## Helpers publicos

```ts
import {
  getNoriLevel,
  getNoriProgress,
  getNoriStage,
  getNoriSprite,
  getUnlockedRewards,
  isRewardUnlocked,
} from '@core/gamification/pulsoNora'
```

- `getNoriLevel(points)`: devuelve el nivel 1..15 segun XP acumulado.
- `getNoriProgress(points)`: devuelve nivel actual, XP del nivel, XP restante,
  porcentaje y siguiente nivel.
- `getNoriStage(level)`: nombre y copy de la etapa evolutiva.
- `getNoriSprite(level)`: ruta publica del sprite `nori-XX.png`.
- `getUnlockedRewards(level)`: recompensas activas hasta ese nivel.
- `isRewardUnlocked(id, level)`: gating para UI o IA.

## Recompensas

Pulso Nora no bloquea funciones basicas existentes. Lo que desbloquea son
capas visibles, comportamiento proactivo y modos avanzados de IA.

| Nivel | Desbloqueo |
| --- | --- |
| 1 | Nori despierta, progreso base y misiones XP. |
| 2 | Brief diario con tono Pulso Nora. |
| 3 | Proxima meta/logro destacado. |
| 4 | Empujones de foco IA. |
| 5 | Review semanal IA. |
| 6 | Acciones ejecutables del copiloto. |
| 7 | Contexto cruzado entre modulos. |
| 8 | Alertas proactivas IA. |
| 9 | Plan de recuperacion diario. |
| 10 | Lectura de patrones semanales. |
| 11 | Sugerencias mas personalizadas por racha. |
| 12 | Priorizacion avanzada de tareas. |
| 13 | Recomendaciones multi-modulo. |
| 14 | Modo coach completo. |
| 15 | Nori sincronizado, IA completa y estado maximo. |

## Tabla de XP por accion

| Fuente | Accion | XP |
| --- | --- | ---: |
| Fitness | Entrada diaria guardada | +5 |
| Fitness | Entrenamiento completado | +25 |
| Work | Tarea completada | +10 |
| Work | Sesion de foco completada | +5 |
| Work | Sesion de foco interrumpida | -2 |
| Work | Nota creada | +3 |
| Finance | Transaccion registrada | +2 |
| Finance | Recurrente creada | +5 |
| Finance | Presupuesto creado | +5 |
| Habits | Habito loggeado | +2 |
| Habits | Meta del periodo cumplida | +5 |
| Journal | Entrada nueva | +5 |
| Journal | Entrada actualizada | +2 |
| Journal | Mood loggeado | +1 |
| Knowledge | Highlight capturado | +3 |
| Knowledge | Flashcard repasada | +2 |
| Knowledge | Recurso terminado | +15 |
| Tiempo | Entry detenida de 5 min o mas | +2 |
| Goals | Key Result completado | +20 |
| Goals | Objective completado | +100 |
| Core Planner | Tarea baja completada | +5 |
| Core Planner | Tarea media completada | +10 |
| Core Planner | Tarea alta completada | +16 |

Cada plugin escucha sus propios eventos y llama a
`api.gamification.addPoints(amount, reason)`.

## UI

`GlobalProgress` muestra a Nori libre, en mayor escala, con etapa evolutiva,
barra de XP, preview bloqueado de la siguiente evolucion y recompensas. Al
clickear el sprite abre una tabla pop-up con todas las evoluciones desbloqueadas
y solo una preview oculta del siguiente nivel.

`Sidebar` muestra una version compacta de Nori con nivel, progreso de XP y
racha activa.

`GamificationNotificationHub` usa la evolucion de Nori y los desbloqueos del
nuevo nivel dentro del overlay de level-up.

## IA y gating

El contexto global de IA incluye `systemName`, `companionName`, nivel de Nori,
etapa, progreso, XP restante y recompensas activas.

Los servicios deben consultar recompensas antes de activar comportamiento
avanzado. Ejemplos actuales:

- `dailyBriefService`: tono Pulso Nora desde nivel 2.
- `aiSuggestionsService`: nudge de foco desde nivel 4 y review semanal desde
  nivel 5.
- `copilotChatService`: acciones ejecutables desde nivel 6.
- `CopilotPanel`: bloquea la ejecucion de acciones si Nori no llego a nivel 6.

## Persistencia y migracion

El snapshot persistido vive en `settings.gamificationState`.

```ts
interface PersistedGamificationState {
  points: number
  level: number
  streak: number
  history: XPEntry[]
  unlockedIds: string[]
}
```

`level` se mantiene por compatibilidad con perfiles antiguos, pero al cargar se
recalcula desde `points` usando `getNoriLevel(points)`.

## Tests

La cobertura principal vive en:

- `src/core/gamification/pulsoNora.test.ts`
- `src/core/gamification/gamificationStore.test.ts`
- `src/core/services/__tests__/copilotChatService.test.ts`

Casos cubiertos: curva XP, limites exactos, progreso entre niveles, maximo 15,
recompensas por nivel, migracion desde estado viejo y gating de acciones IA.

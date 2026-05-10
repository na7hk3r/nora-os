import { useWorkStore } from './store'
import { getEffectiveDuration } from './focus'

export const WORK_FOCUS_CHANNEL = 'nora:work-focus:v1'

const SOURCE_ID = crypto.randomUUID()
let outboundChannel: BroadcastChannel | null = null

export type WorkFocusCommand =
  | 'request-snapshot'
  | 'start-free'
  | 'pause'
  | 'resume'
  | 'stop'
  | 'cancel'
  | 'open-work'

export interface WorkFocusSnapshot {
  active: boolean
  sessionId: string | null
  taskId: string | null
  title: string
  startedAt: number | null
  paused: boolean
  elapsedMs: number
  updatedAt: number
}

export type WorkFocusMessage =
  | { type: 'command'; command: WorkFocusCommand; sourceId: string }
  | { type: 'snapshot'; snapshot: WorkFocusSnapshot; sourceId: string }

type WorkFocusMessagePayload =
  | { type: 'command'; command: WorkFocusCommand }
  | { type: 'snapshot'; snapshot: WorkFocusSnapshot }

export function createWorkFocusSnapshot(now: number = Date.now()): WorkFocusSnapshot {
  const state = useWorkStore.getState()
  const session = state.currentFocusSession

  if (!session) {
    return {
      active: false,
      sessionId: null,
      taskId: null,
      title: 'Sin foco activo',
      startedAt: null,
      paused: false,
      elapsedMs: 0,
      updatedAt: now,
    }
  }

  const task = session.taskId ? state.cards.find((card) => card.id === session.taskId) : null

  return {
    active: true,
    sessionId: session.id,
    taskId: session.taskId,
    title: task?.title ?? 'Foco libre',
    startedAt: session.startTime,
    paused: Boolean(session.pausedAt),
    elapsedMs: getEffectiveDuration(session, now),
    updatedAt: now,
  }
}

function post(message: WorkFocusMessagePayload): void {
  const channel = outboundChannel ?? new BroadcastChannel(WORK_FOCUS_CHANNEL)
  outboundChannel = channel
  channel.postMessage({ ...message, sourceId: SOURCE_ID })
}

export function postWorkFocusCommand(command: WorkFocusCommand): void {
  post({ type: 'command', command })
}

export function postWorkFocusSnapshot(snapshot: WorkFocusSnapshot = createWorkFocusSnapshot()): void {
  post({ type: 'snapshot', snapshot })
}

export function isOwnWorkFocusMessage(message: WorkFocusMessage): boolean {
  return message.sourceId === SOURCE_ID
}

export type NoraId = string
export type NoraDateKey = `${number}-${number}-${number}`

export type NoraPriority = 'low' | 'medium' | 'high'
export type TaskStatus = 'pending' | 'inProgress' | 'completed'
export type PlannerKind = 'task' | 'event' | 'focus'
export type NoraNotificationKind = 'mention' | 'task' | 'project' | 'reminder'

export interface NoraUser {
  id: NoraId
  username: string
  displayName: string
  createdAt: string
  lastLoginAt?: string | null
}

export interface PlannerItem {
  id: NoraId
  ownerId: NoraId
  title: string
  date: NoraDateKey
  startMinute?: number | null
  endMinute?: number | null
  kind: PlannerKind
  category: string
  status: TaskStatus
  priority: NoraPriority
  note?: string | null
  createdAt: string
  updatedAt: string
}

export interface NoraNotification {
  id: NoraId
  ownerId: NoraId
  title: string
  body: string
  kind: NoraNotificationKind
  createdAt: string
  readAt?: string | null
}


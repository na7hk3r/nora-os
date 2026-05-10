import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  completeWorkFocusSession,
  completeWorkTask,
  interruptWorkFocusSession,
  pauseWorkFocusSession,
  resumeWorkFocusSession,
  startWorkFocusSession,
} from '../focus'
import {
  createWorkFocusSnapshot,
  isOwnWorkFocusMessage,
  postWorkFocusSnapshot,
  WORK_FOCUS_CHANNEL,
  type WorkFocusMessage,
} from '../focusSync'
import { useWorkStore } from '../store'

export function WorkFocusCommandHost() {
  const navigate = useNavigate()
  const currentFocusSession = useWorkStore((state) => state.currentFocusSession)

  useEffect(() => {
    const channel = new BroadcastChannel(WORK_FOCUS_CHANNEL)

    channel.onmessage = (event: MessageEvent<WorkFocusMessage>) => {
      const message = event.data
      if (!message || isOwnWorkFocusMessage(message) || message.type !== 'command') return

      void (async () => {
        const state = useWorkStore.getState()
        const session = state.currentFocusSession

        if (message.command === 'request-snapshot') {
          postWorkFocusSnapshot()
          return
        }

        if (message.command === 'start-free') {
          await startWorkFocusSession(null)
        } else if (message.command === 'pause') {
          await pauseWorkFocusSession()
        } else if (message.command === 'resume') {
          await resumeWorkFocusSession()
        } else if (message.command === 'stop') {
          if (session?.taskId) await completeWorkTask(session.taskId)
          else await completeWorkFocusSession()
        } else if (message.command === 'cancel') {
          await interruptWorkFocusSession()
        } else if (message.command === 'open-work') {
          navigate('/work')
          void window.workFocusWindow?.focusMain()
        }

        postWorkFocusSnapshot()
      })()
    }

    postWorkFocusSnapshot()
    return () => channel.close()
  }, [navigate])

  useEffect(() => {
    postWorkFocusSnapshot(createWorkFocusSnapshot())
  }, [currentFocusSession])

  useEffect(() => {
    if (!currentFocusSession || currentFocusSession.pausedAt) return undefined
    const intervalId = window.setInterval(() => postWorkFocusSnapshot(), 1000)
    return () => window.clearInterval(intervalId)
  }, [currentFocusSession])

  return null
}

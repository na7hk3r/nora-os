import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCoreStore } from '../state/coreStore'
import { eventBus } from '../events/EventBus'

/**
 * Atajos globales del shell. Se monta una sola vez desde Shell.
 *
 *  Ctrl/Cmd + N → Nueva nota (navega a /work/notes y dispara `work:new-note`)
 *  Ctrl/Cmd + T → Nueva tarea Kanban (navega a /work y dispara `work:new-task`)
 *  Ctrl/Cmd + F → Iniciar sesión de foco (emite `core:focus-request`)
 *  Ctrl/Cmd + B → Toggle sidebar
 *
 * Se evita interceptar cuando el foco está en un input/textarea/contenteditable
 * para no robar combinaciones del editor (ej. Ctrl+B en RTE).
 */
interface GlobalShortcutsProps {
  onShortcutHandled?: () => void
}

export function GlobalShortcuts({ onShortcutHandled }: GlobalShortcutsProps) {
  const navigate = useNavigate()
  const updateSettings = useCoreStore((s) => s.updateSettings)

  useEffect(() => {
    const isEditingTarget = (target: EventTarget | null): boolean => {
      if (!(target instanceof HTMLElement)) return false
      const tag = target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
      if (target.isContentEditable) return true
      return false
    }

    const handler = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey
      if (!isMod || e.altKey || e.shiftKey) return
      const key = e.key.toLowerCase()
      if (!['n', 't', 'f', 'b'].includes(key)) return

      // No interferir mientras se escribe; excepción: Ctrl+B siempre toggle sidebar.
      if (isEditingTarget(e.target) && key !== 'b') return

      onShortcutHandled?.()

      switch (key) {
        case 'n':
          e.preventDefault()
          navigate('/work/notes')
          // Pequeño delay para que la página monte antes de pedir nueva nota.
          setTimeout(() => window.dispatchEvent(new CustomEvent('work:new-note')), 60)
          break
        case 't':
          e.preventDefault()
          navigate('/work')
          setTimeout(() => window.dispatchEvent(new CustomEvent('work:new-task')), 60)
          break
        case 'f':
          e.preventDefault()
          eventBus.emit('core:focus-request', {}, { source: 'core' })
          break
        case 'b':
          e.preventDefault()
          {
            const current = useCoreStore.getState().settings.sidebarCollapsed
            updateSettings({ sidebarCollapsed: !current })
          }
          break
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [navigate, onShortcutHandled, updateSettings])

  return null
}

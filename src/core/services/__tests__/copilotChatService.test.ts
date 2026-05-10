import { describe, expect, it } from 'vitest'
import { __canAttachCopilotAction, __parseCopilotAction } from '../copilotChatService'

describe('copilotChatService.parseAction', () => {
  it('extrae INICIAR_FOCO sin payload', () => {
    const { clean, action } = __parseCopilotAction(
      'Dale, arranca ahora con foco en la propuesta.\nACCION: INICIAR_FOCO',
    )
    expect(action?.kind).toBe('INICIAR_FOCO')
    expect(action?.payload).toBeUndefined()
    expect(clean).toBe('Dale, arranca ahora con foco en la propuesta.')
  })

  it('extrae CREAR_TAREA con payload', () => {
    const { clean, action } = __parseCopilotAction(
      'Te conviene anotarlo. ACCION: CREAR_TAREA: Llamar al cliente Z',
    )
    expect(action?.kind).toBe('CREAR_TAREA')
    expect(action?.payload).toBe('Llamar al cliente Z')
    expect(clean).toBe('Te conviene anotarlo.')
  })

  it('soporta corchetes en payload', () => {
    const { action } = __parseCopilotAction('ACCION: REGISTRAR_HABITO: [meditacion]')
    expect(action?.kind).toBe('REGISTRAR_HABITO')
    expect(action?.payload).toBe('meditacion')
  })

  it('devuelve action null si no matchea', () => {
    const { clean, action } = __parseCopilotAction('Solo info, sin accion.')
    expect(action).toBeNull()
    expect(clean).toBe('Solo info, sin accion.')
  })

  it('remueve acciones ejecutables cuando Pulso Nora aun no las desbloqueo', () => {
    const { clean, action } = __parseCopilotAction(
      'Conviene arrancar foco.\nACCION: INICIAR_FOCO',
      { allowActions: false },
    )

    expect(action).toBeNull()
    expect(clean).toBe('Conviene arrancar foco.')
    expect(__canAttachCopilotAction(5)).toBe(false)
    expect(__canAttachCopilotAction(6)).toBe(true)
  })
})

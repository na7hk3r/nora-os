import type { JournalPrompt } from './types'

/**
 * Prompts integrados (builtin). Se cargan en migración v2 y son seleccionables
 * sin crear datos extras en la DB del usuario (los persistimos para que el
 * usuario pueda agregar custom y saber cuáles son built-in).
 */
export const BUILTIN_PROMPTS: Omit<JournalPrompt, 'createdAt'>[] = [
  { id: 'prm_morning_intent', text: '¿Qué quiero lograr hoy?', category: 'morning', builtin: true },
  { id: 'prm_morning_energy', text: '¿Cómo amanecí (1-5) y por qué?', category: 'morning', builtin: true },
  { id: 'prm_evening_review', text: '¿Qué hice bien hoy? ¿Qué cambiaría?', category: 'evening', builtin: true },
  { id: 'prm_gratitude', text: 'Tres cosas que agradezco hoy.', category: 'gratitude', builtin: true },
  { id: 'prm_lesson', text: '¿Qué aprendí esta semana?', category: 'reflection', builtin: true },
  { id: 'prm_blocker', text: '¿Qué me está bloqueando ahora mismo?', category: 'reflection', builtin: true },
  { id: 'prm_free', text: 'Escribir libre.', category: 'free', builtin: true },
]

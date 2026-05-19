import { registerAIContextProvider, unregisterAIContextProvider } from '@core/services/aiContextRegistry'
import { useFinanceStore } from './store'
import { financeAIProvider } from './aiProvider'
import type { FinancePluginSettings } from './settings'

export function applyFinanceRuntimeSettings(settings: FinancePluginSettings): void {
  useFinanceStore.getState().setSettings(settings)

  if (settings.aiContextEnabled) {
    registerAIContextProvider(financeAIProvider)
  } else {
    unregisterAIContextProvider(financeAIProvider.id)
  }
}

export function clearFinanceRuntime(): void {
  unregisterAIContextProvider(financeAIProvider.id)
}

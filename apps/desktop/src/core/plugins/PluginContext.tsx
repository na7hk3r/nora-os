import { createContext, useContext } from 'react'
import type { CoreAPI } from '../types'

export const PluginContext = createContext<CoreAPI | null>(null)

export function usePluginAPI(): CoreAPI {
  const api = useContext(PluginContext)
  if (!api) {
    throw new Error('usePluginAPI must be used within a PluginContext.Provider')
  }
  return api
}

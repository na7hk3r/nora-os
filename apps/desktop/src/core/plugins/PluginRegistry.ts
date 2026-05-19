import type { PluginManifest } from '../types'

// Static registry — plugins are imported at build time
// Future: dynamic loading from filesystem

const registry: PluginManifest[] = []

export function registerPlugin(manifest: PluginManifest): void {
  registry.push(manifest)
}

export function getAvailablePlugins(): PluginManifest[] {
  return [...registry]
}

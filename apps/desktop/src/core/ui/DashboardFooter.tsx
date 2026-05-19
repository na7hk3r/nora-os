import { Database, Circle } from 'lucide-react'
import { pluginManager } from '@core/plugins/PluginManager'
import { APP_VERSION } from '@core/utils/version'
import { NoraLogoMark } from './components/NoraLogo'

export function DashboardFooter() {
  const activeCount = pluginManager.getAllPlugins().filter((p) => p.status === 'active').length

  return (
    <footer className="flex flex-col gap-3 pt-4 border-t border-border sm:flex-row sm:items-center sm:justify-between">
      {/* Brand: logo oficial Nora OS + wordmark display. */}
      <div className="flex items-center gap-2">
        <NoraLogoMark size={20} className="text-foreground/60" />
        <span className="font-display text-sm font-semibold tracking-tight text-foreground/80">Nora OS</span>
        <span className="text-xs text-muted" title={`Nora OS v${APP_VERSION}`}>v{APP_VERSION}</span>
      </div>

      {/* System status */}
      <div className="flex items-center gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <Database size={12} className="text-success" />
          Local · SQLite
        </span>
        <span className="flex items-center gap-1.5">
          <Circle size={8} className="fill-success text-success" />
          {activeCount} {activeCount === 1 ? 'plugin activo' : 'plugins activos'}
        </span>
      </div>
    </footer>
  )
}

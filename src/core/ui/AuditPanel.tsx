import { useEffect, useMemo, useState } from 'react'
import { ShieldAlert, AlertCircle, AlertTriangle, Info, RefreshCw, Wand2, Check } from 'lucide-react'
import { useAuditStore } from '@core/audit/store'
import type { Finding, RuleId, Severity } from '@core/audit/types'

const SEVERITY_META: Record<Severity, { label: string; color: string; Icon: typeof AlertCircle }> = {
  error: { label: 'Revisar ahora', color: 'text-red-400 border-red-500/30 bg-red-500/10', Icon: AlertCircle },
  warn: { label: 'Puede esperar', color: 'text-amber-300 border-amber-500/30 bg-amber-500/10', Icon: AlertTriangle },
  info: { label: 'Informativo', color: 'text-sky-300 border-sky-500/30 bg-sky-500/10', Icon: Info },
}

const RULE_META: Record<RuleId, { title: string; impact: string; action: string }> = {
  R1: {
    title: 'Logros vinculados a modulos apagados',
    impact: 'Puede aparecer progreso que ya no corresponde al flujo activo.',
    action: 'Revisa si queres reactivar el modulo o dejar de ver ese logro.',
  },
  R2: {
    title: 'Misiones con dependencias faltantes',
    impact: 'Algunas misiones pueden quedar imposibles de completar.',
    action: 'Activa los modulos necesarios o cambia la mision.',
  },
  R3: {
    title: 'Eventos sin origen claro',
    impact: 'Una automatizacion o aviso podria no dispararse como esperas.',
    action: 'Revisa el modulo relacionado o vuelve a escanear despues de abrirlo.',
  },
  R4: {
    title: 'Avisos de modulos inactivos',
    impact: 'Podrias recibir notificaciones de algo que ya no usas.',
    action: 'Aplica el ajuste seguro para limpiar la cola de avisos.',
  },
  R5: {
    title: 'Pantallas o widgets invisibles',
    impact: 'Hay elementos registrados que no deberian estar disponibles.',
    action: 'Revisa el modulo y guarda su estado actual.',
  },
  R6: {
    title: 'Iconos poco coherentes',
    impact: 'La navegacion puede ser confusa si un modulo usa iconos que no lo representan.',
    action: 'Aplica la sugerencia segura cuando este disponible.',
  },
  R7: {
    title: 'Conexiones entre modulos pendientes',
    impact: 'Un modulo podria estar esperando datos de otro que no esta activo.',
    action: 'Activa el modulo requerido o ignora esta revision si es intencional.',
  },
  R8: {
    title: 'Accesos rapidos inconsistentes',
    impact: 'Un acceso directo podria llevar a una zona que no esta disponible.',
    action: 'Ajusta los modulos activos o ignora el acceso si no lo usas.',
  },
  R9: {
    title: 'Onboarding pendiente',
    impact: 'Un modulo puede estar incompleto porque no termino su configuracion inicial.',
    action: 'Abre el modulo o revisa su configuracion.',
  },
  R10: {
    title: 'Datos residuales',
    impact: 'Quedan datos de modulos que ya no estan instalados o activos.',
    action: 'Haz backup antes de limpiar datos antiguos.',
  },
}

interface FilterState {
  rule: RuleId | 'all'
  pluginId: string
  severity: Severity | 'all'
}

function healthStatus(counts: Record<Severity, number>) {
  if (counts.error > 0) return { label: 'Revisar ahora', tone: 'border-red-500/35 bg-red-500/10 text-red-200' }
  if (counts.warn > 0) return { label: 'Puede esperar', tone: 'border-amber-500/35 bg-amber-500/10 text-amber-100' }
  return { label: 'Todo bien', tone: 'border-emerald-500/35 bg-emerald-500/10 text-emerald-100' }
}

export function AuditPanel() {
  const report = useAuditStore((s) => s.report)
  const isRunning = useAuditStore((s) => s.isRunning)
  const runAudit = useAuditStore((s) => s.runAudit)
  const applyFix = useAuditStore((s) => s.applyFix)
  const dismissFinding = useAuditStore((s) => s.dismissFinding)

  const [filter, setFilter] = useState<FilterState>({ rule: 'all', pluginId: '', severity: 'all' })
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!report) void runAudit()
  }, [report, runAudit])

  const findings = useMemo(() => report?.findings ?? [], [report])
  const counts = report?.countsBySeverity ?? { error: 0, warn: 0, info: 0 }
  const status = healthStatus(counts)

  const pluginIds = useMemo(() => {
    const set = new Set<string>()
    for (const f of findings) if (f.pluginId) set.add(f.pluginId)
    return [...set].sort()
  }, [findings])

  const filtered = useMemo(() => findings.filter((f) => {
    if (filter.rule !== 'all' && f.rule !== filter.rule) return false
    if (filter.severity !== 'all' && f.severity !== filter.severity) return false
    if (filter.pluginId && f.pluginId !== filter.pluginId) return false
    return true
  }), [findings, filter])

  const grouped = useMemo(() => {
    const out: Record<Severity, Finding[]> = { error: [], warn: [], info: [] }
    for (const f of filtered) out[f.severity].push(f)
    return out
  }, [filtered])

  async function handleApplyFix(f: Finding) {
    if (!f.fix) return
    const ok = await applyFix(f.fix)
    if (ok) setAppliedIds((prev) => new Set(prev).add(f.id))
  }

  return (
    <section className="space-y-5 rounded-2xl border border-border bg-surface-light/85 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <ShieldAlert size={20} className="text-accent-light" />
          <div>
            <h2 className="text-lg font-semibold">Salud del sistema</h2>
            <p className="text-xs text-muted">
              Revision de consistencia y posibles ajustes seguros. Ultima revision:{' '}
              {report ? new Date(report.generatedAt).toLocaleString() : 'sin revisar'}
            </p>
          </div>
        </div>
        <button
          onClick={() => void runAudit()}
          disabled={isRunning}
          className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm hover:bg-surface-lighter disabled:opacity-50"
        >
          <RefreshCw size={14} className={isRunning ? 'animate-spin' : ''} />
          {isRunning ? 'Revisando...' : 'Volver a revisar'}
        </button>
      </header>

      <div className={`rounded-xl border px-4 py-3 ${status.tone}`}>
        <p className="text-xs uppercase tracking-wide opacity-80">Estado principal</p>
        <p className="mt-1 text-2xl font-semibold">{status.label}</p>
        <p className="mt-1 text-xs opacity-80">
          {counts.error} para revisar ahora, {counts.warn} que pueden esperar, {counts.info} informativos.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {(['error', 'warn', 'info'] as const).map((sev) => {
          const meta = SEVERITY_META[sev]
          const Icon = meta.Icon
          return (
            <button
              key={sev}
              onClick={() => setFilter((f) => ({ ...f, severity: f.severity === sev ? 'all' : sev }))}
              className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition ${meta.color} ${filter.severity === sev ? 'ring-2 ring-white/30' : ''}`}
            >
              <div>
                <p className="text-xs uppercase tracking-wide opacity-80">{meta.label}</p>
                <p className="text-2xl font-semibold">{counts[sev]}</p>
              </div>
              <Icon size={20} />
            </button>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs">
        <select
          value={filter.rule}
          onChange={(e) => setFilter((f) => ({ ...f, rule: e.target.value as RuleId | 'all' }))}
          className="rounded-md border border-border bg-surface px-2 py-1.5"
        >
          <option value="all">Todas las revisiones</option>
          {(Object.keys(RULE_META) as RuleId[]).map((r) => (
            <option key={r} value={r}>{RULE_META[r].title}</option>
          ))}
        </select>
        <select
          value={filter.pluginId}
          onChange={(e) => setFilter((f) => ({ ...f, pluginId: e.target.value }))}
          className="rounded-md border border-border bg-surface px-2 py-1.5"
        >
          <option value="">Todos los modulos</option>
          {pluginIds.map((id) => <option key={id} value={id}>{id}</option>)}
        </select>
        {(filter.rule !== 'all' || filter.pluginId || filter.severity !== 'all') && (
          <button
            className="text-muted underline hover:text-white"
            onClick={() => setFilter({ rule: 'all', pluginId: '', severity: 'all' })}
          >
            Limpiar filtros
          </button>
        )}
      </div>

      <div className="space-y-4">
        {(['error', 'warn', 'info'] as const).map((sev) => {
          const list = grouped[sev]
          if (list.length === 0) return null
          const meta = SEVERITY_META[sev]
          const Icon = meta.Icon
          return (
            <div key={sev} className="space-y-2">
              <h3 className={`flex items-center gap-2 text-sm font-semibold ${meta.color.split(' ')[0]}`}>
                <Icon size={14} /> {meta.label} ({list.length})
              </h3>
              <ul className="space-y-2">
                {list.map((f) => {
                  const rule = RULE_META[f.rule]
                  return (
                    <li key={f.id} className={`rounded-lg border p-3 text-sm ${meta.color}`}>
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-white">{rule.title}</p>
                          <p className="mt-1 text-xs opacity-90">{rule.impact}</p>
                          <p className="mt-1 text-xs opacity-90">Accion recomendada: {rule.action}</p>
                          <details className="mt-2 text-xs opacity-80">
                            <summary className="cursor-pointer text-muted hover:text-white">Ver detalle tecnico</summary>
                            <div className="mt-2 space-y-1 rounded-md border border-white/10 bg-black/10 p-2">
                              <p><span className="font-semibold">Regla:</span> {f.rule}</p>
                              {f.pluginId && <p><span className="font-semibold">Modulo:</span> {f.pluginId}</p>}
                              {f.location && <p><span className="font-semibold">Ubicacion:</span> {f.location}</p>}
                              <p><span className="font-semibold">Mensaje:</span> {f.message}</p>
                              {f.details?.suggestions ? (
                                <p><span className="font-semibold">Sugerencias:</span> {(f.details.suggestions as string[]).join(', ')}</p>
                              ) : null}
                            </div>
                          </details>
                        </div>
                        {f.fix && !appliedIds.has(f.id) && (
                          <button
                            onClick={() => void handleApplyFix(f)}
                            className="flex items-center gap-1.5 rounded-md border border-white/30 bg-white/10 px-2.5 py-1 text-xs hover:bg-white/20"
                          >
                            <Wand2 size={12} /> Aplicar ajuste seguro
                          </button>
                        )}
                        {appliedIds.has(f.id) && (
                          <span className="flex items-center gap-1 text-xs text-emerald-300">
                            <Check size={12} /> Aplicado
                          </span>
                        )}
                        <button
                          onClick={() => dismissFinding(f.id)}
                          className="text-xs text-muted underline hover:text-white"
                          title="Ocultar de esta revision"
                        >
                          Ignorar esta revision
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
        {filtered.length === 0 && (
          <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-center text-sm text-emerald-200">
            Todo bien para los filtros actuales.
          </p>
        )}
      </div>
    </section>
  )
}

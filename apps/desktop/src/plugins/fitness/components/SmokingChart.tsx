import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Cigarette } from 'lucide-react'
import { useFitnessStore } from '../store'
import { getSmokingChartData } from '../utils'
import { useFitnessSettings } from '../settings'

const CHART_STYLE = {
  grid: 'var(--chart-grid)',
  axis: 'var(--chart-axis)',
  tooltipBg: 'var(--chart-tooltip-bg)',
  tooltipBorder: 'var(--chart-tooltip-border)',
  bar: 'var(--chart-smoking)',
}

export function SmokingChart() {
  const entries = useFitnessStore((s) => s.entries)
  const { settings } = useFitnessSettings()
  const data = getSmokingChartData(entries, 14).map((entry) => ({
    ...entry,
    target: settings.maxCigarettesPerDay,
  }))

  if (!settings.smokingCessationEnabled) return null

  if (data.length === 0) {
    return (
      <div className="plugin-panel flex min-h-[300px] items-center justify-center p-6 text-center text-sm text-muted">
        Sin datos de cigarrillos.
      </div>
    )
  }

  return (
    <div className="plugin-panel min-h-[300px] p-4">
      <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold">
        <Cigarette size={16} />
        Reduccion de cigarrillos
      </h4>
      <ResponsiveContainer width="100%" height={230}>
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_STYLE.grid} vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: CHART_STYLE.axis }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11, fill: CHART_STYLE.axis }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{ background: CHART_STYLE.tooltipBg, border: `1px solid ${CHART_STYLE.tooltipBorder}`, borderRadius: 10 }}
            labelStyle={{ color: CHART_STYLE.axis }}
          />
          <Bar dataKey="cigarettes" name="Cigarrillos" fill={CHART_STYLE.bar} radius={[6, 6, 0, 0]} maxBarSize={26} />
          <Line dataKey="target" name="Limite" stroke={CHART_STYLE.axis} strokeDasharray="4 4" strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

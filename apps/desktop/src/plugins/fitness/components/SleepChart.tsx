import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useFitnessStore } from '../store'
import { getSleepChartData } from '../utils'

const CHART_STYLE = {
  grid: 'var(--chart-grid)',
  axis: 'var(--chart-axis)',
  tooltipBg: 'var(--chart-tooltip-bg)',
  tooltipBorder: 'var(--chart-tooltip-border)',
  line: '#7dd3fc',
}

export function SleepChart() {
  const entries = useFitnessStore((s) => s.entries)
  const data = getSleepChartData(entries, 14)

  if (data.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center rounded-xl border border-dashed border-border bg-surface/40 text-sm text-muted">
        Sin datos de sueño aún.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_STYLE.grid} vertical={false} />
        <XAxis dataKey="date" stroke={CHART_STYLE.axis} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis stroke={CHART_STYLE.axis} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} domain={[0, 'auto']} />
        <Tooltip
          contentStyle={{ backgroundColor: CHART_STYLE.tooltipBg, border: `1px solid ${CHART_STYLE.tooltipBorder}`, borderRadius: 10 }}
          labelStyle={{ color: CHART_STYLE.axis }}
        />
        <Line
          type="monotone"
          dataKey="sleep"
          name="Sueño"
          stroke={CHART_STYLE.line}
          strokeWidth={3}
          dot={{ r: 3, strokeWidth: 2 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

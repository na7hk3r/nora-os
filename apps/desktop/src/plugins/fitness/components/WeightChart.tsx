import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useFitnessStore } from '../store'
import { getWeightChartData } from '../utils'

const CHART_STYLE = {
  grid: 'var(--chart-grid)',
  axis: 'var(--chart-axis)',
  tooltipBg: 'var(--chart-tooltip-bg)',
  tooltipBorder: 'var(--chart-tooltip-border)',
  weightLine: 'var(--chart-weight)',
}

export function WeightChart() {
  const entries = useFitnessStore((s) => s.entries)
  const data = getWeightChartData(entries).slice(-45)

  if (data.length === 0) {
    return <EmptyChart label="Sin datos de peso aun." />
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id="fitnessWeightGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={CHART_STYLE.weightLine} stopOpacity={0.45} />
            <stop offset="95%" stopColor={CHART_STYLE.weightLine} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_STYLE.grid} vertical={false} />
        <XAxis dataKey="date" stroke={CHART_STYLE.axis} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis stroke={CHART_STYLE.axis} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
        <Tooltip
          contentStyle={{ backgroundColor: CHART_STYLE.tooltipBg, border: `1px solid ${CHART_STYLE.tooltipBorder}`, borderRadius: 10 }}
          labelStyle={{ color: CHART_STYLE.axis }}
        />
        <Area
          type="monotone"
          dataKey="weight"
          name="Peso"
          stroke={CHART_STYLE.weightLine}
          strokeWidth={3}
          fill="url(#fitnessWeightGradient)"
          dot={{ r: 3, strokeWidth: 2 }}
          activeDot={{ r: 6 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-[260px] items-center justify-center rounded-xl border border-dashed border-border bg-surface/40 text-sm text-muted">
      {label}
    </div>
  )
}

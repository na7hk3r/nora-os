import { Bar, CartesianGrid, Cell, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useFitnessStore } from '../store'
import { getMealChartData } from '../utils'

const CHART_STYLE = {
  grid: 'var(--chart-grid)',
  axis: 'var(--chart-axis)',
  tooltipBg: 'var(--chart-tooltip-bg)',
  tooltipBorder: 'var(--chart-tooltip-border)',
  mealGood: 'var(--chart-meal-good)',
  mealWarn: 'var(--chart-meal-warn)',
  mealBad: 'var(--chart-meal-bad)',
}

export function MealChart() {
  const entries = useFitnessStore((s) => s.entries)
  const data = getMealChartData(entries, 14)

  if (data.length === 0) {
    return (
      <div className="flex h-[250px] items-center justify-center rounded-xl border border-dashed border-border bg-surface/40 text-sm text-muted">
        Sin datos de comidas aun.
      </div>
    )
  }

  const getColor = (meals: number) => {
    if (meals === 4) return CHART_STYLE.mealGood
    if (meals === 3) return CHART_STYLE.mealWarn
    return CHART_STYLE.mealBad
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_STYLE.grid} vertical={false} />
        <XAxis dataKey="date" stroke={CHART_STYLE.axis} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis stroke={CHART_STYLE.axis} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} domain={[0, 4]} />
        <Tooltip
          contentStyle={{ backgroundColor: CHART_STYLE.tooltipBg, border: `1px solid ${CHART_STYLE.tooltipBorder}`, borderRadius: 10 }}
          labelStyle={{ color: CHART_STYLE.axis }}
        />
        <Bar dataKey="meals" name="Comidas" radius={[6, 6, 0, 0]} maxBarSize={26}>
          {data.map((entry) => (
            <Cell key={entry.date} fill={getColor(entry.meals)} />
          ))}
        </Bar>
        <Line
          dataKey="target"
          name="Objetivo"
          type="monotone"
          stroke={CHART_STYLE.axis}
          strokeDasharray="4 4"
          strokeWidth={2}
          dot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

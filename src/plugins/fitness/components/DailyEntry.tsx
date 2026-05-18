import { useEffect, useState } from 'react'
import { addDays, format, subDays } from 'date-fns'
import { CalendarDays, Check, ChevronLeft, ChevronRight, Save } from 'lucide-react'
import { useI18n } from '@core/i18n'
import { useFitnessStore } from '../store'
import { FITNESS_EVENTS } from '../events'
import { eventBus } from '@core/events/EventBus'
import type { DailyEntry } from '../types'
import { useFitnessSettings } from '../settings'

type MealField = 'breakfast' | 'lunch' | 'snack' | 'dinner'

interface DailyEntryForm {
  breakfast: 0 | 1
  lunch: 0 | 1
  snack: 0 | 1
  dinner: 0 | 1
  workout: DailyEntry['workout']
  cigarettes: number
  sleep: number | null
  weight: number | null
  notes: string
}

const EMPTY_FORM: DailyEntryForm = {
  breakfast: 0,
  lunch: 0,
  snack: 0,
  dinner: 0,
  workout: '',
  cigarettes: 0,
  sleep: null,
  weight: null,
  notes: '',
}

const MEALS: Array<{ field: MealField; label: string }> = [
  { field: 'breakfast', label: 'Desayuno' },
  { field: 'lunch', label: 'Almuerzo' },
  { field: 'snack', label: 'Merienda' },
  { field: 'dinner', label: 'Cena' },
]

export function DailyEntry() {
  const { formatDate } = useI18n()
  const { entries, addEntry, updateEntry } = useFitnessStore()
  const { settings } = useFitnessSettings()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [savedMessage, setSavedMessage] = useState('')

  const dateStr = format(currentDate, 'yyyy-MM-dd')
  const dayName = formatDate(currentDate, { weekday: 'long' })
  const existing = entries.find((e) => e.date === dateStr)
  const [form, setForm] = useState<DailyEntryForm>(entryToForm(existing))

  useEffect(() => {
    setForm(entryToForm(existing))
    setSavedMessage('')
  }, [existing, dateStr])

  const toggleMeal = (field: MealField) => {
    setForm((prev) => ({ ...prev, [field]: prev[field] ? 0 : 1 }))
  }

  const handleSave = async () => {
    const entry: DailyEntry = {
      date: dateStr,
      dayName,
      ...form,
      cigarettes: settings.smokingCessationEnabled ? clamp(form.cigarettes, 0, 60) : existing?.cigarettes ?? 0,
      sleep: form.sleep == null ? null : clamp(form.sleep, 0, 24),
      weight: form.weight == null ? null : clamp(form.weight, 0, 500),
    }

    if (existing) {
      updateEntry(dateStr, entry)
    } else {
      addEntry(entry)
    }

    const cols = 'date, day_name, weight, breakfast, lunch, snack, dinner, workout, cigarettes, sleep, notes'
    const placeholders = '?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?'
    const values = [
      entry.date,
      entry.dayName,
      entry.weight,
      entry.breakfast,
      entry.lunch,
      entry.snack,
      entry.dinner,
      entry.workout,
      entry.cigarettes,
      entry.sleep,
      entry.notes,
    ]

    await window.storage.execute(
      `INSERT OR REPLACE INTO fitness_daily_entries (${cols}) VALUES (${placeholders})`,
      values,
    )

    eventBus.emit(FITNESS_EVENTS.DAILY_ENTRY_SAVED, entry)
    if (entry.weight) eventBus.emit(FITNESS_EVENTS.WEIGHT_RECORDED, { weight: entry.weight, date: dateStr })
    if (entry.workout === 'A' || entry.workout === 'B') {
      eventBus.emit(FITNESS_EVENTS.WORKOUT_COMPLETED, { type: entry.workout, date: dateStr })
    }
    setSavedMessage('Registro guardado')
  }

  return (
    <section className="plugin-panel p-5">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Registro diario</h3>
          <p className="text-xs text-muted">Comidas, entreno, sueno, peso y notas.</p>
        </div>
        <div className="flex items-center gap-2">
          <IconButton label="Dia anterior" onClick={() => setCurrentDate((d) => subDays(d, 1))}>
            <ChevronLeft size={15} />
          </IconButton>
          <div className="min-w-[190px] rounded-lg border border-border bg-surface px-3 py-2 text-center">
            <p className="flex items-center justify-center gap-1.5 text-caption uppercase tracking-wider text-muted">
              <CalendarDays size={12} />
              {dayName}
            </p>
            <p className="text-sm font-medium text-white">{formatDate(currentDate, { day: 'numeric', month: 'long' })}</p>
          </div>
          <IconButton label="Dia siguiente" onClick={() => setCurrentDate((d) => addDays(d, 1))}>
            <ChevronRight size={15} />
          </IconButton>
        </div>
      </div>

      <div className="space-y-5">
        <FieldGroup label="Comidas">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {MEALS.map((meal) => (
              <button
                key={meal.field}
                type="button"
                onClick={() => toggleMeal(meal.field)}
                className={`flex min-h-[42px] items-center justify-between rounded-lg border px-3 py-2 text-sm ${
                  form[meal.field]
                    ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-100'
                    : 'border-border bg-surface text-muted hover:text-white'
                }`}
              >
                <span>{meal.label}</span>
                {form[meal.field] ? <Check size={14} /> : null}
              </button>
            ))}
          </div>
        </FieldGroup>

        <FieldGroup label="Entreno">
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 'A', label: 'Dia A' },
              { value: 'B', label: 'Dia B' },
              { value: 'R', label: 'Descanso' },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setForm((p) => ({ ...p, workout: p.workout === opt.value ? '' : opt.value as DailyEntry['workout'] }))}
                className={`min-h-[42px] rounded-lg border px-3 py-2 text-sm ${
                  form.workout === opt.value
                    ? 'border-accent/50 bg-accent/20 text-white'
                    : 'border-border bg-surface text-muted hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </FieldGroup>

        <div className={`grid grid-cols-1 gap-3 ${settings.smokingCessationEnabled ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
          {settings.smokingCessationEnabled && (
            <NumberField
              label="Cigarrillos"
              value={form.cigarettes}
              min={0}
              step={1}
              onChange={(value) => setForm((p) => ({ ...p, cigarettes: value ?? 0 }))}
            />
          )}
          <NumberField
            label="Sueno (h)"
            value={form.sleep}
            min={0}
            step={0.5}
            onChange={(value) => setForm((p) => ({ ...p, sleep: value }))}
          />
          <NumberField
            label="Peso (kg)"
            value={form.weight}
            min={0}
            step={0.1}
            onChange={(value) => setForm((p) => ({ ...p, weight: value }))}
          />
        </div>

        <label className="block space-y-1">
          <span className="text-xs text-muted">Notas</span>
          <textarea
            value={form.notes}
            onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
            className="h-20 w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          />
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void handleSave()}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent/85"
          >
            <Save size={15} />
            Guardar registro
          </button>
          {savedMessage && <span className="text-xs text-emerald-300">{savedMessage}</span>}
        </div>
      </div>
    </section>
  )
}

function entryToForm(entry: DailyEntry | undefined): DailyEntryForm {
  if (!entry) return EMPTY_FORM
  return {
    breakfast: entry.breakfast,
    lunch: entry.lunch,
    snack: entry.snack,
    dinner: entry.dinner,
    workout: entry.workout,
    cigarettes: entry.cigarettes,
    sleep: entry.sleep,
    weight: entry.weight,
    notes: entry.notes,
  }
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-xs text-muted">{label}</p>
      {children}
    </div>
  )
}

function NumberField({
  label,
  value,
  min,
  step,
  onChange,
}: {
  label: string
  value: number | null
  min: number
  step: number
  onChange: (value: number | null) => void
}) {
  return (
    <label className="space-y-1">
      <span className="text-xs text-muted">{label}</span>
      <input
        type="number"
        min={min}
        step={step}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
      />
    </label>
  )
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-muted hover:text-white"
    >
      {children}
    </button>
  )
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, value))
}

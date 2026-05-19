import { useState } from 'react'
import { Save, Ruler } from 'lucide-react'
import { useFitnessStore } from '../store'
import type { Measurement } from '../types'
import { eventBus } from '@core/events/EventBus'
import { FITNESS_EVENTS } from '../events'
import { hasAnyMeasurementValue } from '../utils'

interface MeasurementFields {
  weight: string
  armRelaxed: string
  armFlexed: string
  chest: string
  waist: string
  leg: string
}

const EMPTY_FIELDS: MeasurementFields = {
  weight: '',
  armRelaxed: '',
  armFlexed: '',
  chest: '',
  waist: '',
  leg: '',
}

const FIELD_META: Array<{ key: keyof MeasurementFields; label: string; unit: string }> = [
  { key: 'weight', label: 'Peso', unit: 'kg' },
  { key: 'armRelaxed', label: 'Brazo relajado', unit: 'cm' },
  { key: 'armFlexed', label: 'Brazo flexionado', unit: 'cm' },
  { key: 'chest', label: 'Pecho', unit: 'cm' },
  { key: 'waist', label: 'Cintura', unit: 'cm' },
  { key: 'leg', label: 'Pierna', unit: 'cm' },
]

export function MeasurementsForm() {
  const { addMeasurement } = useFitnessStore()
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [fields, setFields] = useState<MeasurementFields>(EMPTY_FIELDS)
  const [message, setMessage] = useState('')

  const set = (key: keyof MeasurementFields, val: string) => {
    setMessage('')
    setFields((prev) => ({ ...prev, [key]: val }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const measurement: Measurement = {
      date,
      weight: parseOptionalNumber(fields.weight),
      armRelaxed: parseOptionalNumber(fields.armRelaxed),
      armFlexed: parseOptionalNumber(fields.armFlexed),
      chest: parseOptionalNumber(fields.chest),
      waist: parseOptionalNumber(fields.waist),
      leg: parseOptionalNumber(fields.leg),
    }

    if (!hasAnyMeasurementValue(measurement)) {
      setMessage('Agrega al menos una medida para guardar.')
      return
    }

    addMeasurement(measurement)

    await window.storage.execute(
      `INSERT OR REPLACE INTO fitness_measurements (date, weight, arm_relaxed, arm_flexed, chest, waist, leg)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        measurement.date,
        measurement.weight,
        measurement.armRelaxed,
        measurement.armFlexed,
        measurement.chest,
        measurement.waist,
        measurement.leg,
      ],
    )

    eventBus.emit(FITNESS_EVENTS.MEASUREMENT_SAVED, {
      date: measurement.date,
      weight: measurement.weight,
    })

    setFields(EMPTY_FIELDS)
    setMessage('Medidas guardadas')
  }

  return (
    <form onSubmit={handleSubmit} className="plugin-panel p-5">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h4 className="flex items-center gap-2 text-sm font-semibold">
          <Ruler size={16} />
          Registro de medidas
        </h4>
        <label className="flex items-center gap-2 text-xs text-muted">
          Fecha
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-white"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {FIELD_META.map((field) => (
          <label key={field.key} className="space-y-1">
            <span className="flex items-center justify-between text-xs text-muted">
              <span>{field.label}</span>
              <span>{field.unit}</span>
            </span>
            <input
              type="number"
              min={0}
              step="0.1"
              value={fields[field.key]}
              onChange={(e) => set(field.key, e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            />
          </label>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent/85"
        >
          <Save size={15} />
          Guardar medidas
        </button>
        {message && (
          <span className={`text-xs ${message.includes('guardadas') ? 'text-emerald-300' : 'text-warning'}`}>
            {message}
          </span>
        )}
      </div>
    </form>
  )
}

function parseOptionalNumber(value: string): number | null {
  const normalized = value.trim().replace(',', '.')
  if (!normalized) return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

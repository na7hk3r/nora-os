export interface DailyEntry {
  id?: number
  date: string
  dayName: string
  weight: number | null
  breakfast: 0 | 1
  lunch: 0 | 1
  snack: 0 | 1
  dinner: 0 | 1
  workout: 'A' | 'B' | 'R' | ''
  cigarettes: number
  sleep: number | null
  notes: string
}

export interface Measurement {
  id?: number
  date: string
  weight: number | null
  armRelaxed: number | null
  armFlexed: number | null
  chest: number | null
  waist: number | null
  leg: number | null
}

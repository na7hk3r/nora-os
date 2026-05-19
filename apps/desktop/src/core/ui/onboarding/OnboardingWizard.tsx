import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useCoreStore } from '../../state/coreStore'
import { pluginManager } from '../../plugins/PluginManager'
import { eventBus } from '../../events/EventBus'
import { StepWelcome } from './steps/StepWelcome'
import { StepName } from './steps/StepName'
import { StepPlugins, type PluginSelection } from './steps/StepPlugins'
import { StepFitnessConfig, type FitnessConfig } from './steps/StepFitnessConfig'
import { StepFirstAction, type FirstActionResult } from './steps/StepFirstAction'
import { StepSummary } from './steps/StepSummary'
import { seedDemoData } from './seedDemoData'
import { DEFAULT_FITNESS_SETTINGS, saveFitnessSettings } from '@plugins/fitness/settings'

type Step = 'welcome' | 'name' | 'plugins' | 'fitness' | 'first-action' | 'summary'

const DOTS_STEPS: Step[] = ['name', 'plugins', 'fitness', 'first-action', 'summary']

function makeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function parsePositiveNumber(value: string): number | null {
  const normalized = value.trim().replace(',', '.')
  if (!normalized) return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

export function OnboardingWizard() {
  const { updateProfile, setActivePlugins, completeOnboarding, persistProfile } = useCoreStore()

  const [step, setStep] = useState<Step>('welcome')
  const [name, setName] = useState('')
  const [bigGoal, setBigGoal] = useState('')
  const [plugins, setPlugins] = useState<PluginSelection>({ fitness: true, work: true })
  const [fitnessConfig, setFitnessConfig] = useState<FitnessConfig>({
    goal: 'consistency',
    smokingTracker: false,
    currentWeight: '',
    weightGoal: '',
  })
  const [firstAction, setFirstAction] = useState<FirstActionResult | null>(null)

  const goTo = (s: Step) => setStep(s)
  const goBack = () => {
    setStep((current) => {
      if (current === 'name') return 'welcome'
      if (current === 'plugins') return 'name'
      if (current === 'fitness') return 'plugins'
      if (current === 'first-action') return plugins.fitness ? 'fitness' : 'plugins'
      if (current === 'summary') return 'first-action'
      return current
    })
  }

  const handleName = (data: { name: string; bigGoal: string }) => {
    setName(data.name)
    setBigGoal(data.bigGoal)
    updateProfile({ name: data.name, bigGoal: data.bigGoal || undefined })
    goTo('plugins')
  }

  const handlePlugins = (sel: PluginSelection) => {
    setPlugins(sel)
    if (sel.fitness) {
      goTo('fitness')
    } else {
      goTo('first-action')
    }
  }

  const handleFitness = async (cfg: FitnessConfig) => {
    const currentWeight = parsePositiveNumber(cfg.currentWeight)
    const targetWeight = cfg.goal === 'consistency' ? null : parsePositiveNumber(cfg.weightGoal)
    const normalizedConfig = {
      ...cfg,
      currentWeight: currentWeight ? String(currentWeight) : '',
      weightGoal: targetWeight ? String(targetWeight) : '',
    }

    setFitnessConfig(normalizedConfig)
    updateProfile({
      weightGoal: targetWeight ?? 0,
    })

    // Persist fitness preferences in plugin_state
    if (window.storage) {
      await window.storage.execute(
        `INSERT OR REPLACE INTO plugin_state (plugin_id, key, value) VALUES ('fitness', 'goal', ?)`,
        [cfg.goal],
      )
      await window.storage.execute(
        `INSERT OR REPLACE INTO plugin_state (plugin_id, key, value) VALUES ('fitness', 'smokingTracker', ?)`,
        [cfg.smokingTracker ? 'true' : 'false'],
      )
      await saveFitnessSettings({
        ...DEFAULT_FITNESS_SETTINGS,
        smokingCessationEnabled: cfg.smokingTracker,
      })
      if (currentWeight) {
        // Insert initial weight entry
        await window.storage.execute(
          `INSERT INTO fitness_daily_entries (date, weight, created_at)
           VALUES (date('now'), ?, datetime('now'))
           ON CONFLICT(date) DO UPDATE SET weight = excluded.weight`,
          [currentWeight],
        )
      }
    }

    goTo('first-action')
  }

  const handleFirstAction = async (result: FirstActionResult) => {
    setFirstAction(result)

    if (result.kind !== 'skip' && window.storage) {
      try {
        if (result.kind === 'work_task' && result.value && plugins.work) {
          await window.storage.execute(
            `INSERT INTO work_cards (id, column_id, title, description, position) VALUES (?, 'col-todo', ?, '', 0)`,
            [makeId(), result.value],
          )
          eventBus.emit(
            'WORK_CARD_CREATED',
            { source: 'onboarding' },
            { source: 'work', persist: true },
          )
        } else if (result.kind === 'fitness_weight' && result.value && plugins.fitness) {
          const weight = parsePositiveNumber(result.value)
          if (weight) {
            await window.storage.execute(
              `INSERT INTO fitness_daily_entries (date, weight, created_at)
               VALUES (date('now'), ?, datetime('now'))
               ON CONFLICT(date) DO UPDATE SET weight = excluded.weight`,
              [weight],
            )
            eventBus.emit(
              'FITNESS_WEIGHT_LOGGED',
              { source: 'onboarding' },
              { source: 'fitness', persist: true },
            )
          }
        }
      } catch (err) {
        console.warn('[Onboarding] first-action insert failed', err)
      }
    }

    goTo('summary')
  }

  const handleFinish = async (opts: { loadDemo?: boolean } = {}) => {
    const activeIds = Object.entries(plugins)
      .filter(([, v]) => v)
      .map(([k]) => k)

    // Update Zustand store (triggers storage persistence)
    setActivePlugins(activeIds)

    // Persist active plugins list to storage
    if (window.storage) {
      await window.storage.execute(
        `INSERT OR REPLACE INTO settings (key, value) VALUES ('activePlugins', ?)`,
        [JSON.stringify(activeIds)],
      )
    }

    // Synchronize PluginManager state with the new selection
    for (const plugin of pluginManager.getAllPlugins()) {
      if (activeIds.includes(plugin.manifest.id)) {
        // Initialize if not already active
        if (plugin.status === 'registered' || plugin.status === 'inactive') {
          await pluginManager.initPlugin(plugin.manifest.id)
        }
      } else {
        // Deactivate if currently active
        if (plugin.status === 'active') {
          pluginManager.deactivatePlugin(plugin.manifest.id)
        }
      }
    }

    // Seed demo data si el usuario lo eligió (best-effort, no bloqueante).
    if (opts.loadDemo) {
      try {
        await seedDemoData(activeIds)
      } catch (err) {
        console.warn('[Onboarding] seedDemoData failed', err)
      }
    }

    await persistProfile()
    await completeOnboarding()
  }

  // Progress dots (skip 'welcome' step)
  const dotIndex = DOTS_STEPS.indexOf(step)

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Bienvenida y configuración inicial"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-surface/95 backdrop-blur-sm p-6"
    >
      {/* Progress dots */}
      {step !== 'welcome' && (
        <>
          <button
            type="button"
            onClick={goBack}
            className="absolute left-6 top-6 z-10 flex items-center gap-2 rounded-full border border-border bg-surface-light/85 px-3 py-2 text-xs font-medium text-muted shadow-lg backdrop-blur transition-colors hover:border-accent/50 hover:text-white"
          >
            <ArrowLeft size={15} />
            Volver
          </button>
          <div className="absolute top-8 flex gap-2">
            {DOTS_STEPS.map((s, i) => (
              <span
                key={s}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === dotIndex ? 'w-6 bg-accent' : i < dotIndex ? 'w-3 bg-accent/40' : 'w-3 bg-border'
                }`}
              />
            ))}
          </div>
        </>
      )}

      {/* Step content */}
      <div className="w-full max-w-xl">
        {step === 'welcome' && <StepWelcome onNext={() => goTo('name')} />}
        {step === 'name' && <StepName initialName={name} initialBigGoal={bigGoal} onNext={handleName} />}
        {step === 'plugins' && (
          <StepPlugins initial={plugins} onNext={handlePlugins} />
        )}
        {step === 'fitness' && (
          <StepFitnessConfig initial={fitnessConfig} onNext={handleFitness} />
        )}
        {step === 'first-action' && (
          <StepFirstAction available={plugins} onNext={handleFirstAction} />
        )}
        {step === 'summary' && (
          <StepSummary
            name={name}
            bigGoal={bigGoal}
            plugins={plugins}
            fitnessGoal={plugins.fitness ? fitnessConfig.goal : undefined}
            firstAction={firstAction}
            onFinish={handleFinish}
          />
        )}
      </div>
    </div>
  )
}

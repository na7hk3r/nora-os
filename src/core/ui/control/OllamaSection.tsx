import { useEffect, useState } from 'react'
import { Download, ExternalLink, Sparkles, RefreshCw, Save } from 'lucide-react'
import { useI18n } from '@core/i18n'
import { ollamaService, type OllamaSettings } from '@core/services/ollamaService'

const RECOMMENDED_MODELS = [
  {
    name: 'llama3.2:3b',
    label: 'Recomendado',
    detail: 'Liviano y suficiente para empezar.',
  },
  {
    name: 'mistral:7b',
    label: 'Mas capaz',
    detail: 'Mejor calidad, requiere más recursos.',
  },
]

export function OllamaSection() {
  const { language, t } = useI18n()
  const [settings, setSettings] = useState<OllamaSettings | null>(null)
  const [savedSettings, setSavedSettings] = useState<OllamaSettings | null>(null)
  const [models, setModels] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [pullingModel, setPullingModel] = useState('')
  const [status, setStatus] = useState<string>('')

  useEffect(() => {
    void ollamaService.getSettings().then((loaded) => {
      setSettings(loaded)
      setSavedSettings(loaded)
    })
  }, [])

  const loadModels = async () => {
    const list = await ollamaService.listModels()
    setModels(list.map((m) => m.name))
    return list
  }

  const refreshModels = async () => {
    setBusy(true); setStatus(language === 'en' ? 'Searching models...' : 'Buscando modelos...')
    try {
      const list = await loadModels()
      setStatus(language === 'en'
        ? `${list.length} model${list.length === 1 ? '' : 's'} available`
        : `${list.length} modelos disponibles`)
    } catch (err) {
      setStatus(`Error: ${(err as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  const test = async () => {
    setBusy(true); setStatus(language === 'en' ? 'Testing connection...' : 'Probando conexion...')
    try {
      const h = await ollamaService.health()
      setStatus(h.ok
        ? language === 'en' ? `Connected to ${h.baseUrl}` : `Conectado a ${h.baseUrl}`
        : language === 'en' ? `Not responding - ${h.error ?? ''}` : `No responde - ${h.error ?? ''}`)
    } catch (err) {
      setStatus(`Error: ${(err as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  const pullModel = async (modelName?: string) => {
    if (!settings) return
    const model = (modelName ?? settings.model).trim()
    if (!model) {
      setStatus(language === 'en' ? 'Choose a model before downloading.' : 'Elegi un modelo antes de descargar.')
      return
    }

    setBusy(true)
    setPullingModel(model)
    setStatus(language === 'en' ? `Downloading ${model} from Ollama...` : `Descargando ${model} desde Ollama...`)
    try {
      await ollamaService.pullModel(model)
      const nextSettings = { ...settings, enabled: true, model }
      setSettings(nextSettings)
      await ollamaService.saveSettings(nextSettings)
      setSavedSettings(nextSettings)
      await loadModels()
      setStatus(language === 'en' ? `Model ${model} is ready and selected.` : `Modelo ${model} listo y seleccionado.`)
    } catch (err) {
      setStatus(language === 'en'
        ? `Could not download ${model}: ${(err as Error).message}`
        : `No se pudo descargar ${model}: ${(err as Error).message}`)
    } finally {
      setBusy(false)
      setPullingModel('')
    }
  }

  const save = async () => {
    if (!settings) return
    setBusy(true)
    try {
      await ollamaService.saveSettings(settings)
      setSavedSettings(settings)
      setStatus(language === 'en' ? 'Settings saved' : 'Configuración guardada')
    } finally {
      setBusy(false)
    }
  }

  if (!settings) return null
  const dirty = Boolean(savedSettings && JSON.stringify(savedSettings) !== JSON.stringify(settings))
  const recommendedModels = language === 'en' ? [
    {
      name: 'llama3.2:3b',
      label: 'Recommended',
      detail: 'Lightweight and enough to get started.',
    },
    {
      name: 'mistral:7b',
      label: 'More capable',
      detail: 'Better quality, requires more resources.',
    },
  ] : RECOMMENDED_MODELS

  return (
    <article className="rounded-2xl border border-border bg-surface-light/85 p-6">
      <div className="flex items-center gap-2">
        <Sparkles size={18} className="text-accent-light" />
        <h2 className="text-lg font-semibold">{language === 'en' ? 'Ollama (local AI)' : 'Ollama (IA local)'}</h2>
      </div>
      <p className="mt-1 text-sm text-muted">
        {language === 'en'
          ? 'Connect Nora OS to your local Ollama instance (http://127.0.0.1:11434) for AI analysis based on your data. Everything runs offline.'
          : 'Conecta Nora OS a tu instancia local de Ollama (http://127.0.0.1:11434) para analisis con IA basados en tus datos. Todo se procesa offline.'}
      </p>

      <div className="mt-4 space-y-3">
        <label className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3">
          <div>
            <p className="text-sm font-medium">{language === 'en' ? 'Enable Ollama' : 'Habilitar Ollama'}</p>
            <p className="text-xs text-muted">
              {language === 'en' ? 'When it is off, no network calls are made.' : 'Si está apagado no se hace ninguna llamada de red'}
            </p>
          </div>
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
            className="h-4 w-4"
          />
        </label>

        {settings.enabled && (
          <div className="rounded-lg border border-accent/30 bg-accent/5 px-4 py-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-medium text-white">
                  {language === 'en' ? 'Initial model setup' : 'Configuración inicial del modelo'}
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  {language === 'en'
                    ? 'Download the model from Nora OS. You only need Ollama installed and open.'
                    : 'Descarga el modelo desde Nora OS. Solo necesitas tener Ollama instalado y abierto.'}
                </p>
              </div>
              <a
                href="https://ollama.com/download"
                target="_blank"
                rel="noreferrer"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs text-muted hover:border-accent/50 hover:text-white"
              >
                {language === 'en' ? 'Install Ollama' : 'Instalar Ollama'}
                <ExternalLink size={12} />
              </a>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {recommendedModels.map((model) => (
                <button
                  key={model.name}
                  type="button"
                  onClick={() => void pullModel(model.name)}
                  disabled={busy}
                  className={`rounded-lg border p-3 text-left transition-colors disabled:opacity-60 ${
                    settings.model === model.name
                      ? 'border-accent/60 bg-accent/10'
                      : 'border-border bg-surface/70 hover:border-accent/40'
                  }`}
                >
                  <span className="block text-xs font-semibold text-white">{model.label}</span>
                  <span className="mt-0.5 block text-caption text-muted">{model.name}</span>
                  <span className="mt-1 block text-caption text-muted/85">{model.detail}</span>
                </button>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void pullModel()}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-lg border border-accent/50 bg-accent/10 px-3 py-2 text-xs font-medium text-accent-light hover:bg-accent/15 disabled:opacity-60"
              >
                <Download size={13} className={pullingModel ? 'animate-pulse' : ''} />
                {pullingModel
                  ? language === 'en' ? 'Downloading...' : 'Descargando...'
                  : language === 'en' ? 'Download selected model' : 'Descargar modelo seleccionado'}
              </button>
              <button
                type="button"
                onClick={() => void refreshModels()}
                disabled={busy}
                className="rounded-lg border border-border bg-surface px-3 py-2 text-xs text-muted hover:text-white disabled:opacity-60"
              >
                {language === 'en' ? 'Detect installed' : 'Detectar instalados'}
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="text-xs text-muted">{language === 'en' ? 'Model' : 'Modelo'}</span>
            <div className="flex gap-2">
              <input
                value={settings.model}
                onChange={(e) => setSettings({ ...settings, model: e.target.value })}
                list="ollama-models"
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                placeholder="llama3.2:3b"
              />
              <datalist id="ollama-models">
                {models.map((m) => <option key={m} value={m} />)}
              </datalist>
              <button
                type="button"
                onClick={() => void refreshModels()}
                disabled={busy}
                className="shrink-0 rounded-lg border border-border bg-surface px-3 text-xs text-muted hover:text-white"
                title={language === 'en' ? 'Load available models' : 'Cargar modelos disponibles'}
              ><RefreshCw size={12} className={busy ? 'animate-spin' : ''} /></button>
            </div>
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted">{language === 'en' ? 'Temperature' : 'Temperatura'} ({settings.temperature})</span>
            <input
              type="range"
              min={0}
              max={1.5}
              step={0.1}
              value={settings.temperature}
              onChange={(e) => setSettings({ ...settings, temperature: Number(e.target.value) })}
              className="w-full"
            />
          </label>
        </div>

        <label className="block space-y-1">
          <span className="text-xs text-muted">
            {language === 'en' ? 'System prompt (defines the coach personality)' : 'Prompt de sistema (define personalidad del coach)'}
          </span>
          <textarea
            value={settings.systemPrompt}
            onChange={(e) => setSettings({ ...settings, systemPrompt: e.target.value })}
            rows={4}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs"
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          onClick={() => void save()}
          disabled={busy || !dirty}
          className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-xs font-medium text-white hover:bg-accent/85 disabled:opacity-60"
        ><Save size={13} /> {t.common.save}</button>
        <button
          onClick={() => void test()}
          disabled={busy}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-xs text-muted hover:text-white disabled:opacity-60"
        >{language === 'en' ? 'Test connection' : 'Probar conexion'}</button>
        {dirty && <span className="text-xs text-warning">{t.control.appearance.unsaved}</span>}
        {status && <span className="text-xs text-muted">{status}</span>}
      </div>
    </article>
  )
}

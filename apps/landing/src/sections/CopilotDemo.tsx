import { useEffect, useMemo, useState } from 'react'
import {
  Bot,
  Sparkles,
  Zap,
  Dumbbell,
  Wallet,
  Target,
  Clock,
  BookOpen,
  Moon,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Flame,
  BarChart3,
  Coffee,
  Sunrise,
  ChefHat,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { motion } from 'framer-motion'
import { Section } from '../components/Section'
import { useTypewriter } from '../hooks/useTypewriter'
import { useI18n } from '../i18n'

interface Bullet {
  icon: LucideIcon
  text: string
}

interface Reply {
  body: string
  bullets?: Bullet[]
  closing?: string
}

interface QuickAction {
  label: string
  reply: Reply
}

const initialBulletIcons = [Zap, Dumbbell, Wallet] as const
const quickActionIcons = [
  [Target, Clock],
  [Sunrise, Coffee, BookOpen, ChefHat, Dumbbell],
  [BookOpen, Moon, TrendingUp],
  [CheckCircle2, Flame, BarChart3, AlertTriangle],
] as const

function withIcons(copy: { body: string; bullets?: string[]; closing?: string }, icons: readonly LucideIcon[]): Reply {
  return {
    body: copy.body,
    closing: copy.closing,
    bullets: copy.bullets?.map((text, idx) => ({
      text,
      icon: icons[idx] ?? Sparkles,
    })),
  }
}

function ReplyView({ reply }: { reply: Reply }) {
  const { text, done } = useTypewriter(reply.body, {
    speed: 18,
    startDelay: 80,
    whenVisible: false,
  })

  return (
    <div className="space-y-3">
      <p className="min-h-[1.5em] font-mono text-sm leading-relaxed text-foreground md:text-[1rem]">
        {text}
        {!done && (
          <span
            aria-hidden="true"
            className="ml-[1px] inline-block w-[0.55ch] bg-accent"
            style={{ height: '1em', verticalAlign: 'middle' }}
          />
        )}
      </p>

      {done && reply.bullets && reply.bullets.length > 0 && (
        <ul className="space-y-1.5 animate-fade-in">
          {reply.bullets.map((b) => (
            <li key={b.text} className="flex items-start gap-2.5 text-sm leading-relaxed text-muted">
              <b.icon className="mt-0.5 h-4 w-4 shrink-0 text-accent-light" aria-hidden="true" />
              <span>{b.text}</span>
            </li>
          ))}
        </ul>
      )}

      {done && reply.closing && (
        <p className="mt-3 whitespace-pre-line border-t border-border/50 pt-3 text-sm leading-relaxed text-foreground/90 animate-fade-in">
          {reply.closing}
        </p>
      )}
    </div>
  )
}

export function CopilotDemo() {
  const { t } = useI18n()
  const initialReply = useMemo(
    () => withIcons(t.copilot.initial, initialBulletIcons),
    [t.copilot.initial],
  )
  const quickActions = useMemo<QuickAction[]>(
    () =>
      t.copilot.actions.map((action, idx) => ({
        label: action.label,
        reply: withIcons(action.reply, quickActionIcons[idx] ?? []),
      })),
    [t.copilot.actions],
  )
  const [reply, setReply] = useState<Reply>(initialReply)
  const [activeIdx, setActiveIdx] = useState<number | null>(null)

  useEffect(() => {
    setReply(initialReply)
    setActiveIdx(null)
  }, [initialReply])

  const replyKey = useMemo(
    () => `${activeIdx ?? 'init'}-${reply.body.slice(0, 8)}`,
    [reply, activeIdx],
  )

  function handleClick(idx: number) {
    setActiveIdx(idx)
    setReply(quickActions[idx].reply)
  }

  return (
    <Section
      id="copilot-demo"
      eyebrow={t.copilot.eyebrow}
      title={t.copilot.title}
      description={t.copilot.description}
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.6 }}
        className="mx-auto max-w-3xl"
      >
        <div className="window-frame">
          <div className="flex items-center gap-3 border-b border-border bg-surface-light/50 px-4 py-3 sm:px-5">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
              <Bot className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold leading-tight text-foreground">
                {t.copilot.headerTitle}
              </p>
              <p className="flex items-center gap-1.5 text-xs leading-tight text-muted">
                <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" aria-hidden="true" />
                <span className="truncate">{t.copilot.status}</span>
              </p>
            </div>
            <span className="hidden items-center gap-1 text-[10px] uppercase tracking-widest text-muted sm:inline-flex">
              <Sparkles className="h-3 w-3" aria-hidden="true" />
              {t.copilot.demoLabel}
            </span>
          </div>

          <div className="min-h-[280px] px-4 py-6 sm:px-5">
            <ReplyView key={replyKey} reply={reply} />
          </div>

          <div className="border-t border-border bg-base/40 px-3 py-3 sm:px-4">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {quickActions.map((qa, idx) => {
                const isActive = activeIdx === idx
                return (
                  <button
                    key={qa.label}
                    type="button"
                    onClick={() => handleClick(idx)}
                    className={`rounded-lg border px-3 py-2 text-left text-xs leading-snug transition-colors md:text-sm ${
                      isActive
                        ? 'border-accent/50 bg-accent/15 text-foreground'
                        : 'border-border bg-surface/60 text-muted hover:border-accent/40 hover:text-foreground'
                    }`}
                  >
                    {qa.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap justify-start gap-2 sm:justify-center">
          {t.copilot.badges.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-light/70 px-3 py-1 text-xs leading-relaxed text-muted"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
              {tag}
            </span>
          ))}
        </div>

        <p className="mt-4 text-left text-xs leading-relaxed text-muted sm:text-center md:text-sm">
          {t.copilot.privacyLine}
        </p>
      </motion.div>
    </Section>
  )
}

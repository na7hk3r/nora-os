import { motion } from 'framer-motion'
import { Section } from '../components/Section'
import { DownloadButton } from '../components/DownloadButton'
import {
  FALLBACK_RELEASES_URL,
  useLatestRelease,
  type ReleaseAsset,
} from '../hooks/useLatestRelease'
import { Download, Apple, Monitor, HardDrive } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useI18n } from '../i18n'

interface Row {
  os: string
  type: string
  asset?: ReleaseAsset
  icon: LucideIcon
}

function fmtSize(bytes?: number): string {
  if (!bytes) return '—'
  const mb = bytes / 1024 / 1024
  return `${mb.toFixed(1)} MB`
}

export function Download_() {
  const { release, loading, error } = useLatestRelease()
  const { language, t } = useI18n()
  const installerType = language === 'en' ? 'Installer (NSIS)' : 'Instalador (NSIS)'

  const rows: Row[] = release
    ? [
        { os: 'Windows', type: installerType, asset: release.assets.windows, icon: Monitor },
        { os: 'Windows', type: 'Portable', asset: release.assets.windowsPortable, icon: Monitor },
        { os: 'Linux', type: 'AppImage', asset: release.assets.linuxAppImage, icon: HardDrive },
        { os: 'Linux', type: 'Debian (.deb)', asset: release.assets.linuxDeb, icon: HardDrive },
        { os: 'macOS', type: 'DMG', asset: release.assets.macDmg, icon: Apple },
      ]
    : []

  return (
    <Section id="download">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.6 }}
        className="mx-auto max-w-3xl text-left sm:text-center"
      >
        <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-accent">
          {t.download.eyebrow}
        </p>
        <h2 className="text-4xl font-bold leading-tight text-foreground text-balance md:text-5xl">
          {t.download.titlePrefix}{' '}
          <span className="text-gradient-accent animate-gradient-shift">{t.download.titleAccent}</span>
        </h2>
        <div className="mt-5 text-lg leading-relaxed text-muted text-pretty">
          <p>{t.download.intro}</p>
          {release && (
            <p className="mt-2 text-sm text-muted/80">
              {t.download.version} {release.version}
              {release.publishedAt && (
                <>
                  {' '}
                  · {t.download.published}{' '}
                  {new Date(release.publishedAt).toLocaleDateString(t.locale)}
                </>
              )}
            </p>
          )}
        </div>

        <div className="mt-10 flex justify-start sm:justify-center">
          <DownloadButton size="lg" className="w-full sm:w-auto" />
        </div>
      </motion.div>

      {loading && !release && (
        <p className="mt-10 text-left text-muted sm:text-center">{t.download.loading}</p>
      )}

      {error && !release && (
        <div className="mt-10 text-left sm:text-center">
          <p className="mb-3 leading-relaxed text-muted">{t.download.error}</p>
          <a
            href={FALLBACK_RELEASES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-accent hover:underline"
          >
            {t.download.releaseLink}
          </a>
        </div>
      )}

      {release && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="mx-auto mt-12 max-w-3xl overflow-x-auto rounded-2xl border border-border bg-surface/60"
        >
          <table className="w-full min-w-[620px] text-sm">
            <thead>
              <tr className="bg-surface-light text-left text-foreground">
                <th scope="col" className="px-4 py-3 font-semibold">{t.download.table.os}</th>
                <th scope="col" className="px-4 py-3 font-semibold">{t.download.table.type}</th>
                <th scope="col" className="px-4 py-3 font-semibold">{t.download.table.size}</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">{t.download.table.download}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ os, type, asset, icon: Icon }) => (
                <tr key={`${os}-${type}`} className="border-t border-border transition-colors hover:bg-surface-light/50">
                  <td className="px-4 py-3 text-foreground">
                    <span className="inline-flex items-center gap-2">
                      <Icon className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
                      {os}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted">{type}</td>
                  <td className="px-4 py-3 text-muted">{fmtSize(asset?.size)}</td>
                  <td className="px-4 py-3 text-right">
                    {asset ? (
                      <a
                        href={asset.url}
                        className="inline-flex items-center gap-1 text-accent hover:underline"
                        aria-label={`${t.download.download} ${asset.name}`}
                      >
                        <Download className="h-4 w-4" aria-hidden="true" />
                        {t.download.download}
                      </a>
                    ) : (
                      <span className="text-muted">{t.download.unavailable}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      )}

      <p className="mt-8 text-left text-xs leading-relaxed text-muted sm:text-center">
        {t.download.footerMeta}
      </p>
      <p className="mt-2 text-left text-xs leading-relaxed text-muted sm:text-center">
        {t.download.previousQuestion}{' '}
        <a
          href={FALLBACK_RELEASES_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:underline"
        >
          {t.download.history}
        </a>
      </p>
    </Section>
  )
}

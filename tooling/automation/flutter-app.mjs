#!/usr/bin/env node
import { existsSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { delimiter, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const mobileRoot = resolve(repoRoot, 'apps/mobile')
const args = process.argv.slice(2)

if (args.length === 0) {
  console.error('Usage: node tooling/automation/flutter-app.mjs <flutter-command> [...args]')
  process.exit(1)
}

function findFlutterRoot() {
  if (process.env.FLUTTER_ROOT) {
    return process.env.FLUTTER_ROOT
  }

  for (const entry of (process.env.PATH ?? '').split(delimiter)) {
    if (!entry) continue
    if (existsSync(join(entry, 'flutter.bat'))) {
      return resolve(entry, '..')
    }
  }

  return null
}

const env = { ...process.env }
let command = 'flutter'
let commandArgs = args

if (process.platform === 'win32') {
  const flutterRoot = findFlutterRoot()
  if (!flutterRoot) {
    console.error('Unable to locate Flutter SDK. Add Flutter to PATH or set FLUTTER_ROOT.')
    process.exit(1)
  }

  const dart = join(flutterRoot, 'bin', 'cache', 'dart-sdk', 'bin', 'dart.exe')
  const flutterTools = join(flutterRoot, 'packages', 'flutter_tools')
  const snapshot = join(flutterRoot, 'bin', 'cache', 'flutter_tools.snapshot')
  const packageConfig = join(flutterTools, '.dart_tool', 'package_config.json')
  const mingit = join(flutterRoot, 'bin', 'mingit', 'cmd')

  command = dart
  commandArgs = [`--packages=${packageConfig}`, snapshot, '--suppress-analytics', ...args]
  env.FLUTTER_ROOT = flutterRoot
  env.FLUTTER_ALREADY_LOCKED = 'true'
  if (existsSync(mingit)) {
    env.PATH = `${env.PATH ?? ''}${delimiter}${mingit}`
  }
}

const child = spawn(command, commandArgs, {
  cwd: mobileRoot,
  env,
  stdio: 'inherit',
})

child.on('exit', (code, signal) => {
  if (signal) {
    console.error(`flutter ${args.join(' ')} stopped by ${signal}`)
    process.exit(1)
  }

  process.exit(code ?? 1)
})

child.on('error', (error) => {
  console.error(error.message)
  process.exit(1)
})

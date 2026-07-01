import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))

export async function run() {
  const scripts = pkg.scripts ?? {}
  const build = pkg.build ?? {}

  if (!scripts['build:win']?.includes('electron-builder')) {
    throw new Error('package.json scripts.build:win must run electron-builder')
  }
  if (!scripts['build:mac']?.includes('electron-builder')) {
    throw new Error('package.json scripts.build:mac must run electron-builder')
  }
  if (!scripts.dist?.includes('electron-builder')) {
    throw new Error('package.json scripts.dist must run electron-builder --win --mac')
  }
  if (build.appId !== 'com.resumeintel.app') {
    throw new Error('build.appId must be com.resumeintel.app')
  }
  if (!build.win?.target?.includes('nsis')) {
    throw new Error('build.win.target must include nsis')
  }
  if (!build.mac?.target?.includes('dmg')) {
    throw new Error('build.mac.target must include dmg')
  }
  const extra = build.extraResources ?? []
  if (!extra.some((e) => String(e.to).includes('browsers'))) {
    throw new Error('build.extraResources must bundle Playwright browsers')
  }

  return { ok: true, message: 'electron-builder packaging config present' }
}

import fs from 'fs'
import os from 'os'
import path from 'path'
import { fileURLToPath } from 'url'
import { execFile } from 'child_process'
import { promisify } from 'util'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const runFile = promisify(execFile)
const runtimeFiles = [
  'lib/datos.db',
  'lib/datos.db-shm',
  'lib/datos.db-wal',
]

function runGit(args) {
  return runFile('git', args, {
    maxBuffer: 10 * 1024 * 1024,
    cwd: process.cwd(),
  })
}

async function getTrackedChanges() {
  const changed = new Set()

  for (const args of [['diff', '--name-only', '-z'], ['diff', '--cached', '--name-only', '-z']]) {
    const { stdout } = await runGit(args)
    for (const file of stdout.split('\0')) {
      if (file) changed.add(file)
    }
  }

  return [...changed]
}

function protectRuntimeFiles() {
  const temporaryDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nino-update-'))
  const moved = []

  for (const relativeFile of runtimeFiles) {
    const source = path.join(process.cwd(), relativeFile)
    if (!fs.existsSync(source)) continue

    const target = path.join(temporaryDir, relativeFile.replaceAll('/', '__'))
    fs.renameSync(source, target)
    moved.push({ source, target })
  }

  return {
    restore() {
      for (const { source, target } of moved) {
        if (fs.existsSync(source)) fs.rmSync(source, { force: true })
        fs.renameSync(target, source)
      }

      fs.rmSync(temporaryDir, { recursive: true, force: true })
    },
  }
}

function parseGitStatus(output) {
  const ignored = [
    'node_modules/',
    'backups/',
    'Sessions/',
    '.cache/',
    '.npm/',
    'tmp/',
    '.db',
    '.db-shm',
    '.db-wal',
    '.tar.gz',
    'package-lock.json'
  ]

  return output
    .trim()
    .split('\n')
    .filter(line => {
      const file = line.slice(3)
      return !ignored.some(i => file.includes(i))
    })
    .map(line => {
      const status = line.slice(0, 2).trim()
      const file = line.slice(3)
      return `• ${file} (${status})`
    })
    .join('\n')
}

async function reloadCommands(dir = path.join(__dirname, '..')) {
  const commandsMap = new Map()

  async function readCommands(folder) {
    const files = fs.readdirSync(folder)
    for (const file of files) {
      const fullPath = path.join(folder, file)
      if (fs.lstatSync(fullPath).isDirectory()) {
        await readCommands(fullPath)
      } else if (file.endsWith('.js')) {
        try {
          const { default: cmd } = await import(fullPath + '?update=' + Date.now())
          if (cmd?.command) {
            for (const c of cmd.command) {
              commandsMap.set(c.toLowerCase(), cmd)
            }
          }
        } catch (err) {
          console.error(`Error recargando comando ${file}:`, err)
        }
      }
    }
  }

  await readCommands(dir)
  global.comandos = commandsMap
}

export default {
  command: ['fix', 'update'],
  isOwner: true,

  run: async ({ client, m }) => {
    let runtimeBackup
    let stashCreated = false

    try {
      const { stdout: statusOut } = await runGit(['status', '--porcelain'])
      const filteredList = parseGitStatus(statusOut)
      const trackedChanges = await getTrackedChanges()

      runtimeBackup = protectRuntimeFiles()

      if (trackedChanges.length) {
        const { stdout: stashOutput } = await runGit([
          'stash',
          'push',
          '-m',
          `Nino update backup ${new Date().toISOString()}`,
          '--',
          ...trackedChanges,
        ])
        stashCreated = !stashOutput.includes('No local changes')
      }

      const { stdout, stderr } = await runGit(['pull'])
      await reloadCommands(path.join(__dirname, '..'))

      let msg = ''

      if (filteredList.length) {
        msg +=
          '⚠️ *Cambios locales detectados y guardados en Git stash*\n' +
          '*Archivos protegidos:*\n' +
          filteredList +
          '\n\n'
      }

      if (stdout.includes('Already up to date')) {
        msg += 'ꕥ *Estado:* Todo está actualizado'
      } else {
        msg += `✅ *Actualización completada*\n\n${stdout || stderr}`
      }

      await client.sendMessage(
        m.key.remoteJid,
        { text: msg + '\n\nReinicia el bot para aplicar los cambios completos.' },
        { quoted: m }
      )
    } catch (error) {
      if (stashCreated) {
        try {
          await runGit(['stash', 'pop', '--index'])
        } catch (restoreError) {
          console.error('No se pudieron restaurar los cambios locales:', restoreError)
        }
      }

      await client.sendMessage(
        m.key.remoteJid,
        { text: `❌ Error al actualizar\n\n${error.stderr || error.message}` },
        { quoted: m }
      )
    } finally {
      runtimeBackup?.restore()
    }
  }
}
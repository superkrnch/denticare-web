/**
 * Provision Firebase Storage via REST API + deploy rules.
 *
 * Prerequisites:
 *   1. Firebase CLI logged in: npx -y firebase-tools@latest login
 *   2. Blaze plan (billing linked). Example:
 *        gcloud auth login
 *        gcloud billing accounts list
 *        gcloud billing projects link denticare-app --billing-account=YOUR_BILLING_ACCOUNT_ID
 *
 * Usage:
 *   node scripts/setup-storage.mjs [location]
 *   Default location: asia-southeast1
 */

import { readFileSync, existsSync } from 'fs'
import { homedir } from 'os'
import { join, dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { spawnSync } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))

try {
  const envPath = resolve(__dirname, '../.env')
  readFileSync(envPath, 'utf8').split('\n').forEach((line) => {
    const [key, ...vals] = line.split('=')
    if (key && vals.length) process.env[key.trim()] = vals.join('=').trim()
  })
} catch { /* optional */ }

const PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID || 'denticare-app'
const LOCATION = process.argv[2] || process.env.FIREBASE_STORAGE_LOCATION || 'asia-southeast1'
const OAUTH_CLIENT_ID = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com'

function configPath() {
  return join(homedir(), '.config', 'configstore', 'firebase-tools.json')
}

function loadCliConfig() {
  const path = configPath()
  if (!existsSync(path)) {
    throw new Error('Firebase CLI not logged in. Run: npx -y firebase-tools@latest login')
  }
  return JSON.parse(readFileSync(path, 'utf8'))
}

async function refreshAccessToken(refreshToken) {
  const body = new URLSearchParams({
    client_id: OAUTH_CLIENT_ID,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  })
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error_description || data.error || 'Failed to refresh Firebase CLI token')
  }
  return data.access_token
}

async function getAccessToken() {
  const config = loadCliConfig()
  const { access_token, refresh_token, expires_at } = config.tokens || {}
  if (access_token && expires_at && Date.now() < expires_at - 60_000) {
    return access_token
  }
  if (!refresh_token) {
    throw new Error('Firebase CLI token expired. Run: npx -y firebase-tools@latest login')
  }
  return refreshAccessToken(refresh_token)
}

async function createDefaultBucket(token) {
  const url = `https://firebasestorage.googleapis.com/v1alpha/projects/${PROJECT_ID}/defaultBucket`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ location: LOCATION }),
  })

  const text = await res.text()
  let data
  try {
    data = JSON.parse(text)
  } catch {
    data = { raw: text }
  }

  if (res.ok) return data

  const message = data?.error?.message || text
  if (/already exists|ALREADY_EXISTS/i.test(message)) {
    console.log('Default Storage bucket already exists.')
    return data
  }
  throw new Error(message)
}

function deployStorageRules() {
  console.log('Deploying storage.rules...')
  const result = spawnSync(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['-y', 'firebase-tools@latest', 'deploy', '--only', 'storage', '--project', PROJECT_ID],
    { stdio: 'inherit', shell: process.platform === 'win32' },
  )
  if (result.status !== 0) {
    throw new Error('Failed to deploy storage rules')
  }
}

function printBillingHelp() {
  console.error(`
Storage requires the Blaze (pay-as-you-go) plan on project "${PROJECT_ID}".

Run these commands once (Google Cloud SDK):

  gcloud auth login
  gcloud billing accounts list
  gcloud billing projects link ${PROJECT_ID} --billing-account=YOUR_BILLING_ACCOUNT_ID

Then re-run:

  npm run setup:storage

Blaze still includes free usage quotas — you are only charged if you exceed them.
`)
}

async function main() {
  console.log(`Project: ${PROJECT_ID}`)
  console.log(`Storage location: ${LOCATION}\n`)

  const token = await getAccessToken()
  const result = await createDefaultBucket(token)

  const bucket =
    result?.bucket?.name ||
    result?.name ||
    `${PROJECT_ID}.firebasestorage.app`

  console.log(`Storage bucket ready: ${bucket}\n`)
  deployStorageRules()
  console.log('\nFirebase Storage setup complete.')
}

main().catch((err) => {
  const msg = err.message || String(err)
  console.error('Storage setup failed:', msg)
  if (/billing|Blaze|pricing plan|accountDisabled|permission/i.test(msg)) {
    printBillingHelp()
  }
  process.exit(1)
})

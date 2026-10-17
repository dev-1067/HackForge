/* End-to-end check of the whole product in a real browser.
 *
 *   backend on :8000 (demo accounts on), front end on :5173 or :4173
 *   NODE_PATH=$(npm root -g) node e2e/smoke.cjs [baseUrl]
 *
 * Needs the `playwright` package and a Chromium (set CHROME to its path if it is not the default).
 */
const { chromium } = require('playwright')

const BASE = process.argv[2] || 'http://localhost:5173'
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const PASSWORD = process.env.TJ_DEMO_PASSWORD || 'demo-pass-123'
const OPS_EMAIL = 'ops@trustjuggler.demo'
const RIDER_PHONE = '9000000001'
const SHOTS = process.env.SHOTS || ''

const results = []
let browser

async function step(name, fn) {
  try {
    await fn()
    results.push([true, name])
    console.log(`  ok   ${name}`)
  } catch (error) {
    results.push([false, name, error.message.split('\n')[0]])
    console.log(`  FAIL ${name}\n       ${error.message.split('\n')[0]}`)
  }
}
const expect = (cond, message) => { if (!cond) throw new Error(message) }

async function newPage(opts = {}) {
  const context = await browser.newContext({ viewport: { width: 1366, height: 800 }, reducedMotion: 'reduce', ...opts })
  const page = await context.newPage()
  page.problems = []
  page.on('pageerror', (e) => page.problems.push(`pageerror: ${e.message}`))
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) page.problems.push(`console: ${m.text()}`) })
  return page
}

async function companySignIn(page, email = OPS_EMAIL, password = PASSWORD) {
  await page.goto(`${BASE}/company/login`)
  await page.getByLabel('Work email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
}

async function noHorizontalScroll(page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow <= 1, `page scrolls sideways by ${overflow}px`)
}

;(async () => {
  browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] })

  console.log('Landing page and entry points')
  const anon = await newPage()
  await step('landing page loads with the Trust Juggler name', async () => {
    await anon.goto(BASE)
    await anon.waitForSelector('text=Trust Juggler')
    expect((await anon.title()).includes('Trust Juggler'), 'title')
  })
  await step('the landing page "Explore" link leads to sign in when signed out', async () => {
    await anon.goto(`${BASE}/dashboard`)
    await anon.waitForURL(/\/company\/login\?next=%2Fdashboard/)
    await anon.getByRole('heading', { name: 'Team sign in' }).waitFor()
  })
  await step('the sign-in chooser offers both roles', async () => {
    await anon.goto(`${BASE}/login`)
    await anon.getByRole('link', { name: /delivery partner/i }).click()
    await anon.waitForURL(/\/rider\/login/)
  })

  console.log('Company sign in')
  await step('empty company form shows field errors and sends nothing', async () => {
    await anon.goto(`${BASE}/company/login`)
    await anon.getByRole('button', { name: 'Sign in' }).click()
    await anon.getByText('Enter a valid work email.').waitFor()
    await anon.getByText('Enter your password.').waitFor()
  })
  await step('wrong password is rejected with a calm message', async () => {
    await companySignIn(anon, OPS_EMAIL, 'wrong-password-1')
    await anon.getByRole('alert').getByText(/not right/).waitFor()
    expect(anon.url().includes('/company/login'), 'should stay on sign in')
  })
  await step('a rider phone number does not work as a company login', async () => {
    await companySignIn(anon, 'rider@example.com', PASSWORD)
    await anon.getByRole('alert').waitFor()
  })

  const ops = await newPage()
  await step('valid company sign in lands on the dashboard (and ?next is honoured)', async () => {
    await ops.goto(`${BASE}/dashboard`)
    await ops.waitForURL(/company\/login/)
    await ops.getByLabel('Work email').fill(OPS_EMAIL)
    await ops.getByLabel('Password', { exact: true }).fill(PASSWORD)
    await ops.getByRole('button', { name: 'Sign in' }).click()
    await ops.waitForURL(/\/dashboard$/)
    await ops.getByRole('heading', { name: 'Dashboard', level: 1 }).waitFor()
  })

  console.log('Company dashboard')
  await step('dashboard shows real numbers, a live state and recent sessions', async () => {
    await ops.getByText('Sessions checked').waitFor()
    await ops.getByText('Live', { exact: true }).waitFor({ timeout: 8000 })
    await ops.locator('table tbody tr').first().waitFor()
    expect(await ops.locator('table tbody tr').count() >= 5, 'expected recent sessions')
    const sessions = await ops.locator('text=Sessions checked').locator('xpath=..').locator('p').nth(1).innerText()
    expect(Number(sessions.replace(/,/g, '')) > 500, `sessions checked looks wrong: ${sessions}`)
  })
  await step('no internal level codes are shown on the dashboard', async () => {
    const text = await ops.locator('main').innerText()
    expect(!/\bL[0-4]\b/.test(text), 'found an L0-L4 code on screen')
  })
  await step('sidebar uses the simple labels', async () => {
    const nav = await ops.getByRole('navigation', { name: 'Main' }).innerText()
    for (const label of ['Dashboard', 'Needs review', 'Riders', 'History', 'Demo lab', 'How it compares']) {
      expect(nav.includes(label), `missing sidebar label ${label}`)
    }
    for (const old of ['Operations Console', 'Identity Signals', 'Risk Assessment', 'Audit Trail', 'Session Intelligence']) {
      expect(!nav.includes(old), `still shows ${old}`)
    }
  })
  await step('the "Needs attention" filter and search work', async () => {
    await ops.getByRole('button', { name: 'Needs attention' }).click()
    await ops.waitForTimeout(200)
    await ops.getByRole('button', { name: 'All', exact: true }).click()
    await ops.getByLabel('Search sessions').fill('zzz-no-match')
    await ops.getByText('Nothing matches').waitFor()
    await ops.getByLabel('Search sessions').fill('')
    await ops.locator('table tbody tr').first().waitFor()
  })
  await step('clicking a rider in the table opens their page', async () => {
    await ops.locator('table tbody tr a').first().click()
    await ops.waitForURL(/\/riders\/R/)
    await ops.getByRole('heading', { name: 'Usual pattern' }).waitFor()
    await ops.getByRole('heading', { name: 'Recent sessions' }).waitFor()
    await ops.getByRole('link', { name: /All riders/ }).click()
    await ops.waitForURL(/\/riders$/)
  })
  await step('rider list: search, filter and show more', async () => {
    await ops.locator('table tbody tr').first().waitFor()
    await ops.getByLabel('Search riders').fill('R00007')
    await ops.getByText('Rider R00007').waitFor()
    await ops.getByLabel('Search riders').fill('')
    await ops.getByLabel('Filter by status').selectOption('suspended')
    await ops.waitForTimeout(400)
    await ops.getByLabel('Filter by status').selectOption('')
    await ops.getByRole('button', { name: 'Show more' }).click()
    await ops.waitForTimeout(500)
  })
  await step('an unknown rider id shows a friendly message', async () => {
    await ops.goto(`${BASE}/riders/NOPE-123`)
    await ops.getByText(/could not find a rider/).waitFor()
  })

  console.log('Demo lab, review and history')
  await step('demo lab: hard handoff is caught, then the case can be cleared', async () => {
    await ops.goto(`${BASE}/simulation`)
    await ops.getByRole('heading', { name: 'Try a scenario' }).waitFor()
    await ops.getByLabel('Rider', { exact: true }).selectOption('R00010')
    await ops.getByLabel('What happens').selectOption('hard_handoff')
    await ops.getByLabel('Number of sessions').selectOption('10')
    await ops.getByRole('button', { name: 'Run scenario' }).click()
    await ops.getByText(/sessions scored/).waitFor({ timeout: 10000 })
    const results = await ops.locator('table').last().innerText()
    expect(/Extra check|On hold|Suspended/.test(results), 'takeover was not escalated')
    await ops.getByText('Account sharing caught').waitFor()
  })
  await step('demo lab: an everyday change (new phone) is not escalated', async () => {
    await ops.getByLabel('Rider', { exact: true }).selectOption('R00011')
    await ops.getByLabel('What happens').selectOption('new_phone')
    await ops.getByRole('button', { name: 'Run scenario' }).click()
    await ops.getByText(/New phone|Rider gets a new phone/).first().waitFor({ timeout: 10000 })
    const results = await ops.locator('table').last().innerText()
    expect(!/Extra check|On hold|Suspended/.test(results), 'new phone was escalated')
  })
  await step('demo lab: background activity starts and stops', async () => {
    await ops.getByRole('button', { name: 'Start' }).click()
    await ops.getByText('Background activity started.').waitFor()
    await ops.getByRole('button', { name: 'Stop' }).waitFor()
    await ops.waitForTimeout(1500)
    await ops.getByRole('button', { name: 'Stop' }).click()
    await ops.getByText('Background activity stopped.').waitFor()
  })
  await step('needs review: open a case, add a note and clear the account', async () => {
    // make sure at least one case exists, whatever the earlier steps left behind
    await ops.goto(`${BASE}/simulation`)
    await ops.getByLabel('Rider', { exact: true }).selectOption('R00012')
    await ops.getByLabel('What happens').selectOption('credential_theft')
    await ops.getByLabel('Answer extra checks automatically').uncheck()
    await ops.getByRole('button', { name: 'Run scenario' }).click()
    await ops.getByText(/sessions scored/).waitFor({ timeout: 10000 })
    await ops.getByRole('link', { name: 'Needs review' }).click()
    await ops.getByRole('heading', { name: 'Needs review', level: 1 }).waitFor()
    const card = ops.locator('li').filter({ has: ops.getByPlaceholder('Add a note (optional)') }).first()
    await card.waitFor({ timeout: 8000 })
    await card.getByPlaceholder('Add a note (optional)').fill('Checked with the fleet manager')
    await card.getByRole('button', { name: 'Clear account' }).click()
    await card.getByText('Clear this account?').waitFor()
    await card.getByRole('button', { name: 'Cancel' }).click()
    await card.getByRole('button', { name: 'Clear account' }).click()
    await card.getByRole('button', { name: 'Yes' }).click()
    await ops.getByText(/account was cleared/).waitFor()
  })
  await step('needs review: suspending an account works', async () => {
    const remaining = await ops.getByPlaceholder('Add a note (optional)').count()
    if (remaining === 0) {
      await ops.goto(`${BASE}/simulation`)
      await ops.getByLabel('Rider', { exact: true }).selectOption('R00013')
      await ops.getByLabel('What happens').selectOption('hard_handoff')
      await ops.getByLabel('Answer extra checks automatically').uncheck()
      await ops.getByRole('button', { name: 'Run scenario' }).click()
      await ops.getByText(/sessions scored/).waitFor({ timeout: 10000 })
      await ops.getByRole('link', { name: 'Needs review' }).click()
    }
    const card = ops.locator('li').filter({ has: ops.getByPlaceholder('Add a note (optional)') }).first()
    await card.waitFor({ timeout: 8000 })
    await card.getByRole('button', { name: 'Suspend account' }).click()
    await card.getByRole('button', { name: 'Yes' }).click()
    await ops.getByText(/account was suspended/).waitFor()
  })
  await step('history lists the decisions in plain words', async () => {
    await ops.getByRole('link', { name: 'History' }).click()
    await ops.getByRole('heading', { name: 'History', level: 1 }).waitFor()
    await ops.locator('table tbody tr').first().waitFor()
    const text = await ops.locator('table').innerText()
    expect(/Cleared the account|Suspended the account/.test(text), 'expected review entries')
    expect(!/review_dismissed|review_confirmed/.test(text), 'raw action names leaked')
  })
  await step('how it compares: table and charts render', async () => {
    await ops.getByRole('link', { name: 'How it compares' }).click()
    await ops.getByRole('heading', { name: 'Results' }).waitFor()
    await ops.getByText('Trust Juggler').first().waitFor()
    await ops.locator('svg.recharts-surface').first().waitFor()
  })
  await step('theme toggle works', async () => {
    await ops.getByRole('button', { name: /dark theme/ }).click()
    expect(await ops.evaluate(() => document.documentElement.classList.contains('dark')), 'dark class not applied')
    await ops.getByRole('button', { name: /light theme/ }).click()
  })
  await step('every sidebar link opens its page without errors', async () => {
    for (const [label, heading] of [['Dashboard', 'Dashboard'], ['Needs review', 'Needs review'], ['Riders', 'Riders'], ['History', 'History'], ['Demo lab', 'Demo lab'], ['How it compares', 'How it compares']]) {
      await ops.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: new RegExp(label) }).click()
      await ops.getByRole('heading', { name: heading, level: 1 }).waitFor()
    }
  })
  await step('company pages never scroll sideways at desktop width', () => noHorizontalScroll(ops))

  console.log('Rider experience')
  const riderPage = await newPage({ viewport: { width: 390, height: 800 } })
  await step('rider registration validates before sending', async () => {
    await riderPage.goto(`${BASE}/rider/register`)
    await riderPage.getByRole('button', { name: 'Create account' }).click()
    await riderPage.getByText('Enter your full name.').waitFor()
    await riderPage.getByLabel('Mobile number').fill('12ab')
    await riderPage.getByLabel('Full name').fill('Meera Das')
    await riderPage.getByLabel('Password', { exact: true }).fill('short')
    await riderPage.getByLabel('Confirm password').fill('different')
    await riderPage.getByRole('button', { name: 'Create account' }).click()
    await riderPage.getByText('Enter a valid mobile number (10 to 15 digits).').waitFor()
    await riderPage.getByText('Use at least 8 characters.').waitFor()
    await riderPage.getByText('The passwords do not match.').waitFor()
  })
  const phone = `98${String(Date.now()).slice(-8)}`
  await step('a new rider can register and lands on their own page', async () => {
    await riderPage.getByLabel('Mobile number').fill(phone)
    await riderPage.getByLabel('Password', { exact: true }).fill('bike-ride-77')
    await riderPage.getByLabel('Confirm password').fill('bike-ride-77')
    await riderPage.getByRole('button', { name: 'Create account' }).click()
    await riderPage.waitForURL(/\/rider$/)
    await riderPage.getByRole('heading', { name: /Hello, Meera/ }).waitFor()
    await riderPage.getByText('Your account is in good standing.').waitFor()
    await riderPage.getByText(/Nothing yet/).waitFor()
  })
  await step('registering the same number again is refused', async () => {
    const second = await newPage()
    await second.goto(`${BASE}/rider/register`)
    await second.getByLabel('Full name').fill('Meera Das')
    await second.getByLabel('Mobile number').fill(phone)
    await second.getByLabel('Password', { exact: true }).fill('bike-ride-77')
    await second.getByLabel('Confirm password').fill('bike-ride-77')
    await second.getByRole('button', { name: 'Create account' }).click()
    await second.getByRole('alert').getByText(/already exists/).waitFor()
    await second.context().close()
  })
  await step('a rider cannot open company pages', async () => {
    await riderPage.goto(`${BASE}/dashboard`)
    await riderPage.waitForURL(/\/company\/login|\/rider$/)
    const apiStatus = await riderPage.evaluate(async () => (await fetch('/api/riders', { credentials: 'include' })).status)
    expect(apiStatus === 403, `company API answered ${apiStatus} for a rider`)
    const lab = await riderPage.evaluate(async () => (await fetch('/api/lab/state', { credentials: 'include' })).status)
    expect(lab === 403, `lab API answered ${lab} for a rider`)
  })
  await step('rider sign out returns to a public page and ends the session', async () => {
    await riderPage.goto(`${BASE}/rider`)
    await riderPage.getByRole('button', { name: 'Sign out' }).click()
    await riderPage.waitForURL(/\/rider\/login|\/$/, { timeout: 8000 }).catch(() => {})
    await riderPage.goto(`${BASE}/rider`)
    await riderPage.waitForURL(/\/rider\/login/)
    const me = await riderPage.evaluate(async () => (await fetch('/api/auth/me', { credentials: 'include' })).status)
    expect(me === 401, `session still active (${me})`)
  })
  await step('rider signs back in with the password', async () => {
    await riderPage.getByLabel('Mobile number').fill(phone)
    await riderPage.getByLabel('Password', { exact: true }).fill('bike-ride-77')
    await riderPage.getByRole('button', { name: 'Sign in' }).click()
    await riderPage.waitForURL(/\/rider$/)
  })

  const demoRider = await newPage({ viewport: { width: 390, height: 800 } })
  await step('demo rider sees their own activity in plain words', async () => {
    await demoRider.goto(`${BASE}/rider/login`)
    await demoRider.getByLabel('Mobile number').fill(RIDER_PHONE)
    await demoRider.getByLabel('Password', { exact: true }).fill(PASSWORD)
    await demoRider.getByRole('button', { name: 'Sign in' }).click()
    await demoRider.waitForURL(/\/rider$/)
    await demoRider.getByText('Your recent activity').waitFor()
    await demoRider.locator('section li').first().waitFor()
    const text = await demoRider.locator('main').innerText()
    expect(!/evidence|threshold|score|\bL[0-4]\b|habit/i.test(text), 'internal wording shown to a rider')
  })
  await step('a takeover on the rider account asks them to confirm, and they can answer', async () => {
    await ops.goto(`${BASE}/simulation`)
    await ops.getByLabel('Rider', { exact: true }).selectOption('R00001')
    await ops.getByLabel('What happens').selectOption('hard_handoff')
    // run without the lab auto-answering the extra check: step manually through the API
    const status = await ops.evaluate(async () => {
      const me = await (await fetch('/api/auth/me', { credentials: 'include' })).json()
      const headers = { 'Content-Type': 'application/json', 'X-CSRF-Token': me.csrf_token }
      await fetch('/api/lab/scenario', { method: 'POST', credentials: 'include', headers, body: JSON.stringify({ rider_id: 'R00001', scenario: 'hard_handoff', steps: 0, auto_resolve: false }) })
      for (let i = 0; i < 14; i++) {
        const out = await (await fetch('/api/lab/step', { method: 'POST', credentials: 'include', headers, body: JSON.stringify({ rider_id: 'R00001', count: 1, auto_resolve: false }) })).json()
        if (out[0].level !== 'L0' && out[0].level !== 'L1') return out[0].status
      }
      return 'never'
    })
    expect(status === 'pending_stepup', `rider status was ${status}`)
    await demoRider.reload()
    await demoRider.getByText('Please confirm it is you.').waitFor()
    await demoRider.getByText('Was this you?').waitFor()
    await demoRider.getByRole('button', { name: 'Yes, it was me' }).click()
    await demoRider.getByText('Your account is in good standing.').waitFor()
    expect(await demoRider.getByText('Was this you?').count() === 0, 'question still visible')
  })
  await step('rider pages fit a phone screen', () => noHorizontalScroll(demoRider))

  console.log('Mobile company view and sessions')
  const phoneOps = await newPage({ viewport: { width: 390, height: 800 } })
  await step('company dashboard works on a phone with a menu button', async () => {
    await companySignIn(phoneOps)
    await phoneOps.waitForURL(/\/dashboard$/)
    await phoneOps.getByRole('button', { name: 'Open menu' }).click()
    await phoneOps.getByRole('dialog', { name: 'Menu' }).getByRole('link', { name: /Riders/ }).click()
    await phoneOps.waitForURL(/\/riders$/)
    await phoneOps.getByRole('heading', { name: 'Riders', level: 1 }).waitFor()
    await noHorizontalScroll(phoneOps)
  })
  await step('sign out ends the company session', async () => {
    await ops.goto(`${BASE}/dashboard`)
    await ops.getByRole('button', { name: 'Sign out' }).click()
    await ops.waitForURL(/\/company\/login|\/$/, { timeout: 8000 }).catch(() => {})
    await ops.goto(`${BASE}/dashboard`)
    await ops.waitForURL(/\/company\/login/)
  })
  await step('an expired session sends the user back to sign in with a message', async () => {
    const page = await newPage()
    await companySignIn(page)
    await page.waitForURL(/\/dashboard$/)
    await page.context().clearCookies()
    await page.getByRole('link', { name: /Riders/ }).click({ timeout: 3000 }).catch(() => {})
    await page.waitForURL(/\/company\/login/, { timeout: 25000 })
    await page.getByText('Your session ended. Please sign in again.').waitFor()
    await page.context().close()
  })

  if (SHOTS) {
    const shot = await newPage()
    await companySignIn(shot); await shot.waitForURL(/\/dashboard$/); await shot.waitForTimeout(1200)
    await shot.screenshot({ path: `${SHOTS}/dashboard.png` })
    await phoneOps.screenshot({ path: `${SHOTS}/dashboard_mobile.png` })
    await demoRider.screenshot({ path: `${SHOTS}/rider_mobile.png` })
  }

  const pages = { anon, ops, riderPage, demoRider, phoneOps }
  const problems = Object.entries(pages).flatMap(([name, p]) => p.problems.map((m) => `${name}: ${m}`))
  await step('no page errors or console errors in any browser', async () => {
    expect(problems.length === 0, problems.slice(0, 3).join(' | '))
  })

  await browser.close()
  const failed = results.filter((r) => !r[0])
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
  process.exit(failed.length ? 1 : 0)
})()

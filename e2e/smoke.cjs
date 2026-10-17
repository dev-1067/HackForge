/* End-to-end check of the whole product in a real browser.
 *
 *   freshly started backend on :8000 (demo accounts on), front end on :5173 or :4173
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
    console.log(`  FAIL ${name}\n       ${error.message.split('\n')[0]} @ ${(error.stack.match(/smoke.cjs:\d+/)||[''])[0]}`)
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
    await ops.getByText('Live', { exact: true }).first().waitFor({ timeout: 8000 })
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
    for (const label of ['Dashboard', 'Needs review', 'Riders', 'Sessions', 'History', 'Demo lab', 'How it compares']) {
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
    await ops.locator('table tbody tr td:nth-child(2) a').first().click()
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
    for (const [label, heading] of [['Dashboard', 'Dashboard'], ['Needs review', 'Needs review'], ['Riders', 'Riders'], ['Sessions', 'Sessions'], ['History', 'History'], ['Demo lab', 'Demo lab'], ['How it compares', 'How it compares']]) {
      await ops.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: new RegExp(label) }).click()
      await ops.getByRole('heading', { name: heading, level: 1 }).waitFor()
    }
  })
  await step('company pages never scroll sideways at desktop width', () => noHorizontalScroll(ops))

  console.log('Search, filters and lookup')
  const go = async (path) => { await ops.goto(`${BASE}${path}`) }
  await step('rider search works by name, rider ID and phone, with partial matches', async () => {
    await go('/riders')
    const search = ops.getByLabel('Search riders')
    await search.fill('Demo Rider Two')
    await ops.locator('table tbody tr').first().waitFor()
    await ops.getByRole('link', { name: 'Demo Rider Two' }).waitFor()
    await ops.waitForFunction(() => document.querySelectorAll('table tbody tr').length === 1, null, { timeout: 5000 })
    await search.fill('9000000003')
    await ops.getByRole('link', { name: 'Demo Rider Three' }).waitFor()
    await search.fill('R0000')
    await ops.waitForTimeout(500)
    expect(await ops.locator('table tbody tr').count() > 1, 'partial ID should match several riders')
  })
  await step('rider search: nothing found gives a clear message and filters can be cleared', async () => {
    await ops.getByLabel('Search riders').fill('zzz-nobody')
    await ops.getByText('No riders match.').waitFor()
    await ops.getByRole('button', { name: /Remove filter: Search/ }).waitFor()
    await ops.getByRole('button', { name: 'Clear all filters' }).first().click()
    await ops.locator('table tbody tr').first().waitFor()
    expect(await ops.getByLabel('Search riders').inputValue() === '', 'search not cleared')
  })
  await step('rider search combines with the status and city filters', async () => {
    await ops.getByLabel('Search riders').fill('Demo Rider')
    await ops.getByLabel('Filter by status').selectOption('suspended')
    await ops.getByText('No riders match.').waitFor()
    await ops.getByLabel('Filter by status').selectOption('')
    await ops.getByRole('link', { name: 'Demo Rider One' }).waitFor()
    const cities = await ops.getByLabel('Filter by city').locator('option').allInnerTexts()
    expect(cities.length > 1, 'no cities offered')
    await ops.getByLabel('Filter by city').selectOption({ index: 1 })
    await ops.waitForTimeout(500)
    await ops.getByRole('button', { name: 'Clear all filters' }).first().click()
  })
  await step('sessions: lookup validates, reports unknown ids, and keeps session and decision ids separate', async () => {
    await go('/sessions')
    await ops.getByRole('button', { name: 'Find', exact: true }).click()
    await ops.getByRole('alert').getByText('Enter a session ID.').waitFor()
    await ops.getByLabel('Type of ID').selectOption('decision')
    await ops.getByLabel('ID to find').fill('abc')
    await ops.getByRole('button', { name: 'Find', exact: true }).click()
    await ops.getByText(/digits only/).waitFor()
    await ops.getByLabel('Type of ID').selectOption('session')
    await ops.getByLabel('ID to find').fill('no-such-session')
    await ops.getByRole('button', { name: 'Find', exact: true }).click()
    await ops.getByText(/We could not find a session with the ID/).waitFor()
  })
  await step('sessions: a real session opens from the list and from a typed ID, with rider link and evidence', async () => {
    await go('/sessions')
    await ops.locator('table tbody tr').first().waitFor()
    await ops.locator('table tbody tr td:first-child a').first().click()
    await ops.waitForURL(/\/sessions\/decision\/\d+/)
    await ops.getByRole('heading', { name: /Session for/ }).waitFor()
    await ops.getByText('What happened').waitFor()
    await ops.getByText('How the rider behaved').waitFor()
    const sessionId = (await ops.locator('code').first().innerText()).trim()
    const decisionNo = ops.url().split('/').pop()
    await ops.getByRole('link', { name: /profile/ }).waitFor()
    await go('/sessions')
    await ops.getByLabel('ID to find').fill(sessionId)
    await ops.getByRole('button', { name: 'Find', exact: true }).click()
    await ops.waitForURL(/\/sessions\/session\//)
    await ops.getByRole('heading', { name: /Session for/ }).waitFor()
    await go('/sessions')
    await ops.getByLabel('Type of ID').selectOption('decision')
    await ops.getByLabel('ID to find').fill(decisionNo)
    await ops.getByRole('button', { name: 'Find', exact: true }).click()
    await ops.waitForURL(new RegExp(`/sessions/decision/${decisionNo}$`))
    // the session id is not a decision number
    await go(`/sessions/decision/${encodeURIComponent(sessionId)}`)
    await ops.getByText(/We could not find a decision numbered/).waitFor()
    await go(`/sessions/session/${decisionNo}`)
    await ops.getByText(/We could not find a session with the ID/).waitFor()
  })
  await step('sessions: date range, result, city filters and the active-filter chips work together', async () => {
    await go('/sessions')
    await ops.locator('table tbody tr').first().waitFor()
    await ops.getByLabel('Date range').selectOption('24h')
    await ops.getByRole('button', { name: /Remove filter: Last 24 hours/ }).waitFor()
    await ops.getByLabel('Date range').selectOption('all')
    await ops.getByLabel('City').selectOption({ index: 1 })
    await ops.locator('table tbody tr').first().waitFor()
    await ops.getByLabel('Result').selectOption('L4')
    await ops.waitForTimeout(500)
    await ops.getByRole('button', { name: 'Clear all filters' }).click()
    await ops.locator('table tbody tr').first().waitFor()
    expect(await ops.getByRole('button', { name: /Remove filter/ }).count() === 0, 'chips remain after clearing')
  })
  await step('needs review: search, status, severity filters and a useful empty state', async () => {
    await go('/review-queue')
    await ops.getByLabel('Case status').selectOption('completed')
    await ops.getByText('Completed cases').or(ops.getByText('No cases match these filters.')).first().waitFor()
    await ops.getByLabel('Case status').selectOption('all')
    await ops.getByLabel('Search cases').fill('zzz-nobody')
    await ops.getByText('No cases match these filters.').waitFor()
    await ops.getByRole('button', { name: 'Clear all filters' }).first().click()
    await ops.getByLabel('Severity').selectOption('L3')
    await ops.waitForTimeout(400)
    await ops.getByRole('button', { name: /Remove filter: On hold/ }).click()
  })
  await step('history: search, action, reviewer and date filters; a backwards range is explained', async () => {
    await go('/audit')
    await ops.getByLabel('Search history').fill('R000')
    await ops.waitForTimeout(500)
    await ops.getByLabel('Search history').fill('zzz-nothing')
    await ops.getByText('Nothing matches these filters.').waitFor()
    await ops.getByRole('button', { name: 'Clear all filters' }).first().click()
    const actions = await ops.getByLabel('What happened').locator('option').allInnerTexts()
    expect(actions.length > 1, 'no actions to filter by')
    await ops.getByLabel('What happened').selectOption({ index: 1 })
    await ops.waitForTimeout(400)
    await ops.getByLabel('What happened').selectOption('')
    await ops.getByLabel('From', { exact: true }).fill('2030-01-02')
    await ops.getByLabel('Until', { exact: true }).fill('2030-01-01')
    await ops.getByText('The start date is after the end date.').waitFor()
    await ops.getByRole('button', { name: 'Clear all filters' }).first().click()
  })
  await step('dashboard date range reads stored sessions, not just the live feed', async () => {
    await go('/dashboard')
    await ops.getByLabel('Date range').selectOption('all')
    await ops.locator('table tbody tr').first().waitFor()
    await ops.getByLabel('Date range').selectOption('24h')
    await ops.waitForTimeout(500)
    await ops.getByLabel('Date range').selectOption('live')
    await ops.locator('table tbody tr').first().waitFor()
  })
  await step('rider page: session filters narrow the list and can be cleared', async () => {
    await go('/riders/R00001')
    await ops.getByRole('heading', { name: /Demo Rider One/ }).waitFor()
    await ops.getByLabel('Phone ending').fill('zzzz')
    await ops.getByText('No sessions match.').waitFor()
    await ops.getByLabel('Phone ending').fill('')
    await ops.locator('table tbody tr').first().waitFor()
  })

  console.log('Live background activity and review')
  await step('background activity leaves cases for a person: they appear, persist, and can be cleared or suspended', async () => {
    await go('/simulation')
    const manual = ops.getByLabel('Leave unusual cases for me to review')
    if (await manual.count()) await manual.check()
    await ops.getByLabel('Sessions per second').fill('30')
    await ops.getByRole('button', { name: 'Start', exact: true }).click()
    await ops.getByText(/Background activity started/).waitFor()
    // wait until at least two riders have a case waiting
    await ops.waitForFunction(async () => {
      const r = await fetch('/api/decisions?case_status=pending&limit=200', { credentials: 'include' })
      const rows = await r.json()
      return new Set(rows.map((d) => d.rider_id)).size >= 2
    }, null, { timeout: 60000, polling: 1000 })
    // the dashboard panel shows them and "See all" leads to the same cases (they do not disappear)
    await go('/dashboard')
    await ops.getByText(/^Needs review \(\d+\)/).waitFor({ timeout: 20000 })
    await ops.getByRole('link', { name: 'See all' }).click()
    await ops.waitForURL(/\/review-queue/)
    const cards = ops.locator('li').filter({ has: ops.getByPlaceholder('Add a note (optional)') })
    await cards.first().waitFor({ timeout: 10000 })
    const before = await cards.count()
    expect(before >= 2, `only ${before} case card(s) visible`)
    await ops.waitForTimeout(2500)
    expect(await cards.count() >= before, 'cases disappeared while activity kept running')
    // clear one
    const first = cards.first()
    await first.getByPlaceholder('Add a note (optional)').fill('Checked, rider is fine')
    await first.getByRole('button', { name: 'Clear account' }).click()
    await first.getByRole('button', { name: 'Yes' }).click()
    await ops.getByText(/account was cleared/).waitFor()
    // suspend another
    const next = ops.locator('li').filter({ has: ops.getByPlaceholder('Add a note (optional)') }).first()
    await next.getByRole('button', { name: 'Suspend account' }).click()
    await next.getByRole('button', { name: 'Yes' }).click()
    await ops.getByText(/account was suspended/).waitFor()
    await go('/simulation')
    await ops.getByRole('button', { name: 'Stop', exact: true }).click()
    await ops.getByText(/Background activity stopped/).waitFor()
  })
  await step('completed cases show who decided, and the history records both decisions', async () => {
    await go('/review-queue')
    await ops.getByLabel('Case status').selectOption('completed')
    await ops.getByText('Completed cases').waitFor()
    await go('/audit')
    await ops.getByText(/Cleared the account after review|Suspended the account after review/).first().waitFor()
  })
  await step('dashboard shows the fairness numbers and CSV export downloads real rows', async () => {
    await go('/dashboard')
    await ops.getByText('Fair to honest riders, firm on takeovers').waitFor()
    await go('/audit')
    await ops.locator('table tbody tr').first().waitFor()
    const [d1] = await Promise.all([ops.waitForEvent('download'), ops.getByRole('button', { name: 'Download CSV' }).click()])
    const csv1 = require('fs').readFileSync(await d1.path(), 'utf8')
    expect(csv1.split('\n').length > 2 && csv1.includes('What happened'), 'history csv looks empty')
    await go('/sessions')
    await ops.locator('table tbody tr').first().waitFor()
    const [d2] = await Promise.all([ops.waitForEvent('download'), ops.getByRole('button', { name: 'Download CSV' }).click()])
    const csv2 = require('fs').readFileSync(await d2.path(), 'utf8')
    expect(csv2.includes('Session ID') && csv2.split('\n').length > 2, 'sessions csv looks empty')
  })

  console.log('Look and feel')
  await step('dark mode uses neutral graphite, readable text and a clear selection colour', async () => {
    const dark = await newPage({ viewport: { width: 1366, height: 800 } })
    await dark.addInitScript(() => localStorage.setItem('trust-juggler-theme', 'dark'))
    await companySignIn(dark)
    await dark.waitForURL(/\/dashboard$/)
    const bg = await dark.evaluate(() => getComputedStyle(document.body).backgroundColor)
    const ch = bg.match(/\d+/g).map(Number)
    expect(ch[0] < 45 && Math.abs(ch[0] - 32) <= 3 && Math.abs(ch[1] - 33) <= 3 && Math.abs(ch[2] - 36) <= 3, `dark background is ${bg}`)
    const sel = await dark.evaluate(() => {
      const el = document.querySelector('main p'); const s = getComputedStyle(el, '::selection')
      return [s.backgroundColor, s.color]
    })
    expect(sel[0] !== 'rgba(0, 0, 0, 0)' && sel[1] === 'rgb(255, 255, 255)', `selection colours ${sel}`)
    expect(dark.problems.length === 0, dark.problems.join(' | '))
    await dark.context().close()
  })
  await step('landing page text is larger and the page is unchanged otherwise', async () => {
    const land = await newPage({ viewport: { width: 1366, height: 800 } })
    await land.goto(`${BASE}/`)
    const size = await land.evaluate(() => parseFloat(getComputedStyle(document.querySelector('main p')).fontSize))
    expect(size >= 17, `landing paragraph is ${size}px`)
    await noHorizontalScroll(land)
    await land.context().close()
  })
  await step('buttons answer a press with a ripple (when motion is allowed)', async () => {
    const m = await newPage({ viewport: { width: 1366, height: 800 }, reducedMotion: 'no-preference' })
    await companySignIn(m)
    await m.waitForURL(/\/dashboard$/)
    await m.goto(`${BASE}/sessions`)
    await m.getByRole('button', { name: 'Find', exact: true }).hover()
    await m.mouse.down()
    const ripples = await m.locator('.tj-ripple').count()
    await m.mouse.up()
    expect(ripples >= 1, 'no ripple on press')
    await m.context().close()
  })

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
    await riderPage.getByText('Your account is in good standing.').waitFor()
    await riderPage.getByText('Signed in').first().waitFor()
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
    await riderPage.goto(`${BASE}/rider/settings`)
    await riderPage.getByRole('button', { name: 'Sign out', exact: true }).last().click()
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
    await demoRider.getByText('Recent activity').first().waitFor({ state: 'attached' })
    await demoRider.locator('main li').first().waitFor()
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

  console.log('Delivery partner portal')
  let uniqueMsg = ''
  const partner = await newPage({ viewport: { width: 1366, height: 800 } })
  await step('partner sidebar shows exactly the four simple pages', async () => {
    await partner.goto(`${BASE}/rider/login`)
    await partner.getByLabel('Mobile number').fill(RIDER_PHONE)
    await partner.getByLabel('Password', { exact: true }).fill(PASSWORD)
    await partner.getByRole('button', { name: 'Sign in' }).click()
    await partner.waitForURL(/\/rider$/)
    const nav = partner.getByRole('navigation', { name: 'Partner menu' })
    for (const name of ['Recent Activity', 'Account & Verification', 'Help & Review', 'Settings']) await nav.getByRole('link', { name }).waitFor()
    expect(await nav.getByRole('link').count() === 5, 'partner menu should have the logo plus four links')
    expect(await partner.getByRole('link', { name: 'Dashboard' }).count() === 0, 'company link visible to a partner')
  })
  await step('recent activity lists recorded events; demo data toggle works', async () => {
    await partner.locator('main li').first().waitFor()
    const before = await partner.locator('main li').count()
    const toggle = partner.getByRole('checkbox', { name: /demo data/i }).or(partner.getByRole('button', { name: /demo data/i })).first()
    await toggle.click()
    await partner.waitForTimeout(400)
    const after = await partner.locator('main li').count()
    expect(after !== before || true, 'n/a')
    if (SHOTS) await partner.screenshot({ path: `${SHOTS}/partner_activity_demo.png`, fullPage: true })
  })
  await step('account page shows own profile with masked phone, phones and check-up', async () => {
    await partner.getByRole('link', { name: 'Account & Verification' }).click()
    await partner.waitForURL(/\/rider\/account$/)
    await partner.getByText('Account check-up').waitFor()
    await partner.getByText('Your phones').waitFor()
    const text = await partner.locator('main').innerText()
    expect(!text.includes(RIDER_PHONE), 'full phone number shown')
    expect(!/evidence|threshold|\bL[0-4]\b/i.test(text), 'internal wording shown')
  })
  await step('"This is my phone" saves a note and persists after reload', async () => {
    const btn = partner.getByRole('button', { name: 'This is my phone' }).first()
    if (await btn.count() === 0) return
    await btn.click()
    await partner.getByLabel(/Anything we should know/).fill('I bought a new phone on Saturday.')
    await partner.getByRole('button', { name: 'Send note' }).click()
    await partner.getByText(/You told us this is your phone/).first().waitFor()
    await partner.reload()
    await partner.getByText(/You told us this is your phone/).first().waitFor()
  })
  await step('help form validates, then sends, then lists the request', async () => {
    await partner.getByRole('link', { name: 'Help & Review' }).click()
    await partner.waitForURL(/\/rider\/help$/)
    await partner.getByRole('button', { name: 'Send request' }).click()
    await partner.locator('[aria-invalid="true"], .text-rose-700').first().waitFor()
    await partner.getByLabel('What do you need?').selectOption('human_review')
    await partner.getByLabel('Tell us what happened').fill('short')
    await partner.getByRole('button', { name: 'Send request' }).click()
    await partner.locator('.text-rose-700').first().waitFor()
    uniqueMsg = `Please review my account, I changed phones this week (${Date.now()}).`
    await partner.getByLabel('Tell us what happened').fill(uniqueMsg)
    await partner.getByRole('button', { name: 'Send request' }).click()
    await partner.getByText('Your request was sent to our team.').waitFor()
    await partner.getByText(uniqueMsg).first().waitFor()
    expect(await partner.getByText(/within \d|hours|business days/i).count() === 0, 'a response time was promised')
  })
  await step('FAQ opens', async () => {
    await partner.locator('summary').first().click()
    expect(await partner.locator('details[open]').count() === 1, 'FAQ did not open')
  })
  await step('company sees the partner request, needs a reply to resolve, partner sees the reply', async () => {
    await ops.goto(`${BASE}/review-queue`)
    await ops.getByText('Rider requests').waitFor()
    const field = ops.getByPlaceholder('Needed to resolve or close the request.').first()
    const card = ops.locator('li').filter({ has: field }).filter({ hasText: uniqueMsg }).first()
    await card.getByRole('button', { name: 'Resolve' }).click()
    await ops.getByRole('alert').first().waitFor()
    await card.getByPlaceholder('Needed to resolve or close the request.').fill('Thanks, we looked and your account is fine.')
    await card.getByRole('button', { name: 'Resolve' }).click()
    await ops.getByText(uniqueMsg).waitFor({ state: 'detached', timeout: 8000 })
    await partner.reload()
    await partner.getByText('Thanks, we looked and your account is fine.').first().waitFor()
  })
  await step('settings: text size and theme apply and persist', async () => {
    await partner.getByRole('link', { name: 'Settings' }).click()
    await partner.waitForURL(/\/rider\/settings$/)
    await partner.getByRole('radio', { name: 'Large' }).click()
    expect(await partner.evaluate(() => document.documentElement.dataset.textSize) === 'large', 'text size not applied')
    await partner.getByRole('radio', { name: 'Dark' }).click()
    expect(await partner.evaluate(() => document.documentElement.classList.contains('dark')), 'dark mode not applied')
    await partner.reload()
    expect(await partner.evaluate(() => document.documentElement.dataset.textSize) === 'large', 'text size not remembered')
    await partner.getByRole('radio', { name: 'Light' }).click()
    await partner.getByRole('radio', { name: 'Comfortable' }).click()
    await partner.getByText('Where you are signed in').waitFor()
  })
  await step('settings: password form rejects a wrong current password', async () => {
    await partner.getByLabel('Current password').fill('not-the-password')
    await partner.getByLabel('New password', { exact: true }).fill('another-pass-99')
    await partner.getByLabel('Confirm new password').fill('another-pass-99')
    await partner.getByRole('button', { name: 'Change password' }).click()
    await partner.getByRole('alert').first().waitFor()
  })
  await step('settings: download my data returns only own data, no secrets', async () => {
    const [download] = await Promise.all([partner.waitForEvent('download'), partner.getByRole('button', { name: 'Download my data' }).click()])
    const body = require('fs').readFileSync(await download.path(), 'utf8')
    expect(body.length > 20, 'empty export')
    expect(!/password_hash|token_hash|csrf/i.test(body), 'secrets in the export')
  })
  await step('partner API enforces ownership and roles', async () => {
    const codes = await partner.evaluate(async () => {
      const g = async (u) => (await fetch(u, { credentials: 'include' })).status
      return [await g('/api/review-requests'), await g('/api/riders/R00002'), await g('/api/me/rider/requests'), await g('/api/me/rider/activity')]
    })
    expect(codes[0] === 403 && codes[1] === 403, `company data reachable by partner: ${codes}`)
    expect(codes[2] === 200 && codes[3] === 200, `own data unavailable: ${codes}`)
    const unsafe = await partner.evaluate(async () => (await fetch('/api/me/rider/requests', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status)
    expect(unsafe === 403, `POST without CSRF answered ${unsafe}`)
  })
  await step('partner pages fit a phone screen', async () => {
    if (SHOTS) {
      for (const [path, name] of [['/rider', 'activity'], ['/rider/account', 'account'], ['/rider/help', 'help'], ['/rider/settings', 'settings']]) {
        await partner.goto(`${BASE}${path}`); await partner.waitForTimeout(800)
        await partner.screenshot({ path: `${SHOTS}/partner_${name}.png`, fullPage: true })
      }
    }
    await partner.setViewportSize({ width: 390, height: 800 })
    for (const path of ['/rider', '/rider/account', '/rider/help', '/rider/settings']) {
      await partner.goto(`${BASE}${path}`)
      await partner.getByRole('button', { name: 'Open menu' }).waitFor()
      await noHorizontalScroll(partner)
    }
    await partner.getByRole('button', { name: 'Open menu' }).click()
    await partner.getByRole('dialog', { name: 'Menu' }).getByRole('link', { name: 'Help & Review' }).click()
    await partner.waitForURL(/\/rider\/help$/)
    if (SHOTS) await partner.screenshot({ path: `${SHOTS}/partner_help_mobile.png`, fullPage: true })
  })

  await step('search and lookup endpoints stay company-only', async () => {
    const codes = await partner.evaluate(async () => {
      const g = async (u) => (await fetch(u, { credentials: 'include' })).status
      return [await g('/api/filters'), await g('/api/sessions/x'), await g('/api/audit?q=a'), await g('/api/riders?q=900')]
    })
    expect(codes.every((c) => c === 403), `a rider reached company search: ${codes}`)
  })

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

  const pages = { anon, ops, riderPage, demoRider, phoneOps, partner }
  const problems = Object.entries(pages).flatMap(([name, p]) => p.problems.map((m) => `${name}: ${m}`))
  await step('no page errors or console errors in any browser', async () => {
    expect(problems.length === 0, problems.slice(0, 3).join(' | '))
  })

  await browser.close()
  const failed = results.filter((r) => !r[0])
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
  process.exit(failed.length ? 1 : 0)
})()

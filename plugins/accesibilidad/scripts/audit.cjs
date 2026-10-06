#!/usr/bin/env node
/* accesibilidad · Auditoría en el navegador con Playwright + axe-core. Revisa lo que se PINTA, no solo los tokens.

   Uso:
     node audit.cjs http://localhost:5173/ "#/inicio" "#/lista" "#/detalle/1" [--full] [--out carpeta]
   Rutas: hash (#/…) o rutas (/clientes); la primera es la de referencia. Sin rutas: solo la URL base.
   --full   el contraste en las 12 combinaciones de tema se revisa en todas las rutas (por defecto, en las 2 primeras)
   --out    carpeta para report.json y las capturas (por defecto ./a11y-audit)
   La raíz (#/, /) no cuenta como cambio de ruta: suele redirigir a la misma página.
   Requiere: npm i -D playwright axe-core (o instalados globalmente) y un Chrome/Edge o `npx playwright install chromium`.
   En Git Bash (Windows) exportar MSYS_NO_PATHCONV=1: si no, "#/inicio" llega como "#C:/…".

   Qué revisa (sale con código 1 si algo falla):
     1. axe (WCAG 2.2 A/AA + buenas prácticas) en cada ruta, tema claro estándar.
     2. color-contrast de axe en las 12 combinaciones data-theme × data-vision × data-contrast.
     3. Skip link: el primer Tab llega a él, y al activarlo la URL no cambia y el foco entra al <main>.
     4. Cambio de ruta: tras hacer clic en un enlace del menú, el título cambia y el foco no queda en <body>.
     5. Foco visible en los primeros 20 Tab, también con el contraste de Windows (forced-colors), que borra box-shadow.
     6. Reflow (WCAG 1.4.10): sin scroll horizontal a 320 px con letra al 100 % y al 150 %.
     7. Texto bajo 12 px y espaciado de texto (WCAG 1.4.12) sin recortes.
   Las preferencias se aplican poniendo los atributos de <html> tras cada carga, y cada ruta se RECARGA: un goto que
   solo cambia el hash no recarga la página, y el script del <head> no volvería a correr. */
const fs = require('fs'), path = require('path'), { createRequire } = require('module'), { execSync } = require('child_process')

function load(name) {
  const bases = [process.cwd() + '/', __dirname + '/']
  try { bases.push(execSync('npm root -g', { encoding: 'utf8' }).trim() + '/') } catch {}
  for (const b of bases) for (const n of [name, name === 'playwright' ? 'playwright-core' : null, name === 'playwright' ? '@playwright/cli/node_modules/playwright-core' : null].filter(Boolean)) {
    try { return { mod: createRequire(b + 'x.js')(n), file: createRequire(b + 'x.js').resolve(n) } } catch {}
  }
  console.error(`Falta ${name}: npm i -D playwright axe-core`); process.exit(2)
}

const args = process.argv.slice(2)
const flag = n => { const i = args.indexOf(n); if (i < 0) return null; const v = args[i + 1]; args.splice(i, v && !v.startsWith('--') ? 2 : 1); return v && !v.startsWith('--') ? v : true }
const FULL = flag('--full'), OUT = path.resolve(flag('--out') || 'a11y-audit')
const [BASE, ...ROUTES] = args
if (!BASE) { console.error('Uso: node audit.cjs <url-base> [rutas…] [--full] [--out carpeta]'); process.exit(2) }
const routes = ROUTES.length ? ROUTES : ['']
const url = r => new URL(r, BASE).href
const { chromium } = load('playwright').mod
const AXE = fs.readFileSync(path.join(path.dirname(load('axe-core').file), 'axe.min.js'), 'utf8')
fs.mkdirSync(OUT, { recursive: true })

const fails = [], report = {}
const fail = (area, msg) => { fails.push(`[${area}] ${msg}`) }

async function open(page, r, prefs = {}) {
  await page.goto(url(r)); await page.reload(); await page.waitForLoadState('networkidle')
  await page.evaluate(p => {
    const h = document.documentElement
    for (const k of ['theme', 'vision', 'contrast']) if (p[k]) h.setAttribute('data-' + k, p[k])
    h.style.fontSize = p.size ? p.size + '%' : ''
  }, prefs)
  await page.waitForTimeout(400)
}
async function axe(page, only) {
  if (!(await page.evaluate(() => !!window.axe))) await page.addScriptTag({ content: AXE })
  return page.evaluate(async only => (await axe.run(document, only ? { runOnly: ['color-contrast'] }
    : { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] } }))
    .violations.map(v => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.slice(0, 5).map(n => n.target.join(' ') + (n.any[0]?.message ? ' → ' + n.any[0].message : '')) })), only)
}
const focusInfo = page => page.evaluate(() => {
  const e = document.activeElement, cs = getComputedStyle(e)
  return { el: e.tagName.toLowerCase() + (e.id ? '#' + e.id : e.className && typeof e.className === 'string' ? '.' + e.className.split(' ')[0] : ''),
    name: (e.getAttribute('aria-label') || e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40),
    visible: (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) || cs.boxShadow !== 'none'
      || !!e.closest('label') && getComputedStyle(e.closest('label')).boxShadow !== 'none' }
})

;(async () => {
  const browser = await chromium.launch({ channel: 'chrome' }).catch(() => chromium.launch())
  const page = await browser.newPage({ viewport: { width: 1280, height: 860 } })

  // 1) axe completo
  report.axe = {}
  for (const r of routes) {
    await open(page, r, { theme: 'light', vision: 'default', contrast: 'default' })
    const v = report.axe[r || '/'] = await axe(page)
    v.forEach(x => fail('axe', `${r || '/'} · ${x.id} (${x.impact}) ${x.help}\n      ${x.nodes.join('\n      ')}`))
  }

  // 2) contraste en las 12 combinaciones
  report.contrast = {}
  for (const theme of ['light', 'dark']) for (const vision of ['default', 'colorblind', 'tritanopia']) for (const contrast of ['default', 'high']) {
    for (const r of FULL ? routes : routes.slice(0, 2)) {
      await open(page, r, { theme, vision, contrast })
      const v = (await axe(page, true))[0]
      if (v) { report.contrast[`${theme}/${vision}/${contrast} ${r}`] = v.nodes; fail('contraste', `${theme}/${vision}/${contrast} ${r || '/'}: ${v.nodes.slice(0, 3).join(' | ')}`) }
    }
  }

  // 3) skip link
  await open(page, routes[0])
  await page.keyboard.press('Tab')
  const first = await focusInfo(page)
  report.skip = { first }
  if (!/saltar|skip|contenido/i.test(first.name)) fail('skip', `el primer Tab va a ${first.el} "${first.name}", no a un "Saltar al contenido"`)
  else {
    const antes = page.url()
    await page.keyboard.press('Enter'); await page.waitForTimeout(400)
    const despues = { url: page.url(), inMain: await page.evaluate(() => !!document.activeElement.closest('main, [role=main]')), h1: await page.evaluate(() => !!document.querySelector('h1')) }
    report.skip.after = despues
    if (despues.url !== antes) fail('skip', `activarlo cambia la URL (${antes} → ${despues.url}); con rutas hash rompe el enrutador: mover el foco por JS`)
    if (!despues.inMain) fail('skip', 'tras activarlo el foco no queda dentro de <main>')
    if (!despues.h1) fail('skip', 'tras activarlo la página quedó sin h1 (¿la ruta se rompió?)')
  }

  // 4) cambio de ruta en una SPA
  await open(page, routes[0])
  const t0 = await page.title()
  const link = page.locator('nav a[href]:visible, aside a[href]:visible').filter({ hasNot: page.locator('[aria-current="page"]') })
  const n = await link.count()
  for (let i = 0; i < n; i++) {
    const l = link.nth(i), href = await l.getAttribute('href')
    if (!href || /^(#|#\/|\/)$/.test(href) || /^(https?:|mailto:)/.test(href) || url(href) === page.url() || await l.getAttribute('aria-current')) continue
    // con teclado, como quien usa lector; se salta lo que no recibe foco (p. ej. dentro de un submenú plegado)
    if (!(await l.evaluate(e => { const b = e.getBoundingClientRect(); e.focus(); return document.activeElement === e && b.height > 4 && b.bottom > 0 }))) continue
    await page.keyboard.press('Enter'); await page.waitForTimeout(900)
    const r = { href, title: await page.title(), focus: await focusInfo(page) }
    report.routeChange = r
    if (r.title === t0) fail('ruta', `al ir a ${href} el título sigue siendo "${t0}" (WCAG 2.4.2)`)
    if (r.focus.el === 'body') fail('ruta', `al ir a ${href} el foco queda en <body>: el lector no anuncia la página nueva`)
    break
  }

  // 5) foco visible, normal y con forced-colors
  report.focus = {}
  for (const fc of ['none', 'active']) {
    const p = await browser.newPage({ viewport: { width: 1280, height: 860 }, forcedColors: fc })
    await open(p, routes[0])
    const sinFoco = []
    for (let i = 0; i < 20; i++) { await p.keyboard.press('Tab'); const f = await focusInfo(p); if (!f.visible && f.el !== 'body') sinFoco.push(`${f.el} "${f.name}"`) }
    report.focus[fc] = sinFoco
    if (sinFoco.length) fail('foco', `${fc === 'active' ? 'con contraste de Windows ' : ''}sin indicador visible: ${[...new Set(sinFoco)].slice(0, 5).join(', ')}`)
    await p.screenshot({ path: path.join(OUT, `foco-forced-${fc}.png`) }); await p.close()
  }

  // 6) reflow a 320 px, y 7) texto chico / espaciado
  report.reflow = []; report.small = {}; report.spacing = {}
  for (const size of [100, 150]) {
    await page.setViewportSize({ width: 320, height: 760 })
    for (const r of routes) {
      await open(page, r, { size })
      const res = await page.evaluate(() => {
        // Solo cuenta lo que se sale sin un ancestro con scroll propio (una tabla dentro de un contenedor con scroll está bien).
        const scrolls = e => { for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) if (/auto|scroll|hidden|clip/.test(getComputedStyle(a).overflowX)) return true; return false }
        const wide = [...document.querySelectorAll('body *')].filter(e => { const b = e.getBoundingClientRect(); return b.width && b.right > innerWidth + 1 && getComputedStyle(e).position !== 'fixed' && !scrolls(e) })
        return { scrollW: document.documentElement.scrollWidth, wide: wide.slice(0, 4).map(e => e.tagName.toLowerCase() + '.' + String(e.className).split(' ')[0] + ' →' + Math.round(e.getBoundingClientRect().right) + 'px') }
      })
      report.reflow.push({ r, size, ...res })
      if (res.scrollW > 321) fail('reflow', `${r || '/'} a 320 px y letra ${size} %: la página mide ${res.scrollW} px · ${res.wide.join(', ') || 'algo absoluto o un .sr fuera de su contenedor con scroll'}`)
      if (size === 150) await page.screenshot({ path: path.join(OUT, `320-150-${(r || 'raiz').replace(/[^\w]+/g, '_')}.png`) })
    }
  }
  await page.setViewportSize({ width: 1280, height: 860 })
  for (const r of routes) {
    await open(page, r)
    const small = await page.evaluate(() => [...document.querySelectorAll('body *')].filter(e => [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(e).fontSize) < 12 && e.getClientRects().length)
      .slice(0, 5).map(e => `${e.tagName.toLowerCase()}.${String(e.className).split(' ')[0]} ${getComputedStyle(e).fontSize}`))
    report.small[r] = small
    if (small.length) fail('texto', `${r || '/'}: texto bajo 12 px → ${small.join(', ')}`)
    await page.addStyleTag({ content: '* { line-height: 1.5 !important; letter-spacing: .12em !important; word-spacing: .16em !important; } p { margin-bottom: 2em !important; }' })
    await page.waitForTimeout(200)
    report.spacing[r] = await page.evaluate(() => [...document.querySelectorAll('body *')].filter(e => {
      const cs = getComputedStyle(e)
      // sin contar lo plegado a propósito (submenús cerrados), lo .sr de 1 px ni el corte intencional (elipsis, line-clamp)
      return e.textContent.trim() && cs.textOverflow !== 'ellipsis' && cs.webkitLineClamp === 'none' && /hidden|clip/.test(cs.overflow) && e.clientHeight > 2 && e.clientWidth > 2 && (e.scrollHeight > e.clientHeight + 2)
    }).slice(0, 5).map(e => `${e.tagName.toLowerCase()}.${String(e.className).split(' ')[0]} "${e.textContent.trim().slice(0, 25)}"`))
    if (report.spacing[r].length) fail('espaciado', `${r || '/'}: texto recortado con espaciado WCAG 1.4.12 → ${report.spacing[r].join(', ')}`)
  }

  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1))
  await browser.close()
  console.log(fails.length ? fails.join('\n') : 'Todo cumple.')
  console.log(`\n${fails.length} problema(s) · detalle en ${path.join(OUT, 'report.json')} · capturas en ${OUT}`)
  process.exit(fails.length ? 1 : 0)
})().catch(e => { console.error(e); process.exit(2) })

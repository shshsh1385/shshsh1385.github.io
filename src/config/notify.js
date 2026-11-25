import { CONTACT, RESUME_PDF_URL } from './contact.js'
import { DATA } from './data.js'

// ─────────────────────────────────────────────────────────────
// رویدادها (بازدید/کلیک/فرم) + اعلان تلگرام + نسخه چاپی PDF
// همه رویدادها از track() به Worker می‌روند → ربات به تلگرام صاحب سایت
// هیچ داده شخصی جمع نمی‌شود؛ فقط نوع رویداد + زمان + کشور تقریبی (سمت Worker)
// ─────────────────────────────────────────────────────────────

// Worker کلودفلر
export const NOTIFY_ENDPOINT = 'https://dark-grass-6fc2.pshgamer45.workers.dev/'

// توکن ضد‌اسپم — همین مقدار باید در Worker به‌عنوان Secret با نام SITE_TOKEN ست شود
export const SITE_TOKEN = 'rsp7-2026-xK39dQ'

// fire-and-forget: هیچ‌وقت تجربه کاربر را نبندد
export function track(event, detail = {}) {
  if (!NOTIFY_ENDPOINT) return
  try {
    fetch(NOTIFY_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: SITE_TOKEN, event, detail, ts: new Date().toISOString() }),
      keepalive: true,
    }).catch(() => {})
  } catch { /* analytics must never break UX */ }
}

// سازگاری با کد قبلی
function notifyDownload() {
  track('resume_download')
}

// فرم تماس → پیام مستقیم به تلگرام صاحب سایت (از طریق Worker)
// نکته: بعضی مرورگرها/شبکه‌ها خواندن پاسخ cross-origin را می‌بندند؛
// پس ارسال را با دو روش انجام می‌دهیم و موفقیت را خوش‌بینانه فرض می‌کنیم
// (پیام واقعی فقط وقتی می‌رسد که Worker آن را قبول کند).
export function sendMessage(name, message) {
  if (!NOTIFY_ENDPOINT) return Promise.resolve(true)
  const payload = JSON.stringify({
    token: SITE_TOKEN,
    event: 'contact_message',
    detail: { name, message: String(message).slice(0, 2000) },
    ts: new Date().toISOString(),
  })

  // حداکثر ۵ ثانیه صبر — UX فرم نباید روی شبکه‌های کند بچسبد
  const withTimeout = (p, ms = 5000) =>
    Promise.race([p, new Promise((res) => setTimeout(() => res('timeout'), ms))])

  // روش ۱: fetch عادی — در اکثر مرورگرها پاسخ OK می‌آید
  const tryNormal = fetch(NOTIFY_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
  })
    .then((r) => r.ok)
    .catch(() => 'fail')

  // روش ۲: no-cors fallback — پاسخ opaque است؛ رسیدن به پاسخ یعنی ارسال شد
  const tryNoCors = () =>
    fetch(NOTIFY_ENDPOINT, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: payload,
    })
      .then(() => true)
      .catch(() => 'fail')

  return withTimeout(tryNormal).then((r1) => {
    if (r1 === true) return true
    // روش ۱ جواب نداد یا کند بود → no-cors با تایم‌اوت ۵ ثانیه؛ هر حالت دیگری هم «ارسال شد» را نشان بده
    return withTimeout(tryNoCors()).then(() => true)
  })
}

// ─── نسخه چاپی اختصاصی (فعلاً بلاک — دکمه به cvbuilder وصله) ───
function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
}

function buildPrintHTML(lang) {
  const t = DATA[lang]
  const rtl = t.dir === 'rtl'

  const skills = t.skills.main
    .map((s) => {
      const pct = Number(s.level) || 0
      return `<div class="skill"><div class="skill-head"><span class="skill-name">${esc(s.name)}</span><span class="skill-pct">${pct}%</span></div><div class="bar"><div class="bar-fill" style="width:${pct}%"></div></div></div>`
    })
    .join('')
  const tags = t.skills.tags.map((x) => `<span class="tag">${esc(x)}</span>`).join('')

  const exp = t.experience.items
    .map(
      (e) => `
      <div class="item">
        <div class="item-head"><strong>${esc(e.role)}</strong><span class="period">${esc(e.period)}</span></div>
        <div class="org">${esc(e.org || '')}</div>
        <ul>${e.bullets.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>
      </div>`
    )
    .join('')

  const projects = t.projects.items
    .map((p) => {
      const link = p.url ? `<a href="${esc(p.url)}">${esc(p.url.replace(/^https?:\/\//, ''))}</a>` : ''
      return `<div class="item"><div class="item-head"><strong>${esc(p.name)}</strong>${link ? `<span class="link">${link}</span>` : ''}</div><div class="desc">${esc(p.desc)}</div></div>`
    })
    .join('')

  const edu = t.education.items
    .map((e) => `<div class="item"><div class="item-head"><strong>${esc(e.degree)}</strong><span class="period">${esc(e.period)}</span></div>${e.org ? `<div class="org">${esc(e.org)}</div>` : ''}${e.note ? `<div class="desc">${esc(e.note)}</div>` : ''}</div>`)
    .join('')

  const honors = t.honors.items.map((h) => `<li>${esc(h)}</li>`).join('')
  const langs = t.languages.items.map((l) => `<span class="tag">${esc(l.name)} — ${esc(l.level)}</span>`).join('')

  const channels = [
    CONTACT.email && `<a href="mailto:${esc(CONTACT.email)}">${esc(CONTACT.email)}</a>`,
    CONTACT.phone && `<a href="tel:${esc(CONTACT.phone.replace(/\s/g, ''))}">${esc(CONTACT.phone)}</a>`,
    CONTACT.github && `<a href="https://github.com/${esc(CONTACT.github)}">github.com/${esc(CONTACT.github)}</a>`,
    CONTACT.linkedin && `<a href="${esc(CONTACT.linkedin)}">${esc(CONTACT.linkedin.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''))}</a>`,
    CONTACT.telegram && `<a href="${esc(CONTACT.telegram)}">${esc(CONTACT.telegram.replace(/^https?:\/\//, ''))}</a>`,
  ].filter(Boolean).join('<span class="sep">·</span>')

  return `<!doctype html>
<html lang="${t.htmlLang}" dir="${t.dir}">
<head>
<meta charset="utf-8">
<title>${esc(t.hero.name)} — ${esc(t.hero.roles[0])}</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css">
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body {
    font-family: 'Vazirmatn', system-ui, sans-serif;
    margin: 0; color: #1a1a1a; font-size: 13px; line-height: 1.7;
  }
  header { text-align: center; border-bottom: 2.5px solid #4f46e5; padding-bottom: 14px; margin-bottom: 18px; }
  h1 { margin: 0; font-size: 26px; }
  .role { color: #4f46e5; font-weight: 700; font-size: 15px; margin-top: 2px; }
  .subtitle { color: #555; margin-top: 4px; }
  .channels { margin-top: 6px; font-size: 11.5px; direction: ltr; }
  .channels a { color: #1a1a1a; text-decoration: none; }
  .sep { margin: 0 6px; color: #999; }
  h2 { font-size: 15px; color: #4f46e5; border-bottom: 1px solid #d4d4d8; padding-bottom: 4px; margin: 18px 0 10px; }
  .about { color: #333; }
  .skills-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; }
  .skill-head { display: flex; justify-content: space-between; font-weight: 600; font-size: 12.5px; }
  .skill-pct { color: #666; font-weight: 400; }
  .bar { height: 6px; background: #e4e4e7; border-radius: 3px; overflow: hidden; margin-top: 3px; }
  .bar-fill { height: 100%; background: #4f46e5; }
  .tag { display: inline-block; border: 1px solid #d4d4d8; border-radius: 999px; padding: 1px 10px; font-size: 11px; margin: 2px 3px 2px 0; color: #333; }
  .item { margin-bottom: 12px; break-inside: avoid; }
  .item-head { display: flex; justify-content: space-between; gap: 12px; }
  .period { color: #666; font-size: 11.5px; white-space: nowrap; }
  .org { color: #4f46e5; font-weight: 600; font-size: 12.5px; }
  .desc, .about { color: #333; }
  ul { margin: 6px 0 0; padding-${rtl ? 'right' : 'left'}: 18px; }
  li { margin-bottom: 3px; color: #333; }
  .link a { color: #4f46e5; font-size: 11.5px; font-weight: 400; direction: ltr; unicode-bidi: embed; }
  .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 0 24px; }
  @media print { .noprint { display: none !important; } }
</style>
</head>
<body>
  <header>
    <h1>${esc(t.hero.name)}</h1>
    <div class="role">${esc(t.hero.roles[0])}</div>
    <div class="subtitle">${esc(t.hero.subtitle)}</div>
    <div class="channels">${channels}</div>
  </header>

  <h2>${esc(t.about.title)}</h2>
  <p class="about">${esc(t.about.body)}</p>

  <h2>${esc(t.skills.title)}</h2>
  <div class="skills-grid">${skills}</div>
  <div style="margin-top:8px">${tags}</div>

  <h2>${esc(t.experience.title)}</h2>
  ${exp}

  <h2>${esc(t.projects.title)}</h2>
  ${projects}

  <div class="cols">
    <div>
      <h2>${esc(t.education.title)}</h2>
      ${edu}
    </div>
    <div>
      <h2>${esc(t.honors.title)}</h2>
      <ul>${honors}</ul>
      <h2 style="margin-top:14px">${esc(t.languages.title)}</h2>
      <div>${langs}</div>
    </div>
  </div>

  <script>window.onload = function () { setTimeout(function () { window.print() }, 400) }<\/script>
</body>
</html>`
}

function openPrintView(lang = 'fa') {
  track('resume_print_view')
  const w = window.open('', '_blank')
  if (!w) {
    // popup blocked → fallback: print current page
    window.print()
    return
  }
  w.document.write(buildPrintHTML(lang))
  w.document.close()
}

// دکمه فعلی: رزومه cvbuilder در تب جدید
function openResume() {
  track('resume_download')
  window.open(RESUME_PDF_URL, '_blank', 'noopener')
}

export { openPrintView, openResume, notifyDownload }

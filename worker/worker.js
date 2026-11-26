// ============================================================
// Cloudflare Worker v3 — ربات مدیریت رزومه پارسا شیروانی
// ============================================================
// قابلیت‌ها:
//  1. رویدادهای سایت → اعلان تلگرام (ضداسپم با توکن)
//  2. فرم تماس → پیام مستقیم
//  3. دستورات مشاهده: /stats /today /msgs /site /help
//  4. دستورات تغییر محتوا (کامیت به گیت‌هاب → deploy خودکار):
//     /menu            منوی کامل
//     /skill <Name> <0-100>     تغییر درصد مهارت
//     /skilladd <Name> <0-100>  افزودن مهارت جدید
//     /skilldel <Name>          حذف مهارت
//     /proj <شماره> <متن>       تغییر توضیح پروژه (هر دو زبان یکسان)
//     /addjob <عنوان> | <سازمان> | <دوره> | <مورد1>؛ <مورد2>   افزودن سابقه کاری
//     /orglink <URL>            لینک رزومه سازمانی
//     /pdflink <URL>            لینک دکمه دانلود PDF
//     /text <مسیر> = <متن>      مثال: /text fa.hero.subtitle = متن جدید
//     /ok                تأیید آخرین تغییر و کامیت
//     /cancel            لغو تغییر در انتظار
//  جریان هر تغییر: فرمان → پیش‌نمایش → /ok → commit به main → GitHub Actions خودکار deploy
//
// Secrets لازم:
//   BOT_TOKEN, CHAT_ID, SITE_TOKEN (= مقدار در src/config/notify.js)
//   GH_TOKEN  = GitHub Personal Access Token با دسترسی repo ( Contents: Read and write )
//   GH_REPO   = shshsh1385/shshsh1385.github.io
// اختیاری (KV bind با نام KV برای mute/stats) — بدون KV هم کار می‌کند.
// Cron Trigger (خلاصه روزانه): 0 21 * * *
// Webhook: https://api.telegram.org/bot<TOKEN>/setWebhook?url=<WORKER_URL>/webhook
// ============================================================

const MAX_PER_HOUR = 30
const MAX_MSG_LEN = 2000
const CONTENT_PATH = 'src/config/content.json'

const EVENT_ICONS = {
  page_view: '👀', lang_switch: '🌐', resume_download: '📄', resume_print_view: '🖨',
  project_click: '🔗', contact_email: '📧', contact_github: '🐙', contact_linkedin: '💼',
  contact_telegram: '💬', contact_phone: '📞', contact_form: '✉️', contact_message: '📨',
}

let env0 = {}
let memCount = { hour: '', n: 0 }

// ─── KV helpers (degrade بدون KV) ───
async function getKV(key, fallback) {
  if (env0.KV) { const v = await env0.KV.get(key); return v === null ? fallback : v }
  return fallback
}
async function putKV(key, value) { if (env0.KV) await env0.KV.put(key, String(value)) }
async function isMuted() { return (await getKV('muted', '0')) === '1' }
async function rateOK() {
  const hour = new Date().toISOString().slice(0, 13)
  if (memCount.hour !== hour) memCount = { hour, n: 0 }
  memCount.n++
  if (memCount.n > MAX_PER_HOUR) return false
  const c = parseInt((await getKV('cnt_' + hour, '0')) || '0', 10)
  if (c >= MAX_PER_HOUR) return false
  await putKV('cnt_' + hour, c + 1)
  return true
}

// ─── Telegram ───
async function tg(method, payload) {
  return fetch(`https://api.telegram.org/bot${env0.BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).then(r => r.ok)
}
async function send(text, kb) {
  const p = { chat_id: env0.CHAT_ID, text, parse_mode: 'HTML' }
  if (kb) p.reply_markup = { keyboard: kb, resize_keyboard: true }
  return tg('sendMessage', p)
}
function faTime(iso) {
  try {
    return new Date(iso).toLocaleString('fa-IR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Tehran' })
  } catch { return iso }
}
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') }

// ─── GitHub content API ───
async function ghGetContent() {
  const r = await fetch(`https://api.github.com/repos/${env0.GH_REPO}/contents/${CONTENT_PATH}`, {
    headers: { Authorization: `Bearer ${env0.GH_TOKEN}`, Accept: 'application/vnd.github+json', 'User-Agent': 'resume-bot' },
  })
  if (!r.ok) throw new Error(`GitHub GET ${r.status}`)
  const j = await r.json()
  return { sha: j.sha, json: JSON.parse(atob(j.content.replace(/\n/g, ''))) }
}
async function ghCommit(json, sha, message) {
  const r = await fetch(`https://api.github.com/repos/${env0.GH_REPO}/contents/${CONTENT_PATH}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${env0.GH_TOKEN}`, Accept: 'application/vnd.github+json', 'User-Agent': 'resume-bot', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      content: btoa(unescape(encodeURIComponent(JSON.stringify(json, null, 2)))),
      sha,
    }),
  })
  if (!r.ok) throw new Error(`GitHub PUT ${r.status}: ${await r.text().catch(() => '')}`)
  return true
}

// ─── EDITORS: هر ادیتور (json) => (json) تغییر‌یافته یا throw ───
const EDITORS = {
  skill(args, json) {
    const [name, level] = args
    const lv = parseInt(level, 10)
    if (!(lv >= 0 && lv <= 100)) throw new Error('درصد باید 0 تا 100 باشد')
    for (const lang of ['fa', 'en']) {
      const s = json[lang].skills.main.find(x => x.name.toLowerCase() === name.toLowerCase())
      if (!s) throw new Error(`مهارت «${name}» نیست. از /skilladd استفاده کن یا /site ببین لیست را`)
      s.level = lv
    }
    return `مهارت ${name} → ${lv}% (هر دو زبان)`
  },
  skilladd(args, json) {
    const [name, level] = args
    const lv = parseInt(level, 10)
    if (!(lv >= 0 && lv <= 100)) throw new Error('درصد باید 0 تا 100 باشد')
    for (const lang of ['fa', 'en']) {
      if (json[lang].skills.main.some(x => x.name.toLowerCase() === name.toLowerCase())) throw new Error('از قبل هست — از /skill استفاده کن')
      json[lang].skills.main.push({ name, level: lv })
    }
    return `مهارت جدید: ${name} (${lv}%)`
  },
  skilldel(args, json) {
    const name = args[0]
    let found = false
    for (const lang of ['fa', 'en']) {
      const i = json[lang].skills.main.findIndex(x => x.name.toLowerCase() === name.toLowerCase())
      if (i >= 0) { json[lang].skills.main.splice(i, 1); found = true }
    }
    if (!found) throw new Error(`مهارت «${name}» پیدا نشد`)
    return `حذف شد: ${name}`
  },
  proj(args, json) {
    const idx = parseInt(args[0], 10) - 1
    const desc = args.slice(1).join(' ')
    if (isNaN(idx) || idx < 0 || !desc) throw new Error('قالب: /proj <شماره 1-4> <توضیح جدید>')
    const names = []
    for (const lang of ['fa', 'en']) {
      if (!json[lang].projects.items[idx]) throw new Error(`پروژه شماره ${idx + 1} نیست`)
      json[lang].projects.items[idx].desc = desc
      names.push(json[lang].projects.items[idx].name)
    }
    return `توضیح «${names[0]} / ${names[1]}» به‌روز شد`
  },
  addjob(args, json) {
    // /addjob عنوان | سازمان | دوره | مورد1؛ مورد2؛ مورد3
    const [role, org, period, bullets] = args.join(' ').split('|').map(s => s.trim())
    if (!role || !org || !period) throw new Error('قالب: /addjob عنوان | سازمان | دوره | مورد1؛ مورد2')
    const list = (bullets || '').split('؛').map(s => s.trim()).filter(Boolean)
    for (const lang of ['fa', 'en']) json[lang].experience.items.unshift({ role, org, period, bullets: list })
    return `سابقه جدید اضافه شد: ${role} @ ${org}`
  },
  orglink(args, json) {
    const url = args[0]
    if (!/^https?:\/\/.+/.test(url || '')) throw new Error('قالب: /orglink https://...')
    json.site.orgResumeUrl = url
    return `لینک رزومه سازمانی ست شد`
  },
  pdflink(args, json) {
    const url = args[0]
    if (!/^https?:\/\/.+/.test(url || '')) throw new Error('قالب: /pdflink https://...')
    json.site.resumePdfUrl = url
    return `لینک دکمه دانلود PDF ست شد`
  },
}

// ─── دستورات ───
const MENU_KB = [
  ['/stats', '/today'], ['/msgs', '/site'],
  ['/menu', '/help'],
]

async function handleCommand(text) {
  const raw = (text || '').trim()
  if (!raw.startsWith('/')) return
  const parts = raw.split(/\s+/)
  const cmd = parts[0].toLowerCase()
  const args = parts.slice(1)

  // ── مشاهده ──
  if (cmd === '/menu') {
    return send(
      `🤖 <b>منوی ربات</b>\n\n` +
      `📊 مشاهده:\n/stats — آمار این ساعت\n/today — خلاصه امروز\n/msgs — پیام‌های فرم تماس (آخرین‌ها)\n/site — وضعیت فعلی محتوا\n\n` +
      `✏️ تغییر محتوا (پیش‌نمایش → /ok):\n` +
      `/skill Python 92 — درصد مهارت\n` +
      `/skilladd Tailwind 70 — مهارت جدید\n` +
      `/skilldel Bootstrap — حذف مهارت\n` +
      `/proj 1 توضیح جدید — توضیح پروژه\n` +
      `/addjob عنوان | سازمان | دوره | مورد1؛ مورد2 — سابقه جدید\n` +
      `/orglink https://... — لینک رزومه سازمانی\n` +
      `/pdflink https://... — لینک PDF\n` +
      `/text fa.hero.subtitle = متن — هر متنی\n\n` +
      `✅ /ok تأیید و انتشار  ❌ /cancel لغو`,
      MENU_KB
    )
  }
  if (cmd === '/help') return send('🤖 /menu را بزن برای منوی کامل.', MENU_KB)
  if (cmd === '/stats') {
    const hour = new Date().toISOString().slice(0, 13)
    const c = await getKV('cnt_' + hour, '0')
    return send(`📊 اعلان‌های این ساعت: ${c}\n🔇 ${(await getKV('muted', '0')) === '1' ? 'بی‌صدا' : 'فعال'}`, MENU_KB)
  }
  if (cmd === '/today') {
    const today = new Date().toISOString().slice(0, 10)
    const keys = ['page_view', 'resume_download', 'project_click', 'contact_message']
    const lines = []
    for (const k of keys) lines.push(`${EVENT_ICONS[k]} ${k}: ${await getKV(`day_${today}_${k}`, '0')}`)
    return send(`📊 <b>امروز (${today})</b>\n${lines.join('\n')}`, MENU_KB)
  }
  if (cmd === '/msgs') {
    const msgs = JSON.parse((await getKV('contact_msgs', '[]')))
    if (!msgs.length) return send('📨 پیامی نیست.', MENU_KB)
    const last = msgs.slice(-5).reverse()
      .map(m => `👤 ${esc(m.name)}\n${esc(m.message).slice(0, 300)}\n🕒 ${faTime(m.ts)}`)
      .join('\n———\n')
    return send(`📨 <b>۵ پیام آخر فرم تماس</b>\n\n${last}`, MENU_KB)
  }
  if (cmd === '/site') {
    try {
      const { json } = await ghGetContent()
      const skills = json.fa.skills.main.map(s => `${s.name} ${s.level}%`).join(' · ')
      const projects = json.fa.projects.items.map((p, i) => `${i + 1}. ${p.name}`).join('\n')
      return send(
        `🌐 <b>وضعیت محتوا</b>\n\n` +
        `🖥 مهارت‌ها: ${esc(skills)}\n\n` +
        `🔗 پروژه‌ها:\n${esc(projects)}\n\n` +
        `📄 PDF: ${esc(json.site.resumePdfUrl)}\n` +
        `🏢 سازمانی: ${json.site.orgResumeUrl ? esc(json.site.orgResumeUrl) : '— هنوز نداره'}`,
        MENU_KB
      )
    } catch (e) { return send(`⚠️ خطا در خواندن: ${esc(e.message)}`, MENU_KB) }
  }
  if (cmd === '/mute') { await putKV('muted', '1'); return send('🔇 اعلان‌ها بی‌صدا شد (فرم تماس همچنان می‌آید)', MENU_KB) }
  if (cmd === '/unmute') { await putKV('muted', '0'); return send('🔔 اعلان‌ها فعال شد', MENU_KB) }

  // ── تأیید / لغو ──
  if (cmd === '/ok') {
    const pending = JSON.parse((await getKV('pending_edit', 'null')) || 'null')
    if (!pending) return send('چیزی در انتظار تأیید نیست.', MENU_KB)
    try {
      const { sha, json: current } = await ghGetContent()
      await ghCommit(pending.json, sha, `bot: ${pending.summary}`)
      await putKV('pending_edit', 'null')
      return send(`✅ کامیت شد: ${esc(pending.summary)}\n🚀 GitHub Actions در حال deploy — حدود ۲ دقیقه صبر کن.`, MENU_KB)
    } catch (e) { return send(`⚠️ خطای کامیت: ${esc(e.message)}`, MENU_KB) }
  }
  if (cmd === '/cancel') {
    await putKV('pending_edit', 'null')
    return send('❌ لغو شد.', MENU_KB)
  }

  // ── تغییرات محتوا ──
  if (EDITORS[cmd.replace('/', '')] || cmd === '/text') {
    try {
      const { json } = await ghGetContent()
      let summary
      if (cmd === '/text') {
        // /text fa.hero.subtitle = متن جدید
        const m = raw.match(/^\/text\s+(\S+)\s*=\s*([\s\S]+)$/)
        if (!m) throw new Error('قالب: /text fa.hero.subtitle = متن جدید')
        const [, path, value] = m
        const segs = path.split('.')
        let obj = json
        for (let i = 0; i < segs.length - 1; i++) {
          if (obj[segs[i]] === undefined) throw new Error(`مسیر اشتباه: ${segs.slice(0, i + 1).join('.')}`)
          obj = obj[segs[i]]
        }
        const last = segs[segs.length - 1]
        if (obj[last] === undefined) throw new Error(`مسیر اشتباه: ${path}`)
        obj[last] = value.trim()
        summary = `${path} → «${value.trim().slice(0, 40)}»`
      } else {
        const editor = EDITORS[cmd.replace('/', '')]
        summary = editor(args, json)
      }
      await putKV('pending_edit', JSON.stringify({ json, summary, ts: Date.now() }))
      const preview = JSON.stringify(json, null, 1)
      return send(
        `📝 <b>پیش‌نمایش تغییر</b>\n${esc(summary)}\n\n` +
        `✅ /ok برای انتشار (کامیت + deploy خودکار)\n❌ /cancel لغو\n\n` +
        `<i>اندازه JSON: ${Math.round(preview.length / 1024)}KB</i>`,
        [['✅ OK'], ['❌ Cancel'], ...MENU_KB]
      )
    } catch (e) { return send(`⚠️ ${esc(e.message)}`, MENU_KB) }
  }
}

// ─── Main ───
export default {
  async fetch(request, env, ctx) {
    env0 = env
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors })
    const url = new URL(request.url)

    // webhook تلگرام
    if (request.method === 'POST' && url.pathname === '/webhook') {
      try {
        const update = await request.json()
        const msg = update?.message
        if (msg?.text && String(msg.chat.id) === String(env.CHAT_ID)) {
          // ذخیره پیام‌های غیردستوری به عنوان نکته؟ نه — فقط دستورات
          await handleCommand(msg.text)
        }
      } catch {}
      return new Response('ok', { headers: cors })
    }

    // رویداد سایت
    if (request.method === 'POST') {
      let body
      try { body = await request.json() } catch { body = null }
      if (!body || body.token !== env.SITE_TOKEN) {
        return new Response(JSON.stringify({ ok: false, err: 'bad token' }), { status: 403, headers: { ...cors, 'Content-Type': 'application/json' } })
      }

      // فرم تماس: همیشه بفرست + ذخیره در KV برای /msgs
      if (body.event === 'contact_message') {
        const name = String(body.detail?.name || '').slice(0, 60)
        const msg = String(body.detail?.message || '').slice(0, MAX_MSG_LEN)
        if (name && msg) {
          const msgs = JSON.parse((await getKV('contact_msgs', '[]')))
          msgs.push({ name, message: msg, ts: body.ts })
          await putKV('contact_msgs', JSON.stringify(msgs.slice(-50)))
          if (!(await isMuted())) {
            await send(`📨 <b>پیام جدید از سایت</b>\n👤 ${esc(name)}\n\n${esc(msg)}\n\n🕒 ${faTime(body.ts)}`)
          }
        }
        return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, 'Content-Type': 'application/json' } })
      }

      // شمارنده روزانه برای /today
      const today = new Date().toISOString().slice(0, 10)
      const dayKey = `day_${today}_${body.event}`
      await putKV(dayKey, parseInt((await getKV(dayKey, '0')) || '0', 10) + 1)

      const country = request.cf?.country || ''
      const lang = body.detail?.lang === 'en' ? 'EN' : body.detail?.lang === 'fa' ? 'FA' : ''
      const icon = EVENT_ICONS[body.event] || '🔔'
      let line = ''
      switch (body.event) {
        case 'page_view': line = `👀 بازدید صفحه ${lang ? '(' + lang + ')' : ''}${country ? ' — 🌍 ' + country : ''}`; break
        case 'lang_switch': line = `🌐 تعویض زبان به ${lang || ''}`; break
        case 'resume_download': line = `📄 رزومه دانلود شد!${country ? ' — 🌍 ' + country : ''}`; break
        case 'resume_print_view': line = '🖨 نسخه چاپی باز شد'; break
        case 'project_click': line = `🔗 کلیک روی پروژه: <b>${esc(body.detail?.project || '')}</b>`; break
        default:
          line = body.event?.startsWith('contact_')
            ? `${icon} کلیک روی ${esc(body.event.replace('contact_', '').toUpperCase())}`
            : `${icon} ${esc(body.event)}`
      }
      if (!(await isMuted()) && (await rateOK())) await send(`${line}\n🕒 ${faTime(body.ts)}`)
      return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, 'Content-Type': 'application/json' } })
    }

    // GET با ?cmd= (روش بدون webhook)
    if (request.method === 'GET') {
      const cmd = url.searchParams.get('cmd')
      if (cmd) await handleCommand(cmd)
      return new Response('ok', { headers: cors })
    }
    return new Response('ok', { headers: cors })
  },

  async scheduled(event, env, ctx) {
    env0 = env
    const today = new Date().toISOString().slice(0, 10)
    const keys = ['page_view', 'resume_download', 'project_click', 'contact_message']
    const lines = []
    for (const k of keys) lines.push(`${EVENT_ICONS[k]} ${k}: ${await getKV(`day_${today}_${k}`, '0')}`)
    await send(`📊 <b>خلاصه امروز (${today})</b>\n${lines.join('\n')}`)
  },
}

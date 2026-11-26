// ============================================================
// Cloudflare Worker v4 — ربات مدیریت رزومه پارسا شیروانی
// ============================================================
// جدید در v4 (علاوه بر v3):
//   /photo      — عکس را در پاسخ به ربات بفرست → کامیت به public/me.jpg → deploy
//   /undo       — برگرداندن آخرین تغییر محتوا (فقط content.json و me.jpg)
//   /backup     — دریافت content.json به عنوان فایل
//   /qr         — QR code لینک سایت
//   خلاصه هفتگی — هر جمعه ۲۱:۰۰ UTC با پربازدیدترین پروژه (cron جدا در scheduled)
//
// Secrets: BOT_TOKEN, CHAT_ID, SITE_TOKEN, GH_TOKEN, GH_REPO
// اختیاری: KV bind (نام متغیر: KV)
// Cron Triggers (دو تا):
//   0 21 * * *        → خلاصه روزانه
//   0 21 * * 5        → خلاصه هفتگی (جمعه‌ها)
// Webhook: https://api.telegram.org/bot<TOKEN>/setWebhook?url=<WORKER_URL>/webhook
// ============================================================

const MAX_PER_HOUR = 30
const MAX_MSG_LEN = 2000
const CONTENT_PATH = 'src/config/content.json'
const PHOTO_PATH = 'public/me.jpg'
const SITE_URL = 'https://shshsh1385.github.io'

const EVENT_ICONS = {
  page_view: '👀', lang_switch: '🌐', resume_download: '📄', resume_print_view: '🖨',
  project_click: '🔗', contact_email: '📧', contact_github: '🐙', contact_linkedin: '💼',
  contact_telegram: '💬', contact_phone: '📞', contact_form: '✉️', contact_message: '📨',
}

let env0 = {}
let memCount = { hour: '', n: 0 }

// ─── KV helpers ───
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
async function sendFile(filename, bytes, caption) {
  const fd = new FormData()
  fd.append('chat_id', env0.CHAT_ID)
  fd.append('document', new Blob([bytes]), filename)
  if (caption) fd.append('caption', caption)
  return fetch(`https://api.telegram.org/bot${env0.BOT_TOKEN}/sendDocument`, { method: 'POST', body: fd }).then(r => r.ok)
}
async function sendPhotoBytes(bytes, caption) {
  const fd = new FormData()
  fd.append('chat_id', env0.CHAT_ID)
  fd.append('photo', new Blob([bytes]), 'qr.png')
  if (caption) fd.append('caption', caption)
  return fetch(`https://api.telegram.org/bot${env0.BOT_TOKEN}/sendPhoto`, { method: 'POST', body: fd }).then(r => r.ok)
}
function faTime(iso) {
  try {
    return new Date(iso).toLocaleString('fa-IR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Tehran' })
  } catch { return iso }
}
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') }

// ─── UTF-8-safe Base64 ───
function b64ToUtf8(b64) {
  const bin = atob(b64.replace(/\n/g, ''))
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
  return new TextDecoder('utf-8').decode(bytes)
}
function utf8ToB64(str) {
  const bytes = new TextEncoder().encode(str)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin)
}

// ─── GitHub content API (raw bytes برای عکس) ───
async function ghGetContent() {
  const r = await fetch(`https://api.github.com/repos/${env0.GH_REPO}/contents/${CONTENT_PATH}`, {
    headers: { Authorization: `Bearer ${env0.GH_TOKEN}`, Accept: 'application/vnd.github+json', 'User-Agent': 'resume-bot' },
  })
  if (!r.ok) throw new Error(`GitHub GET ${r.status}`)
  const j = await r.json()
  return { sha: j.sha, json: JSON.parse(b64ToUtf8(j.content)) }
}
async function ghCommitJson(json, sha, message) {
  const r = await fetch(`https://api.github.com/repos/${env0.GH_REPO}/contents/${CONTENT_PATH}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${env0.GH_TOKEN}`, Accept: 'application/vnd.github+json', 'User-Agent': 'resume-bot', 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, content: utf8ToB64(JSON.stringify(json, null, 2)), sha }),
  })
  if (!r.ok) throw new Error(`GitHub PUT ${r.status}: ${await r.text().catch(() => '')}`)
  return true
}
async function ghGetBinary(path) {
  const r = await fetch(`https://api.github.com/repos/${env0.GH_REPO}/contents/${path}`, {
    headers: { Authorization: `Bearer ${env0.GH_TOKEN}`, Accept: 'application/vnd.github+json', 'User-Agent': 'resume-bot' },
  })
  if (!r.ok) throw new Error(`GitHub GET ${path} ${r.status}`)
  const j = await r.json()
  return { sha: j.sha, bytes: Uint8Array.from(atob(j.content.replace(/\n/g, '')), c => c.charCodeAt(0)) }
}
async function ghCommitBinary(path, bytes, sha, message) {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  const r = await fetch(`https://api.github.com/repos/${env0.GH_REPO}/contents/${path}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${env0.GH_TOKEN}`, Accept: 'application/vnd.github+json', 'User-Agent': 'resume-bot', 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, content: btoa(bin), sha }),
  })
  if (!r.ok) throw new Error(`GitHub PUT ${path} ${r.status}: ${await r.text().catch(() => '')}`)
  return true
}

// ─── EDITORS (مانند v3) ───
const EDITORS = {
  skill(args, json) {
    const [name, level] = args
    const lv = parseInt(level, 10)
    if (!(lv >= 0 && lv <= 100)) throw new Error('درصد باید 0 تا 100 باشد')
    for (const lang of ['fa', 'en']) {
      const s = json[lang].skills.main.find(x => x.name.toLowerCase() === name.toLowerCase())
      if (!s) throw new Error(`مهارت «${name}» نیست. از /skilladd استفاده کن`)
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
    return 'لینک رزومه سازمانی ست شد'
  },
  pdflink(args, json) {
    const url = args[0]
    if (!/^https?:\/\/.+/.test(url || '')) throw new Error('قالب: /pdflink https://...')
    json.site.resumePdfUrl = url
    return 'لینک دکمه دانلود PDF ست شد'
  },
}

// ─── منو ───
const MENU_KB = [
  ['/stats', '/today'], ['/msgs', '/site'],
  ['/backup', '/qr'], ['/undo', '/menu'],
]

// دکمه‌های شیشه‌ای (inline) — هر دکمه یه دستور را اجرا می‌کند
function mainMenuInline() {
  return {
    inline_keyboard: [
      [{ text: '📊 آمار', callback_data: 'cmd:/stats' }, { text: '📅 امروز', callback_data: 'cmd:/today' }],
      [{ text: '📨 پیام‌ها', callback_data: 'cmd:/msgs' }, { text: '🌐 وضعیت سایت', callback_data: 'cmd:/site' }],
      [
        { text: '🖼 عکس پروفایل', callback_data: 'cmd:/photo' },
        { text: '🔗 QR سایت', callback_data: 'cmd:/qr' },
      ],
      [
        { text: '💾 پشتیبان‌گیری', callback_data: 'cmd:/backup' },
        { text: '↩️ برگرداندن', callback_data: 'cmd:/undo' },
      ],
      [
        { text: '✏️ راهنمای ویرایش', callback_data: 'cmd:/edit' },
        { text: '🔕 بی‌صدا', callback_data: 'cmd:/mute' },
      ],
      [{ text: '🔄 تازه‌سازی منو', callback_data: 'cmd:/menu' }],
    ],
  }
}

function editHelpInline() {
  return {
    inline_keyboard: [
      [{ text: '🌐 وضعیت فعلی محتوا', callback_data: 'cmd:/site' }],
      [{ text: '💾 پشتیبان قبل از ویرایش', callback_data: 'cmd:/backup' }],
      [{ text: '🔙 بازگشت به منو', callback_data: 'cmd:/menu' }],
    ],
  }
}

// پاسخ به دکمه‌های شیشه‌ای
async function handleCallback(cb) {
  const data = cb?.data || ''
  if (!data.startsWith('cmd:')) return
  const cmd = data.slice(4)

  // تأیید دریافت دکمه (چراغ دکمه خاموش شود)
  await tg('answerCallbackQuery', { callback_query_id: cb.id })
  await tg('deleteMessage', { chat_id: cb.message.chat.id, message_id: cb.message.message_id }).catch(() => {})
  await handleCommand(cmd)
}

async function handleCommand(text) {
  const raw = (text || '').trim()
  if (!raw.startsWith('/')) return
  const parts = raw.split(/\s+/)
  const cmd = parts[0].toLowerCase()
  const args = parts.slice(1)

  if (cmd === '/menu') {
    return tg('sendMessage', {
      chat_id: env0.CHAT_ID,
      text:
        `🤖 <b>مدیریت رزومه</b>\n` +
        `<i>shshsh1385.github.io</i>\n\n` +
        `از دکمه‌های زیر استفاده کن 👇\n\n` +
        `✏️ <b>ویرایش محتوا:</b> دستور را بنویس، پیش‌نمایش می‌دهم، با /ok منتشر می‌شود.\n` +
        `<code>/skill Python 92</code> — درصد مهارت\n` +
        `<code>/proj 1 توضیح جدید</code> — توضیح پروژه\n` +
        `<code>/text fa.hero.subtitle = متن</code> — هر متنی\n\n` +
        `🖼 <b>عکس:</b> با /photo راهنما بگیر، بعد عکس را در همین چت بفرست.`,
      parse_mode: 'HTML',
      reply_markup: mainMenuInline(),
    })
  }
  if (cmd === '/edit') {
    return tg('sendMessage', {
      chat_id: env0.CHAT_ID,
      text:
        `✏️ <b>راهنمای ویرایش محتوا</b>\n\n` +
        `جریان: دستور → پیش‌نمایش → <b>/ok</b> انتشار · <b>/cancel</b> لغو · بعدش <b>/undo</b> برگشت\n\n` +
        `🎯 مهارت‌ها:\n` +
        `<code>/skill Python 92</code> — تغییر درصد\n` +
        `<code>/skilladd Tailwind 70</code> — افزودن\n` +
        `<code>/skilldel Bootstrap</code> — حذف\n\n` +
        `🔗 پروژه‌ها:\n` +
        `<code>/proj 1 توضیح جدید پروژه</code>\n\n` +
        `💼 سابقه کاری جدید:\n` +
        `<code>/addjob عنوان | سازمان | دوره | مورد1؛ مورد2</code>\n\n` +
        `🔗 لینک‌ها:\n` +
        `<code>/orglink https://...</code> — رزومه سازمانی\n` +
        `<code>/pdflink https://...</code> — دکمه PDF\n\n` +
        `📝 هر متن دیگر:\n` +
        `<code>/text fa.hero.subtitle = متن جدید</code>\n` +
        `<code>/text en.about.body = English text</code>\n\n` +
        `💡 زبان: fa / en — مسیرها را با /site ببین.`,
      parse_mode: 'HTML',
      reply_markup: editHelpInline(),
    })
  }
  if (cmd === '/help') return send('🤖 /menu را بزن برای منوی کامل.')

  // ── /photo: راهنما (عکس خودش در webhook handler پردازش می‌شود) ──
  if (cmd === '/photo') {
    return send('🖼 عکس جدید را همین‌جا بفرست (به‌صورت Photo، نه File). بعد از تأیید، کامیت و deploy می‌شود.', MENU_KB)
  }

  // ── /qr ──
  if (cmd === '/qr') {
    try {
      const api = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(SITE_URL)}`
      const img = await (await fetch(api)).arrayBuffer()
      await sendPhotoBytes(new Uint8Array(img), `🔗 ${SITE_URL}`)
      return
    } catch (e) { return send(`⚠️ خطای QR: ${esc(e.message)}`, MENU_KB) }
  }

  // ── /backup ──
  if (cmd === '/backup') {
    try {
      const { json } = await ghGetContent()
      await sendFile('content.json', new TextEncoder().encode(JSON.stringify(json, null, 2)), '💾 پشتیبان محتوای سایت')
      return
    } catch (e) { return send(`⚠️ خطا: ${esc(e.message)}`, MENU_KB) }
  }

  // ── /undo ──
  if (cmd === '/undo') {
    const last = JSON.parse((await getKV('last_commit', 'null')) || 'null')
    if (!last) return send('تغییری برای برگرداندن نیست.', MENU_KB)
    try {
      if (last.type === 'content') {
        const { sha } = await ghGetContent()
        await ghCommitJson(last.before, sha, `bot: undo — ${last.summary}`)
      } else if (last.type === 'photo') {
        const { sha } = await ghGetBinary(PHOTO_PATH)
        await ghCommitBinary(PHOTO_PATH, last.beforeBytes, sha, 'bot: undo — photo')
      }
      await putKV('last_commit', 'null')
      return send(`↩️ برگردانده شد: ${esc(last.summary)}\n🚀 deploy خودکار در جریان است.`, MENU_KB)
    } catch (e) { return send(`⚠️ خطای undo: ${esc(e.message)}`, MENU_KB) }
  }

  // ── مشاهده ──
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
        `🌐 <b>وضعیت محتوا</b>\n\n🖥 مهارت‌ها: ${esc(skills)}\n\n🔗 پروژه‌ها:\n${esc(projects)}\n\n📄 PDF: ${esc(json.site.resumePdfUrl)}\n🏢 سازمانی: ${json.site.orgResumeUrl ? esc(json.site.orgResumeUrl) : '—'}`,
        MENU_KB
      )
    } catch (e) { return send(`⚠️ خطا: ${esc(e.message)}`, MENU_KB) }
  }
  if (cmd === '/mute') { await putKV('muted', '1'); return send('🔇 بی‌صدا شد (فرم تماس همیشه می‌آید)', MENU_KB) }
  if (cmd === '/unmute') { await putKV('muted', '0'); return send('🔔 فعال شد', MENU_KB) }

  // ── تأیید / لغو ──
  if (cmd === '/ok') {
    const pending = JSON.parse((await getKV('pending_edit', 'null')) || 'null')
    if (!pending) return send('چیزی در انتظار تأیید نیست.')
    try {
      const { sha, json: current } = await ghGetContent()
      await ghCommitJson(pending.json, sha, `bot: ${pending.summary}`)
      await putKV('last_commit', JSON.stringify({ type: 'content', before: current, summary: pending.summary }))
      await putKV('pending_edit', 'null')
      return tg('sendMessage', {
        chat_id: env0.CHAT_ID,
        text: `✅ <b>منتشر شد!</b>\n${esc(pending.summary)}\n\n🚀 deploy خودکار — ~۲ دقیقه بعد سایت آپدیت است.`,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '↩️ برگرداندن (undo)', callback_data: 'cmd:/undo' }, { text: '🌐 دیدن سایت', url: SITE_URL }],
          ],
        },
      })
    } catch (e) { return send(`⚠️ خطای کامیت: ${esc(e.message)}`, MENU_KB) }
  }
  if (cmd === '/cancel') {
    await putKV('pending_edit', 'null')
    return send('❌ لغو شد.')
  }

  // ── تغییرات محتوا ──
  if (EDITORS[cmd.replace('/', '')] || cmd === '/text') {
    try {
      const { json } = await ghGetContent()
      let summary
      if (cmd === '/text') {
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
        summary = EDITORS[cmd.replace('/', '')](args, json)
      }
      await putKV('pending_edit', JSON.stringify({ json, summary, ts: Date.now() }))
      return send(`📝 <b>پیش‌نمایش تغییر</b>\n${esc(summary)}\n\n✅ /ok برای انتشار\n❌ /cancel لغو\n↩️ بعد از ok: /undo`, MENU_KB)
    } catch (e) { return send(`⚠️ ${esc(e.message)}`, MENU_KB) }
  }
}

// ─── پردازش پیام تلگرام (دستور + عکس) ───
async function handleUpdate(update) {
  const msg = update?.message
  if (!msg) return

  // 🖼 عکس → /photo flow
  if (msg.photo && Array.isArray(msg.photo) && msg.photo.length) {
    try {
      const photo = msg.photo[msg.photo.length - 1] // بزرگ‌ترین سایز
      const fr = await fetch(`https://api.telegram.org/bot${env0.BOT_TOKEN}/getFile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_id: photo.file_id }),
      })
      const file = await fr.json().catch(() => null)
      // پاسخ موفق تلگرام: { ok: true, result: { file_path: ... } }
      const filePath = file?.ok ? file.result?.file_path : null
      if (!filePath) {
        throw new Error(`getFile ${fr.status}: ${file?.description || fr.statusText || 'no file_path'}`)
      }
      const dl = await fetch(`https://api.telegram.org/file/bot${env0.BOT_TOKEN}/${filePath}`)
      if (!dl.ok) throw new Error(`دانلود فایل ${dl.status}`)
      const img = new Uint8Array(await dl.arrayBuffer())
      if (!img.length) throw new Error('فایل خالی از تلگرام')
      const { sha, bytes: oldBytes } = await ghGetBinary(PHOTO_PATH)
      await ghCommitBinary(PHOTO_PATH, img, sha, 'bot: update profile photo')
      await putKV('last_commit', JSON.stringify({ type: 'photo', beforeBytes: Array.from(oldBytes), summary: 'عکس پروفایل' }))
      return tg('sendMessage', {
        chat_id: env0.CHAT_ID,
        text: '✅ <b>عکس پروفایل عوض شد!</b>\n\n🚀 deploy خودکار — ~۲ دقیقه\n💡 عکس مربع با صورت وسط کادر بهترین نتیجه را می‌دهد.',
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '↩️ برگرداندن (undo)', callback_data: 'cmd:/undo' }, { text: '🌐 دیدن سایت', url: SITE_URL }],
          ],
        },
      })
    } catch (e) {
      await send(`⚠️ خطای عکس: ${esc(e.message)}`, MENU_KB)
    }
    return
  }

  if (msg.text && String(msg.chat.id) === String(env0.CHAT_ID)) {
    await handleCommand(msg.text)
  }
}

// ─── خلاصه‌ها ───
async function dailyDigest() {
  const today = new Date().toISOString().slice(0, 10)
  const keys = ['page_view', 'resume_download', 'project_click', 'contact_message']
  const lines = []
  for (const k of keys) lines.push(`${EVENT_ICONS[k]} ${k}: ${await getKV(`day_${today}_${k}`, '0')}`)
  await send(`📊 <b>خلاصه امروز (${today})</b>\n${lines.join('\n')}`)
}
async function weeklyDigest() {
  const weekKey = 'week_' + Math.floor(Date.now() / (7 * 864e5))
  const lines = []
  const today = new Date().toISOString().slice(0, 10)
  for (const k of ['page_view', 'resume_download', 'contact_message']) {
    // هفتگی: جمع روزهای اخیر — ساده: از کلیدهای روزهای این هفته
    let total = 0
    for (let d = 0; d < 7; d++) {
      const day = new Date(Date.now() - d * 864e5).toISOString().slice(0, 10)
      total += parseInt((await getKV(`day_${day}_${k}`, '0')) || '0', 10)
    }
    lines.push(`${EVENT_ICONS[k]} ${k}: ${total}`)
  }
  // پربازدیدترین پروژه این هفته
  let top = '—'
  let topN = 0
  const projCounts = JSON.parse((await getKV(weekKey + '_projects', '{}')))
  for (const [name, n] of Object.entries(projCounts)) {
    if (n > topN) { topN = n; top = name }
  }
  lines.push(`🏆 پربازدیدترین پروژه هفته: ${esc(top)}${topN ? ` (${topN} کلیک)` : ''}`)
  await send(`📈 <b>خلاصه هفتگی</b>\n${lines.join('\n')}`)
}

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

    if (request.method === 'POST' && url.pathname === '/webhook') {
      try {
        const update = await request.json()
        if (String(update?.message?.chat?.id) === String(env.CHAT_ID)) {
          await handleUpdate(update)
        } else if (String(update?.callback_query?.message?.chat?.id) === String(env.CHAT_ID)) {
          await handleCallback(update.callback_query)
        }
      } catch {}
      return new Response('ok', { headers: cors })
    }

    if (request.method === 'POST') {
      let body
      try { body = await request.json() } catch { body = null }
      if (!body || body.token !== env.SITE_TOKEN) {
        return new Response(JSON.stringify({ ok: false, err: 'bad token' }), { status: 403, headers: { ...cors, 'Content-Type': 'application/json' } })
      }

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

      const today = new Date().toISOString().slice(0, 10)
      const dayKey = `day_${today}_${body.event}`
      await putKV(dayKey, parseInt((await getKV(dayKey, '0')) || '0', 10) + 1)

      // آمار کلیک پروژه برای پربازدیدترین هفتگی
      if (body.event === 'project_click' && body.detail?.project) {
        const weekKey = 'week_' + Math.floor(Date.now() / (7 * 864e5))
        const projCounts = JSON.parse((await getKV(weekKey + '_projects', '{}')))
        projCounts[body.detail.project] = (projCounts[body.detail.project] || 0) + 1
        await putKV(weekKey + '_projects', JSON.stringify(projCounts))
      }

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

    if (request.method === 'GET') {
      const cmd = url.searchParams.get('cmd')
      if (cmd) await handleCommand(cmd)
      return new Response('ok', { headers: cors })
    }
    return new Response('ok', { headers: cors })
  },

  async scheduled(event, env, ctx) {
    env0 = env
    const cron = event.cron || ''
    // دو cron: روزانه 0 21 * * * و هفتگی 0 21 * * 5
    if (cron === '0 21 * * 5') await weeklyDigest()
    else await dailyDigest()
  },
}

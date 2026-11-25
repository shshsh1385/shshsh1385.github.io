// ============================================================
// Cloudflare Worker — ربات اعلان رزومه پارسا شیروانی
// ============================================================
// قابلیت‌ها:
//  1. POST /  → دریافت رویداد از سایت (توکن‌دار، ضداسپم) → پیام تلگرام
//  2. GET  /bot/COMMAND یا POST از تلگرام (Webhook) → دستورات /stats /mute /unmute /daily
//  3. Cron Trigger (هر شب 21:00 UTC) → خلاصه روزانه
//
// Secrets لازم (Workers → Settings → Variables and Secrets):
//   BOT_TOKEN  = توکن ربات از BotFather
//   CHAT_ID    = عدد شناسه تلگرام شما
//   SITE_TOKEN = rsp7-2026-xK39dQ   ← باید با SITE_TOKEN در src/config/notify.js یکی باشد
//
// تنظیم Cron (تنها بخش غیراز تنظیمات فعلی):
//   Workers → Settings → Trigger Events → Add Cron Trigger → عبارت: 0 21 * * *
//   (21:00 UTC = 00:30 به وقت ایران)
// ============================================================

const MAX_PER_HOUR = 30          // سقف اعلان در ساعت (ضداسپم)
const MAX_MSG_LEN = 2000         // سقف طول پیام فرم تماس

const EVENT_ICONS = {
  page_view: '👀',
  lang_switch: '🌐',
  resume_download: '📄',
  resume_print_view: '🖨',
  project_click: '🔗',
  contact_email: '📧',
  contact_github: '🐙',
  contact_linkedin: '💼',
  contact_telegram: '💬',
  contact_phone: '📞',
  contact_form: '✉️',
  contact_message: '📨',
}

// ─── Helpers ─────────────────────────────────────────────────

let env0 = {} // set in fetch()/scheduled() — module-level helpers need access

async function tg(method, payload) {
  const url = `https://api.telegram.org/bot${env0.BOT_TOKEN}/${method}`
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return r.ok
}

async function send(text) {
  return tg('sendMessage', { chat_id: env0.CHAT_ID, text, parse_mode: 'HTML' })
}

function faTime(iso) {
  try {
    return new Date(iso).toLocaleString('fa-IR', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Tehran',
    })
  } catch {
    return iso
  }
}

// ─── State (KV-free: استفاده از نکته — دو متغیر global ذخیره موقت) ───
// برای شمارنده ساعتی و mute/daily از KV استفاده می‌کنیم اگر bind شده باشد،
// وگرنه رفتار degrade می‌کند (همیشه on، شمارنده درون‌حافظه هر ایزوله).

let memCount = { hour: '', n: 0 }

async function getKV(key, fallback) {
  if (env0.KV) {
    const v = await env0.KV.get(key)
    return v === null ? fallback : v
  }
  return fallback
}

async function putKV(key, value) {
  if (env0.KV) await env0.KV.put(key, String(value))
}

async function isMuted() {
  return (await getKV('muted', '0')) === '1'
}

async function rateOK() {
  const hour = new Date().toISOString().slice(0, 13)
  if (memCount.hour !== hour) memCount = { hour, n: 0 }
  memCount.n++
  if (memCount.n > MAX_PER_HOUR) return false
  const kvCount = parseInt((await getKV('cnt_' + hour, '0')) || '0', 10)
  if (kvCount >= MAX_PER_HOUR) return false
  await putKV('cnt_' + hour, kvCount + 1)
  return true
}

// ─── Main handler ────────────────────────────────────────────

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

    // ── Webhook تلگرام (دستورات کاربر) ──
    if (request.method === 'POST' && url.pathname === '/webhook') {
      try {
        const update = await request.json()
        const text = update?.message?.text || ''
        await handleCommand(text)
      } catch {}
      return new Response('ok', { headers: cors })
    }

    // ── رویداد سایت ──
    if (request.method === 'POST') {
      let body
      try { body = await request.json() } catch { body = null }

      if (!body || body.token !== env.SITE_TOKEN) {
        return new Response(JSON.stringify({ ok: false, err: 'bad token' }), {
          status: 403,
          headers: { ...cors, 'Content-Type': 'application/json' },
        })
      }

      // فرم تماس: همیشه بفرست (پیام شخصی مهم‌تر از rate limit است) ولی sanitize
      if (body.event === 'contact_message') {
        const name = String(body.detail?.name || '').slice(0, 60)
        const msg = String(body.detail?.message || '').slice(0, MAX_MSG_LEN)
        if (name && msg && !(await isMuted())) {
          const safe = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
          await send(
            `📨 <b>پیام جدید از سایت</b>\n👤 ${safe(name)}\n\n${safe(msg)}\n\n🕒 ${faTime(body.ts)}`
          )
        }
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...cors, 'Content-Type': 'application/json' },
        })
      }

      // رویدادهای عادی: ضداسپم + mute
      const country = request.cf?.country || ''
      const lang = body.detail?.lang === 'en' ? 'EN' : body.detail?.lang === 'fa' ? 'FA' : ''
      const icon = EVENT_ICONS[body.event] || '🔔'
      let line = ''
      switch (body.event) {
        case 'page_view':
          line = `👀 بازدید صفحه ${lang ? '(' + lang + ')' : ''}${country ? ' — 🌍 ' + country : ''}`
          break
        case 'lang_switch':
          line = `🌐 تعویض زبان به ${lang || ''}`
          break
        case 'resume_download':
          line = `📄 رزومه دانلود شد!${country ? ' — 🌍 ' + country : ''}`
          break
        case 'resume_print_view':
          line = `🖨 نسخه چاپی باز شد`
          break
        case 'project_click':
          line = `🔗 کلیک روی پروژه: <b>${body.detail?.project || ''}</b>`
          break
        default:
          if (body.event?.startsWith('contact_')) {
            line = `${icon} کلیک روی ${body.event.replace('contact_', '').toUpperCase()}`
          } else {
            line = `${icon} ${body.event}`
          }
      }
      if (!(await isMuted()) && (await rateOK())) {
        await send(`${line}\n🕒 ${faTime(body.ts)}`)
      }
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // ── دستورات با GET (بدون webhook — ساده): /stats /mute /unmute /daily-on /daily-off ──
    if (request.method === 'GET') {
      const cmd = url.searchParams.get('cmd') || url.pathname.replace('/', '')
      if (cmd) await handleCommand(cmd)
      return new Response('ok', { headers: cors })
    }

    return new Response('ok', { headers: cors })
  },

  // ── خلاصه روزانه (Cron Trigger) ──
  async scheduled(event, env, ctx) {
    env0 = env
    const today = new Date().toISOString().slice(0, 10)
    const stats = []
    const keys = ['page_view', 'resume_download', 'project_click', 'contact_message']
    for (const k of keys) {
      const n = parseInt((await getKV(`day_${today}_${k}`, '0')) || '0', 10)
      stats.push(`${EVENT_ICONS[k] || '•'} ${k}: ${n}`)
    }
    await send(`📊 <b>خلاصه امروز (${today})</b>\n${stats.join('\n')}`)
  },
}

async function handleCommand(text) {
  const t = (text || '').trim().toLowerCase()
  if (t === '/stats' || t === 'stats') {
    const hour = new Date().toISOString().slice(0, 13)
    const cnt = await getKV('cnt_' + hour, '0')
    await send(`📊 اعلان‌های این ساعت: ${cnt}\n🔇 وضعیت: ${(await getKV('muted', '0')) === '1' ? 'بی‌صدا' : 'فعال'}`)
  } else if (t === '/mute') {
    await putKV('muted', '1')
    await send('🔇 اعلان‌ها بی‌صدا شد (پیام‌های فرم تماس همچنان می‌آیند)')
  } else if (t === '/unmute') {
    await putKV('muted', '0')
    await send('🔔 اعلان‌ها فعال شد')
  } else if (t === '/help' || t === 'start') {
    await send(
      '🤖 دستورات:\n/stats — آمار این ساعت\n/mute — بی‌صدا\n/unmute — فعال‌سازی\n\nنکته: پیام‌های فرم تماس همیشه می‌آیند.'
    )
  }
}

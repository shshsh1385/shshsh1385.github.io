// ─────────────────────────────────────────────────────────────
// اعلان تلگرام + نسخه چاپی رزومه
// ─────────────────────────────────────────────────────────────
// نحوه کار: وقتی بازدیدکننده «دانلود PDF» را می‌زند:
//   1. یک درخواست به Worker کلودفلر می‌رود → ربات تلگرام به صاحب سایت پیام می‌دهد
//   2. پنجره چاپ با استایل رزومه باز می‌شود (Save as PDF)
// توکن ربات و chat_id در Worker ذخیره می‌شوند، نه در این فایل عمومی.
// ─────────────────────────────────────────────────────────────

// TODO: بعد از ساخت Worker، آدرسش را اینجا بگذارید. تا آن‌ زمان اعلان غیرفعال است و مستقیم پنجره چاپ باز می‌شود.
export const NOTIFY_ENDPOINT = ''

// fire-and-forget: هیچ‌وقت تجربه کاربر را نبندد
function notifyDownload() {
  if (!NOTIFY_ENDPOINT) return
  try {
    fetch(NOTIFY_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'resume_download', ts: new Date().toISOString() }),
      keepalive: true,
      // در Worker پاسخ CORS به‌صورت no-cors-safe ست می‌شود
    }).catch(() => {})
  } catch { /* silently ignore — analytics must never break UX */ }
}

// تاخیر کوتاه تا درخواست اعلان شروع شود، بعد پنجره چاپ باز شود
function openPrintView() {
  notifyDownload()
  setTimeout(() => window.print(), 350)
}

export { openPrintView }

// ساخت og-card.png — اجرا: node scripts/make-og-card.mjs
// از sharp کش npx استفاده می‌کند (نیازی به dependency پروژه نیست)
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const require = createRequire(import.meta.url)
// sharp از کش npx؛ اگر مسیر عوض شد این ثابت را به‌روز کنید
const SHARP_PATH = 'C:/Users/pshga/AppData/Local/npm-cache/_npx/76dc10efc80ca823/node_modules/sharp'
const sharp = require(SHARP_PATH)

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const W = 1200, H = 630, CX = 330, CY = 315, R = 150

const bgSvg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#09090b"/><stop offset="1" stop-color="#1e1b4b"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#6366f1"/><stop offset="1" stop-color="#8b5cf6"/>
    </linearGradient>
    <radialGradient id="g1" cx="0.85" cy="0.1" r="0.5">
      <stop offset="0" stop-color="#6366f1" stop-opacity="0.35"/><stop offset="1" stop-color="#6366f1" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="g2" cx="0.1" cy="0.95" r="0.5">
      <stop offset="0" stop-color="#8b5cf6" stop-opacity="0.3"/><stop offset="1" stop-color="#8b5cf6" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#g1)"/>
  <rect width="${W}" height="${H}" fill="url(#g2)"/>
  <text x="540" y="270" font-family="Vazirmatn, Tahoma, sans-serif" font-size="76" font-weight="900" fill="#fafafa" text-anchor="end" direction="rtl">پارسا شیروانی</text>
  <text x="540" y="360" font-family="Vazirmatn, Tahoma, sans-serif" font-size="40" font-weight="700" fill="#818cf8" text-anchor="end" direction="rtl">برنامه‌نویس فول‌استک</text>
  <rect x="300" y="395" width="240" height="8" rx="4" fill="url(#accent)"/>
  <text x="540" y="460" font-family="Vazirmatn, Tahoma, sans-serif" font-size="24" fill="#a1a1aa" text-anchor="end" direction="rtl">طراحی و توسعه وب‌اپلیکیشن‌های کاربردی و مقیاس‌پذیر</text>
  <rect x="330" y="510" width="540" height="62" rx="31" fill="#18181b" stroke="#3f3f46"/>
  <text x="600" y="551" font-family="Vazirmatn, Tahoma, sans-serif" font-size="26" font-weight="700" fill="#e4e4e7" text-anchor="middle">shshsh1385.github.io</text>
</svg>`

const base = await sharp(Buffer.from(bgSvg)).png().toBuffer()

// عکس داخل حلقه — برش دایره‌ای با mask
const ringBox = R * 2
const circleMask = Buffer.from(
  `<svg width="${ringBox}" height="${ringBox}"><circle cx="${ringBox / 2}" cy="${ringBox / 2}" r="${ringBox / 2}" fill="#fff"/></svg>`
)
const photo = await sharp(path.join(root, 'public/me.jpg'))
  .resize(ringBox, ringBox, { fit: 'cover', position: 'top' })
  .composite([{ input: circleMask, blend: 'dest-in' }])
  .png()
  .toBuffer()

// حلقه گرادیانی (دایره توخالی با استروک گرادیان) — بالای عکس
const ringSvg = Buffer.from(
  `<svg width="${ringBox + 24}" height="${ringBox + 24}" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#6366f1"/><stop offset="1" stop-color="#8b5cf6"/>
    </linearGradient></defs>
    <circle cx="${(ringBox + 24) / 2}" cy="${(ringBox + 24) / 2}" r="${ringBox / 2 + 6}" fill="none" stroke="url(#accent)" stroke-width="12"/>
  </svg>`
)

await sharp(base)
  .composite([
    { input: photo, left: CX - ringBox / 2, top: CY - ringBox / 2 },
    { input: ringSvg, left: CX - (ringBox + 24) / 2, top: CY - (ringBox + 24) / 2 },
  ])
  .png({ quality: 90 })
  .toFile(path.join(root, 'public/og-card.png'))

console.log('og-card.png OK')

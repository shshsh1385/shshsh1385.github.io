# PROJECT_STATE.md

> فایل وضعیت پروژه — هر جلسه جدید اول این فایل خوانده می‌شود.

## هویت پروژه

- **هدف:** سایت رزومه شخصی دوزبانه (FA/EN) برای پارسا شیروانی، قابل هاست روی GitHub Pages (user site) و اتصال دامنه بعداً
- **استک:** React 19 + Vite 7 + Tailwind CSS 4 + Framer Motion 12
- **وضعیت:** `EXECUTION_MODE` → پیاده‌سازی کامل و تست لوکال انجام شد؛ انتشار (push به گیت‌هاب) منتظر اطلاعات و دستور کاربر

## منابع داده

- رزومه مرجع: https://cvbuilder.me/Resume/fa/283d04f9-c5a6-4c32-8864-5112d192aa49?template=Template34
- سیستم پرامپت‌ها: `C:\Users\pshga\OneDrive\Desktop\Website-Client-Prompt-System` (۹۵ فایل، کامل خوانده و ثبت شده — ماشین وضعیت: COLLECTION → REVIEW → EXECUTION)
- گزارش بررسی (REVIEW) توسط کاربر تأیید شد؛ تصمیم‌ها: React+Vite، تم مینیمال با پیش‌فرض تیره + سوییچ روشن، مهارت‌ها با نوار درصدی متحرک

## رجیستری پرامپت‌ها

| پک | وضعیت |
|---|---|
| 00-START-HERE + 01..04 (بریف/تحقیق/ساخت/کنترل اجرا) | دریافت و ثبت ✓ |
| Universal-Master-Prompts (۱۲) | دریافت و ثبت ✓ |
| Universal-Specialized-Prompts (۴۸ — قالب مشترک + ۴۸ مأموریت) | دریافت و ثبت ✓ |
| Three_Advanced_Agent_Prompt_Packs (۱۸) | دریافت و ثبت ✓ |

## اطلاعات گمشده / منتظر کاربر (TODO)

| فیلد | فایل | مقدار فعلی |
|---|---|---|
| ایمیل | `src/config/contact.js` | ✓ shirvaniparsa85@gmail.com |
| یوزرنیم گیت‌هاب | `src/config/contact.js` | ✓ shshsh1385 → ریپو: shshsh1385.github.io |
| LinkedIn | `src/config/contact.js` | ✓ linkedin.com/in/parsa-shirvani-429b743ab |
| تلگرام | `src/config/contact.js` | ✓ t.me/IcyParsa |
| شماره تماس | `src/config/contact.js` | ✓ +98 903 573 3911 |
| لینک رزومه سازمانی | `src/config/contact.js` → `ORG_RESUME.url` | خالی (سایت شرکت down است؛ دکمه placeholder نمایش داده می‌شود) |
| سال دیپلم | `src/config/data.js` | پیش‌فرض ۱۴۰۲ / 2023 —نیاز به تأیید |
| سطح انگلیسی/ترکی | `src/config/data.js` | متوسط / مادری — نیاز به تأیید |

**تأیید تماس (تست مرورگر):** هر ۵ لینک کانال درست رندر و کلیک‌پذیرند — mailto / github / linkedin / t.me / tel ✓

## کارهای انجام‌شده

1. اسکلت پروژه: package.json، vite.config.js (base './')، workflow گیت‌هاب Pages، favicon، index.html با SEO/OG/JSON-LD
2. دیتای دوزبانه کامل در `src/config/data.js` (منبع: رزومه واقعی) + `src/config/contact.js` برای لینک‌ها
3. کامپوننت‌ها: Navbar (موبایل+دسکتاپ)، Hero (تایپ‌رایتر + حباب‌های گرادیانی)، About، Skills (نوار متحرک)، Experience (تایم‌لاین)، Projects، Education+Honors+Languages، OrgResume، Contact، Footer
4. سوییچ زبان (RTL/LTR واقعی روی `<html>`) + سوییچ تم — هر دو با localStorage
5. انیمیشن‌ها با احترام به prefers-reduced-motion

## تست‌های انجام‌شده (واقعی)

| تست | روش | نتیجه |
|---|---|---|
| بیلد پروداکشن | `npm run build` (×۳) | ✓ موفق — JS 365KB (gzip 116KB) |
| سرور پرودیوشن | `vite preview :4173` + curl | ✓ HTTP 200 |
| رندر React | مرورگر — rootChildren، h1، ۸ سکشن | ✓ (بعد از رفع باگ import useState) |
| سوییچ زبان | کلیک واقعی دکمه | ✓ dir/ltr→rtl، localStorage، h1 فارسی/انگلیسی |
| سوییچ تم | کلیک واقعی دکمه | ✓ dark/light + localStorage |
| تایپ‌رایتر | مشاهده متن تایپ‌شده | ✓ «Full-Stack Developer\|» تایپ شد |
| نوارهای مهارت | اسکرول + اسکرین‌شات | ✓ انیمیشن width با درصد |
| تایم‌لاین تجربه | اسکرول + اسکرین‌شات | ✓ نقطه تایم‌لاین RTL درست |
| رزومه سازمانی | اسکرول + اسکرین‌شات | ✓ دکمه placeholder «لینک به‌زودی» |
| RTL/LTR | محاسبه dir روی html | ✓ |
| localStorage | تست مستقیم | ✓ ذخیره/بازیابی |

### باگ‌های رفع‌شده در تست

1. `useState is not defined` — import جا افتاده در App.jsx → رفع ✓ (تشخیص با تله خطای موقت در index.html، سپس حذف تله)
2. پس‌زمینه body تعریف نشده (متن نامرئی روی بوم مشکی در تم روشن) → صریح‌سازی رنگ‌ها ✓
3. حباب‌های گرادیانی بیش‌ازحد پررنگ → کاهش opacity ✓

## مراحل بعدی (انتشار — نیازمند اطلاعات/دستور کاربر)

1. دریافت: یوزرنیم گیت‌هاب، ایمیل، LinkedIn، لینک رزومه سازمانی
2. جایگذاری در `src/config/contact.js` (و `data.js` در صورت تغییر سال دیپلم/سطح زبان‌ها)
3. `git init` + commit اولیه
4. ساخت ریپوی `username.github.io` روی گیت‌هاب و push (اکشن خارجی — قبل از انجام با کاربر هماهنگ شود)
5. فعال‌سازی GitHub Pages از شاخه `gh-pages`/Actions در تنظیمات ریپو
6. بعداً: اتصال دامنه اختصاصی (فایل CNAME + رکوردهای DNS)

## محدودیت‌ها / ریسک‌ها

- فونت Vazirmatn از CDN (jsdelivr) لود می‌شود — آفلاین/تحریم ممکن است لود نشود؛ در صورت نیاز فونت لوکال شود
- `Download PDF` فعلاً فقط در دیتا تعریف است؛ دکمه دانلود PDF رزومه هنوز پیاده نشده (فایل PDF لازم است — از کاربر پرسیده شود)
- تست موبایل واقعی انجام نشد (فقط viewport دسکتاپ) — پس از انتشار یا در ادامه با viewport کوچک تست شود

---
آخرین به‌روزرسانی: 2026-11-26

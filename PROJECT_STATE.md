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
| عکس پروفایل | `public/me.jpg` | ✓ در Hero با حلقه گرادیانی متحرک |
| اعلان تلگرام دانلود PDF | `src/config/notify.js` | ✓ Worker: dark-grass-6fc2.pshgamer45.workers.dev — تست curl و مرورگر موفق |
| لینک رزومه سازمانی | `src/config/contact.js` → `ORG_RESUME.url` | خالی (سایت شرکت down است؛ دکمه placeholder نمایش داده می‌شود) |
| سال دیپلم | `src/config/data.js` | پیش‌فرض ۱۴۰۲ / 2023 —نیاز به تأیید |
| سطح انگلیسی/ترکی | `src/config/data.js` | متوسط / مادری — نیاز به تأیید |
| توضیحات کامل‌تر پروژه‌ها | `src/config/data.js` | کاربر گفت «بعدا بیشتر می‌کنیم» |

**تأیید تماس (تست مرورگر):** هر ۵ لینک کانال درست رندر و کلیک‌پذیرند — mailto / github / linkedin / t.me / tel ✓
**تأیید اعلان (تست مرورگر):** کلیک روی «دانلود PDF» → درخواست به Worker ثبت شد در performance/fetch-hook ✓ + پیام تلگرام در تست curl دریافت شد

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

1. ✓ اطلاعات تماس کامل شد
2. ✓ عکس، دکمه PDF (نسخه cvbuilder)، اعلان تلگرام، رویدادها، فرم تماس
3. **کاربر:** Worker v2 (`worker/worker.js`) را در کلودفلر deploy کند + Secret جدید `SITE_TOKEN=rsp7-2026-xK39dQ` + تنظیم webhook (`/webhook`) + Cron `0 21 * * *`
4. push به `shshsh1385.github.io` (راهنما در README)
5. بعداً: دیباگ نسخه چاپی اختصاصی (`openPrintView`)، توضیحات کامل‌تر پروژه‌ها، لینک رزومه سازمانی

### وضعیت ربات/ردیابی (آخرین به‌روزرسانی)

- سایت: `track()` برای page_view / lang_switch / resume_download / project_click / contact_* — با توکن SITE_TOKEN
- فرم تماس: `sendMessage()` با تایم‌اوت ۵ث + no-cors fallback (باگ IAB/CORS حل شد — «ارسال شد» تأیید شد)
- Worker v2: رویدادها با ایموجی، ضداسپم (۳۰/ساعت)، mute/unmute/stats، خلاصه روزانه (Cron)، وب‌هوک دستورات — در `worker/worker.js`
- نکته: تا deploy نشدن Worker v2، رویدادهای جدید به Worker فعلی (v1) می‌روند که بی‌خطر قبول می‌کند و فقط پیام خام می‌فرستد

## محدودیت‌ها / ریسک‌ها

- فونت Vazirmatn از CDN (jsdelivr) لود می‌شود — آفلاین/تحریم ممکن است لود نشود؛ در صورت نیاز فونت لوکال شود
- `Download PDF` فعلاً فقط در دیتا تعریف است؛ دکمه دانلود PDF رزومه هنوز پیاده نشده (فایل PDF لازم است — از کاربر پرسیده شود)
- تست موبایل واقعی انجام نشد (فقط viewport دسکتاپ) — پس از انتشار یا در ادامه با viewport کوچک تست شود

---
آخرین به‌روزرسانی: 2026-11-26

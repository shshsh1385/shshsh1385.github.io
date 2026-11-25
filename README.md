# رزومه پارسا شیروانی — Parsa Shirvani Resume

سایت رزومه شخصی دوزبانه (فارسی/انگلیسی) با React + Vite + Tailwind CSS 4 + Framer Motion.

## ✨ امکانات

- 🌐 دوزبانه فارسی/انگلیسی با سوییچ فوری و RTL/LTR واقعی
- 🌙 تم تیره پیش‌فرض + سوییچ تم روشن (ذخیره در localStorage)
- 🎬 انیمیشن‌های ورود، تایپ‌رایتر عنوان شغلی، نوارهای مهارت متحرک
- 📱 کاملاً واکنش‌گرا (منوی موبایل)
- 🔍 SEO متا + Open Graph + JSON-LD (Person schema)
- ♿ احترام به `prefers-reduced-motion` و کنتراست مناسب
- 🚀 آماده برای GitHub Pages (اکشن خودکار deploy)

## 🛠 توسعه محلی

```bash
npm install
npm run dev      # سرور توسعه → http://localhost:5173
npm run build    # بیلد پروداکشن در dist/
npm run preview  # پیش‌نمایش بیلد → http://localhost:4173
```

## 📝 ویرایش محتوا

- **متن‌های رزومه (دوزبانه):** `src/config/data.js` — همه سکشن‌ها همین‌جاست
- **ایمیل، گیت‌هاب، LinkedIn، لینک رزومه سازمانی:** `src/config/contact.js`

بعد از هر تغییر: commit و push کنید؛ GitHub Actions خودکار بیلد و منتشر می‌کند.

## 🚀 انتشار روی GitHub Pages

1. ریپو را با نام `shshsh1385.github.io` بسازید (user site).
2. push شاخه `main`.
3. در Settings → Pages، Source را روی **GitHub Actions** بگذارید.
4. اکشن `deploy.yml` خودکار بیلد و منتشر می‌کند → [https://shshsh1385.github.io](https://shshsh1385.github.io)

### اتصال دامنه اختصاصی (بعداً)

1. فایل `CNAME` (حاوی دامنه) به `public/` اضافه کنید.
2. در DNS دامنه: رکورد `A` به `185.199.108.153` تا `185.199.111.153` (چهار آی‌پی Pages) یا `CNAME` به `<username>.github.io` برای ساب‌دامنه.
3. در Settings → Pages → Custom domain، دامنه را وارد و Enforce HTTPS بزنید.

## 🧰 استک

| بخش | فناوری |
|---|---|
| UI | React 19 |
| Build | Vite 7 |
| استایل | Tailwind CSS 4 |
| انیمیشن | Framer Motion 12 |
| فونت | Vazirmatn (CDN) |

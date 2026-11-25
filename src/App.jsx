import { useEffect, useRef, useState } from 'react'
import { motion, useInView, useAnimation } from 'framer-motion'
import { useApp, fadeUp } from './context/AppContext.jsx'
import { CONTACT, ORG_RESUME } from './config/contact.js'
import { openPrintView } from './config/notify.js'

// ── small shared bits ─────────────────────────────────────────

function Section({ id, title, children, className = '' }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  return (
    <section id={id} className={`scroll-mt-24 py-20 ${className}`} ref={ref}>
      <div className="mx-auto max-w-5xl px-6">
        <motion.h2
          variants={fadeUp}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          className="mb-10 text-3xl font-extrabold tracking-tight md:text-4xl"
        >
          {title}
          <span className="mt-2 block h-1 w-16 rounded-full bg-gradient-to-l from-indigo-500 to-violet-500" />
        </motion.h2>
        {children}
      </div>
    </section>

  )
}

function Card({ children, className = '', i = 0 }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  return (
    <motion.div
      ref={ref}
      variants={fadeUp}
      custom={i}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      className={`rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition-colors dark:border-zinc-800 dark:bg-zinc-900 ${className}`}
    >
      {children}
    </motion.div>
  )
}

function Chip({ children }) {
  return (
    <span className="rounded-full border border-zinc-300 bg-zinc-50 px-3 py-1 text-sm font-medium text-zinc-700 transition-colors dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300">
      {children}
    </span>
  )
}

// ── Navbar ────────────────────────────────────────────────────

function Navbar() {
  const { t, lang, setLang, theme, setTheme, isRTL } = useApp()
  const [open, setOpen] = useState(false)

  const links = [
    ['#about', t.nav.about],
    ['#skills', t.nav.skills],
    ['#experience', t.nav.experience],
    ['#projects', t.nav.projects],
    ['#education', t.nav.education],
    ['#contact', t.nav.contact],
  ]

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-zinc-200/60 bg-white/80 backdrop-blur-md dark:border-zinc-800/60 dark:bg-zinc-950/80">
      <nav className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
        <a href="#top" className="font-extrabold tracking-tight">
          PS<span className="text-indigo-500">.</span>
        </a>

        {/* desktop links */}
        <ul className="hidden items-center gap-6 text-sm font-medium md:flex">
          {links.map(([href, label]) => (
            <li key={href}>
              <a className="text-zinc-600 transition-colors hover:text-indigo-500 dark:text-zinc-400 dark:hover:text-indigo-400" href={href}>
                {label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setLang(lang === 'fa' ? 'en' : 'fa')}
            className="rounded-full border border-zinc-300 px-3 py-1 text-sm font-bold transition-colors hover:border-indigo-400 hover:text-indigo-500 dark:border-zinc-700 dark:hover:border-indigo-500 dark:hover:text-indigo-400"
            aria-label="Switch language"
          >
            {lang === 'fa' ? 'EN' : 'فا'}
          </button>
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="rounded-full border border-zinc-300 p-2 transition-colors hover:border-indigo-400 dark:border-zinc-700 dark:hover:border-indigo-500"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          {/* mobile menu button */}
          <button
            onClick={() => setOpen(!open)}
            className="rounded-full border border-zinc-300 p-2 md:hidden dark:border-zinc-700"
            aria-label="Menu"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {open ? <path d="M18 6L6 18M6 6l12 12" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </nav>

      {/* mobile menu */}
      {open && (
        <motion.ul
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="border-t border-zinc-200 bg-white px-6 py-4 text-sm font-medium md:hidden dark:border-zinc-800 dark:bg-zinc-950"
        >
          {links.map(([href, label]) => (
            <li key={href} className="py-2">
              <a href={href} onClick={() => setOpen(false)}>
                {label}
              </a>
            </li>
          ))}
        </motion.ul>
      )}
    </header>
  )
}

// ── Hero ──────────────────────────────────────────────────────

function Typewriter({ words, isRTL }) {
  const [wordIndex, setWordIndex] = useState(0)
  const [text, setText] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const word = words[wordIndex % words.length]
    const speed = deleting ? 40 : 90

    const timer = setTimeout(() => {
      if (!deleting) {
        const next = word.slice(0, text.length + 1)
        setText(next)
        if (next === word) setTimeout(() => setDeleting(true), 1400)
      } else {
        const next = word.slice(0, text.length - 1)
        setText(next)
        if (next === '') {
          setDeleting(false)
          setWordIndex((i) => (i + 1) % words.length)
        }
      }
    }, speed)
    return () => clearTimeout(timer)
  }, [text, deleting, wordIndex, words])

  return (
    <span className="text-indigo-500 dark:text-indigo-400">
      {text}
      <span className="animate-pulse">|</span>
    </span>
  )
}

function Hero() {
  const { t, isRTL, lang } = useApp()
  return (
    <section id="top" className="relative flex min-h-screen items-center justify-center overflow-hidden">
      {/* soft gradient blobs */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <motion.div
          className="absolute -top-24 right-[-10%] h-80 w-80 rounded-full bg-indigo-300/40 blur-3xl dark:bg-indigo-600/15"
          animate={{ y: [0, 30, 0] }}
          transition={{ duration: 10, repeat: true, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-[-10%] left-[-10%] h-80 w-80 rounded-full bg-violet-300/40 blur-3xl dark:bg-violet-600/15"
          animate={{ y: [0, -30, 0] }}
          transition={{ duration: 12, repeat: true, ease: 'easeInOut' }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="relative z-10 mx-auto max-w-3xl px-6 text-center"
      >
        {/* profile photo with animated gradient ring */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.15, ease: 'easeOut' }}
          className="relative mx-auto mb-6 h-36 w-36 md:h-44 md:w-44"
        >
          <motion.span
            aria-hidden
            className="absolute -inset-1.5 rounded-full bg-gradient-to-tr from-indigo-500 via-violet-500 to-fuchsia-500"
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: true, ease: 'linear' }}
          />
          <img
            src="./me.jpg"
            alt={t.hero.name}
            className="relative h-full w-full rounded-full border-4 border-white object-cover object-top shadow-xl dark:border-zinc-900"
          />
        </motion.div>

        <h1 className="mb-4 text-5xl font-black tracking-tight md:text-7xl">
          {t.hero.name}
        </h1>
        <p className="mb-6 text-2xl font-bold md:text-3xl">
          <Typewriter words={t.hero.roles} isRTL={isRTL} />
        </p>
        <p className="mx-auto mb-10 max-w-xl text-lg text-zinc-600 dark:text-zinc-400">
          {t.hero.subtitle}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <a
            href="#about"
            className="rounded-full bg-indigo-600 px-7 py-3 font-bold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-500"
          >
            {t.hero.cta}
          </a>
          <a
            href="#resume-pdf"
            onClick={(e) => { e.preventDefault(); openPrintView(lang); }}
            className="rounded-full border border-zinc-300 px-7 py-3 font-bold transition hover:border-indigo-400 hover:text-indigo-500 dark:border-zinc-700 dark:hover:border-indigo-500 dark:hover:text-indigo-400"
          >
            📄 {t.hero.download}
          </a>
        </div>
      </motion.div>
    </section>
  )
}

// ── About ─────────────────────────────────────────────────────

function About() {
  const { t } = useApp()
  return (
    <Section id="about" title={t.about.title}>
      <Card>
        <p className="text-lg leading-9 text-zinc-700 dark:text-zinc-300">{t.about.body}</p>
      </Card>
    </Section>
  )
}

// ── Skills (animated bars) ────────────────────────────────────

function SkillBar({ skill, i }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  return (
    <div ref={ref}>
      <div className="mb-1.5 flex items-center justify-between text-sm font-semibold">
        <span>{skill.name}</span>
        <motion.span
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.6 + i * 0.08 }}
          className="font-mono text-zinc-500 dark:text-zinc-400"
        >
          {skill.level}%
        </motion.span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-200 print-bar-track dark:bg-zinc-800">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 print-bar-fill"
          initial={{ width: 0 }}
          animate={inView ? { width: `${skill.level}%` } : {}}
          transition={{ duration: 1, delay: i * 0.08, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}

function Skills() {
  const { t } = useApp()
  return (
    <Section id="skills" title={t.skills.title}>
      <div className="grid gap-x-10 gap-y-5 md:grid-cols-2">
        {t.skills.main.map((s, i) => (
          <SkillBar key={s.name} skill={s} i={i} />
        ))}
      </div>
      <div className="mt-8 flex flex-wrap gap-2.5">
        {t.skills.tags.map((tag) => (
          <Chip key={tag}>{tag}</Chip>
        ))}
      </div>
    </Section>
  )
}

// ── Experience ────────────────────────────────────────────────

function Experience() {
  const { t, isRTL } = useApp()
  return (
    <Section id="experience" title={t.experience.title}>
      <div className="relative border-s-2 border-zinc-200 ps-8 dark:border-zinc-800">
        {t.experience.items.map((item, i) => (
          <Card key={i} i={i} className="mb-6">
            <span className="absolute -start-[41px] top-8 h-4 w-4 rounded-full border-4 border-white bg-indigo-500 dark:border-zinc-950" />
            <h3 className="text-xl font-bold">{item.role}</h3>
            <p className="font-medium text-indigo-500 dark:text-indigo-400">{item.org}</p>
            <p className="mb-3 font-mono text-sm text-zinc-500 dark:text-zinc-400">{item.period}</p>
            <ul className="list-inside list-disc space-y-1.5 text-zinc-600 dark:text-zinc-300">
              {item.bullets.map((b, j) => (
                <li key={j}>{b}</li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </Section>
  )
}

// ── Projects ──────────────────────────────────────────────────

function Projects() {
  const { t, isRTL } = useApp()
  return (
    <Section id="projects" title={t.projects.title}>
      <div className="grid gap-5 sm:grid-cols-2">
        {t.projects.items.map((p, i) => {
          const inner = (
            <>
              <h3 className="mb-1.5 text-xl font-bold">
                {p.name}
                {p.url && <span className="ms-2 text-sm text-indigo-500">↗</span>}
              </h3>
              <p className="text-zinc-600 dark:text-zinc-300">{p.desc}</p>
            </>
          )
          return p.url ? (
            <a key={p.name} href={p.url} target="_blank" rel="noopener noreferrer" className="block">
              <Card i={i} className="h-full transition hover:-translate-y-1 hover:shadow-md">
                {inner}
              </Card>
            </a>
          ) : (
            <Card key={p.name} i={i} className="h-full">
              {inner}
            </Card>
          )
        })}
      </div>
    </Section>
  )
}

// ── Education ─────────────────────────────────────────────────

function Education() {
  const { t } = useApp()
  return (
    <Section id="education" title={t.education.title}>
      <div className="grid gap-5 md:grid-cols-2">
        {t.education.items.map((e, i) => (
          <Card key={i} i={i}>
            <h3 className="text-lg font-bold">{e.degree}</h3>
            {e.org && <p className="font-medium text-indigo-500 dark:text-indigo-400">{e.org}</p>}
            <p className="font-mono text-sm text-zinc-500 dark:text-zinc-400">{e.period}</p>
            {e.note && <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">{e.note}</p>}
          </Card>
        ))}
      </div>

      {/* honors & courses */}
      <Card className="mt-8">
        <h3 className="mb-4 text-lg font-bold">{t.honors.title}</h3>
        <ul className="list-inside list-disc space-y-2 text-zinc-600 dark:text-zinc-300">
          {t.honors.items.map((h, i) => (
            <li key={i}>{h}</li>
          ))}
        </ul>
      </Card>

      {/* languages */}
      <div className="mt-8 grid gap-5 sm:grid-cols-3">
        {t.languages.items.map((l, i) => (
          <Card key={l.name} i={i} className="text-center">
            <p className="text-lg font-bold">{l.name}</p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{l.level}</p>
          </Card>
        ))}
      </div>
    </Section>
  )
}

// ── Corporate resume ──────────────────────────────────────────

function OrgResume() {
  const { t } = useApp()
  return (
    <Section id="org-resume" title={t.orgResume.title}>
      <Card className="text-center">
        <p className="mb-5 text-zinc-600 dark:text-zinc-300">{t.orgResume.body}</p>
        {ORG_RESUME.url ? (
          <a
            href={ORG_RESUME.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded-full bg-indigo-600 px-7 py-3 font-bold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-500"
          >
            {t.orgResume.title} ↗
          </a>
        ) : (
          <span className="inline-block cursor-not-allowed rounded-full border border-dashed border-zinc-400 px-7 py-3 font-bold text-zinc-500 dark:border-zinc-600">
            {ORG_RESUME.label[t === undefined ? 'fa' : document.documentElement.lang === 'fa' ? 'fa' : 'en']}
          </span>
        )}
      </Card>
    </Section>
  )
}

// ── Contact / Footer ──────────────────────────────────────────

function Contact() {
  const { t, lang } = useApp()
  const channels = [
    CONTACT.email && { label: 'Email', value: CONTACT.email, href: `mailto:${CONTACT.email}` },
    CONTACT.github && { label: 'GitHub', value: `github.com/${CONTACT.github}`, href: `https://github.com/${CONTACT.github}` },
    CONTACT.linkedin && { label: 'LinkedIn', value: 'LinkedIn', href: CONTACT.linkedin },
    CONTACT.telegram && { label: 'Telegram', value: '@IcyParsa', href: CONTACT.telegram },
    CONTACT.phone && { label: 'Phone', value: CONTACT.phone, href: `tel:${CONTACT.phone.replace(/\s/g, '')}` },
  ].filter(Boolean)

  return (
    <Section id="contact" title={t.contact.title}>
      <Card className="text-center">
        <p className="mb-6 text-zinc-600 dark:text-zinc-300">{t.contact.body}</p>
        {channels.length > 0 ? (
          <div className="flex flex-wrap items-center justify-center gap-4">
            {channels.map((c) => (
              <a
                key={c.label}
                href={c.href}
                target={c.href.startsWith('http') ? '_blank' : undefined}
                rel="noopener noreferrer"
                className="rounded-full border border-zinc-300 px-5 py-2.5 font-semibold transition hover:border-indigo-400 hover:text-indigo-500 dark:border-zinc-700 dark:hover:border-indigo-500 dark:hover:text-indigo-400"
              >
                {c.label} ↗
              </a>
            ))}
          </div>
        ) : (
          <p className="font-mono text-sm text-zinc-500 dark:text-zinc-400">
            {/* placeholders visible until contact info is provided */}
            email · github · linkedin — coming soon
          </p>
        )}
        <div className="mt-6">
          <Chip>{CONTACT.location[lang]}</Chip>
        </div>
      </Card>
    </Section>
  )
}

function Footer() {
  const { t } = useApp()
  return (
    <footer className="border-t border-zinc-200 py-8 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
      {t.footer}
    </footer>
  )
}

// ── App ───────────────────────────────────────────────────────

export default function App() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <About />
        <Skills />
        <Experience />
        <Projects />
        <Education />
        <OrgResume />
        <Contact />
      </main>
      <Footer />
    </>
  )
}

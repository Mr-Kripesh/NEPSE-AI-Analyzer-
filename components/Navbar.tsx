'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

// ── Minimal inline SVG icons ──────────────────────────────────────────────────
const HomeIcon = () => (
  <svg className="nv-link-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
)
const StocksIcon = () => (
  <svg className="nv-link-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="4" height="18"/><rect x="10" y="8" width="4" height="13"/><rect x="17" y="5" width="4" height="16"/>
  </svg>
)
const NewsIcon = () => (
  <svg className="nv-link-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 22h16a2 2 0 002-2V4a2 2 0 00-2-2H8a2 2 0 00-2 2v16a2 2 0 01-2 2zm0 0a2 2 0 01-2-2v-9c0-1.1.9-2 2-2h2"/>
  </svg>
)
const IpoIcon = () => (
  <svg className="nv-link-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="17 11 21 7 17 3"/><line x1="21" y1="7" x2="9" y2="7"/>
    <polyline points="7 21 3 17 7 13"/><line x1="3" y1="17" x2="15" y2="17"/>
  </svg>
)
const WatchlistIcon = () => (
  <svg className="nv-link-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
  </svg>
)
const OracleIcon = () => (
  <svg className="nv-link-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/>
    <line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/>
    <line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/>
  </svg>
)

const NAV_LINKS = [
  { href: '/',             label: 'Home',     icon: <HomeIcon /> },
  { href: '/stocks',       label: 'Stocks',   icon: <StocksIcon /> },
  { href: '/news',         label: 'News',     icon: <NewsIcon /> },
  { href: '/ipo',          label: 'IPO',      icon: <IpoIcon /> },
  { href: '/watchlist',    label: 'Watchlist',icon: <WatchlistIcon /> },
  { href: '/nepse-oracle', label: 'Oracle',   icon: <OracleIcon /> },
]

function applyTheme(t: 'light' | 'dark') {
  document.documentElement.setAttribute('data-theme', t)
  localStorage.setItem('nepsai_theme', t)
  window.dispatchEvent(new CustomEvent('nepse-theme-change', { detail: t }))
}

const SunIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
)
const MoonIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
  </svg>
)

export default function Navbar() {
  const pathname  = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')
  const [scrolled, setScrolled] = useState(false)

  // Sync theme from storage after mount (avoids hydration mismatch)
  useEffect(() => {
    const saved = localStorage.getItem('nepsai_theme') as 'light' | 'dark' | null
    const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    const initial = saved ?? preferred
    setTheme(initial)
    applyTheme(initial)
  }, [])

  useEffect(() => { applyTheme(theme) }, [theme])

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 4)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => setMenuOpen(false), 0)
    return () => clearTimeout(timer)
  }, [pathname])

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false) }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [])

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    applyTheme(next)
  }

  return (
    <>
      <nav className={`nv${scrolled ? ' nv-scrolled' : ''}`}>
        <div className="nv-inner">

          {/* Logo */}
          <Link href="/" className="nv-logo">
            <span>Nepse<span className="nv-logo-ai">AI</span></span>
            <span className="nv-logo-sub">नेपाल स्टक विश्लेषण</span>
          </Link>

          {/* Desktop nav links */}
          <div className="nv-links">
            {NAV_LINKS.map(({ href, label, icon }) => (
              <Link
                key={href}
                href={href}
                className={`nv-link${pathname === href ? ' nv-link-active' : ''}`}
              >
                {icon}
                {label}
              </Link>
            ))}
          </div>

          {/* Right controls */}
          <div className="nv-right">
            {/* NP Avatar */}
            <div className="nv-avatar" title="Nepal">NP</div>

            {/* Theme toggle */}
            <button
              type="button"
              className="nv-theme-btn"
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            </button>

            {/* Hamburger */}
            {menuOpen ? (
              <button type="button" className="nv-hamburger open" onClick={() => setMenuOpen(false)} aria-label="Close menu" aria-expanded="true">
                <span /><span /><span />
              </button>
            ) : (
              <button type="button" className="nv-hamburger" onClick={() => setMenuOpen(true)} aria-label="Open menu" aria-expanded="false">
                <span /><span /><span />
              </button>
            )}
          </div>
        </div>
      </nav>

      {menuOpen && <div className="nv-backdrop" onClick={() => setMenuOpen(false)} />}

      <div className={`nv-mobile${menuOpen ? ' open' : ''}`}>
        {NAV_LINKS.map(({ href, label, icon }) => (
          <Link
            key={href}
            href={href}
            className={`nv-mobile-link${pathname === href ? ' active' : ''}`}
          >
            {icon}
            {label}
          </Link>
        ))}
      </div>
    </>
  )
}

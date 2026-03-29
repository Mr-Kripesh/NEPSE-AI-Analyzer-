'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

const NAV_LINKS = [
  { href: '/',              label: 'Home'          },
  { href: '/stocks',        label: 'Stocks'        },
  { href: '/news',          label: 'News'          },
  { href: '/ipo',           label: 'IPO'           },
  { href: '/watchlist',     label: 'Watchlist'     },
  { href: '/trading-chart', label: 'Trading Chart' },
]

function applyTheme(t: 'light' | 'dark') {
  document.documentElement.setAttribute('data-theme', t)
  localStorage.setItem('nepsai_theme', t)
  window.dispatchEvent(new CustomEvent('nepse-theme-change', { detail: t }))
}

export default function Navbar() {
  const pathname  = usePathname()
  const [menuOpen, setMenuOpen]   = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'dark'
    const saved = localStorage.getItem('nepse_theme') as 'light' | 'dark' | null
    const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    return saved ?? preferred
  })
  const [scrolled, setScrolled]   = useState(false)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  // Scroll shadow
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 4)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  // Close mobile menu on navigation
  useEffect(() => {
    const timer = setTimeout(() => setMenuOpen(false), 0)
    return () => clearTimeout(timer)
  }, [pathname])

  // Close mobile menu on Escape
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
      {/* ── Main nav bar ── */}
      <nav className={`nv${scrolled ? ' nv-scrolled' : ''}`}>
        <div className="nv-inner">

          {/* Logo */}
          <Link href="/" className="nv-logo">
            Nepse<span className="nv-logo-ai">AI</span>
          </Link>

          {/* Desktop center links */}
          <div className="nv-links">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`nv-link${pathname === href ? ' nv-link-active' : ''}`}
              >
                {label}
              </Link>
            ))}
          </div>

          {/* Right controls */}
          <div className="nv-right">
            <span className="nv-flag" aria-label="Nepal" title="Nepal">🇳🇵</span>
            <button
              type="button"
              className="nv-theme-btn"
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? '☀' : '☾'}
            </button>

            {menuOpen ? (
              <button
                type="button"
                className="nv-hamburger open"
                onClick={() => setMenuOpen(false)}
                aria-label="Toggle menu"
                aria-expanded="true"
              >
                <span /><span /><span />
              </button>
            ) : (
              <button
                type="button"
                className="nv-hamburger"
                onClick={() => setMenuOpen(true)}
                aria-label="Toggle menu"
                aria-expanded="false"
              >
                <span /><span /><span />
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* ── Mobile backdrop ── */}
      {menuOpen && (
        <div className="nv-backdrop" onClick={() => setMenuOpen(false)} />
      )}

      {/* ── Mobile dropdown menu ── */}
      <div className={`nv-mobile${menuOpen ? ' open' : ''}`}>
        {NAV_LINKS.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`nv-mobile-link${pathname === href ? ' active' : ''}`}
          >
            {label}
          </Link>
        ))}
      </div>
    </>
  )
}

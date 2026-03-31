'use client'

/**
 * NEPSE Oracle — Cinematic Edition
 * A full-page premium casino × futuristic-AI spin experience.
 *
 * Animation stack:
 *  • Framer Motion  — result card, orb intensification, winning zoom, symbol bounce
 *  • canvas-confetti — triple gold/cyan confetti burst on win
 *  • Web Audio API  — adaptive ticking, whoosh, jackpot chime
 *  • Canvas 2D      — fullscreen ₨/$ particle rain during spin
 *  • CSS keyframes  — screen flash, vignette, shake, shimmer, trails
 */

import {
  useState, useRef, useEffect, useCallback, memo,
} from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import Link from 'next/link'

// ═══════════════════════════════════════════════════════════════════════════
// DATA
// ═══════════════════════════════════════════════════════════════════════════

type Signal = 'BUY' | 'HOLD' | 'SELL'
type StockEntry = {
  symbol: string
  name: string
  sector: string
  price: number
  change: number
  signal: Signal
  insight: string
}

// Fallback pool — shown on first load before /api/stocks responds
const FALLBACK_STOCKS: StockEntry[] = [
  { symbol: 'NABIL',  name: 'Nabil Bank Ltd',               sector: 'Commercial Banks',  price:  930, change:  1.2, signal: 'BUY',
    insight: 'Strong Q3 earnings with 18% YoY NII growth.' },
  { symbol: 'NTC',    name: 'Nepal Telecom',                 sector: 'Telecom Services',  price:  898, change: -0.5, signal: 'HOLD',
    insight: 'Defensive fortress with rock-solid dividends.' },
  { symbol: 'HIDCL',  name: 'Hydroelectricity Inv. & Dev.', sector: 'Hydropower',        price:  178, change:  0.9, signal: 'BUY',
    insight: 'Dry season ending — peak generation incoming.' },
  { symbol: 'PRVU',   name: 'Prabhu Bank Ltd',              sector: 'Commercial Banks',  price:  215, change: -3.9, signal: 'HOLD',
    insight: 'Merger synergies not fully priced in yet.' },
  { symbol: 'SHIVM',  name: 'Shiva Shree Hydro',            sector: 'Hydropower',        price:  645, change:  2.1, signal: 'BUY',
    insight: 'High-conviction breakout on exceptional volume.' },
  { symbol: 'NRIC',   name: 'NMB Real Estate',              sector: 'Finance',           price:  310, change:  0.3, signal: 'HOLD',
    insight: 'Sector recovering post rate-cuts.' },
  { symbol: 'GBIME',  name: 'Global IME Bank',              sector: 'Commercial Banks',  price:  185, change: -0.2, signal: 'HOLD',
    insight: 'MACD crossover signals potential upward move.' },
  { symbol: 'ADBL',   name: 'Agricultural Dev Bank',        sector: 'Development Banks', price:  318, change:  1.4, signal: 'BUY',
    insight: 'Government-backed with guaranteed business floor.' },
  { symbol: 'CHCL',   name: 'Chilime Hydropower',           sector: 'Hydropower',        price:  440, change:  1.8, signal: 'BUY',
    insight: 'Monsoon season approaching — generation surge.' },
  { symbol: 'NIFRA',  name: 'Nepal Infrastructure',         sector: 'Infrastructure',    price:   72, change: -1.4, signal: 'SELL',
    insight: 'Oversold on RSI(14) — technically a bounce candidate.' },
]

const SIGNALS: Signal[] = ['BUY', 'HOLD', 'SELL']

const SEGMENT_COLORS = [
  '#06b6d4', // cyan
  '#8b5cf6', // violet
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#3b82f6', // blue
  '#a855f7', // purple
  '#14b8a6', // teal
  '#f97316', // orange
  '#ec4899', // pink
]

type Phase = 'idle' | 'spinning' | 'result'

// ═══════════════════════════════════════════════════════════════════════════
// SVG WHEEL HELPERS
// ═══════════════════════════════════════════════════════════════════════════

const CX = 250, CY = 250, OUTER_R = 220, INNER_R = 80, N = 10
const SVG_DECIMALS = 6

function formatSvgNumber(value: number): string {
  return `${Number(value.toFixed(SVG_DECIMALS))}`
}

type SvgPoint = { x: string; y: string }

function polarPoint(radius: number, angle: number): SvgPoint {
  return {
    x: formatSvgNumber(CX + radius * Math.cos(angle)),
    y: formatSvgNumber(CY + radius * Math.sin(angle)),
  }
}

/** Build an SVG donut-segment path. Segment 0 is centered at 12 o'clock. */
function slicePath(i: number): string {
  const slice = (2 * Math.PI) / N
  const sa = i * slice - Math.PI / 2 - slice / 2
  const ea = sa + slice
  const laf = slice > Math.PI ? 1 : 0
  const outerStart = polarPoint(OUTER_R, sa)
  const outerEnd = polarPoint(OUTER_R, ea)
  const innerEnd = polarPoint(INNER_R, ea)
  const innerStart = polarPoint(INNER_R, sa)
  return `M ${outerStart.x} ${outerStart.y} A ${OUTER_R} ${OUTER_R} 0 ${laf} 1 ${outerEnd.x} ${outerEnd.y} L ${innerEnd.x} ${innerEnd.y} A ${INNER_R} ${INNER_R} 0 ${laf} 0 ${innerStart.x} ${innerStart.y} Z`
}

/** Label position + readable rotation for segment i. */
function labelPos(i: number) {
  const slice = (2 * Math.PI) / N
  const mid   = i * slice - Math.PI / 2
  const r     = (OUTER_R + INNER_R) / 2
  let rot = mid * (180 / Math.PI) + 90
  rot = ((rot + 180) % 360) - 180
  if (rot >  90) rot -= 180
  if (rot < -90) rot += 180
  return {
    x: formatSvgNumber(CX + r * Math.cos(mid)),
    y: formatSvgNumber(CY + r * Math.sin(mid)),
    rot: formatSvgNumber(rot),
  }
}

function boundaryLine(i: number) {
  const angle = (i - 0.5) * (2 * Math.PI / N) - Math.PI / 2
  const inner = polarPoint(INNER_R, angle)
  const outer = polarPoint(OUTER_R, angle)
  return { x1: inner.x, y1: inner.y, x2: outer.x, y2: outer.y }
}

// Round geometry once so prerendered HTML matches hydration across runtimes.
const WHEEL_GEOMETRY = Array.from({ length: N }, (_, i) => ({
  label: labelPos(i),
  path: slicePath(i),
}))

const WHEEL_BOUNDARIES = Array.from({ length: N }, (_, i) => boundaryLine(i))

const SEGMENT_THEMES = [
  { from: '#5eead4', to: '#0f766e', accent: '#99f6e4', iconBg: 'rgba(94,234,212,.18)' },
  { from: '#c4b5fd', to: '#5b21b6', accent: '#ddd6fe', iconBg: 'rgba(196,181,253,.18)' },
  { from: '#6ee7b7', to: '#065f46', accent: '#a7f3d0', iconBg: 'rgba(110,231,183,.18)' },
  { from: '#fcd34d', to: '#b45309', accent: '#fde68a', iconBg: 'rgba(252,211,77,.18)' },
  { from: '#fda4af', to: '#be123c', accent: '#fecdd3', iconBg: 'rgba(253,164,175,.18)' },
  { from: '#93c5fd', to: '#1d4ed8', accent: '#bfdbfe', iconBg: 'rgba(147,197,253,.18)' },
  { from: '#d8b4fe', to: '#7e22ce', accent: '#f3e8ff', iconBg: 'rgba(216,180,254,.18)' },
  { from: '#67e8f9', to: '#0f766e', accent: '#a5f3fc', iconBg: 'rgba(103,232,249,.18)' },
  { from: '#fdba74', to: '#c2410c', accent: '#fed7aa', iconBg: 'rgba(253,186,116,.18)' },
  { from: '#f9a8d4', to: '#9d174d', accent: '#fbcfe8', iconBg: 'rgba(249,168,212,.18)' },
] as const

const TICKER_SCROLL_DURATION = 28

function hashSymbol(value: string) {
  return value.split('').reduce((total, char, index) => total + char.charCodeAt(0) * (index + 1), 0)
}

function logoBadgeText(symbol: string) {
  return symbol.slice(0, 2)
}

function iconPos(i: number) {
  const slice = (2 * Math.PI) / N
  const mid = i * slice - Math.PI / 2
  const r = 182

  return {
    x: formatSvgNumber(CX + r * Math.cos(mid)),
    y: formatSvgNumber(CY + r * Math.sin(mid)),
  }
}

function stableConfidence(stock: StockEntry) {
  return 84 + (hashSymbol(stock.symbol) % 15)
}

function buildSparklineSeries(stock: StockEntry, livePrice: LivePrice | null) {
  const base = livePrice?.ltp ?? stock.price
  const change = livePrice?.change ?? stock.change
  const seed = hashSymbol(stock.symbol)

  return Array.from({ length: 7 }, (_, index) => {
    const wave = Math.sin((seed + index * 11) / 8) * 0.034
    const pulse = Math.cos((seed + index * 7) / 6) * 0.016
    const trend = (index - 3) * (change / 100) * 0.22
    return Number((base * (1 + wave + pulse + trend)).toFixed(2))
  })
}

function buildSparklinePaths(values: number[], width = 320, height = 90) {
  const padX = 4   // just enough to avoid clipping edge circles
  const padY = 8
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = Math.max(max - min, 1)
  const stepX = (width - padX * 2) / Math.max(values.length - 1, 1)

  const points = values.map((value, index) => {
    const x = padX + index * stepX
    const y = padY + ((max - value) / range) * (height - padY * 2)
    return { x: Number(x.toFixed(2)), y: Number(y.toFixed(2)) }
  })

  const line = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
  const area = `${line} L ${points[points.length - 1].x} ${height + 2} L ${points[0].x} ${height + 2} Z`

  return { points, line, area, width, height }
}

function formatConsultedAt(timestamp: number | null) {
  if (!timestamp) return 'Awaiting Oracle confirmation'

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(timestamp)
}

function parseOraclePrices(data: { prices?: Record<string, { ltp: number; change: number }> } | null): Record<string, LivePrice> {
  const entries = Object.entries(data?.prices ?? {})
    .filter(([, p]) => Number.isFinite(p.ltp) && p.ltp > 0)
    .map(([sym, p]) => [sym, { ltp: p.ltp, change: p.change }] as const)
  return Object.fromEntries(entries)
}

function haveSameOrder(a: StockEntry[], b: StockEntry[]) {
  return a.length === b.length && a.every((stock, index) => stock.symbol === b[index]?.symbol)
}

function shuffleWheelStocks(previousOrder: StockEntry[]): StockEntry[] {
  const nextOrder = [...previousOrder]

  for (let i = nextOrder.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[nextOrder[i], nextOrder[j]] = [nextOrder[j], nextOrder[i]]
  }

  if (nextOrder.length > 1 && haveSameOrder(nextOrder, previousOrder)) {
    const first = nextOrder.shift()
    if (first) nextOrder.push(first)
  }

  return nextOrder
}

/** Pick N distinct random stocks from the full pool. */
function pickRandom(pool: StockEntry[], count: number): StockEntry[] {
  if (pool.length <= count) return [...pool]
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

// ═══════════════════════════════════════════════════════════════════════════
// WEB AUDIO ENGINE
// ═══════════════════════════════════════════════════════════════════════════

let _ctx: AudioContext | null = null
function getACtx(): AudioContext | null {
  try {
    if (!_ctx) _ctx = new AudioContext()
    if (_ctx.state === 'suspended') _ctx.resume()
    return _ctx
  } catch { return null }
}

function playTick(freq = 650) {
  const ctx = getACtx(); if (!ctx) return
  try {
    const osc  = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    osc.type = 'triangle'
    osc.frequency.value = freq
    const t = ctx.currentTime
    gain.gain.setValueAtTime(0.1, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.035)
    osc.start(t); osc.stop(t + 0.035)
  } catch { /* silent */ }
}

function playWhoosh() {
  const ctx = getACtx(); if (!ctx) return
  try {
    const len = ctx.sampleRate * 0.28
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const d   = buf.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
    const src  = ctx.createBufferSource(); src.buffer = buf
    const filt = ctx.createBiquadFilter()
    filt.type = 'bandpass'
    filt.frequency.setValueAtTime(3500, ctx.currentTime)
    filt.frequency.exponentialRampToValueAtTime(280, ctx.currentTime + 0.28)
    filt.Q.value = 1.5
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28)
    src.connect(filt); filt.connect(gain); gain.connect(ctx.destination)
    src.start(); src.stop(ctx.currentTime + 0.28)
  } catch { /* silent */ }
}

function playJackpot() {
  const ctx = getACtx(); if (!ctx) return
  try {
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5] // C5 E5 G5 C6 E6
    notes.forEach((freq, i) => {
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.type = 'sine'; osc.frequency.value = freq
      const st = ctx.currentTime + i * 0.1
      gain.gain.setValueAtTime(0, st)
      gain.gain.linearRampToValueAtTime(0.22, st + 0.04)
      gain.gain.exponentialRampToValueAtTime(0.001, st + 0.7)
      osc.start(st); osc.stop(st + 0.7)
    })
  } catch { /* silent */ }
}

let _tickTimer: ReturnType<typeof setTimeout> | null = null

function startTicking(totalMs: number) {
  stopTicking()
  const t0 = Date.now()
  const fire = () => {
    const p = Math.min((Date.now() - t0) / totalMs, 1)
    if (p >= 1) return
    // interval curve: 380ms → 42ms (at 30%) → 42ms (hold) → 380ms
    let interval: number
    if      (p < 0.30) interval = 380 - 338 * (p / 0.30)
    else if (p < 0.62) interval = 42
    else               interval = 42 + 338 * ((p - 0.62) / 0.38)
    const freq = 440 + 500 * (1 - interval / 380) // higher pitch when faster
    playTick(freq)
    _tickTimer = setTimeout(fire, interval)
  }
  fire()
}

function stopTicking() {
  if (_tickTimer) { clearTimeout(_tickTimer); _tickTimer = null }
}

// ═══════════════════════════════════════════════════════════════════════════
// CONFETTI BURST
// ═══════════════════════════════════════════════════════════════════════════

function triggerConfettiBurst(accentColor: string) {
  const rupeeShape = confetti.shapeFromText({ text: 'Rs', scalar: 1 })
  const arrowShape = confetti.shapeFromText({ text: '↑', scalar: 1.1 })
  const sparkShape = confetti.shapeFromText({ text: '✦', scalar: 0.9 })

  confetti({
    particleCount: 180,
    angle: 90,
    spread: 125,
    origin: { y: 0.34 },
    colors: [accentColor, '#FFD700', '#FFC83D', '#22c55e', '#06b6d4', '#f8fafc'],
    shapes: ['square', 'circle', rupeeShape, arrowShape],
    gravity: 0.95,
    scalar: 1.28,
    startVelocity: 48,
    ticks: 280,
    drift: 0.2,
  })

  setTimeout(() => confetti({
    particleCount: 120,
    angle: 58,
    spread: 82,
    origin: { x: 0.04, y: 0.58 },
    colors: ['#FFD700', '#22c55e', accentColor, '#f8fafc'],
    shapes: ['square', arrowShape, sparkShape],
    gravity: 1.02,
    scalar: 1.08,
    startVelocity: 40,
    ticks: 240,
  }), 140)

  setTimeout(() => confetti({
    particleCount: 120,
    angle: 122,
    spread: 82,
    origin: { x: 0.96, y: 0.58 },
    colors: ['#FFD700', '#06b6d4', accentColor, '#f8fafc'],
    shapes: ['square', rupeeShape, sparkShape],
    gravity: 1.02,
    scalar: 1.08,
    startVelocity: 40,
    ticks: 240,
  }), 140)

  setTimeout(() => confetti({
    particleCount: 140,
    angle: 90,
    spread: 170,
    origin: { y: 0.22 },
    colors: ['#FFD700', '#FFF7AE', accentColor, '#ffffff'],
    shapes: ['circle', sparkShape],
    gravity: 0.55,
    scalar: 0.82,
    startVelocity: 26,
    drift: 0.55,
    ticks: 320,
  }), 420)
}

// ═══════════════════════════════════════════════════════════════════════════
// CSS KEYFRAMES  (injected as a <style> tag — applies globally in Next.js)
// ═══════════════════════════════════════════════════════════════════════════

const KEYFRAMES = `
  /* ── shimmer gradient text ── */
  @keyframes shimmer {
    0%   { background-position: -200% center; }
    100% { background-position:  200% center; }
  }
  /* ── orbital rings ── */
  @keyframes orbCW  { to { transform: rotate( 360deg); } }
  @keyframes orbCCW { to { transform: rotate(-360deg); } }
  /* ── needle/ring pulse ── */
  @keyframes needlePulse {
    0%,100% { filter: drop-shadow(0 0  6px #06b6d4); }
    50%      { filter: drop-shadow(0 0 20px #8b5cf6) drop-shadow(0 0 8px #06b6d4); }
  }
  /* ── idle wheel glow ── */
  @keyframes idleGlow {
    0%,100% { filter: drop-shadow(0 0  8px rgba(6,182,212,.22)); }
    50%      { filter: drop-shadow(0 0 22px rgba(139,92,246,.45)); }
  }
  /* ── fullscreen screen flash ── */
  @keyframes screenFlash {
    0%   { opacity: 0; }
    15%  { opacity: 1; }
    100% { opacity: 0; }
  }
  /* ── vignette pulse ── */
  @keyframes vignettePulse {
    0%,100% { opacity: .55; }
    50%      { opacity: .75; }
  }
  /* ── screen shake on reveal ── */
  @keyframes screenShake {
    0%,100% { transform: translate(0,0); }
    10%     { transform: translate(-6px,-3px) rotate(-.4deg); }
    20%     { transform: translate( 6px, 3px) rotate( .4deg); }
    30%     { transform: translate(-5px, 2px) rotate(-.3deg); }
    40%     { transform: translate( 5px,-2px) rotate( .3deg); }
    55%     { transform: translate(-3px,-3px); }
    70%     { transform: translate( 3px, 3px); }
    85%     { transform: translate(-1px, 1px); }
  }
  /* ── floatUp for ₨/$ particles ── */
  @keyframes floatUp {
    0%   { transform: translateY(0) scale(.9);   opacity: 0; }
    12%  {                                        opacity: .9; }
    85%  {                                        opacity: .6; }
    100% { transform: translateY(-140px) scale(1.4); opacity: 0; }
  }
  /* ── energy ring that circles the wheel during spin ── */
  @keyframes energyRingRotate {
    to { transform: rotate(360deg); }
  }
  /* ── ambient wheel spin-trail conic gradient ── */
  @keyframes trailRotate {
    to { transform: rotate(360deg); }
  }
  /* ── light-burst ring on reveal ── */
  @keyframes burstRing {
    0%   { transform: scale(.5) translate(-50%,-50%); opacity: 1; }
    100% { transform: scale(6)  translate(-50%,-50%); opacity: 0; }
  }
  /* ── glow pulse for result card ── */
  @keyframes resultGlow {
    0%,100% { box-shadow: 0 0 40px rgba(6,182,212,.12), var(--card-depth-shadow, 0 32px 80px rgba(0,0,0,.55)); }
    50%      { box-shadow: 0 0 80px rgba(6,182,212,.28), var(--card-depth-shadow, 0 32px 80px rgba(0,0,0,.55)); }
  }
  /* ── typing cursor blink ── */
  @keyframes cursorBlink {
    0%,100% { opacity: 1; }
    50%      { opacity: 0; }
  }
  /* ── navbar dim during spin ── */
  @keyframes oraclePulse {
    0%,100% { box-shadow: 0 0 0 rgba(245,158,11,.12), 0 0 48px rgba(6,182,212,.16); }
    50% { box-shadow: 0 0 40px rgba(245,158,11,.18), 0 0 96px rgba(139,92,246,.22); }
  }
  @keyframes pointerShine {
    0%   { transform: translateX(-120%) skewX(-18deg); opacity: 0; }
    18%  { opacity: .72; }
    40%  { transform: translateX(130%) skewX(-18deg); opacity: 0; }
    100% { transform: translateX(130%) skewX(-18deg); opacity: 0; }
  }
  @keyframes tickerScroll {
    from { transform: translateX(0); }
    to   { transform: translateX(-50%); }
  }
  @keyframes wheelWobble {
    0%,100% { transform: translateY(0px); }
    30% { transform: translateY(2px); }
    65% { transform: translateY(-1px); }
  }
  .nv { transition: filter .5s ease, opacity .5s ease !important; }
  body.oracle-spinning .nv { filter: brightness(.45) saturate(1.6); opacity: .8; }
`

// ═══════════════════════════════════════════════════════════════════════════
// BACKGROUND ORBS (Framer Motion — intensify during spin)
// ═══════════════════════════════════════════════════════════════════════════

const BackgroundOrbs = memo(function BackgroundOrbs({ phase }: { phase: Phase }) {
  const spin   = phase === 'spinning'
  const result = phase === 'result'
  return (
    <div
      aria-hidden
      style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}
    >
      {/* Cyan orb — top-left */}
      <motion.div
        animate={{ opacity: spin ? 0.38 : result ? 0.26 : 0.11, scale: spin ? 1.35 : 1 }}
        transition={{ duration: 0.9, ease: 'easeInOut' }}
        style={{
          position: 'absolute', width: 750, height: 750, borderRadius: '50%',
          background: 'rgba(6,182,212,1)', filter: 'blur(130px)',
          top: -250, left: -250, mixBlendMode: 'screen',
        }}
      />
      {/* Purple orb — bottom-right */}
      <motion.div
        animate={{ opacity: spin ? 0.32 : result ? 0.22 : 0.09, scale: spin ? 1.25 : 1 }}
        transition={{ duration: 0.9, ease: 'easeInOut', delay: 0.1 }}
        style={{
          position: 'absolute', width: 650, height: 650, borderRadius: '50%',
          background: 'rgba(139,92,246,1)', filter: 'blur(110px)',
          bottom: -180, right: -180, mixBlendMode: 'screen',
        }}
      />
      {/* Gold accent orb — center (appears on spin/result) */}
      <motion.div
        animate={{ opacity: spin ? 0.18 : result ? 0.14 : 0 }}
        transition={{ duration: 0.6 }}
        style={{
          position: 'absolute', width: 500, height: 500, borderRadius: '50%',
          background: 'rgba(245,158,11,1)', filter: 'blur(100px)',
          top: '30%', left: '45%', transform: 'translate(-50%,-50%)',
          mixBlendMode: 'screen',
        }}
      />
      {/* Extra cyan pulse ring during spin */}
      <AnimatePresence>
        {spin && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.4 } }}
            style={{
              position: 'absolute', inset: '8%', borderRadius: '50%',
              border: '1px solid rgba(6,182,212,.14)',
              boxShadow: '0 0 80px rgba(6,182,212,.08), inset 0 0 80px rgba(6,182,212,.06)',
              animation: 'energyRingRotate 4s linear infinite',
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
})

// ═══════════════════════════════════════════════════════════════════════════
// FULLSCREEN PARTICLE CANVAS  (₨ and $ rain during spin)
// ═══════════════════════════════════════════════════════════════════════════

const FullScreenParticles = memo(function FullScreenParticles({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef    = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    if (!active) {
      cancelAnimationFrame(rafRef.current)
      const ctx = canvas.getContext('2d')
      ctx?.clearRect(0, 0, canvas.width, canvas.height)
      return
    }

    canvas.width  = window.innerWidth
    canvas.height = window.innerHeight
    const ctx = canvas.getContext('2d')!

    type Particle = {
      x: number; y: number; vx: number; vy: number
      symbol: string; size: number; color: string; alpha: number
    }
    const particles: Particle[] = []

    let lastSpawnAt = 0
    const spawnParticle = () => particles.push({
      x:      Math.random() * canvas.width,
      y:      canvas.height + 30,
      vx:     (Math.random() - 0.5) * 1.8,
      vy:    -(Math.random() * 2.8 + 1.2),
      symbol: (['Rs', '↑', '◆'] as const)[Math.floor(Math.random() * 3)],
      size:   13 + Math.random() * 17,
      color:  (['#f59e0b', '#10b981', '#f8fafc'] as const)[Math.floor(Math.random() * 3)],
      alpha:  0,
    })

    // seed initial particles
    for (let i = 0; i < 22; i++) {
      spawnParticle()
      particles[particles.length - 1].y = Math.random() * canvas.height
    }

    const draw = (time: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // spawn a new particle every ~180ms
      if (time - lastSpawnAt > 180) { spawnParticle(); lastSpawnAt = time }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.x  += p.vx; p.y += p.vy
        p.vy += 0.012 // very light gravity

        const prog = 1 - p.y / canvas.height
        p.alpha = Math.min(1, prog * 4) * Math.min(1, (1 - prog) * 2.5)

        if (p.y < -40) { particles.splice(i, 1); continue }

        ctx.save()
        ctx.globalAlpha = p.alpha * 0.8
        ctx.fillStyle   = p.color
        ctx.font        = `bold ${p.size}px 'IBM Plex Mono',monospace`
        ctx.textAlign   = 'center'
        ctx.fillText(p.symbol, p.x, p.y)
        ctx.restore()
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(rafRef.current)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
  }, [active])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{ position: 'fixed', inset: 0, zIndex: 4, pointerEvents: 'none' }}
    />
  )
})

// ═══════════════════════════════════════════════════════════════════════════
// RESULT CARD — upgraded: typewriter insight, count-up price, motion bar
// ═══════════════════════════════════════════════════════════════════════════

const OracleTickerTape = memo(function OracleTickerTape({
  prices,
  stocks,
}: {
  prices: Record<string, LivePrice>
  stocks: StockEntry[]
}) {
  const tapeStocks = [...stocks, ...stocks]

  return (
    <div
      style={{
        position: 'relative',
        marginTop: 18,
        marginBottom: 18,
        overflow: 'hidden',
        borderRadius: 22,
        border: '1px solid rgba(255,255,255,.08)',
        background: 'linear-gradient(180deg, rgba(8,14,28,.82), rgba(5,8,18,.66))',
        boxShadow: '0 18px 60px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.06)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 14px',
          borderBottom: '1px solid rgba(255,255,255,.06)',
          background: 'linear-gradient(90deg, rgba(245,158,11,.12), rgba(6,182,212,.08), transparent)',
        }}
      >
        <span
          style={{
            padding: '5px 10px',
            borderRadius: 999,
            background: 'rgba(245,158,11,.14)',
            border: '1px solid rgba(245,158,11,.28)',
            color: '#fcd34d',
            fontSize: '0.58rem',
            fontWeight: 800,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            fontFamily: 'var(--font-stack-mono)',
          }}
        >
          Live Feed
        </span>
        <span style={{ color: 'var(--text2)', fontSize: '0.72rem', fontFamily: 'var(--font-stack-sans)' }}>
          NEPSE pulse across banks, hydro, and infrastructure leaders
        </span>
      </div>

      <div style={{ overflow: 'hidden', position: 'relative' }}>
        <div
          style={{
            display: 'flex',
            width: 'max-content',
            animation: `tickerScroll ${TICKER_SCROLL_DURATION}s linear infinite`,
          }}
        >
          {tapeStocks.map((stock, index) => {
            const live = prices[stock.symbol]
            const ltp = live?.ltp ?? stock.price
            const change = live?.change ?? stock.change
            const positive = change >= 0
            const theme = SEGMENT_THEMES[index % SEGMENT_THEMES.length]

            return (
              <div
                key={`${stock.symbol}-${index}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  minWidth: 190,
                  padding: '12px 16px',
                  borderRight: '1px solid rgba(255,255,255,.06)',
                }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 12,
                    display: 'grid',
                    placeItems: 'center',
                    background: theme.iconBg,
                    border: `1px solid ${theme.accent}40`,
                    color: theme.accent,
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    fontFamily: 'var(--font-stack-mono)',
                  }}
                >
                  {logoBadgeText(stock.symbol)}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ color: '#f8fafc', fontSize: '0.76rem', fontWeight: 700, fontFamily: 'var(--font-stack-mono)' }}>
                    {stock.symbol}
                  </span>
                  <span style={{ color: positive ? '#4ade80' : '#fb7185', fontSize: '0.7rem', fontFamily: 'var(--font-stack-mono)' }}>
                    Rs {ltp.toLocaleString()} {positive ? '▲' : '▼'} {Math.abs(change).toFixed(2)}%
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
})

const WheelPointer = memo(function WheelPointer({ active }: { active: boolean }) {
  return (
    <motion.div
      aria-label="oracle-pointer"
      animate={{
        y: active ? [0, -3, 0] : 0,
        scale: active ? [1, 1.03, 1] : 1,
        filter: active
          ? 'drop-shadow(0 0 28px rgba(245,158,11,.72)) drop-shadow(0 0 48px rgba(251,191,36,.3))'
          : 'drop-shadow(0 0 18px rgba(245,158,11,.42))',
      }}
      transition={{ duration: 1.4, repeat: active ? Infinity : 0, ease: 'easeInOut' }}
      style={{
        position: 'absolute',
        top: -18,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 14,
        width: 88,
        height: 112,
        pointerEvents: 'none',
      }}
    >
      <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
        <svg viewBox="0 0 88 112" style={{ width: '100%', height: '100%' }}>
          <defs>
            <linearGradient id="oracle-pointer-gold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fff2b5" />
              <stop offset="45%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#92400e" />
            </linearGradient>
          </defs>
          <path
            d="M44 2 L58 17 L72 22 L54 72 L48 108 L40 108 L34 72 L16 22 L30 17 Z"
            fill="url(#oracle-pointer-gold)"
            stroke="rgba(255,243,189,.82)"
            strokeWidth="2"
          />
          <path
            d="M44 10 L52 21 L61 25 L48 66 L44 93 L40 66 L27 25 L36 21 Z"
            fill="rgba(120,53,15,.22)"
            stroke="rgba(255,249,196,.28)"
            strokeWidth="1"
          />
          <circle cx="44" cy="84" r="8" fill="rgba(255,244,207,.92)" />
          <circle cx="44" cy="84" r="4.5" fill="#92400e" />
        </svg>

        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: '8px 18px 18px',
            background: 'linear-gradient(120deg, transparent 20%, rgba(255,255,255,.75) 48%, transparent 80%)',
            mixBlendMode: 'screen',
            animation: 'pointerShine 4.2s ease-in-out infinite',
          }}
        />
      </div>
    </motion.div>
  )
})

const SparklineChart = memo(function SparklineChart({
  stock,
  livePrice,
}: {
  stock: StockEntry
  livePrice: LivePrice | null
}) {
  const change = livePrice?.change ?? stock.change
  const ltp    = livePrice?.ltp ?? stock.price
  const positive = change >= 0
  const series = buildSparklineSeries(stock, livePrice)
  const { points, line, area, width, height } = buildSparklinePaths(series)
  const [isDark, setIsDark] = useState(true)

  useEffect(() => {
    const root = document.documentElement
    const check = () => setIsDark(root.dataset.theme !== 'light')
    check()
    const obs = new MutationObserver(check)
    obs.observe(root, { attributes: true, attributeFilter: ['data-theme'] })
    return () => obs.disconnect()
  }, [])

  const stroke      = positive ? (isDark ? '#4ade80' : '#16a34a') : (isDark ? '#fb7185' : '#dc2626')
  const gridLine    = isDark ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.06)'
  const panelBg     = isDark
    ? 'linear-gradient(160deg, rgba(255,255,255,.06) 0%, rgba(255,255,255,.02) 100%)'
    : 'linear-gradient(160deg, rgba(255,255,255,.98) 0%, rgba(248,250,255,.95) 100%)'
  const panelBorder = isDark ? 'rgba(255,255,255,.09)' : 'rgba(37,99,235,.13)'
  const labelColor  = isDark ? 'rgba(148,163,184,.75)' : 'rgba(100,116,139,.8)'
  const dotLast     = isDark ? '#fff' : '#0f172a'
  const priceColor  = isDark ? '#f8fafc' : '#0f172a'
  const changeStr   = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`
  const badgeBg     = positive
    ? (isDark ? 'rgba(74,222,128,.15)' : 'rgba(22,163,74,.10)')
    : (isDark ? 'rgba(251,113,133,.15)' : 'rgba(220,38,38,.10)')
  const badgeBd     = positive
    ? (isDark ? 'rgba(74,222,128,.30)' : 'rgba(22,163,74,.25)')
    : (isDark ? 'rgba(251,113,133,.30)' : 'rgba(220,38,38,.25)')
  const divider     = isDark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.06)'
  const dayLabels   = ['5D', '4D', '3D', '2D', '1D', 'Ydy', 'Now']

  return (
    <div
      style={{
        flex: '1 1 100%',
        borderRadius: 20,
        border: `1px solid ${panelBorder}`,
        background: panelBg,
        padding: '16px 18px 12px',
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <div style={{
            fontSize: '0.58rem', letterSpacing: '0.2em', textTransform: 'uppercase',
            color: labelColor, fontFamily: 'var(--font-stack-sans)', marginBottom: 3,
          }}>
            5D Momentum
          </div>
          <div style={{ fontSize: '1rem', fontWeight: 800, fontFamily: 'var(--font-stack-mono)', color: priceColor, letterSpacing: '-0.02em' }}>
            {ltp > 0 ? `₨ ${ltp.toLocaleString()}` : '—'}
          </div>
        </div>
        {ltp > 0 && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: badgeBg, border: `1px solid ${badgeBd}`,
            padding: '5px 11px', borderRadius: 10,
            fontSize: '0.74rem', fontWeight: 700, fontFamily: 'var(--font-stack-mono)', color: stroke,
          }}>
            {positive ? '▲' : '▼'} {changeStr}
          </div>
        )}
      </div>

      {/* Chart — full width */}
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 130, overflow: 'visible', display: 'block' }}>
        <defs>
          <linearGradient id="oracleSparkGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={stroke} stopOpacity={0.28} />
            <stop offset="100%" stopColor={stroke} stopOpacity={0.01} />
          </linearGradient>
        </defs>

        {[0.15, 0.42, 0.68, 0.90].map(level => (
          <line
            key={level}
            x1={0} x2={width}
            y1={height * level} y2={height * level}
            stroke={gridLine} strokeDasharray="4 8"
          />
        ))}

        <path d={area} fill="url(#oracleSparkGrad)" />

        <motion.path
          d={line}
          fill="none"
          stroke={stroke}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.4, ease: 'easeOut', delay: 0.2 }}
        />

        {points.map((point, index) => {
          const isLast = index === points.length - 1
          return (
            <motion.circle
              key={`${point.x}-${point.y}`}
              cx={point.x}
              cy={point.y}
              r={isLast ? 5.5 : 3}
              fill={isLast ? dotLast : stroke}
              stroke={isLast ? stroke : 'none'}
              strokeWidth={isLast ? 2.5 : 0}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.22 + index * 0.06, duration: 0.28 }}
            />
          )
        })}
      </svg>

      {/* X-axis day labels */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginTop: 6, paddingTop: 8,
        borderTop: `1px solid ${divider}`,
      }}>
        {dayLabels.map((label, i) => (
          <span key={label} style={{
            fontSize: '0.52rem', letterSpacing: '0.06em', textTransform: 'uppercase',
            color: i === dayLabels.length - 1 ? stroke : labelColor,
            fontFamily: 'var(--font-stack-sans)',
            fontWeight: i === dayLabels.length - 1 ? 700 : 400,
          }}>
            {label}
          </span>
        ))}
      </div>
    </div>
  )
})

type LivePrice = { ltp: number; change: number }

function ResultCard({
  stock, onReset, livePrice, consultedAt,
}: {
  stock: StockEntry
  onReset: () => void
  /** Live price fetched from /api/market-data after the wheel stops.
   *  Null until the fetch resolves; falls back to hardcoded data if it fails. */
  livePrice: LivePrice | null
  consultedAt: number | null
}) {
  const confidence = stableConfidence(stock)
  const [displayPrice,   setDisplayPrice]   = useState(0)
  const [displayInsight, setDisplayInsight] = useState('')
  const [barWidth,       setBarWidth]       = useState(0)
  const [isDark,         setIsDark]         = useState(true)
  const rafRef   = useRef<number>(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)

  // Theme detection — watches data-theme on <html>
  useEffect(() => {
    const root = document.documentElement
    const check = () => setIsDark(root.dataset.theme !== 'light')
    check()
    const obs = new MutationObserver(check)
    obs.observe(root, { attributes: true, attributeFilter: ['data-theme'] })
    return () => obs.disconnect()
  }, [])

  // Live price wins; hardcoded values are only a fallback
  const price  = livePrice?.ltp    ?? stock.price
  const change = livePrice?.change ?? stock.change

  // Count-up animation — restarts automatically if live price arrives mid-animation
  useEffect(() => {
    cancelAnimationFrame(rafRef.current)
    setDisplayPrice(0)
    const start    = performance.now()
    const duration = 1800
    const tick = (now: number) => {
      const t      = Math.min((now - start) / duration, 1)
      const eased  = 1 - Math.pow(1 - t, 3)
      setDisplayPrice(Math.round(price * eased))
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [price]) // re-runs when live price replaces the hardcoded fallback

  // Confidence bar fill
  useEffect(() => {
    const t = setTimeout(() => setBarWidth(confidence), 200)
    return () => clearTimeout(t)
  }, [confidence])

  // Typewriter insight — starts after 600ms delay so card is visible first
  useEffect(() => {
    let i = 0
    const startId = setTimeout(() => {
      timerRef.current = setInterval(() => {
        i++
        setDisplayInsight(stock.insight.slice(0, i))
        if (i >= stock.insight.length) clearInterval(timerRef.current)
      }, 18)
    }, 600)
    return () => { clearTimeout(startId); clearInterval(timerRef.current) }
  }, [stock.insight])

  const signalColor  = stock.signal === 'BUY'  ? (isDark ? '#10b981' : '#059669')
                     : stock.signal === 'SELL' ? (isDark ? '#ef4444' : '#e11d48')
                     : (isDark ? '#f59e0b' : '#d97706')
  const changeColor  = change >= 0 ? (isDark ? '#10b981' : '#059669') : (isDark ? '#ef4444' : '#e11d48')
  const changeStr    = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`
  const isTyping     = displayInsight.length < stock.insight.length
  const consultedLabel = formatConsultedAt(consultedAt)
  const theme = SEGMENT_THEMES[hashSymbol(stock.symbol) % SEGMENT_THEMES.length]

  // ── Theme-adaptive palette ──────────────────────────────────────────────
  const cardBg      = isDark
    ? 'linear-gradient(160deg, rgba(9,14,30,.97) 0%, rgba(4,7,18,.95) 100%)'
    : 'linear-gradient(160deg, rgba(255,255,255,.99) 0%, rgba(248,250,255,.97) 100%)'
  const cardBorder  = isDark ? 'rgba(255,255,255,.1)' : 'rgba(37,99,235,.18)'
  const symbolColor = isDark ? '#f8fafc' : '#0f172a'
  const nameColor   = isDark ? '#94a3b8' : '#475569'
  const sectorBg    = isDark ? 'rgba(255,255,255,.04)' : 'rgba(239,246,255,.8)'
  const sectorBd    = isDark ? 'rgba(255,255,255,.08)' : 'rgba(37,99,235,.15)'
  const sectorColor = isDark ? '#94a3b8' : '#64748b'
  const consultedC  = isDark ? '#fde68a' : '#b45309'
  const consultedBg = isDark ? 'rgba(245,158,11,.08)' : 'rgba(245,158,11,.07)'
  const consultedBd = isDark ? 'rgba(245,158,11,.22)' : 'rgba(245,158,11,.35)'
  const panelBg     = isDark
    ? 'linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,.015))'
    : 'rgba(248,250,255,.85)'
  const panelBd     = isDark ? 'rgba(255,255,255,.08)' : 'rgba(37,99,235,.1)'
  const confidBg    = isDark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.07)'
  const pipOff      = isDark ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.1)'
  const insightBg   = isDark
    ? 'linear-gradient(180deg,rgba(6,182,212,.07),rgba(6,182,212,.02))'
    : 'rgba(239,246,255,.75)'
  const insightBd   = isDark ? 'rgba(6,182,212,.15)' : 'rgba(37,99,235,.14)'
  const insightTxt  = isDark ? '#cbd5e1' : '#334155'
  const insightLbl  = isDark ? '#06b6d4' : '#2563eb'
  const priceCurr   = isDark ? '#67e8f9' : '#2563eb'
  const priceNum    = isDark ? '#f1f5f9' : '#0f172a'
  const priceLabel  = '#64748b'
  const curvePrim   = isDark ? 'rgba(255,255,255,.28)' : 'rgba(0,0,0,.1)'
  const curveCyan   = isDark ? 'rgba(6,182,212,.42)' : 'rgba(37,99,235,.18)'
  const confPct     = isDark ? '#67e8f9' : '#2563eb'
  const btnPrimBg   = isDark
    ? 'linear-gradient(135deg, rgba(8,145,178,.55), rgba(124,58,237,.5))'
    : 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)'
  const btnPrimBd   = isDark ? 'rgba(6,182,212,.45)' : 'transparent'
  const btnPrimShad = isDark ? '0 8px 22px rgba(8,145,178,.2)' : '0 6px 22px rgba(37,99,235,.3)'
  const btnSecBg    = isDark ? 'rgba(59,130,246,.1)' : 'rgba(239,246,255,.9)'
  const btnSecBd    = isDark ? 'rgba(59,130,246,.32)' : 'rgba(37,99,235,.28)'
  const btnSecColor = isDark ? '#60a5fa' : '#2563eb'

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 920,
        background: cardBg,
        border: `1px solid ${cardBorder}`,
        borderRadius: 30,
        padding: '30px clamp(20px, 4vw, 34px)',
        backdropFilter: 'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
        position: 'relative',
        overflow: 'hidden',
        animation: 'resultGlow 3s ease-in-out infinite',
      }}
    >
      {/* Decorative SVG curves */}
      <svg
        aria-hidden
        viewBox="0 0 920 420"
        preserveAspectRatio="none"
        style={{ position: 'absolute', inset: 0, opacity: isDark ? 0.09 : 0.05, pointerEvents: 'none', width: '100%', height: '100%' }}
      >
        <path d="M0,300 Q140,248 250,255 Q430,265 520,175 Q650,40 920,80" stroke={theme.accent} strokeWidth="1.6" fill="none" />
        <path d="M0,390 Q180,360 320,280 Q520,170 920,220" stroke={curvePrim} strokeWidth="0.9" fill="none" />
        <path d="M0,360 Q150,290 260,325 Q410,380 540,272 Q700,150 920,166" stroke={curveCyan} strokeWidth="1" fill="none" />
      </svg>

      {/* Ambient radial overlay */}
      <div
        aria-hidden
        style={{
          position: 'absolute', inset: 0, borderRadius: 30, pointerEvents: 'none',
          background: isDark
            ? 'radial-gradient(ellipse 80% 42% at 50% 0%, rgba(245,158,11,.14) 0%, transparent 62%), radial-gradient(circle at 82% 18%, rgba(6,182,212,.12), transparent 30%)'
            : 'radial-gradient(ellipse 80% 42% at 50% 0%, rgba(37,99,235,.05) 0%, transparent 62%), radial-gradient(circle at 82% 18%, rgba(6,182,212,.05), transparent 30%)',
        }}
      />

      {/* ── Stock identity + live price ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start', marginBottom: 20 }}>
        {/* Left: logo + details */}
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <motion.div
            initial={{ scale: 0.68, opacity: 0, y: 14 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: 'spring', damping: 16, stiffness: 220 }}
            style={{
              width: 72, height: 72, borderRadius: 22,
              display: 'grid', placeItems: 'center',
              background: `linear-gradient(180deg, ${theme.iconBg}, rgba(255,255,255,.04))`,
              border: `1px solid ${theme.accent}40`,
              color: theme.accent,
              fontSize: '1.2rem', fontWeight: 900,
              fontFamily: 'var(--font-stack-mono)',
              boxShadow: `inset 0 1px 0 rgba(255,255,255,.12), 0 0 36px ${theme.accent}26`,
            }}
          >
            {logoBadgeText(stock.symbol)}
          </motion.div>

          <div>
            <div style={{ fontSize: '0.62rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: theme.accent, marginBottom: 6, fontFamily: 'var(--font-stack-sans)' }}>
              Oracle Pick
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ fontSize: '2.2rem', fontWeight: 900, lineHeight: 1, color: symbolColor, fontFamily: 'var(--font-stack-mono)' }}>
                {stock.symbol}
              </div>
              <span
                style={{
                  padding: '5px 14px', borderRadius: 999,
                  background: `${signalColor}1e`,
                  border: `1px solid ${signalColor}55`,
                  color: signalColor,
                  fontSize: '0.68rem', fontWeight: 800,
                  letterSpacing: '0.16em', textTransform: 'uppercase',
                  fontFamily: 'var(--font-stack-mono)',
                  boxShadow: `0 0 14px ${signalColor}22`,
                }}
              >
                {stock.signal}
              </span>
            </div>
            <div style={{ color: nameColor, fontSize: '0.84rem', fontFamily: 'var(--font-stack-sans)', marginTop: 4 }}>
              {stock.name}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
              <span style={{
                padding: '4px 12px', borderRadius: 999,
                border: `1px solid ${sectorBd}`, background: sectorBg,
                color: sectorColor, fontSize: '0.64rem',
                letterSpacing: '0.12em', textTransform: 'uppercase',
                fontFamily: 'var(--font-stack-mono)',
              }}>
                {stock.sector}
              </span>
              <span style={{
                padding: '4px 12px', borderRadius: 999,
                border: `1px solid ${consultedBd}`, background: consultedBg,
                color: consultedC, fontSize: '0.64rem',
                letterSpacing: '0.12em', textTransform: 'uppercase',
                fontFamily: 'var(--font-stack-mono)',
              }}>
                Consulted {consultedLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Right: animated live price */}
        <motion.div
          initial={{ opacity: 0, x: 14 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.22, duration: 0.45 }}
          style={{ textAlign: 'right', flexShrink: 0 }}
        >
          <div style={{ fontSize: '0.58rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: priceLabel, marginBottom: 5, fontFamily: 'var(--font-stack-sans)' }}>
            Live Price
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, justifyContent: 'flex-end' }}>
            {price > 0 && (
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: priceCurr, fontFamily: 'var(--font-stack-mono)' }}>₨</span>
            )}
            <span style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1, color: priceNum, fontFamily: 'var(--font-stack-mono)' }}>
              {price > 0 ? displayPrice.toLocaleString() : '—'}
            </span>
          </div>
          <div style={{ fontSize: '0.84rem', fontWeight: 700, color: changeColor, fontFamily: 'var(--font-stack-mono)', marginTop: 3 }}>
            {price > 0 ? changeStr : 'No data'}
          </div>
        </motion.div>
      </div>

      {/* ── AI Insight typewriter ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.45 }}
        style={{
          marginBottom: 18,
          padding: '14px 18px',
          borderRadius: 16,
          border: `1px solid ${insightBd}`,
          background: insightBg,
        }}
      >
        <div style={{ fontSize: '0.58rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: insightLbl, marginBottom: 8, fontFamily: 'var(--font-stack-sans)' }}>
          ✦ Oracle AI Insight
        </div>
        <p style={{ fontSize: '0.86rem', lineHeight: 1.78, margin: 0, color: insightTxt, fontFamily: 'var(--font-stack-sans)', minHeight: '2.8rem' }}>
          {displayInsight}
          {isTyping && (
            <span style={{
              display: 'inline-block', width: 2, height: '1em',
              background: insightLbl, marginLeft: 3, verticalAlign: 'middle',
              animation: 'cursorBlink .5s ease-in-out infinite',
            }} />
          )}
        </p>
      </motion.div>

      {/* ── 5D Sparkline ── */}
      <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginBottom: 18 }}>
        <SparklineChart stock={stock} livePrice={livePrice} />
      </div>

      {/* ── Confidence meter ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.45, duration: 0.35 }}
        style={{
          marginBottom: 24,
          padding: '16px 18px',
          borderRadius: 20,
          border: `1px solid ${panelBd}`,
          background: panelBg,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.62rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: isDark ? 'var(--muted)' : '#64748b', fontFamily: 'var(--font-stack-sans)' }}>
            Oracle Confidence
          </span>
          <motion.span style={{ fontSize: '1rem', fontWeight: 800, color: confPct, fontFamily: 'var(--font-stack-mono)' }}>
            {confidence}%
          </motion.span>
        </div>

        <div style={{ height: 8, background: confidBg, borderRadius: 999, overflow: 'hidden', marginBottom: 10, position: 'relative' }}>
          <div style={{
            height: '100%',
            width: `${barWidth}%`,
            background: 'linear-gradient(90deg, #38bdf8, #a855f7, #f59e0b)',
            borderRadius: 999,
            boxShadow: '0 0 16px rgba(6,182,212,.5)',
            transition: 'width 1.6s cubic-bezier(0.4,0,0.2,1)',
          }} />
          <div style={{
            position: 'absolute',
            top: '50%',
            left: `calc(${barWidth}% - 6px)`,
            transform: 'translateY(-50%)',
            width: 12, height: 12, borderRadius: '50%',
            background: '#fff',
            boxShadow: '0 0 10px #38bdf8, 0 0 18px #a855f7',
            transition: 'left 1.6s cubic-bezier(0.4,0,0.2,1)',
            opacity: barWidth > 5 ? 1 : 0,
          }} />
        </div>

        <div style={{ display: 'flex', gap: 5 }}>
          {Array.from({ length: 10 }, (_, i) => {
            const lit = i < Math.round(confidence / 10)
            return (
              <div key={i} style={{
                flex: 1, height: 4, borderRadius: 999,
                background: lit ? 'linear-gradient(90deg, #38bdf8, #a855f7)' : pipOff,
                boxShadow: lit ? '0 0 8px rgba(6,182,212,.35)' : 'none',
                transition: `background .3s ${i * 0.07}s, box-shadow .3s ${i * 0.07}s`,
              }} />
            )
          })}
        </div>
      </motion.div>

      {/* ── Actions ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.62, duration: 0.4 }}
        style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}
      >
        <motion.button
          onClick={onReset}
          whileHover={{ scale: 1.03, boxShadow: isDark ? '0 0 28px rgba(6,182,212,.4)' : '0 8px 28px rgba(37,99,235,.38)' }}
          whileTap={{ scale: 0.97 }}
          style={{
            flex: '1 1 160px', padding: '14px 20px',
            background: btnPrimBg,
            border: `1.5px solid ${btnPrimBd}`,
            borderRadius: 999,
            color: '#fff', fontSize: '0.8rem', fontWeight: 700,
            letterSpacing: '0.08em', cursor: 'pointer',
            fontFamily: 'var(--font-stack-sans)',
            boxShadow: btnPrimShad,
          }}
        >
          Spin Again
        </motion.button>

        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} style={{ flex: '1 1 140px' }}>
          <Link
            href={`/?q=${stock.symbol}`}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '100%', padding: '14px 16px',
              background: btnSecBg,
              border: `1.5px solid ${btnSecBd}`,
              borderRadius: 999,
              color: btnSecColor,
              fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.08em',
              textDecoration: 'none', fontFamily: 'var(--font-stack-sans)',
              transition: 'background .2s',
            }}
          >
            Open Analysis
          </Link>
        </motion.div>
      </motion.div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════

export default function NepseOraclePage() {
  const [wheelStocks,   setWheelStocks]   = useState<StockEntry[]>([...FALLBACK_STOCKS])
  const [allStocks,     setAllStocks]     = useState<StockEntry[]>([...FALLBACK_STOCKS])
  const [phase,        setPhase]        = useState<Phase>('idle')
  const [selectedIdx,  setSelectedIdx]  = useState<number | null>(null)
  const [selectedStock, setSelectedStock] = useState<StockEntry | null>(null)
  const [rotation,     setRotation]     = useState(0)
  const [rotationFrames, setRotationFrames] = useState<number[] | null>(null)
  const [spinDuration, setSpinDuration] = useState(4.1)
  const [showResult,   setShowResult]   = useState(false)
  const [wheelBlur,    setWheelBlur]    = useState(0)
  const [flashActive,  setFlashActive]  = useState(false)
  const [shaking,      setShaking]      = useState(false)
  /** Real-time price fetched from /api/market-data once the wheel stops */
  const [livePrice,    setLivePrice]    = useState<LivePrice | null>(null)
  const [tickerPrices, setTickerPrices] = useState<Record<string, LivePrice>>({})
  const [consultedAt,  setConsultedAt]  = useState<number | null>(null)

  const rotRef           = useRef(0)
  const phaseRef         = useRef<Phase>('idle')   // kept in sync with phase state for async callbacks
  const timerRef         = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const blurTimers       = useRef<ReturnType<typeof setTimeout>[]>([])
  const tickerPricesRef  = useRef<Record<string, LivePrice>>({})
  // Holds a fresh fetch kicked off at spin-start so prices are ready at reveal
  const spinFetchRef     = useRef<Promise<Record<string, LivePrice>> | null>(null)
  // Dynamic oracle-prices URL — updates whenever wheelStocks changes
  const oraclePricesUrlRef = useRef<string>(
    `/api/oracle-prices?symbols=${FALLBACK_STOCKS.map(s => s.symbol).join(',')}`
  )

  // Keep a ref to tickerPrices so setTimeout closures always see the latest values
  useEffect(() => { tickerPricesRef.current = tickerPrices }, [tickerPrices])

  // Update oracle-prices URL whenever wheel stocks change
  useEffect(() => {
    oraclePricesUrlRef.current = `/api/oracle-prices?symbols=${wheelStocks.map(s => s.symbol).join(',')}`
  }, [wheelStocks])

  // Fetch full stock list from /api/stocks once on mount
  useEffect(() => {
    fetch('/api/stocks')
      .then(r => r.ok ? r.json() : null)
      .then((data: { stocks: { symbol: string; name: string; sector: string; ltp?: string; change?: string }[] } | null) => {
        if (!data?.stocks?.length) return
        const mapped: StockEntry[] = data.stocks.map(s => ({
          symbol: s.symbol,
          name: s.name || s.symbol,
          sector: s.sector || 'Others',
          price: parseFloat(s.ltp || '0') || 0,
          change: parseFloat(s.change || '0') || 0,
          signal: SIGNALS[hashSymbol(s.symbol) % 3],
          insight: '',
        }))
        setAllStocks(mapped)
        // Only update the wheel when idle — never during a spin or result reveal
        // (changing wheelStocks mid-spin causes selectedIdx to point at the wrong segment)
        if (phaseRef.current === 'idle') {
          setWheelStocks(pickRandom(mapped, N))
        }
      })
      .catch(() => { /* use fallback */ })
  }, [])

  // Cleanup on unmount
  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    blurTimers.current.forEach(clearTimeout)
    stopTicking()
    document.body.classList.remove('oracle-spinning')
  }, [])

  // Keep phaseRef in sync so async callbacks (fetch .then) can read current phase
  useEffect(() => { phaseRef.current = phase }, [phase])

  // Body class drives navbar dimming
  useEffect(() => {
    if (phase === 'spinning') {
      document.body.classList.add('oracle-spinning')
    } else {
      document.body.classList.remove('oracle-spinning')
    }
  }, [phase])

  useEffect(() => {
    let active = true

    const loadTicker = () => {
      fetch(oraclePricesUrlRef.current)
        .then(r => r.ok ? r.json() : null)
        .then((data: { prices?: Record<string, { ltp: number; change: number }> } | null) => {
          if (!active) return
          setTickerPrices(parseOraclePrices(data))
        })
        .catch(() => { /* silent fallback to static prices */ })
    }

    loadTicker()
    const intervalId = setInterval(loadTicker, 45000)

    return () => {
      active = false
      clearInterval(intervalId)
    }
  }, [])

  const handleSpin = useCallback(() => {
  if (phase === 'spinning') return;

  // Cleanup previous timers
  blurTimers.current.forEach(clearTimeout);
  blurTimers.current = [];

  setShowResult(false);
  setLivePrice(null);
  setConsultedAt(null);

  // Visual + sound feedback
  setFlashActive(true);
  setTimeout(() => setFlashActive(false), 320);
  playWhoosh();
  setTimeout(() => startTicking(2600), 100);

  // oracle-prices URL for the current wheel stocks — used after landing
  const oraclePricesUrl = oraclePricesUrlRef.current;

  // Shuffle wheel and start animation
  const nextWheelStocks = shuffleWheelStocks(wheelStocks);
  setWheelStocks(nextWheelStocks);

  const idx = Math.floor(Math.random() * N);
  const dur = 2.6 + Math.random() * 0.3;   // 2.6 – 2.9 s (was 4.2 – 4.6 s)

  setSpinDuration(dur);
  setPhase('spinning');

  // Rotation & blur logic
  const segDeg = 360 / N;
  const targetMod = ((N - idx) % N) * segDeg;
  const currentMod = (rotRef.current % 360 + 360) % 360;
  let delta = (targetMod - currentMod + 360) % 360;
  if (delta < segDeg) delta += 360;
  const extraSpins = (3 + Math.floor(Math.random() * 2)) * 360;  // 3–4 full rotations (was 6–8)
  rotRef.current += extraSpins + delta;
  setRotation(rotRef.current);

  blurTimers.current = [
    setTimeout(() => setWheelBlur(2),   200),
    setTimeout(() => setWheelBlur(4.5), 500),
    setTimeout(() => setWheelBlur(2.5), dur * 1000 - 900),
    setTimeout(() => setWheelBlur(0.8), dur * 1000 - 450),
    setTimeout(() => setWheelBlur(0),   dur * 1000 - 100),
  ];

  // Reveal
  timerRef.current = setTimeout(async () => {
    stopTicking();

    const symbol     = nextWheelStocks[idx].symbol;
    const stockEntry = nextWheelStocks[idx];

    // Show the card immediately — use best available initial price
    const hardcoded  = FALLBACK_STOCKS.find(s => s.symbol === symbol);
    const initPrice  = stockEntry.price  > 0 ? stockEntry.price  : (hardcoded?.price  ?? 0);
    const initChange = stockEntry.price  > 0 ? stockEntry.change : (hardcoded?.change ?? 0);

    setSelectedIdx(idx);
    setSelectedStock(nextWheelStocks[idx]);   // lock in the actual landed stock
    setPhase('result');
    setShowResult(true);
    setConsultedAt(Date.now());
    setShaking(true);
    setTimeout(() => setShaking(false), 700);
    playJackpot();
    triggerConfettiBurst(SEGMENT_COLORS[idx]);
    setLivePrice({ ltp: initPrice, change: initChange });

    // Fetch verified price from oracle-prices (MeroLagani priority) and update
    try {
      const resp = await fetch(
        `/api/oracle-prices?symbols=${encodeURIComponent(symbol)}`,
        { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } }
      );
      if (resp.ok) {
        const data = await resp.json();
        const accurate = data?.prices?.[symbol];
        if (accurate && accurate.ltp > 0) {
          setLivePrice({ ltp: accurate.ltp, change: accurate.change });
        }
      }
    } catch (err) {
      console.warn(`[Oracle] Price refresh failed for ${symbol}:`, err);
    }
  }, Math.round(dur * 1000) + 250);
}, [phase, wheelStocks]);

  const handleReset = useCallback(() => {
    setPhase('idle')
    setSelectedIdx(null)
    setSelectedStock(null)
    setShowResult(false)
    setLivePrice(null)
    setRotationFrames(null)
    setConsultedAt(null)
  }, [])

  // Use the locked-in selectedStock (immune to wheelStocks reshuffling during spin)
  const stock = selectedStock

  /* ─ dynamic SVG filter based on wheelBlur state ─ */
  const wheelFilter =
    phase === 'spinning'
      ? `drop-shadow(0 0 ${8 + wheelBlur * 5}px #06b6d4) drop-shadow(0 0 ${wheelBlur * 7}px #8b5cf6)`
      : phase === 'result'
        ? 'drop-shadow(0 0 20px rgba(6,182,212,.65))'
        : 'drop-shadow(0 0 8px rgba(6,182,212,.22))'

  return (
    <main
      className="page-main"
      style={{
        minHeight: 'calc(100vh - 56px)',
        animation: shaking ? 'screenShake 0.6s cubic-bezier(.36,.07,.19,.97)' : 'none',
      }}
    >
      {/* ── Inject keyframes globally ── */}
      <style>{KEYFRAMES}</style>

      {/* ── Animated background orbs ── */}
      <BackgroundOrbs phase={phase} />

      {/* ── Screen flash on spin start ── */}
      {flashActive && (
        <div
          aria-hidden
          style={{
            position: 'fixed', inset: 0, zIndex: 600, pointerEvents: 'none',
            background: 'radial-gradient(ellipse at center, rgba(6,182,212,.22) 0%, rgba(255,255,255,.06) 60%, transparent 100%)',
            animation: 'screenFlash 0.32s ease-out forwards',
          }}
        />
      )}

      {/* ── Vignette + focus during spin ── */}
      <AnimatePresence>
        {phase === 'spinning' && (
          <motion.div
            key="vignette"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.5 } }}
            aria-hidden
            style={{
              position: 'fixed', inset: 0, zIndex: 2, pointerEvents: 'none',
              background: 'radial-gradient(ellipse 65% 55% at 50% 42%, transparent 0%, rgba(0,0,0,.62) 100%)',
              animation: 'vignettePulse 1.8s ease-in-out infinite',
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Fullscreen ₨/$ particle canvas ── */}
      <FullScreenParticles active={phase === 'spinning'} />

      {/* ── Light burst ring on reveal (under the needle) ── */}
      <AnimatePresence>
        {phase === 'result' && selectedIdx !== null && (
          <motion.div
            key="burst"
            initial={{ scale: 0.4, opacity: 1 }}
            animate={{ scale: 7, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.4, ease: [0.15, 0, 1, 1] }}
            aria-hidden
            style={{
              position: 'fixed',
              top: '36%', left: '50%',
              width: 120, height: 120,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${SEGMENT_COLORS[selectedIdx]} 0%, rgba(255,255,255,.5) 35%, transparent 70%)`,
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
              zIndex: 10,
            }}
          />
        )}
      </AnimatePresence>

      {/* ── PAGE CONTENT ── */}
      <div className="container" style={{ position: 'relative', zIndex: 5, paddingBottom: 100 }}>
        <OracleTickerTape prices={tickerPrices} stocks={allStocks} />

        {/* Page header */}
        <div className="page-header" style={{ borderBottom: '1px solid rgba(255,255,255,.06)' }}>
          <Link href="/" className="page-back-link">← Home</Link>
          <h1
            className="page-title"
            style={{
              backgroundImage: 'linear-gradient(135deg, #06b6d4 0%, #8b5cf6 55%, #06b6d4 100%)',
              backgroundSize: '200% auto',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              animation: 'shimmer 5s linear infinite',
            }}
          >
            NEPSE Oracle
          </h1>
          <span style={{ marginLeft: 'auto', fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted)', fontFamily: 'var(--font-stack-sans)' }}>
            AI · Powered
          </span>
        </div>

        <p style={{ textAlign: 'center', marginBottom: 44, fontSize: '0.8rem', color: 'var(--text2)', letterSpacing: '0.05em', fontFamily: 'var(--font-stack-sans)' }}>
          Consult the Oracle for your next NEPSE move · Powered by AI market intelligence
        </p>

        {/* ── Oracle stage (wheel + button + result) ── */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 40 }}>

          {/* ─── Wheel container ─── */}
          <div style={{ position: 'relative', width: '100%', maxWidth: 500, aspectRatio: '1/1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>

            {/* Outer orbital rings */}
            {(['28px', '48px'] as const).map((inset, ri) => (
              <div key={ri} aria-hidden style={{
                position: 'absolute', inset: `-${inset}`, borderRadius: '50%',
                border: '1px dashed rgba(6,182,212,.20)',
                animation: `${ri % 2 === 0 ? 'orbCW 22s' : 'orbCCW 36s'} linear infinite`,
                pointerEvents: 'none',
              }} />
            ))}

            {/* Ambient glow halo */}
            <motion.div
              animate={{
                opacity: phase === 'spinning' ? 1 : 0.45,
                scale:   phase === 'spinning' ? 1.08 : 1,
              }}
              transition={{ duration: 0.7 }}
              aria-hidden
              style={{
                position: 'absolute', inset: -4, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(6,182,212,.12) 0%, rgba(139,92,246,.08) 55%, transparent 72%)',
                pointerEvents: 'none',
              }}
            />

            {/* Spinning conic-gradient light trail (appears when wheelBlur is high) */}
            {phase === 'spinning' && wheelBlur > 2 && (
              <div aria-hidden style={{
                position: 'absolute', inset: -8, borderRadius: '50%',
                background: 'conic-gradient(from 0deg, transparent 0%, rgba(6,182,212,.18) 8%, transparent 16%, transparent 50%, rgba(139,92,246,.14) 58%, transparent 66%)',
                filter: `blur(${wheelBlur}px)`,
                animation: 'trailRotate 0.22s linear infinite',
                pointerEvents: 'none',
              }} />
            )}

            {/* Needle */}
            <div aria-label="needle" style={{
              position: 'absolute', top: 0, left: '50%',
              transform: 'translateX(-50%) translateY(-3px)',
              zIndex: 12, pointerEvents: 'none',
              width: 0, height: 0,
              borderLeft: '12px solid transparent',
              borderRight: '12px solid transparent',
              borderTop: '32px solid #06b6d4',
              animation: 'needlePulse 2.2s ease-in-out infinite',
            }} />

            {/* ─ SVG Wheel wrapped in motion.div for win-zoom ─ */}
            <motion.div
              animate={phase === 'result' ? { scale: [1, 1.06, 1] } : { scale: 1 }}
              transition={{ duration: 1.3, ease: 'easeInOut' }}
              style={{ width: '100%', height: '100%' }}
            >
              <svg
                viewBox="0 0 500 500"
                aria-label="NEPSE Oracle spinning wheel"
                style={{
                  width: '100%', height: '100%',
                  transform:  `rotate(${rotation}deg)`,
                  transition: phase === 'spinning'
                    ? `transform ${spinDuration}s cubic-bezier(0.17,0.67,0.12,0.99)`
                    : 'none',
                  filter:    wheelFilter,
                  animation: phase === 'idle' ? 'idleGlow 4s ease-in-out infinite' : 'none',
                  willChange: 'transform',
                }}
              >
                <defs>
                  {wheelStocks.map((_, i) => (
                    <radialGradient key={i} id={`sg${i}`} cx="50%" cy="30%" r="70%">
                      <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.20" />
                      <stop offset="100%" stopColor="#000000" stopOpacity="0.05" />
                    </radialGradient>
                  ))}
                </defs>

                {/* Segments */}
                {wheelStocks.map((s, i) => {
                  const { label, path } = WHEEL_GEOMETRY[i]
                  const { x, y, rot } = label
                  const winning = selectedIdx === i && phase === 'result'
                  return (
                    <g key={s.symbol}>
                      <path d={path} fill={SEGMENT_COLORS[i]} opacity={winning ? 1 : 0.86} stroke="rgba(5,7,9,.85)" strokeWidth="1.8" />
                      <path d={path} fill={`url(#sg${i})`} />
                      {winning && <path d={path} fill="white" opacity="0.14" />}
                      <text
                        x={x} y={y}
                        textAnchor="middle" dominantBaseline="central"
                        transform={`rotate(${rot},${x},${y})`}
                        fontSize="13" fontWeight="700"
                        fill="rgba(255,255,255,.96)"
                        fontFamily="'IBM Plex Mono',monospace"
                        letterSpacing="0.5"
                      >
                        {s.symbol}
                      </text>
                    </g>
                  )
                })}

                {/* Boundary lines */}
                {WHEEL_BOUNDARIES.map(({ x1, y1, x2, y2 }, i) => {
                  return (
                    <line key={i}
                      x1={x1} y1={y1}
                      x2={x2} y2={y2}
                      stroke="rgba(5,7,9,.7)" strokeWidth="1.5"
                    />
                  )
                })}

                {/* Center hub */}
                <circle cx={CX} cy={CY} r={INNER_R} fill="rgba(3,5,10,.95)" stroke="rgba(6,182,212,.5)" strokeWidth="2.5" />
                <circle cx={CX} cy={CY} r={INNER_R - 10} fill="none" stroke="rgba(139,92,246,.24)" strokeWidth="1" strokeDasharray="4 5" />
                <text x={CX} y={CY - 10} textAnchor="middle" fill="rgba(6,182,212,.92)" fontSize="15" fontWeight="800" fontFamily="'IBM Plex Sans',sans-serif" letterSpacing="1.5">ORACLE</text>
                <text x={CX} y={CY + 9}  textAnchor="middle" fill="rgba(139,92,246,.75)" fontSize="9"  fontFamily="'IBM Plex Mono',monospace" letterSpacing="2.5">NEPSE</text>
              </svg>
            </motion.div>
          </div>

          {/* ─── Spin button ─── */}
          <AnimatePresence mode="wait">
            {phase !== 'result' && (
              <motion.div
                key="spin-btn"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                style={{ textAlign: 'center' }}
              >
                <motion.button
                  onClick={handleSpin}
                  disabled={phase === 'spinning'}
                  whileHover={phase === 'idle' ? {
                    scale:     1.04,
                    boxShadow: '0 0 60px rgba(6,182,212,.55), 0 0 100px rgba(139,92,246,.2)',
                  } : {}}
                  whileTap={phase === 'idle' ? { scale: 0.96 } : {}}
                  style={{
                    position:    'relative',
                    padding:     '18px 58px',
                    fontSize:    '0.92rem',
                    fontWeight:  800,
                    fontFamily:  'var(--font-stack-sans)',
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color:       phase === 'spinning' ? 'rgba(255,255,255,.4)' : '#fff',
                    backgroundImage:
                      phase === 'spinning'
                        ? 'none'
                        : 'linear-gradient(135deg, #0891b2 0%, #7c3aed 50%, #0891b2 100%)',
                    backgroundColor:
                      phase === 'spinning' ? 'rgba(15,23,42,.6)' : 'transparent',
                    backgroundSize: '200% auto',
                    border:      '1.5px solid rgba(6,182,212,.4)',
                    borderRadius: 64,
                    cursor:      phase === 'spinning' ? 'not-allowed' : 'pointer',
                    boxShadow:
                      phase === 'idle'
                        ? '0 0 48px rgba(6,182,212,.32), 0 0 90px rgba(139,92,246,.14), inset 0 1px 0 rgba(255,255,255,.14)'
                        : '0 4px 20px rgba(0,0,0,.3)',
                    animation:   phase === 'idle' ? 'shimmer 3.5s linear infinite' : 'none',
                    transition:  'opacity .3s, box-shadow .3s',
                  }}
                >
                  {phase === 'spinning' ? '✦ Consulting Oracle…' : '✦ Spin the Oracle'}
                </motion.button>

                {phase === 'spinning' && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    style={{
                      marginTop: 16, fontSize: '0.7rem',
                      letterSpacing: '0.14em', fontFamily: 'var(--font-stack-sans)',
                      backgroundImage: 'linear-gradient(90deg, var(--muted), #06b6d4, #8b5cf6, var(--muted))',
                      backgroundSize: '300% auto',
                      WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      animation: 'shimmer 2.5s linear infinite',
                    }}
                  >
                    The Oracle reads the market forces…
                  </motion.p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ─── Result card ─── */}
          <AnimatePresence>
            {phase === 'result' && stock && showResult && (
              <motion.div
                key="result"
                initial={{ y: 90, opacity: 0, scale: 0.86 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 50, opacity: 0, scale: 0.94 }}
                transition={{ type: 'spring', damping: 22, stiffness: 190, delay: 0.15 }}
                style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
              >
                <ResultCard stock={stock} onReset={handleReset} livePrice={livePrice} consultedAt={consultedAt} />
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </main>
  )
}

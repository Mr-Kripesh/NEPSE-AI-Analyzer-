import type { Metadata } from 'next'
import {
  Geist, Geist_Mono,
  IBM_Plex_Mono, IBM_Plex_Sans, Playfair_Display,
  Inter, Noto_Sans_Devanagari,
} from 'next/font/google'
import Script from 'next/script'
import Navbar from '@/components/Navbar'
import ServiceWorkerReg from '@/components/ServiceWorkerReg'
import './globals.css'

const geistSans      = Geist({             variable: '--font-geist-sans',      subsets: ['latin'] })
const geistMono      = Geist_Mono({        variable: '--font-geist-mono',       subsets: ['latin'] })
const ibmPlexMono    = IBM_Plex_Mono({     variable: '--font-ibm-plex-mono',    subsets: ['latin'], weight: ['400', '600'] })
const ibmPlexSans    = IBM_Plex_Sans({     variable: '--font-ibm-plex-sans',    subsets: ['latin'], weight: ['300', '400', '500', '600'] })
const playfair       = Playfair_Display({  variable: '--font-playfair',         subsets: ['latin'], weight: ['400', '700', '900'] })
const inter          = Inter({             variable: '--font-inter',            subsets: ['latin'], weight: ['300', '400', '500', '600', '700'] })
const notoDevanagari = Noto_Sans_Devanagari({ variable: '--font-noto-devanagari', subsets: ['devanagari'], weight: ['400', '600'] })

export const metadata: Metadata = {
  title: {
    default: 'NEPSE AI — Nepal Stock Exchange Analysis',
    template: '%s — NEPSE AI',
  },
  description:
    'AI-powered Nepal Stock Exchange analysis. Get instant BUY/SELL/HOLD signals, live prices, technical indicators, portfolio tracker, and market news.',
  keywords: ['NEPSE', 'Nepal Stock Exchange', 'stock analysis', 'AI', 'share market', 'portfolio'],
  authors: [{ name: 'NEPSE AI' }],
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'NepseAI',
  },
  formatDetection: { telephone: false },
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${ibmPlexMono.variable} ${ibmPlexSans.variable} ${playfair.variable} ${inter.variable} ${notoDevanagari.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://s3.tradingview.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {/* Sets data-theme BEFORE React hydrates — prevents flash & ensures CSS selectors work */}
        <Script src="/theme-init.js" strategy="beforeInteractive" />
        <Navbar />
        <ServiceWorkerReg />
        {children}
      </body>
    </html>
  )
}

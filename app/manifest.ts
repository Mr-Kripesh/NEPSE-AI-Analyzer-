import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'NEPSE AI — Nepal Stock Analysis',
    short_name: 'NepseAI',
    description: 'AI-powered Nepal Stock Exchange analysis with watchlist, portfolio tracker, and live market data.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#06080f',
    theme_color: '#c0392b',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  }
}

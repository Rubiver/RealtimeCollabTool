import type { Metadata } from 'next'
import './globals.css'
import Providers from '@/components/Providers'

export const metadata: Metadata = {
  title: 'Collaboration Tool',
  description: 'Real-time collaboration tool for drawing and document editing',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className="antialiased">
          <Providers>
             {children}
          </Providers>
        </body>
    </html>
  )
}

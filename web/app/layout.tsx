import type { Metadata } from 'next'
import { JetBrains_Mono, Work_Sans } from 'next/font/google'
import './globals.css'

const workSans = Work_Sans({ subsets: ['latin'], variable: '--font-work-sans' })
const jetBrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains-mono' })

export const metadata: Metadata = {
  title: 'Agent Tools Registry',
  description: 'Versioned tool schemas with source provenance.',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${workSans.variable} ${jetBrainsMono.variable}`}>{children}</body>
    </html>
  )
}

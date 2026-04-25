import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Doclytics',
  description: 'Chat with your documents using AI',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='light'){document.documentElement.classList.remove('dark')}else{document.documentElement.classList.add('dark')}}catch(e){document.documentElement.classList.add('dark')}})()`,
          }}
        />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  )
}

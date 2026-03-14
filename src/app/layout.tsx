import type { Metadata } from 'next'

import { AuthProvider } from '@/context/AuthContext'
import './globals.css'

export const metadata: Metadata = {
  title: 'DPWH PDS Task Management System',
  description: 'Manage RBP and GAA stage technical documents and workflows.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* ... heads ... */}
        <link href="https://fonts.googleapis.com" rel="preconnect" />
        <link crossOrigin="anonymous" href="https://fonts.gstatic.com" rel="preconnect" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@400;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;500;700;900&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap" rel="stylesheet" />
        <script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
        <script
          id="tailwind-config"
          dangerouslySetInnerHTML={{
            __html: `
              tailwind.config = {
                  darkMode: "class",
                  corePlugins: {
                      preflight: false,
                  },
                  theme: {
                      extend: {
                          colors: {
                              "primary": "#135bec",
                              "background-light": "#f6f6f8",
                              "background-dark": "#101622",
                          },
                          fontFamily: {
                              "display": ["Public Sans", "sans-serif"]
                          },
                          borderRadius: {"DEFAULT": "0.25rem", "lg": "0.5rem", "xl": "0.75rem", "full": "9999px"},
                      },
                  },
              }
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}

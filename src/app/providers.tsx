'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Suspense, useState, type ReactNode } from 'react'
import { ThemeProvider, useTheme } from 'next-themes'
import { AppProgressBar } from 'next-nprogress-bar'
import { MotionConfig } from 'motion/react'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/lib/hooks/useAuth'
import { CityProvider } from '@/lib/context/CityContext'

function ThemedToaster() {
  const { resolvedTheme } = useTheme()
  return (
    <Toaster
      position="bottom-center"
      richColors
      closeButton
      theme={(resolvedTheme as 'light' | 'dark') ?? 'light'}
    />
  )
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 2 * 60 * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  )

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange={false}
    >
      <Suspense>
        <AppProgressBar
          height="3px"
          color="#E23744"
          options={{ showSpinner: false }}
          shallowRouting
        />
      </Suspense>
      <MotionConfig reducedMotion="user">
        <QueryClientProvider client={queryClient}>
          <CityProvider>
            <AuthProvider>{children}</AuthProvider>
          </CityProvider>
        </QueryClientProvider>
      </MotionConfig>
      <ThemedToaster />
    </ThemeProvider>
  )
}

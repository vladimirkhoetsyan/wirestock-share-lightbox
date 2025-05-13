import type React from "react"
import { AuthProvider } from "@/contexts/auth-context"
import { Toaster } from "@/components/ui/toaster"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0a0a0c] text-white">
        <AuthProvider>
          {/* <TestToastButton /> */}
          {children}
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  )
}

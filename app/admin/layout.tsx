import type React from "react"
import { AuthProvider } from "@/contexts/auth-context"
import { Toaster } from "@/components/ui/toaster"
import { TestToastButton } from "@/components/TestToastButton"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-[#0a0a0c]">
        <TestToastButton />
        {children}
      </div>
      <Toaster />
    </AuthProvider>
  )
}

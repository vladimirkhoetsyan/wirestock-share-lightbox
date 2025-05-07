"use client"
import { useToast } from "@/hooks/use-toast"

export function TestToastButton() {
  const { toast } = useToast()
  return (
    <button
      style={{ position: 'fixed', top: 10, right: 10, zIndex: 9999 }}
      onClick={() => toast({ title: 'Test Toast', description: 'This is a test toast from layout.' })}
      className="bg-blue-600 text-white px-4 py-2 rounded shadow"
    >
      Show Toast
    </button>
  )
} 
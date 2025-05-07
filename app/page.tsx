"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push("/admin/login")
    }, 2000)

    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-6">
          <span className="text-white text-4xl font-bold">W</span>
        </div>
        <h1 className="text-4xl font-bold mb-2">Wirestock Lightbox</h1>
        <p className="text-muted-foreground mb-6">Share your media collections with clients and collaborators</p>
        <div className="w-12 h-12 rounded-full border-4 border-white/10 border-t-blue-500 animate-spin mx-auto"></div>
        <p className="text-sm text-muted-foreground mt-4">Redirecting to login...</p>
      </motion.div>
    </div>
  )
}

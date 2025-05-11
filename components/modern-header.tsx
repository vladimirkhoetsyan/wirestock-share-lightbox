"use client"

import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { LogOut, Menu, X, Bell, ExternalLink } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"

export default function ModernHeader() {
  const { logout, isAuthenticated } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const notifRef = useRef(null)
  const { notifications, unreadCount, loading, error, fetchNotifications, setNotifications } = useNotifications()
  const unseenCount = typeof unreadCount === 'number' ? unreadCount : notifications.filter((n: any) => !n.seen).length

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !(notifRef.current as any).contains(e.target)) {
        setNotifOpen(false)
      }
    }
    if (notifOpen) document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [notifOpen])

  // Refetch on open
  useEffect(() => { if (notifOpen) fetchNotifications() }, [notifOpen])

  async function markAsSeen(id: string) {
    const token = localStorage.getItem("token")
    if (!token) return
    await fetch(`/api/admin/notifications/${id}`, {
      method: "PATCH",
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ seen: true })
    })
    setNotifications((prev: any) => prev.map((n: any) => n.id === id ? { ...n, seen: true, seenAt: new Date().toISOString() } : n))
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-md border-b border-white/10">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link href={isAuthenticated ? "/admin/dashboard" : "/"} className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <span className="text-white font-bold">W</span>
          </div>
          <span className="text-xl font-bold text-white">Wirestock Lightbox</span>
        </Link>

        {isAuthenticated && (
          <>
            <div className="hidden md:flex items-center space-x-4">
              <Button variant="ghost" size="sm" asChild className="text-white hover:bg-white/10">
                <Link href="/admin/dashboard">Dashboard</Link>
              </Button>
              {/* Notification bell - before logout */}
              <div className="relative" ref={notifRef}>
                <Button variant="ghost" size="icon" className="text-white" onClick={() => setNotifOpen((v) => !v)}>
                  <Bell className="h-6 w-6" />
                  {unseenCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full text-xs w-5 h-5 flex items-center justify-center border-2 border-black">{unseenCount >= 10 ? '9+' : unseenCount}</span>
                  )}
                </Button>
                {notifOpen && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.2 }} className="absolute right-0 mt-2 w-96 max-w-[90vw] glass-card rounded-xl shadow-lg border border-white/10 bg-black/90 z-50">
                    <div className="p-4 border-b border-white/10 flex items-center justify-between">
                      <span className="font-bold text-white">Notifications</span>
                      {loading && <span className="text-xs text-gray-400">Loading...</span>}
                    </div>
                    <div className="max-h-96 overflow-y-auto divide-y divide-white/10">
                      {notifications.length === 0 && (
                        <div className="p-4 text-gray-400 text-center">No notifications</div>
                      )}
                      {notifications.map((n: any) => (
                        <div
                          key={n.id}
                          className={`w-full text-left px-4 py-3 hover:bg-white/5 transition flex flex-col relative ${!n.seen ? 'bg-blue-500/10' : ''}`}
                          onClick={() => markAsSeen(n.id)}
                          style={{ cursor: 'pointer' }}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-white">{n.lightboxName || 'Lightbox'}</span>
                            <span className="text-xs text-gray-400 ml-2">{n.enteredAtRelative}</span>
                          </div>
                          <div className="text-sm text-gray-300">{n.shareLinkName}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs ${n.seen ? 'text-green-400' : 'text-blue-400'}`}>{n.seen ? 'Seen' : 'New'}</span>
                            {n.passwordCorrect && <span className="text-xs text-yellow-400">Password Correct</span>}
                          </div>
                          <ExternalLink
                            className="absolute right-4 bottom-3 text-blue-400 hover:text-blue-300 cursor-pointer"
                            size={18}
                            onClick={e => { e.stopPropagation(); window.open(n.analyticsLink, '_blank'); }}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="p-2 border-t border-white/10 text-center">
                      <Link href="/admin/notifications" className="text-blue-400 hover:underline text-sm font-medium">View all notifications</Link>
                    </div>
                  </motion.div>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={logout}
                className="text-white border-white/20 hover:bg-white/10"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-white"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X /> : <Menu />}
            </Button>

            <AnimatePresence>
              {mobileMenuOpen && (
                <motion.div
                  className="absolute top-full left-0 right-0 bg-black/95 border-b border-white/10 md:hidden"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="flex flex-col p-4 space-y-3">
                    <Button variant="ghost" size="sm" asChild className="text-white hover:bg-white/10">
                      <Link href="/admin/dashboard">Dashboard</Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={logout}
                      className="text-white border-white/20 hover:bg-white/10"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </header>
  )
}

function useNotifications() {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState<number | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const fetchNotifications = async () => {
    setLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem("token")
      if (!token) return
      const res = await fetch("/api/admin/notifications", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error("Failed to fetch notifications")
      const data = await res.json()
      setNotifications(data.notifications || [])
      setUnreadCount(data.unreadCount)
    } catch (e) {
      setError(e as any)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { fetchNotifications() }, [])
  // Poll every 30s
  useEffect(() => {
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])
  return { notifications, unreadCount, loading, error, fetchNotifications, setNotifications }
}

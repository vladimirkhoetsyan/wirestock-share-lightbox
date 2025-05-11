"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import ProtectedRoute from "@/components/protected-route"
import ModernHeader from "@/components/modern-header"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { type Lightbox, mockLightboxes } from "@/lib/mock-data"
import { Edit, Trash2, Plus, ImageIcon, Video, Share2, BarChart2, Users, Timer, Eye, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { motion } from "framer-motion"

async function fetchLightboxes(token: string) {
  const res = await fetch("/api/lightboxes", {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error("Failed to fetch lightboxes")
  return res.json()
}

async function deleteLightbox(id: string, token: string) {
  const res = await fetch(`/api/lightboxes/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error("Failed to delete lightbox")
  return res.json()
}

// Add helper to format seconds to human readable
function formatDuration(seconds: number) {
  if (!seconds || seconds < 1) return '0s';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [
    h ? `${h}h` : null,
    m ? `${m}m` : null,
    s ? `${s}s` : null,
  ].filter(Boolean).join(' ');
}

export default function DashboardPage() {
  const [lightboxes, setLightboxes] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const { toast } = useToast()
  const [analytics, setAnalytics] = useState<Record<string, any>>({})
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [summary, setSummary] = useState<any>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) return
    fetchLightboxes(token)
      .then(setLightboxes)
      .catch(() => toast({ title: "Error", description: "Failed to load lightboxes", variant: "destructive" }))
      .finally(() => setIsLoading(false))
  }, [])

  useEffect(() => {
    async function fetchAllAnalytics() {
      setAnalyticsLoading(true)
      const results: Record<string, any> = {}
      await Promise.all(
        lightboxes.map(async (lb: any) => {
          try {
            const res = await fetch(`/api/admin/analytics/lightbox/${lb.id}`)
            if (res.ok) {
              results[lb.id] = await res.json()
            }
          } catch {}
        })
      )
      setAnalytics(results)
      setAnalyticsLoading(false)
    }
    if (lightboxes.length > 0) fetchAllAnalytics()
  }, [lightboxes])

  useEffect(() => {
    setSummaryLoading(true);
    fetch("/api/admin/analytics/summary")
      .then((res) => res.json())
      .then(setSummary)
      .finally(() => setSummaryLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this lightbox? This action cannot be undone.")) {
      return
    }
    const token = localStorage.getItem("token")
    if (!token) return
    try {
      await deleteLightbox(id, token)
      setLightboxes(lightboxes.filter((lightbox) => lightbox.id !== id))
      toast({
        title: "Lightbox deleted",
        description: "The lightbox has been successfully deleted",
      })
    } catch {
      toast({ title: "Error", description: "Failed to delete lightbox", variant: "destructive" })
    }
  }

  // Calculate total stats
  const totalMediaItems = lightboxes.reduce((acc: number, lb: any) => acc + (lb.mediaItems?.length || 0), 0)
  const totalShareLinks = lightboxes.reduce((acc: number, lb: any) => acc + (lb.shareLinks?.length || 0), 0)
  const totalViews = lightboxes.reduce(
    (acc: number, lb: any) => acc + (lb.shareLinks?.reduce((a: number, link: any) => a + (link.analytics?.totalViews || 0), 0) || 0),
    0,
  )

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#0a0a0c]">
        <ModernHeader />
        <main className="pt-20 pb-16 min-h-screen">
          <div className="container mx-auto px-4">
            {/* --- OVERALL ANALYTICS SUMMARY --- */}
            <div className="mb-12">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <h1 className="text-4xl font-bold mb-2 text-white">Dashboard Analytics</h1>
                <p className="text-gray-300 mb-8">App-wide summary of engagement and content</p>
              </motion.div>
              <div className="mb-10">
                {summaryLoading ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="animate-spin h-8 w-8 text-white" />
                  </div>
                ) : summary ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    <Card className="glass-card p-6 flex flex-col items-center">
                      <span className="text-2xl font-bold text-blue-400">{summary.totalLightboxes}</span>
                      <span className="text-gray-300 mt-2">Total Lightboxes</span>
                    </Card>
                    <Card className="glass-card p-6 flex flex-col items-center">
                      <span className="text-2xl font-bold text-purple-400">{summary.totalMediaItems}</span>
                      <span className="text-gray-300 mt-2">Total Media Items</span>
                    </Card>
                    <Card className="glass-card p-6 flex flex-col items-center">
                      <span className="text-2xl font-bold text-cyan-400">{summary.totalShareLinks}</span>
                      <span className="text-gray-300 mt-2">Total Share Links</span>
                    </Card>
                    <Card className="glass-card p-6 flex flex-col items-center">
                      <span className="text-2xl font-bold text-yellow-400">{summary.totalViews}</span>
                      <span className="text-gray-300 mt-2">Total Views</span>
                    </Card>
                    <Card className="glass-card p-6 flex flex-col items-center">
                      <span className="text-2xl font-bold text-green-400">{summary.uniqueSessions}</span>
                      <span className="text-gray-300 mt-2">Unique Sessions</span>
                    </Card>
                    <Card className="glass-card p-6 flex flex-col items-center">
                      <span className="text-2xl font-bold text-pink-400">{summary.uniqueDevices}</span>
                      <span className="text-gray-300 mt-2">Unique Devices</span>
                    </Card>
                    <Card className="glass-card p-6 flex flex-col items-center">
                      <span className="text-2xl font-bold text-orange-400">{formatDuration(summary.avgSessionDuration)}</span>
                      <span className="text-gray-300 mt-2">Avg. Session Duration</span>
                    </Card>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">All Lightboxes</h2>
              <Button
                asChild
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
              >
                <Link href="/admin/lightboxes/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Create New Lightbox
                </Link>
              </Button>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="glass-card rounded-xl p-6 h-64 animate-pulse">
                    <div className="h-6 bg-white/10 rounded w-3/4 mb-4"></div>
                    <div className="h-4 bg-white/10 rounded w-full mb-6"></div>
                    <div className="flex gap-2 mb-4">
                      <div className="h-6 bg-white/10 rounded w-16"></div>
                      <div className="h-6 bg-white/10 rounded w-16"></div>
                    </div>
                    <div className="flex gap-2 mb-6">
                      <div className="h-5 bg-white/10 rounded w-20"></div>
                      <div className="h-5 bg-white/10 rounded w-20"></div>
                    </div>
                    <div className="mt-auto pt-4 border-t border-white/10 flex justify-between">
                      <div className="h-9 bg-white/10 rounded w-24"></div>
                      <div className="h-9 bg-white/10 rounded w-24"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {lightboxes.map((lightbox, index) => (
                  <motion.div
                    key={lightbox.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  >
                    <Card className="glass-card overflow-hidden h-full flex flex-col rounded-xl">
                      <div className="p-6 flex-grow">
                        <h3 className="text-xl font-bold mb-2 text-white">{lightbox.name}</h3>
                        <p className="text-gray-300 text-sm mb-4 line-clamp-2">{lightbox.description}</p>

                        <div className="flex flex-wrap gap-2 mb-4">
                          {lightbox.types?.map((type: any) => (
                            <Badge
                              key={type}
                              variant="outline"
                              className="flex items-center gap-1 border-white/20 text-white"
                            >
                              {type === "image" ? <ImageIcon className="h-3 w-3" /> : <Video className="h-3 w-3" />}
                              {type}
                            </Badge>
                          ))}
                        </div>

                        <div className="flex flex-wrap gap-2 mb-4">
                          {lightbox.keywords?.slice(0, 3).map((keyword: any) => (
                            <Badge key={keyword} variant="secondary" className="bg-white/10 text-xs text-white">
                              {keyword}
                            </Badge>
                          ))}
                          {lightbox.keywords?.length > 3 && (
                            <Badge variant="secondary" className="bg-white/10 text-xs text-white">
                              +{lightbox.keywords?.length - 3} more
                            </Badge>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2 mb-4">
                          {analyticsLoading || !analytics[lightbox.id] ? (
                            <>
                              <div className="h-6 w-20 bg-white/10 rounded animate-pulse" />
                              <div className="h-6 w-20 bg-white/10 rounded animate-pulse" />
                              <div className="h-6 w-20 bg-white/10 rounded animate-pulse" />
                              <div className="h-6 w-20 bg-white/10 rounded animate-pulse" />
                              <div className="h-6 w-20 bg-white/10 rounded animate-pulse" />
                              <div className="h-6 w-20 bg-white/10 rounded animate-pulse" />
                            </>
                          ) : (
                            <>
                              <Badge variant="outline" className="flex items-center gap-1 border-white/20 text-white">
                                <Eye className="h-3 w-3" /> {analytics[lightbox.id].totalViews} Views
                              </Badge>
                              <Badge variant="outline" className="flex items-center gap-1 border-white/20 text-white">
                                <BarChart2 className="h-3 w-3" /> {analytics[lightbox.id].totalSessions} Sessions
                              </Badge>
                              <Badge variant="outline" className="flex items-center gap-1 border-white/20 text-white">
                                <Users className="h-3 w-3" /> {analytics[lightbox.id].uniqueDevices} Devices
                              </Badge>
                              <Badge variant="outline" className="flex items-center gap-1 border-white/20 text-white">
                                <Timer className="h-3 w-3" /> {formatDuration(analytics[lightbox.id].avgSessionDuration)} Avg. Session
                              </Badge>
                              <Badge variant="outline" className="flex items-center gap-1 border-white/20 text-white">
                                <Share2 className="h-3 w-3" /> {lightbox.shareLinkCount} Shares
                              </Badge>
                              <Badge variant="outline" className="flex items-center gap-1 border-white/20 text-white">
                                <ImageIcon className="h-3 w-3" /> {lightbox.mediaItemCount} Items
                              </Badge>
                            </>
                          )}
                        </div>

                        <div className="flex gap-6 text-sm text-gray-300">
                          <div className="flex items-center gap-1">
                            <ImageIcon className="h-4 w-4" />
                            <span>{lightbox.mediaItemCount} items</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Share2 className="h-4 w-4" />
                            <span>{lightbox.shareLinkCount} shares</span>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 border-t border-white/10 flex gap-2 mt-auto">
                        <Button
                          variant="secondary"
                          size="sm"
                          asChild
                          className="bg-white/10 hover:bg-white/20 text-white flex-1"
                        >
                          <Link href={`/admin/lightboxes/${lightbox.id}`}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </Link>
                        </Button>
                        <Button
                          size="sm"
                          asChild
                          className="bg-white/10 hover:bg-white/20 text-white flex-1"
                          title="View Analytics"
                        >
                          <Link href={`/admin/analytics/lightbox/${lightbox.id}`}>
                            <BarChart2 className="mr-2 h-4 w-4" />
                            Analytics
                          </Link>
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(lightbox.id)}
                          className="flex-1 bg-red-900/50 hover:bg-red-900/70 text-white"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}

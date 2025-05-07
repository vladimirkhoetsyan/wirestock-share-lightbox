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
import { Edit, Trash2, Plus, ImageIcon, Video, Share2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { motion } from "framer-motion"

export default function DashboardPage() {
  const [lightboxes, setLightboxes] = useState<Lightbox[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    // Simulate loading data
    const timer = setTimeout(() => {
      setLightboxes(mockLightboxes)
      setIsLoading(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  const handleDelete = (id: string) => {
    setLightboxes(lightboxes.filter((lightbox) => lightbox.id !== id))
    toast({
      title: "Lightbox deleted",
      description: "The lightbox has been successfully deleted",
    })
  }

  // Calculate total stats
  const totalMediaItems = lightboxes.reduce((acc, lb) => acc + lb.mediaItems.length, 0)
  const totalShareLinks = lightboxes.reduce((acc, lb) => acc + lb.shareLinks.length, 0)
  const totalViews = lightboxes.reduce(
    (acc, lb) => acc + lb.shareLinks.reduce((a, link) => a + link.analytics.totalViews, 0),
    0,
  )

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#0a0a0c]">
        <ModernHeader />
        <main className="pt-20 pb-16 min-h-screen">
          <div className="container mx-auto px-4">
            <div className="mb-12">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <h1 className="text-4xl font-bold mb-2 text-white">Your Lightbox Collections</h1>
                <p className="text-gray-300 mb-8">
                  Manage and share your media collections with clients and collaborators
                </p>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="stats-item"
                >
                  <span className="stats-number">{lightboxes.length}</span>
                  <span className="stats-label">Lightboxes</span>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="stats-item"
                >
                  <span className="stats-number">{totalMediaItems}</span>
                  <span className="stats-label">Media Items</span>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="stats-item"
                >
                  <span className="stats-number">{totalViews}</span>
                  <span className="stats-label">Total Views</span>
                </motion.div>
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
                          {lightbox.types.map((type) => (
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
                          {lightbox.keywords.slice(0, 3).map((keyword) => (
                            <Badge key={keyword} variant="secondary" className="bg-white/10 text-xs text-white">
                              {keyword}
                            </Badge>
                          ))}
                          {lightbox.keywords.length > 3 && (
                            <Badge variant="secondary" className="bg-white/10 text-xs text-white">
                              +{lightbox.keywords.length - 3} more
                            </Badge>
                          )}
                        </div>

                        <div className="flex gap-6 text-sm text-gray-300">
                          <div className="flex items-center gap-1">
                            <ImageIcon className="h-4 w-4" />
                            <span>{lightbox.mediaItems.length} items</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Share2 className="h-4 w-4" />
                            <span>{lightbox.shareLinks.length} shares</span>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 border-t border-white/10 flex justify-between mt-auto">
                        <Button
                          variant="secondary"
                          size="sm"
                          asChild
                          className="w-[48%] bg-white/10 hover:bg-white/20 text-white"
                        >
                          <Link href={`/admin/lightboxes/${lightbox.id}`}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </Link>
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(lightbox.id)}
                          className="w-[48%] bg-red-900/50 hover:bg-red-900/70 text-white"
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

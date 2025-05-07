"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { type Lightbox, mockLightboxes } from "@/lib/mock-data"
import { Play, Lock, ArrowLeft, Eye } from "lucide-react"
import MediaPreviewModal from "@/components/media-preview-modal"
import { useToast } from "@/components/ui/use-toast"
import { motion } from "framer-motion"

export default function SharePage({ params }: { params: { token: string } }) {
  const [lightbox, setLightbox] = useState<Lightbox | null>(null)
  const [shareLink, setShareLink] = useState<any>(null)
  const [password, setPassword] = useState("")
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(-1)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    // Find the lightbox that contains the share link with the given token
    const timer = setTimeout(() => {
      for (const lb of mockLightboxes) {
        const link = lb.shareLinks.find((link) => link.token === params.token)
        if (link) {
          setLightbox(lb)
          setShareLink(link)

          // If the share link is not password protected, authenticate immediately
          if (!link.isPasswordProtected) {
            setIsAuthenticated(true)
          }

          // Mock analytics update
          link.analytics.totalViews += 1
          break
        }
      }
      setIsLoading(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [params.token])

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsAuthenticating(true)

    // Simulate API call
    setTimeout(() => {
      if (password === shareLink.password) {
        setIsAuthenticated(true)
        toast({
          title: "Access granted",
          description: "You now have access to the lightbox",
        })
      } else {
        toast({
          title: "Incorrect password",
          description: "Please try again with the correct password",
          variant: "destructive",
        })
      }
      setIsAuthenticating(false)
    }, 1000)
  }

  const handleMediaClick = (index: number) => {
    setSelectedMediaIndex(index)
    setIsPreviewOpen(true)

    // Mock analytics update
    if (shareLink) {
      shareLink.analytics.mediaInteractions += 1
    }
  }

  const handleClosePreview = () => {
    setIsPreviewOpen(false)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0c]">
        <div className="w-12 h-12 rounded-full border-4 border-white/10 border-t-blue-500 animate-spin"></div>
      </div>
    )
  }

  if (!lightbox || !shareLink) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0c] p-4">
        <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
          <Lock className="h-8 w-8 text-red-400" />
        </div>
        <h1 className="text-2xl font-bold mb-2 text-white">Share link not found</h1>
        <p className="text-gray-400 mb-6 text-center">This share link may have been revoked or does not exist.</p>
        <Button asChild className="bg-white/10 hover:bg-white/20 text-white">
          <a href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Return Home
          </a>
        </Button>
      </div>
    )
  }

  if (!isAuthenticated && shareLink.isPasswordProtected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0c] p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="glass-card rounded-xl p-8">
            <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-6">
              <Lock className="h-8 w-8 text-blue-400" />
            </div>

            <h1 className="text-2xl font-bold text-center mb-2 text-white">Password Protected</h1>
            <p className="text-gray-400 text-center mb-6">
              This lightbox is password protected. Please enter the password to view it.
            </p>

            <form onSubmit={handlePasswordSubmit}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-white">
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-[#1a1a1c] border-white/10 h-12 text-white"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
                  disabled={isAuthenticating}
                >
                  {isAuthenticating ? (
                    <div className="flex items-center">
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Verifying...
                    </div>
                  ) : (
                    "Submit Password"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0c]">
      <header className="bg-[#0a0a0c]/80 backdrop-blur-md border-b border-white/10 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">{lightbox.name}</h1>
              <p className="text-gray-400">{lightbox.description}</p>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <Eye className="h-4 w-4" />
              <span className="text-sm">{shareLink.analytics.totalViews} views</span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="media-grid">
          {lightbox.mediaItems.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
              className="media-item"
              onClick={() => handleMediaClick(index)}
            >
              <img src={item.thumbnailUrl || "/placeholder.svg"} alt={item.title} />
              {item.type === "video" && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 bg-black/50 rounded-full flex items-center justify-center">
                    <Play className="h-6 w-6 text-white" />
                  </div>
                </div>
              )}
              <div className="media-item-overlay">
                <h3 className="font-medium text-white">{item.title}</h3>
                {item.description && <p className="text-sm text-gray-300">{item.description}</p>}
              </div>
            </motion.div>
          ))}
        </div>
      </main>

      <MediaPreviewModal
        isOpen={isPreviewOpen}
        onClose={handleClosePreview}
        mediaItems={lightbox.mediaItems}
        initialIndex={selectedMediaIndex}
      />
    </div>
  )
}

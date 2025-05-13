"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Play, Lock, ArrowLeft, Eye } from "lucide-react"
import MediaPreviewModal from "@/components/media-preview-modal"
import { useToast } from "@/hooks/use-toast"
import { motion } from "framer-motion"
import { recordAnalyticsEvent } from '@/lib/analytics'

// Helper: file extension mapping for media type
const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"];
const VIDEO_EXTENSIONS = ["mp4", "mov", "webm", "m4v", "avi", "mkv", "ogv", "3gp", "3g2", "hls", "m3u8"];
function getMediaTypeFromUrl(url?: string): "image" | "video" | undefined {
  if (!url) return undefined;
  const extMatch = url.split("?")[0].split(".").pop();
  if (!extMatch) return undefined;
  const ext = extMatch.toLowerCase();
  if (IMAGE_EXTENSIONS.includes(ext)) return "image";
  if (VIDEO_EXTENSIONS.includes(ext)) return "video";
  if (url.toLowerCase().includes(".m3u8")) return "video";
  return undefined;
}

export default function SharePage() {
  const params = useParams();
  const [lightbox, setLightbox] = useState<any>(null)
  const [shareLink, setShareLink] = useState<any>(null)
  const [password, setPassword] = useState("")
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(-1)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const [shakePassword, setShakePassword] = useState(false)
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [mediaItems, setMediaItems] = useState<any[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const lastItemRef = useRef<null | HTMLDivElement>(null);
  const observer = useRef<IntersectionObserver | null>(null);

  // Fetch share link and lightbox from backend
  useEffect(() => {
    const fetchShareData = async () => {
      setIsLoading(true)
      try {
        const token = params.token as string
        // Fetch share link details
        const linkRes = await fetch(`/api/share-links/by-token/${encodeURIComponent(token)}`)
        if (!linkRes.ok) throw new Error("Share link not found")
        const link = await linkRes.json()
        setShareLink(link)
        // Check for access token in localStorage
        let accessToken = null
        let isValidToken = false
        if (link.isPasswordProtected) {
          accessToken = localStorage.getItem(`share_access_${link.token}`)
          if (accessToken) {
            try {
              // Decode JWT to check expiry (exp is in seconds)
              const payload = JSON.parse(atob(accessToken.split('.')[1]))
              if (payload.exp && Date.now() / 1000 < payload.exp) {
                isValidToken = true
                setIsAuthenticated(true)
              }
            } catch {}
          }
        } else {
          setIsAuthenticated(true)
        }
        // Only fetch lightbox if not protected, or if authenticated
        if (!link.isPasswordProtected || isValidToken) {
          const lbRes = await fetch(`/api/public/lightboxes/${link.lightbox_id}?shareToken=${encodeURIComponent(link.token)}`, {
            headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
          })
          if (!lbRes.ok) throw new Error("Lightbox not found")
          const lb = await lbRes.json()
          setLightbox(lb)
          // Trigger analytics event for lightbox open
          recordAnalyticsEvent({
            event: 'lightbox_open',
            share_link_id: link.id,
            password_correct: true,
          });
          setTheme(link.theme || 'dark');
        } else {
          setLightbox(null)
        }
      } catch (err) {
        setShareLink(null)
        setLightbox(null)
      } finally {
        setIsLoading(false)
      }
    }
    fetchShareData()
  }, [params.token])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.classList.remove('dark', 'light');
      document.documentElement.classList.add(theme);
    }
  }, [theme]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsAuthenticating(true)
    try {
      const res = await fetch("/api/share-links/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: shareLink.token, password }),
      })
      if (res.ok) {
        const data = await res.json()
        setIsAuthenticated(true)
        if (data.accessToken) {
          localStorage.setItem(`share_access_${shareLink.token}`, data.accessToken)
        }
        toast({ title: "Access granted", description: "You now have access to the lightbox" })
        const lbRes = await fetch(`/api/public/lightboxes/${shareLink.lightbox_id}?shareToken=${encodeURIComponent(shareLink.token)}`, {
          headers: { Authorization: `Bearer ${data.accessToken}` },
        })
        if (lbRes.ok) {
          const lb = await lbRes.json()
          setLightbox(lb)
          // Trigger analytics event for lightbox open (for password-protected links)
          recordAnalyticsEvent({
            event: 'lightbox_open',
            share_link_id: shareLink.id,
            password_correct: true,
          });
        }
      } else {
        toast({ title: "Incorrect password", description: "Please try again with the correct password", variant: "destructive" })
        setShakePassword(true)
      }
    } finally {
      setIsAuthenticating(false)
    }
  }

  const handleMediaClick = (index: any) => {
    setSelectedMediaIndex(index)
    setIsPreviewOpen(true)
  }

  const handleClosePreview = () => {
    setIsPreviewOpen(false)
  }

  // Logout handler for password-protected lightboxes
  const handleLogout = () => {
    if (shareLink && shareLink.isPasswordProtected) {
      localStorage.removeItem(`share_access_${shareLink.token}`)
      setIsAuthenticated(false)
      setLightbox(null)
    }
  }

  // Fetch initial media items and on offset change
  useEffect(() => {
    if (!shareLink || !isAuthenticated) return;
    const fetchMedia = async () => {
      setIsLoading(true);
      try {
        const lbRes = await fetch(`/api/public/lightboxes/${shareLink.lightbox_id}?shareToken=${encodeURIComponent(shareLink.token)}&offset=0&limit=24`, {
          headers: localStorage.getItem(`share_access_${shareLink.token}`)
            ? { Authorization: `Bearer ${localStorage.getItem(`share_access_${shareLink.token}`)}` }
            : undefined,
        });
        if (!lbRes.ok) throw new Error("Lightbox not found");
        const lb = await lbRes.json();
        setLightbox(lb);
        setMediaItems(lb.mediaItems);
        setOffset(lb.mediaItems.length);
        setHasMore(lb.mediaItems.length === 24);
      } catch (err) {
        setLightbox(null);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMedia();
  }, [shareLink, isAuthenticated]);

  // Infinite scroll observer
  const loadMore = useCallback(async () => {
    if (!shareLink || !isAuthenticated || isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    try {
      const lbRes = await fetch(`/api/public/lightboxes/${shareLink.lightbox_id}?shareToken=${encodeURIComponent(shareLink.token)}&offset=${offset}&limit=24`, {
        headers: localStorage.getItem(`share_access_${shareLink.token}`)
          ? { Authorization: `Bearer ${localStorage.getItem(`share_access_${shareLink.token}`)}` }
          : undefined,
      });
      if (!lbRes.ok) throw new Error("Lightbox not found");
      const lb = await lbRes.json();
      setMediaItems((prev: any[]) => [...prev, ...lb.mediaItems]);
      setOffset(offset + lb.mediaItems.length);
      setHasMore(lb.mediaItems.length === 24);
    } finally {
      setIsLoadingMore(false);
    }
  }, [shareLink, isAuthenticated, offset, isLoadingMore, hasMore]);

  const lastMediaRef = useCallback((node: HTMLDivElement | null) => {
    if (isLoadingMore) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new window.IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore) {
        loadMore();
      }
    });
    if (node) observer.current.observe(node);
  }, [isLoadingMore, hasMore, loadMore]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 rounded-full border-4 border-white/10 border-t-blue-500 animate-spin"></div>
      </div>
    )
  }

  // Show password prompt if shareLink exists, is password protected, and not authenticated
  if (shareLink && shareLink.isPasswordProtected && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <motion.div
            className="glass-card rounded-xl p-8"
            animate={shakePassword ? { x: [0, -10, 10, -10, 10, 0] } : {}}
            transition={{ duration: 0.4 }}
            onAnimationComplete={() => setShakePassword(false)}
          >
            <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-6">
              <Lock className="h-8 w-8 text-blue-400" />
            </div>

            <h1 className="text-2xl font-bold text-center mb-2 text-foreground">Password Protected</h1>
            <p className="text-gray-400 text-center mb-6">
              This lightbox is password protected. Please enter the password to view it.
            </p>

            <form onSubmit={handlePasswordSubmit}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-foreground">
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className={theme === 'dark' ? 'bg-gradient-to-r from-[#23232b] to-[#18181b] border-white/10 h-12' : ''}
                  />
                </div>

                <Button
                  type="submit"
                  className={
                    theme === 'dark'
                      ? 'w-full h-12 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white'
                      : 'w-full h-12 bg-primary text-primary-foreground'
                  }
                  disabled={isAuthenticating}
                >
                  {isAuthenticating ? (
                    <div className="flex items-center">
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-foreground"
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
          </motion.div>
        </motion.div>
      </div>
    )
  }

  // Show error only if shareLink is null
  if (!shareLink) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
          <Lock className="h-8 w-8 text-red-400" />
        </div>
        <h1 className="text-2xl font-bold mb-2 text-foreground">Share link not found</h1>
        <p className="text-gray-400 mb-6 text-center">This share link may have been revoked or does not exist.</p>
        <Button asChild className="bg-white/10 hover:bg-white/20 text-foreground">
          <a href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Return Home
          </a>
        </Button>
      </div>
    )
  }

  // If lightbox is not loaded yet, show spinner or nothing
  if (!lightbox) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 rounded-full border-4 border-white/10 border-t-blue-500 animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-background/80 backdrop-blur-md border-b border-white/10 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">{lightbox.name}</h1>
              <p className="text-gray-400">{lightbox.description}</p>
            </div>
            <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-gray-400">
              <Eye className="h-4 w-4" />
              <span className="text-sm">{shareLink.analytics.totalViews} views</span>
              </div>
              {/* Logout button for password-protected lightboxes */}
              {shareLink.isPasswordProtected && (
                <Button
                  variant="outline"
                  className="ml-4 text-foreground border-white/20 hover:bg-white/10"
                  onClick={handleLogout}
                >
                  Logout
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="media-grid">
          {mediaItems.map((item: any, index: any) => {
            const mediaType = getMediaTypeFromUrl(item.previewUrl || item.originalUrl || item.thumbnailUrl);
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
                className="media-item"
                onClick={() => handleMediaClick(index)}
                ref={index === mediaItems.length - 1 ? lastMediaRef : undefined}
              >
                <img src={item.thumbnailUrl || '/placeholder.svg'} alt={item.title} />
                {mediaType === "video" && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-14 h-14 glass-card rounded-full flex items-center justify-center shadow-lg border border-white/10 backdrop-blur-md">
                      <Play className="h-7 w-7 text-foreground" />
                    </div>
                  </div>
                )}
                <div className="media-item-overlay">
                  {item.title && !/^s3:\/\//.test(item.title) && !/^https?:\/\//.test(item.title) && (
                    <h3 className="font-medium text-foreground">{item.title}</h3>
                  )}
                  {item.description && <p className="text-sm text-gray-300">{item.description}</p>}
                </div>
              </motion.div>
            );
          })}
          {isLoadingMore && (
            <div className="py-4 flex justify-center col-span-full">
              <div className="w-8 h-8 rounded-full border-4 border-white/10 border-t-blue-500 animate-spin"></div>
            </div>
          )}
        </div>
      </main>

      <MediaPreviewModal
        isOpen={isPreviewOpen}
        onClose={handleClosePreview}
        mediaItems={lightbox.mediaItems}
        initialIndex={selectedMediaIndex}
        shareLinkId={shareLink.id}
      />
    </div>
  )
}

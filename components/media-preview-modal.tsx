"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import type { MediaItem } from "@/lib/mock-data"
import { ChevronLeft, ChevronRight, Play, Pause, Volume2, VolumeX, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import ReactPlayer from "react-player"
import { recordAnalyticsEvent } from '@/lib/analytics'

interface MediaPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  mediaItems: MediaItem[]
  initialIndex: number
  onRequestMore?: () => Promise<void>
}

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
  // HLS support
  if (url.toLowerCase().includes(".m3u8")) return "video";
  return undefined;
}

export default function MediaPreviewModal({ isOpen, onClose, mediaItems, initialIndex, onRequestMore }: MediaPreviewModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  const currentItem = Array.isArray(mediaItems) && mediaItems.length > 0 && currentIndex >= 0 && currentIndex < mediaItems.length ? mediaItems[currentIndex] : undefined
  const currentMediaType = getMediaTypeFromUrl(currentItem?.signedUrl || currentItem?.url || currentItem?.thumbnailUrl);

  useEffect(() => {
    setCurrentIndex(initialIndex)
  }, [initialIndex, isOpen])

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true)
      const timer = setTimeout(() => {
        setIsLoading(false)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [isOpen, currentIndex])

  const handlePrevious = () => {
    setIsLoading(true)
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : mediaItems.length - 1))
  }

  const handleNext = async () => {
    setIsLoading(true)
    if (currentIndex < mediaItems.length - 1) {
      setCurrentIndex((prev) => prev + 1)
    } else if (onRequestMore) {
      await onRequestMore()
      // If new items were loaded, move to the next one
      if (mediaItems.length > currentIndex + 1) {
        setCurrentIndex((prev) => prev + 1)
      } else {
        setIsLoading(false)
      }
    } else {
      setCurrentIndex(0)
    }
  }

  const togglePlay = () => {
    setIsPlaying(!isPlaying)
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`
  }

  // Mock video player progress
  useEffect(() => {
    let interval: NodeJS.Timeout

    if (currentItem?.type === "video" && isPlaying) {
      // Mock a 30 second video
      setDuration(30)

      interval = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= 30) {
            setIsPlaying(false)
            return 0
          }
          return prev + 0.1
        })
      }, 100)
    } else {
      setCurrentTime(0)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [currentItem, isPlaying])

  useEffect(() => {
    let progressInterval: NodeJS.Timeout | null = null;
    let lastReported = 0;
    if (isOpen && currentMediaType === 'video' && currentItem) {
      // Video play event
      if (isPlaying && currentTime === 0) {
        recordAnalyticsEvent({
          event: 'video_play',
          media_item_id: currentItem.id,
        });
      }
      // Video end event
      if (!isPlaying && currentTime > 0 && Math.abs(currentTime - duration) < 1) {
        recordAnalyticsEvent({
          event: 'video_end',
          media_item_id: currentItem.id,
        });
      }
      // Periodic watch progress
      if (isPlaying) {
        progressInterval = setInterval(() => {
          if (currentTime - lastReported >= 5) {
            recordAnalyticsEvent({
              event: 'video_watch_progress',
              media_item_id: currentItem.id,
              duration_ms: Math.floor(currentTime * 1000),
            });
            lastReported = currentTime;
          }
        }, 1000);
      }
    }
    return () => {
      if (progressInterval) clearInterval(progressInterval);
    };
  }, [isPlaying, currentTime, duration, isOpen, currentMediaType, currentItem]);

  if (!isOpen || !currentItem) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-[98vw] w-full max-h-screen p-0 bg-[#18181B] text-white overflow-auto border-none rounded-xl shadow-2xl z-[10050] flex items-center justify-center"
        style={{ minHeight: 400 }}
      >
        <DialogTitle className="sr-only">{currentItem.title || "Media Preview"}</DialogTitle>
        <div className="relative flex flex-col w-full max-h-screen min-h-[60vh]">
          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-10 rounded-full bg-black/50 hover:bg-black/70"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>

          {/* Media display */}
          <div className="flex-grow flex items-center justify-center p-4 relative w-full max-h-screen">
            <AnimatePresence mode="wait">
              {isLoading ? (
                <motion.div
                  key="loader"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <div className="w-12 h-12 rounded-full border-4 border-white/10 border-t-white animate-spin"></div>
                </motion.div>
              ) : currentMediaType === "image" ? (
                <motion.img
                  key={`image-${currentIndex}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  src={currentItem.signedUrl || currentItem.thumbnailUrl || "/placeholder.svg"}
                  alt={currentItem.title}
                  className="max-h-screen max-w-full w-auto h-auto object-contain"
                />
              ) : currentMediaType === "video" ? (
                <motion.div
                  key={`video-${currentIndex}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="relative w-full h-full flex items-center justify-center"
                >
                  <ReactPlayer
                    url={currentItem.signedUrl || currentItem.url}
                    playing={isPlaying}
                    muted={isMuted}
                    controls
                    width="100%"
                    height="100%"
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onEnded={() => setIsPlaying(false)}
                    onProgress={({ playedSeconds }) => setCurrentTime(playedSeconds)}
                    onDuration={setDuration}
                    onReady={() => setIsLoading(false)}
                    config={{
                      file: {
                        attributes: {
                          poster: currentItem.thumbnailUrl || undefined,
                        },
                      },
                    }}
                  />
                </motion.div>
              ) : null}
            </AnimatePresence>

            {/* Navigation arrows */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-black/50 text-white hover:bg-black/70"
              onClick={handlePrevious}
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-black/50 text-white hover:bg-black/70"
              onClick={handleNext}
              disabled={currentIndex === mediaItems.length - 1}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </div>

          {/* Navigation indicators - always at the bottom */}
          <div className="absolute left-0 right-0 bottom-0 flex justify-center gap-1 p-2 z-20">
            {mediaItems.map((_, index) => (
              <button
                key={index}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  index === currentIndex
                    ? "w-8 bg-gradient-to-r from-blue-500 to-purple-600"
                    : "w-1.5 bg-white/30 hover:bg-white/50"
                }`}
                onClick={() => setCurrentIndex(index)}
              />
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

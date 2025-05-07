"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import type { MediaItem } from "@/lib/mock-data"
import { ChevronLeft, ChevronRight, Play, Pause, Volume2, VolumeX, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface MediaPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  mediaItems: MediaItem[]
  initialIndex: number
}

export default function MediaPreviewModal({ isOpen, onClose, mediaItems, initialIndex }: MediaPreviewModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  const currentItem = mediaItems[currentIndex]

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

  const handleNext = () => {
    setIsLoading(true)
    setCurrentIndex((prev) => (prev < mediaItems.length - 1 ? prev + 1 : 0))
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

  if (!isOpen || !currentItem) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl w-full p-0 bg-black/95 text-white overflow-hidden border-none rounded-xl">
        <div className="relative flex flex-col h-[85vh]">
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
          <div className="flex-grow flex items-center justify-center p-4 relative">
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
              ) : currentItem.type === "image" ? (
                <motion.img
                  key={`image-${currentIndex}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  src={currentItem.thumbnailUrl || "/placeholder.svg"}
                  alt={currentItem.title}
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <motion.div
                  key={`video-${currentIndex}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="relative w-full h-full flex items-center justify-center"
                >
                  <img
                    src={currentItem.thumbnailUrl || "/placeholder.svg"}
                    alt={currentItem.title}
                    className="max-h-full max-w-full object-contain"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-20 w-20 rounded-full bg-black/50 text-white hover:bg-black/70"
                      onClick={togglePlay}
                    >
                      {!isPlaying ? <Play className="h-10 w-10" /> : <Pause className="h-10 w-10" />}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation arrows */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-black/50 text-white hover:bg-black/70"
              onClick={handlePrevious}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-black/50 text-white hover:bg-black/70"
              onClick={handleNext}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </div>

          {/* Controls */}
          <div className="p-6 bg-black/90 backdrop-blur-md">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-medium">{currentItem.title}</h3>
                <p className="text-sm text-gray-400">{currentItem.description}</p>
              </div>

              <div className="flex items-center gap-3">
                {currentItem.type === "video" && (
                  <div className="flex items-center gap-3 mr-4">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={toggleMute}>
                      {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    </Button>
                    <span className="text-sm font-mono">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={handlePrevious}>
                    <ChevronLeft className="h-6 w-6" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={handleNext}>
                    <ChevronRight className="h-6 w-6" />
                  </Button>
                </div>
              </div>
            </div>

            {currentItem.type === "video" && (
              <div className="mt-4">
                <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-purple-600 h-full"
                    style={{ width: `${(currentTime / duration) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>

          {/* Navigation indicators */}
          <div className="absolute bottom-24 left-0 right-0 flex justify-center gap-1 p-2">
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

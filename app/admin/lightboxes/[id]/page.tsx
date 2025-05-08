"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import ProtectedRoute from "@/components/protected-route"
import ModernHeader from "@/components/modern-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { type Lightbox, type MediaItem, type ShareLink, type MediaType, mockLightboxes } from "@/lib/mock-data"
import { useToast } from "@/hooks/use-toast"
import {
  Save,
  Plus,
  Trash2,
  MoveUp,
  MoveDown,
  Eye,
  Clock,
  MousePointer,
  Lock,
  Unlock,
  Video,
  ArrowLeft,
  Copy,
  ExternalLink,
  Share2,
  Upload,
  Maximize,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd"
import { motion } from "framer-motion"
import Link from "next/link"
import { ImageIcon } from "lucide-react"
import ImportMediaModal from "@/components/import-media-modal"
import MediaPreviewModal from "@/components/media-preview-modal"

// Number of items to load per page
const ITEMS_PER_PAGE = 10

async function fetchLightbox(id: string, token: string) {
  const res = await fetch(`/api/lightboxes/${id}` , {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error("Failed to fetch lightbox")
  return res.json()
}

async function updateLightbox(id: string, data: any, token: string) {
  const res = await fetch(`/api/lightboxes/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("Failed to update lightbox")
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

// API helpers for media items
async function fetchMediaItems(lightboxId: string, token: string) {
  const res = await fetch(`/api/lightboxes/${lightboxId}/media`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error("Failed to fetch media items")
  return res.json()
}

async function uploadMediaItem(lightboxId: string, data: any, token: string) {
  const res = await fetch(`/api/media/upload`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ ...data, lightbox_id: lightboxId }),
  })
  if (!res.ok) throw new Error("Failed to upload media item")
  return res.json()
}

async function deleteMediaItem(mediaId: string, token: string) {
  const res = await fetch(`/api/media/${mediaId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error("Failed to delete media item")
  return res.json()
}

// Add a helper to persist the new order to the backend
async function persistMediaOrder(lightboxId: string, orderedItems: MediaItem[], token: string) {
  const res = await fetch(`/api/lightboxes/${lightboxId}/media/reorder`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ order: orderedItems.map(item => item.id) }),
  })
  if (!res.ok) throw new Error("Failed to persist media order")
  return res.json()
}

function combineRefs(...refs: any[]) {
  return (node: any) => {
    refs.forEach(ref => {
      if (typeof ref === "function") {
        ref(node);
      } else if (ref && typeof ref === "object") {
        ref.current = node;
      }
    });
  };
}

export default function LightboxEditPage() {
  const params = useParams();
  const [lightbox, setLightbox] = useState<any>(null)
  const [newMediaUrl, setNewMediaUrl] = useState("")
  const [newShareName, setNewShareName] = useState("")
  const [newSharePassword, setNewSharePassword] = useState("")
  const [isPasswordProtected, setIsPasswordProtected] = useState(false)
  const [availableTypes] = useState<MediaType[]>(["image", "video"])
  const [selectedTypes, setSelectedTypes] = useState<MediaType[]>([])
  const [keywords, setKeywords] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [displayedMediaItems, setDisplayedMediaItems] = useState<MediaItem[]>([])
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const observer = useRef<IntersectionObserver | null>(null)
  const router = useRouter()
  const { toast } = useToast()
  // Add a new state for saving order
  const [isSavingOrder, setIsSavingOrder] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem("token")
    const id = typeof params.id === "string" ? params.id : Array.isArray(params.id) ? params.id[0] : undefined;
    if (!token || !id) return
    fetchLightbox(id, token)
      .then((data) => {
        setLightbox(data)
        setSelectedTypes(data.types)
        setKeywords(data.keywords.join(", "))
        // Fetch media items from backend
        fetchMediaItems(id, token)
          .then((media) => {
            setDisplayedMediaItems(media)
            setHasMore(media.length > ITEMS_PER_PAGE)
          })
          .catch(() => toast({ title: "Error", description: "Failed to load media items", variant: "destructive" }))
      })
      .catch(() => toast({ title: "Error", description: "Failed to load lightbox", variant: "destructive" }))
      .finally(() => setIsLoading(false))
  }, [params.id])

  // Infinite scroll implementation
  const lastItemRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (isLoadingMore) return
      if (observer.current) observer.current.disconnect()

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          loadMoreItems()
        }
      })

      if (node) observer.current.observe(node)
    },
    [isLoadingMore, hasMore],
  )

  const loadMoreItems = () => {
    if (!lightbox || isLoadingMore || !hasMore) return

    setIsLoadingMore(true)

    // Simulate API call delay
    setTimeout(() => {
      const nextPage = currentPage + 1
      const startIndex = (nextPage - 1) * ITEMS_PER_PAGE
      const endIndex = startIndex + ITEMS_PER_PAGE
      const newItems = lightbox.mediaItems.slice(startIndex, endIndex)

      if (newItems.length > 0) {
        setDisplayedMediaItems((prev) => [...prev, ...newItems])
        setCurrentPage(nextPage)
        setHasMore(endIndex < lightbox.mediaItems.length)
      } else {
        setHasMore(false)
      }

      setIsLoadingMore(false)
    }, 800)
  }

  if (!lightbox && !isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-[#0a0a0c]">
          <ModernHeader />
          <div className="pt-20 container mx-auto px-4 py-8 text-center">
            <p className="text-white">Lightbox not found</p>
            <Button asChild className="mt-4">
              <Link href="/admin/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Link>
            </Button>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  const handleSave = async () => {
    const token = localStorage.getItem("token")
    const id = typeof params.id === "string" ? params.id : Array.isArray(params.id) ? params.id[0] : undefined;
    if (!token || !lightbox || !id) return
    try {
      const updated = await updateLightbox(id, {
        name: lightbox.name,
        description: lightbox.description,
        types: selectedTypes,
        keywords: keywords.split(",").map((k: string) => k.trim()).filter((k: string) => k.length > 0),
      }, token)
      setLightbox(updated)
      toast({
        title: "Lightbox saved",
        description: "Your changes have been saved successfully",
      })
    } catch {
      toast({ title: "Error", description: "Failed to update lightbox", variant: "destructive" })
    }
  }

  const handleDelete = async () => {
    const token = localStorage.getItem("token")
    const id = typeof params.id === "string" ? params.id : Array.isArray(params.id) ? params.id[0] : undefined;
    if (!token || !lightbox || !id) return
    try {
      await deleteLightbox(id, token)
      toast({ title: "Lightbox deleted", description: "The lightbox has been deleted" })
      router.push("/admin/dashboard")
    } catch {
      toast({ title: "Error", description: "Failed to delete lightbox", variant: "destructive" })
    }
  }

  const handleAddMedia = async () => {
    if (!newMediaUrl.trim() || !lightbox) {
      toast({
        title: "Error",
        description: "Please enter a valid S3 URI",
        variant: "destructive",
      })
      return
    }
    const token = localStorage.getItem("token")
    const id = typeof params.id === "string" ? params.id : Array.isArray(params.id) ? params.id[0] : undefined;
    if (!token || !id) return
    try {
      const isVideo = newMediaUrl.toLowerCase().endsWith(".mp4")
      const newMedia = await uploadMediaItem(id, {
        s3_uri: newMediaUrl,
        media_type: isVideo ? "video" : "image",
      }, token)
      setDisplayedMediaItems((prev) => [
        {
          ...newMedia,
          thumbnailUrl: newMedia.signedUrl || "/placeholder.svg"
        },
        ...prev
      ])
      setNewMediaUrl("")
      toast({
        title: "Media added",
        description: "New media item has been added to the lightbox",
      })
    } catch {
      toast({ title: "Error", description: "Failed to add media item", variant: "destructive" })
    }
  }

  const handleImportMedia = (mediaItems: MediaItem[]) => {
    if (!lightbox) return

    const updatedLightbox = {
      ...lightbox,
      mediaItems: [...mediaItems, ...lightbox.mediaItems],
    }

    setLightbox(updatedLightbox)

    // Update displayed items
    setDisplayedMediaItems([...mediaItems, ...displayedMediaItems].slice(0, ITEMS_PER_PAGE))
    setHasMore(updatedLightbox.mediaItems.length > ITEMS_PER_PAGE)
    setCurrentPage(1)

    toast({
      title: "Media imported",
      description: `${mediaItems.length} media items have been imported successfully`,
    })
  }

  const handleDeleteMedia = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this media item? This action cannot be undone.")) {
      return
    }
    const token = localStorage.getItem("token")
    if (!token) return
    try {
      await deleteMediaItem(id, token)
      setDisplayedMediaItems((prev) => prev.filter((item: any) => item.id !== id))
      toast({
        title: "Media removed",
        description: "Media item has been removed from the lightbox",
      })
    } catch {
      toast({ title: "Error", description: "Failed to delete media item", variant: "destructive" })
    }
  }

  const handleMoveMedia = async (id: string, direction: "up" | "down") => {
    if (!lightbox || !Array.isArray(lightbox.mediaItems)) {
      return;
    }
    const token = localStorage.getItem("token")
    const allItems = [...lightbox.mediaItems]
    const index = allItems.findIndex((item) => item.id === id)
    if ((direction === "up" && index === 0) || (direction === "down" && index === allItems.length - 1)) {
      return;
    }
    const newIndex = direction === "up" ? index - 1 : index + 1
    const [removed] = allItems.splice(index, 1)
    allItems.splice(newIndex, 0, removed)
    setLightbox((prev: any) => {
      const updated = { ...prev, mediaItems: allItems };
      return updated;
    });
    // Update displayed items if both items are currently displayed
    const displayedIndex = displayedMediaItems.findIndex((item) => item.id === id)
    if (displayedIndex !== -1) {
      const newDisplayedIndex = direction === "up" ? displayedIndex - 1 : displayedIndex + 1
      if (newDisplayedIndex >= 0 && newDisplayedIndex < displayedMediaItems.length) {
        const newDisplayedItems = [...displayedMediaItems]
        const [removedDisplayed] = newDisplayedItems.splice(displayedIndex, 1)
        newDisplayedItems.splice(newDisplayedIndex, 0, removedDisplayed)
        setDisplayedMediaItems((prev: any) => {
          return newDisplayedItems;
        });
      }
    }
    // Persist order to backend
    if (!token) return
    setIsSavingOrder(true)
    try {
      await persistMediaOrder(lightbox.id, allItems, token)
      toast({ title: "Order saved", description: "Media order updated" })
    } catch {
      toast({ title: "Error", description: "Failed to save order", variant: "destructive" })
    } finally {
      setIsSavingOrder(false)
    }
  }

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination || !lightbox) return
    const allItems: MediaItem[] = Array.from(lightbox.mediaItems)
    const displayedItems = Array.from(displayedMediaItems)
    // Find the actual indices in the full array
    const sourceItem = displayedItems[result.source.index]
    const destItem = displayedItems[result.destination.index]
    const sourceIndex = allItems.findIndex((item: any) => item.id === sourceItem.id)
    const destIndex = allItems.findIndex((item: any) => item.id === destItem.id)
    // Reorder the full array
    const [reorderedItem] = allItems.splice(sourceIndex, 1)
    allItems.splice(destIndex, 0, reorderedItem)
    // Reorder the displayed items
    const [reorderedDisplayedItem] = displayedItems.splice(result.source.index, 1)
    displayedItems.splice(result.destination.index, 0, reorderedDisplayedItem)
    setLightbox({
      ...lightbox,
      mediaItems: allItems,
    })
    setDisplayedMediaItems(displayedItems)
    // Persist order to backend
    const token = localStorage.getItem("token")
    if (!token) return
    setIsSavingOrder(true)
    try {
      await persistMediaOrder(lightbox.id, allItems, token)
      toast({ title: "Order saved", description: "Media order updated" })
    } catch {
      toast({ title: "Error", description: "Failed to save order", variant: "destructive" })
    } finally {
      setIsSavingOrder(false)
    }
  }

  const handleCreateShareLink = () => {
    if (!newShareName.trim() || !lightbox) {
      toast({
        title: "Error",
        description: "Please enter a name for the share link",
        variant: "destructive",
      })
      return
    }

    const token = `${lightbox.name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`
    const newShareLink: ShareLink = {
      id: `share-${Date.now()}`,
      token,
      name: newShareName,
      isPasswordProtected,
      password: isPasswordProtected ? newSharePassword : undefined,
      createdAt: new Date().toISOString(),
      analytics: {
        totalViews: 0,
        mediaInteractions: 0,
        timeSpentPerMedia: 0,
      },
    }

    setLightbox({
      ...lightbox,
      shareLinks: [...lightbox.shareLinks, newShareLink],
    })

    setNewShareName("")
    setNewSharePassword("")
    setIsPasswordProtected(false)

    toast({
      title: "Share link created",
      description: "New share link has been created successfully",
    })
  }

  const handleRevokeShareLink = (id: string) => {
    if (!lightbox) return

    setLightbox({
      ...lightbox,
      shareLinks: lightbox.shareLinks.filter((link: any) => link.id !== id),
    })

    toast({
      title: "Share link revoked",
      description: "Share link has been revoked successfully",
    })
  }

  const handleTypeToggle = (type: MediaType) => {
    if (!lightbox) return

    const newTypes = selectedTypes.includes(type) ? selectedTypes.filter((t) => t !== type) : [...selectedTypes, type]

    setSelectedTypes(newTypes)
    setLightbox({
      ...lightbox,
      types: newTypes,
    })
  }

  const handleKeywordsChange = (value: string) => {
    if (!lightbox) return

    setKeywords(value)
    const keywordArray = value
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k.length > 0)

    setLightbox({
      ...lightbox,
      keywords: keywordArray,
    })
  }

  const copyShareLink = (token: string) => {
    const url = `${window.location.origin}/share/${token}`
    navigator.clipboard.writeText(url)
    toast({
      title: "Link copied",
      description: "Share link has been copied to clipboard",
    })
  }

  const handleOpenPreview = (index: number) => {
    setSelectedMediaIndex(index)
    setIsPreviewOpen(true)
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#0a0a0c]">
        <ModernHeader />
        <main className="pt-20 pb-16 min-h-screen">
          <div className="container mx-auto px-4">
            <div className="flex items-center mb-6">
              <Button variant="ghost" size="sm" asChild className="mr-4 text-white hover:bg-white/10">
                <Link href="/admin/dashboard">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Link>
              </Button>
              <h1 className="text-3xl font-bold flex-grow text-white">
                {isLoading ? <div className="h-9 bg-white/10 rounded w-48 animate-pulse"></div> : lightbox?.name}
              </h1>
              <Button
                onClick={handleSave}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
              >
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </div>

            {isLoading ? (
              <div className="glass-card rounded-xl p-6 animate-pulse">
                <div className="h-6 bg-white/10 rounded w-1/4 mb-4"></div>
                <div className="h-24 bg-white/10 rounded w-full mb-6"></div>
                <div className="h-6 bg-white/10 rounded w-1/3 mb-4"></div>
                <div className="h-12 bg-white/10 rounded w-full mb-6"></div>
              </div>
            ) : lightbox ? (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <div className="glass-card rounded-xl p-6 mb-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-sm font-medium text-white">
                          Name
                        </Label>
                        <Input
                          id="name"
                          value={lightbox.name}
                          onChange={(e) => setLightbox({ ...lightbox, name: e.target.value })}
                          className="bg-[#1a1a1c] border-white/10 text-white"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="description" className="text-sm font-medium text-white">
                          Description
                        </Label>
                        <Textarea
                          id="description"
                          value={lightbox.description}
                          onChange={(e) => setLightbox({ ...lightbox, description: e.target.value })}
                          rows={3}
                          className="bg-[#1a1a1c] border-white/10 text-white"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-white">Media Types</Label>
                        <div className="flex flex-wrap gap-2">
                          {availableTypes.map((type) => (
                            <Badge
                              key={type}
                              variant={selectedTypes.includes(type) ? "default" : "outline"}
                              className={`cursor-pointer px-3 py-1 ${
                                selectedTypes.includes(type)
                                  ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white"
                                  : "border-white/20 text-white"
                              }`}
                              onClick={() => handleTypeToggle(type)}
                            >
                              {type === "image" ? (
                                <ImageIcon className="mr-1 h-3 w-3" />
                              ) : (
                                <Video className="mr-1 h-3 w-3" />
                              )}
                              {type}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="keywords" className="text-sm font-medium text-white">
                          Keywords (comma separated)
                        </Label>
                        <Textarea
                          id="keywords"
                          value={keywords}
                          onChange={(e) => handleKeywordsChange(e.target.value)}
                          rows={2}
                          placeholder="nature, landscape, wildlife"
                          className="bg-[#1a1a1c] border-white/10 text-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <Tabs defaultValue="media" className="mb-8">
                  <TabsList className="glass-card p-1 mb-6">
                    <TabsTrigger value="media" className="data-[state=active]:bg-white/10 text-white">
                      Media Items
                    </TabsTrigger>
                    <TabsTrigger value="share" className="data-[state=active]:bg-white/10 text-white">
                      Share Links
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="media">
                    <div className="glass-card rounded-xl p-6">
                      <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-white">Media Items</h2>
                        <div className="text-sm text-gray-400">{lightbox.mediaItems?.length ?? 0} total items</div>
                      </div>

                      <div className="flex flex-col md:flex-row gap-2 mb-6">
                        <div className="flex-grow flex gap-2">
                          <Input
                            placeholder="Paste S3 URI (e.g., s3://bucket/path/to/file.jpg)"
                            value={newMediaUrl}
                            onChange={(e) => setNewMediaUrl(e.target.value)}
                            className="bg-[#1a1a1c] border-white/10 text-white"
                          />
                          <Button
                            onClick={handleAddMedia}
                            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white whitespace-nowrap"
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Add Media
                          </Button>
                        </div>
                        <Button
                          onClick={() => setIsImportModalOpen(true)}
                          className="bg-white/10 hover:bg-white/20 text-white whitespace-nowrap"
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          Import from CSV
                        </Button>
                      </div>

                      <DragDropContext onDragEnd={handleDragEnd}>
                        <Droppable droppableId="media-items">
                          {(provided) => (
                            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                              {displayedMediaItems.length === 0 ? (
                                <div className="text-center py-12 border border-dashed border-white/20 rounded-xl">
                                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                                    <ImageIcon className="h-8 w-8 text-gray-400" />
                                  </div>
                                  <p className="text-white mb-2">No media items added yet</p>
                                  <p className="text-sm text-gray-400">Add your first item using the form above</p>
                                </div>
                              ) : (
                                displayedMediaItems.map((item: any, index: number) => (
                                  <Draggable key={item.id} draggableId={item.id} index={index}>
                                    {(provided) => (
                                      <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                        className="glass-card rounded-xl flex relative overflow-hidden"
                                      >
                                        {/* Glassmorphism overlay */}
                                        <div
                                          style={{
                                            position: "absolute",
                                            inset: 0,
                                            zIndex: 0,
                                            pointerEvents: "none",
                                            backdropFilter: "blur(12px)",
                                            WebkitBackdropFilter: "blur(12px)",
                                          }}
                                        />
                                        <div className="p-4 flex items-center gap-4 w-full relative z-10">
                                          <div className="w-16 h-16 bg-black rounded-lg overflow-hidden flex-shrink-0">
                                            <img
                                              src={item.signedUrl || item.thumbnailUrl || "/placeholder.svg"}
                                              alt={item.title}
                                              className="w-full h-full object-cover"
                                            />
                                            {item.type === "video" && (
                                              <div className="relative w-8 h-8 bg-black/50 rounded-full flex items-center justify-center -mt-12 mx-auto">
                                                <div className="w-0 h-0 border-t-4 border-t-transparent border-l-8 border-l-white border-b-4 border-b-transparent ml-1"></div>
                                              </div>
                                            )}
                                          </div>
                                          <div className="flex-grow min-w-0">
                                            <p className="font-medium truncate text-white">{item.title}</p>
                                            <p className="text-sm text-gray-400 truncate">{item.url}</p>
                                            <Badge
                                              variant="outline"
                                              className="mt-1 border-white/20 flex items-center gap-1 w-fit text-white"
                                            >
                                              {item.type === "image" ? (
                                                <ImageIcon className="h-3 w-3" />
                                              ) : (
                                                <Video className="h-3 w-3" />
                                              )}
                                              {item.type}
                                            </Badge>
                                          </div>
                                          <div className="flex gap-1">
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              onClick={() => handleOpenPreview(index)}
                                              className="text-gray-400 hover:text-white hover:bg-white/10"
                                              title="Preview"
                                            >
                                              <Maximize className="h-4 w-4" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              onClick={() => handleMoveMedia(item.id, "up")}
                                              disabled={index === 0 || isSavingOrder}
                                              className="text-gray-400 hover:text-white hover:bg-white/10"
                                            >
                                              <MoveUp className="h-4 w-4" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              onClick={() => handleMoveMedia(item.id, "down")}
                                              disabled={index === displayedMediaItems.length - 1 && !hasMore || isSavingOrder}
                                              className="text-gray-400 hover:text-white hover:bg-white/10"
                                            >
                                              <MoveDown className="h-4 w-4" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              onClick={() => handleDeleteMedia(item.id)}
                                              className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </Button>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </Draggable>
                                ))
                              )}
                              {provided.placeholder}

                              {isLoadingMore && (
                                <div className="py-4 flex justify-center">
                                  <div className="w-8 h-8 rounded-full border-4 border-white/10 border-t-blue-500 animate-spin"></div>
                                </div>
                              )}

                              {!isLoadingMore && hasMore && displayedMediaItems.length > 0 && (
                                <div className="py-4 flex justify-center">
                                  <Button
                                    variant="outline"
                                    onClick={loadMoreItems}
                                    className="border-white/10 text-white hover:bg-white/10"
                                  >
                                    Load More
                                  </Button>
                                </div>
                              )}

                              {displayedMediaItems.length > 0 && (
                                <div ref={lastItemRef} style={{ height: 1 }} />
                              )}
                            </div>
                          )}
                        </Droppable>
                      </DragDropContext>
                    </div>
                  </TabsContent>

                  <TabsContent value="share">
                    <div className="glass-card rounded-xl p-6">
                      <h2 className="text-xl font-bold mb-4 text-white">Share Links</h2>

                      <Dialog>
                        <DialogTrigger asChild>
                          <Button className="mb-6 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white">
                            <Plus className="mr-2 h-4 w-4" />
                            Create New Share Link
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="glass-card border-white/10">
                          <DialogHeader>
                            <DialogTitle className="text-white">Create Share Link</DialogTitle>
                            <DialogDescription className="text-gray-400">
                              Create a new link to share this lightbox with others.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label htmlFor="share-name" className="text-white">
                                Link Name
                              </Label>
                              <Input
                                id="share-name"
                                value={newShareName}
                                onChange={(e) => setNewShareName(e.target.value)}
                                placeholder="e.g., Client Review"
                                className="bg-[#1a1a1c] border-white/10 text-white"
                              />
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="password-protected"
                                checked={isPasswordProtected}
                                onCheckedChange={(checked) => setIsPasswordProtected(checked === true)}
                              />
                              <Label htmlFor="password-protected" className="text-white">
                                Password protected
                              </Label>
                            </div>
                            {isPasswordProtected && (
                              <div className="space-y-2">
                                <Label htmlFor="share-password" className="text-white">
                                  Password
                                </Label>
                                <Input
                                  id="share-password"
                                  type="password"
                                  value={newSharePassword}
                                  onChange={(e) => setNewSharePassword(e.target.value)}
                                  className="bg-[#1a1a1c] border-white/10 text-white"
                                />
                              </div>
                            )}
                          </div>
                          <DialogFooter>
                            <Button
                              onClick={handleCreateShareLink}
                              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
                            >
                              Create Link
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>

                      {lightbox.shareLinks?.length === 0 ? (
                        <div className="text-center py-12 border border-dashed border-white/20 rounded-xl">
                          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                            <Share2 className="h-8 w-8 text-gray-400" />
                          </div>
                          <p className="text-white mb-2">No share links created yet</p>
                          <p className="text-sm text-gray-400">Create your first link using the button above</p>
                        </div>
                      ) : (
                        <ScrollArea className="h-[400px] pr-4">
                          <div className="space-y-4">
                            {lightbox.shareLinks?.map((link: any, idx: number) => (
                              <div key={link.id} className="glass-card rounded-xl p-4">
                                <div className="flex justify-between items-start mb-3">
                                  <div>
                                    <h3 className="font-medium text-lg text-white">{link.name}</h3>
                                    <p className="text-sm text-gray-400">
                                      Created on {new Date(link.createdAt).toLocaleDateString()}
                                    </p>
                                  </div>
                                  {link.isPasswordProtected ? (
                                    <Badge
                                      variant="outline"
                                      className="flex items-center gap-1 border-white/20 text-white"
                                    >
                                      <Lock className="h-3 w-3" />
                                      Password Protected
                                    </Badge>
                                  ) : (
                                    <Badge
                                      variant="outline"
                                      className="flex items-center gap-1 border-white/20 text-white"
                                    >
                                      <Unlock className="h-3 w-3" />
                                      Public
                                    </Badge>
                                  )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                  <div className="glass-card p-3 rounded-lg flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                                      <Eye className="h-4 w-4 text-blue-400" />
                                    </div>
                                    <div>
                                      <p className="text-sm text-gray-400">Views</p>
                                      <p className="font-medium text-white">{link.analytics.totalViews}</p>
                                    </div>
                                  </div>

                                  <div className="glass-card p-3 rounded-lg flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                                      <MousePointer className="h-4 w-4 text-purple-400" />
                                    </div>
                                    <div>
                                      <p className="text-sm text-gray-400">Interactions</p>
                                      <p className="font-medium text-white">{link.analytics.mediaInteractions}</p>
                                    </div>
                                  </div>

                                  <div className="glass-card p-3 rounded-lg flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                                      <Clock className="h-4 w-4 text-green-400" />
                                    </div>
                                    <div>
                                      <p className="text-sm text-gray-400">Avg. Time</p>
                                      <p className="font-medium text-white">
                                        {link.analytics.timeSpentPerMedia}s per item
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    className="bg-white/5 hover:bg-white/10 text-white"
                                    onClick={() => copyShareLink(link.token)}
                                  >
                                    <Copy className="mr-2 h-4 w-4" />
                                    Copy Link
                                  </Button>

                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    className="bg-white/5 hover:bg-white/10 text-white"
                                    asChild
                                  >
                                    <a href={`/share/${link.token}`} target="_blank" rel="noreferrer">
                                      <ExternalLink className="mr-2 h-4 w-4" />
                                      Open
                                    </a>
                                  </Button>

                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleRevokeShareLink(link.id)}
                                    className="ml-auto bg-red-900/30 hover:bg-red-900/50 text-white"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Revoke
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </motion.div>
            ) : null}
          </div>
        </main>
      </div>

      {/* Import Media Modal */}
      <ImportMediaModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImportMedia}
      />

      {/* Media Preview Modal */}
      {lightbox && (
        <MediaPreviewModal
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          mediaItems={displayedMediaItems}
          initialIndex={selectedMediaIndex}
          onRequestMore={async () => {
            if (hasMore && !isLoadingMore) {
              await loadMoreItems()
            }
          }}
        />
      )}
    </ProtectedRoute>
  )
}

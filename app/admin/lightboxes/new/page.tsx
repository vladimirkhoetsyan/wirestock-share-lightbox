"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import ProtectedRoute from "@/components/protected-route"
import ModernHeader from "@/components/modern-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { type MediaType, mockLightboxes } from "@/lib/mock-data"
import { useToast } from "@/hooks/use-toast"
import { Save, ArrowLeft, ImageIcon, Video } from "lucide-react"
import { motion } from "framer-motion"
import Link from "next/link"

async function createLightbox(data: any, token: string) {
  const res = await fetch("/api/lightboxes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("Failed to create lightbox")
  return res.json()
}

export default function CreateLightboxPage() {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [selectedTypes, setSelectedTypes] = useState<MediaType[]>(["image"])
  const [keywords, setKeywords] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const availableTypes: MediaType[] = ["image", "video"]

  const handleTypeToggle = (type: MediaType) => {
    const newTypes = selectedTypes.includes(type) ? selectedTypes.filter((t) => t !== type) : [...selectedTypes, type]

    // Ensure at least one type is selected
    if (newTypes.length > 0) {
      setSelectedTypes(newTypes)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      toast({
        title: "Error",
        description: "Please enter a name for the lightbox",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const token = localStorage.getItem("token")
      if (!token) throw new Error("Not authenticated")
      const keywordArray = keywords
        .split(",")
        .map((k) => k.trim())
        .filter((k) => k.length > 0)
      const newLightbox = await createLightbox({
        name,
        description,
        types: selectedTypes,
        keywords: keywordArray,
      }, token)
      toast({
        title: "Lightbox created",
        description: "Your new lightbox has been created successfully",
      })
      router.push(`/admin/lightboxes/${newLightbox.id}`)
    } catch {
      toast({ title: "Error", description: "Failed to create lightbox", variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
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
              <h1 className="text-3xl font-bold flex-grow text-white">Create New Lightbox</h1>
            </div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <form onSubmit={handleSubmit}>
                <div className="glass-card rounded-xl p-6 mb-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-sm font-medium text-white">
                          Name <span className="text-red-400">*</span>
                        </Label>
                        <Input
                          id="name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Enter lightbox name"
                          required
                          className="flex h-10 w-full rounded-md border px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 bg-[#1a1a1c] border-white/10 text-white"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="description" className="text-sm font-medium text-white">
                          Description
                        </Label>
                        <Textarea
                          id="description"
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="Enter a description for this lightbox"
                          rows={3}
                          className="bg-[#1a1a1c] border-white/10 text-white"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-white">
                          Media Types <span className="text-red-400">*</span>
                        </Label>
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
                          onChange={(e) => setKeywords(e.target.value)}
                          placeholder="nature, landscape, wildlife"
                          rows={2}
                          className="bg-[#1a1a1c] border-white/10 text-white"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 flex justify-end">
                    <Button
                      type="submit"
                      className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <svg
                            className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                          Creating...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Create Lightbox
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}

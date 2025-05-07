"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Upload, AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import type { MediaItem } from "@/lib/mock-data"

interface ImportMediaModalProps {
  isOpen: boolean
  onClose: () => void
  onImport: (mediaItems: MediaItem[]) => void
}

export default function ImportMediaModal({ isOpen, onClose, onImport }: ImportMediaModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string[][]>([])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setError(null)

      // Read the CSV file
      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const text = event.target?.result as string
          const rows = text.split("\n").map((row) => row.split(",").map((cell) => cell.trim()))

          // Show preview (first 5 rows)
          setPreview(rows.slice(0, 5))
        } catch (err) {
          setError("Failed to parse CSV file")
        }
      }
      reader.readAsText(selectedFile)
    }
  }

  const handleImport = () => {
    if (!file) {
      setError("Please select a CSV file")
      return
    }

    setIsUploading(true)
    setUploadProgress(0)

    // Simulate upload progress
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          return 100
        }
        return prev + 10
      })
    }, 200)

    // Simulate processing
    setTimeout(() => {
      clearInterval(interval)
      setUploadProgress(100)

      // Read the CSV file
      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const text = event.target?.result as string
          const rows = text.split("\n").filter((row) => row.trim() !== "")

          // Process the CSV data
          const mediaItems: MediaItem[] = rows.map((row, index) => {
            const [url, title, description, type = "image"] = row.split(",").map((cell) => cell.trim())
            const isVideo = type.toLowerCase() === "video" || url.toLowerCase().endsWith(".mp4")

            return {
              id: `imported-${Date.now()}-${index}`,
              url,
              type: isVideo ? "video" : "image",
              title: title || `New ${isVideo ? "Video" : "Image"}`,
              description: description || "",
              thumbnailUrl: `/placeholder.svg?height=200&width=300&query=${isVideo ? "video thumbnail" : "image thumbnail"}`,
            }
          })

          // Call the onImport callback with the processed data
          onImport(mediaItems)

          // Reset state
          setFile(null)
          setIsUploading(false)
          setUploadProgress(0)
          setPreview([])
          onClose()
        } catch (err) {
          setError("Failed to process CSV file")
          setIsUploading(false)
        }
      }
      reader.readAsText(file)
    }, 2000)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="glass-card border-white/10 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-white">Import Media from CSV</DialogTitle>
          <DialogDescription className="text-gray-400">
            Upload a CSV file with S3 URLs to import multiple media items at once.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <Alert variant="destructive" className="bg-red-900/30 border-red-900/50 text-white">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="csv-file" className="text-white">
              CSV File
            </Label>
            <Input
              id="csv-file"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="bg-[#1a1a1c] border-white/10 text-white"
              disabled={isUploading}
            />
            <p className="text-xs text-gray-400">
              Format: s3://bucket/path/to/file.jpg, Title, Description, Type (optional)
            </p>
          </div>

          {preview.length > 0 && (
            <div className="space-y-2">
              <Label className="text-white">Preview</Label>
              <div className="bg-[#1a1a1c] border border-white/10 rounded-md p-3 overflow-x-auto">
                <table className="w-full text-sm text-white">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-2 px-3">URL</th>
                      <th className="text-left py-2 px-3">Title</th>
                      <th className="text-left py-2 px-3">Description</th>
                      <th className="text-left py-2 px-3">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, index) => (
                      <tr key={index} className="border-b border-white/5">
                        <td className="py-2 px-3 text-gray-300 truncate max-w-[200px]">{row[0] || "-"}</td>
                        <td className="py-2 px-3 text-gray-300">{row[1] || "-"}</td>
                        <td className="py-2 px-3 text-gray-300">{row[2] || "-"}</td>
                        <td className="py-2 px-3 text-gray-300">{row[3] || "image"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-400">Showing first {preview.length} rows</p>
            </div>
          )}

          {isUploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-400">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            className="border-white/10 text-white hover:bg-white/10"
            disabled={isUploading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
            disabled={!file || isUploading}
          >
            {isUploading ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Processing...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Import Media
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

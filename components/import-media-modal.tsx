"use client"

import type React from "react"

import { useState, useRef } from "react"
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
  lightboxId: string
}

const EXPECTED_FIELDS = [
  { key: "url", label: "URL", aliases: ["url", "s3_url", "link", "media_url"] },
  { key: "title", label: "Title", aliases: ["title", "name", "caption"] },
  { key: "description", label: "Description", aliases: ["description", "desc", "details"] },
  { key: "type", label: "Type", aliases: ["type", "media_type", "format"] },
]

export default function ImportMediaModal({ isOpen, onClose, onImport, lightboxId }: ImportMediaModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string[][]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [columnMapping, setColumnMapping] = useState<{ [key: string]: string }>({})
  const [processingProgress, setProcessingProgress] = useState<{ total: number; processed: number; errors: number } | null>(null)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)

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
          // Detect headers
          let detectedHeaders: string[] = []
          let dataRows = rows
          if (rows.length > 0 && rows[0].some(cell => cell && isNaN(Number(cell)))) {
            detectedHeaders = rows[0] as string[]
            dataRows = rows.slice(1)
          }
          setHeaders(detectedHeaders)
          setPreview(dataRows.slice(0, 5))
          // Auto-map columns
          const mapping: { [key: string]: string } = {}
          EXPECTED_FIELDS.forEach(field => {
            const match = detectedHeaders.find(h => field.aliases.includes(h.toLowerCase()))
            if (match) mapping[field.key] = match
          })
          setColumnMapping(mapping)
        } catch (err) {
          setError("Failed to parse CSV file")
        }
      }
      reader.readAsText(selectedFile)
    }
  }

  const handleMappingChange = (field: string, value: string) => {
    setColumnMapping(prev => ({ ...prev, [field]: value }))
  }

  const handleImport = async () => {
    if (!file) {
      setError("Please select a CSV file")
      return
    }
    setIsUploading(true)
    setUploadProgress(0)
    setError(null)
    setProcessingProgress(null)
    const progressId = crypto.randomUUID()
    try {
      const token = localStorage.getItem("token")
      const formData = new FormData()
      formData.append("file", file)
      formData.append("mapping", JSON.stringify(columnMapping))
      formData.append("progressId", progressId)

      // Start polling for progress
      pollingRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/lightboxes/${lightboxId}/import-csv?progressId=${progressId}`)
          if (res.ok) {
            const prog = await res.json()
            setProcessingProgress(prog)
            if (prog.total > 0 && prog.processed >= prog.total) {
              clearInterval(pollingRef.current!)
              pollingRef.current = null
            }
          }
        } catch {}
      }, 1000)

      const res = await fetch(`/api/lightboxes/${lightboxId}/import-csv`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      })
      if (!res.ok) throw new Error("Failed to import media from CSV")
      const data = await res.json()
      onImport(data)
      setFile(null)
      setIsUploading(false)
      setUploadProgress(0)
      setPreview([])
      setHeaders([])
      setColumnMapping({})
      setProcessingProgress(null)
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
      onClose()
    } catch (err: any) {
      setError(err.message || "Failed to import media from CSV")
      setIsUploading(false)
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-[#18181b] border border-[#232329] rounded-2xl shadow-xl max-w-2xl">
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
              className="flex h-10 w-full rounded-md border px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 bg-[#1a1a1c] border-white/10 text-white"
              disabled={isUploading}
            />
            <p className="text-xs text-gray-400">
              Format: s3://bucket/path/to/file.jpg, Title, Description, Type (optional)
            </p>
          </div>

          {headers.length > 0 && (
            <div className="space-y-2">
              <Label className="text-white">Map CSV Columns</Label>
              {EXPECTED_FIELDS.map(field => (
                <div key={field.key} className="flex items-center gap-2">
                  <span className="w-24 text-gray-300">{field.label}</span>
                  <select
                    className="bg-[#1a1a1c] border border-white/10 rounded px-2 py-1 text-white max-w-xs"
                    value={columnMapping[field.key] || ""}
                    onChange={e => handleMappingChange(field.key, e.target.value)}
                  >
                    <option value="">-- Not Mapped --</option>
                    {headers.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}

          {preview.length > 0 && (
            <div className="space-y-2">
              <Label className="text-white">Preview</Label>
              <div className="bg-[#1a1a1c] border border-white/10 rounded-md p-3 overflow-x-auto">
                <table className="w-full text-sm text-white">
                  <thead>
                    <tr className="border-b border-white/10">
                      {EXPECTED_FIELDS.map(field => (
                        <th key={field.key} className="text-left py-2 px-3">{field.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, index) => (
                      <tr key={index} className="border-b border-white/5">
                        {EXPECTED_FIELDS.map(field => {
                          const colIdx = headers.indexOf(columnMapping[field.key])
                          return <td key={field.key} className="py-2 px-3 text-gray-300 truncate max-w-[200px]">{colIdx >= 0 ? row[colIdx] : "-"}</td>
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-400">Showing first {preview.length} rows</p>
            </div>
          )}

          {isUploading && (
            <div className="flex flex-col items-center gap-2 text-blue-400 py-2 w-full">
              <svg className="animate-spin h-5 w-5 mb-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {processingProgress && processingProgress.total > 0 ? (
                <>
                  <Progress value={Math.round((processingProgress.processed / processingProgress.total) * 100)} className="w-full max-w-xs" />
                  <span className="text-xs mt-1">Processing {processingProgress.processed} of {processingProgress.total} rows{processingProgress.errors > 0 ? `, ${processingProgress.errors} errors` : ''}...</span>
                </>
              ) : (
                <span>Uploading and processing CSV...</span>
              )}
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

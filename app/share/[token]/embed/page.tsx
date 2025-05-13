"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { recordAnalyticsEvent } from '@/lib/analytics';
import MediaPreviewModal from "@/components/media-preview-modal";

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

export default function ShareEmbedPage() {
  const params = useParams();
  const [lightbox, setLightbox] = useState<any>(null);
  const [shareLink, setShareLink] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  const handleMediaClick = (index: number) => {
    setSelectedMediaIndex(index);
    setIsPreviewOpen(true);
  };
  const handleClosePreview = () => setIsPreviewOpen(false);

  useEffect(() => {
    const fetchShareData = async () => {
      setIsLoading(true);
      try {
        const token = params.token as string;
        // Fetch share link details
        const linkRes = await fetch(`/api/share-links/by-token/${encodeURIComponent(token)}`);
        if (!linkRes.ok) throw new Error("Share link not found");
        const link = await linkRes.json();
        setShareLink(link);
        setTheme(link.theme || 'dark');
        // Only fetch lightbox if not protected (for embed, we don't support password-protected)
        if (!link.isPasswordProtected) {
          const lbRes = await fetch(`/api/public/lightboxes/${link.lightbox_id}?shareToken=${encodeURIComponent(link.token)}`);
          if (!lbRes.ok) throw new Error("Lightbox not found");
          const lb = await lbRes.json();
          setLightbox(lb);
          // Trigger analytics event for lightbox open
          recordAnalyticsEvent({
            event: 'lightbox_open',
            share_link_id: link.id,
            password_correct: true,
          });
        } else {
          setLightbox(null);
        }
      } catch (err) {
        setShareLink(null);
        setLightbox(null);
      } finally {
        setIsLoading(false);
      }
    };
    fetchShareData();
  }, [params.token]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.classList.remove('dark', 'light');
      document.documentElement.classList.add(theme);
    }
  }, [theme]);

  // Load iframe-resizer contentWindow script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/iframe-resizer/js/iframeResizer.contentWindow.min.js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 rounded-full border-4 border-white/10 border-t-blue-500 animate-spin"></div>
      </div>
    );
  }

  if (!shareLink || !lightbox) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-foreground text-center">This lightbox is not available for embedding.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <h2 className="text-2xl font-bold text-foreground mb-6 text-center">{lightbox.name}</h2>
      <div className="media-grid">
        {lightbox.mediaItems && lightbox.mediaItems.length > 0 ? (
          lightbox.mediaItems.map((item: any, index: number) => {
            const mediaType = getMediaTypeFromUrl(item.previewUrl || item.originalUrl || item.thumbnailUrl);
            return (
              <div
                key={item.id}
                className="media-item"
                onClick={() => handleMediaClick(index)}
                style={{ cursor: 'pointer', position: 'relative' }}
              >
                <img src={item.thumbnailUrl || '/placeholder.svg'} alt={item.title} />
                {mediaType === "video" && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-12 h-12 bg-black/50 rounded-full flex items-center justify-center">
                      <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-foreground"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                    </div>
                  </div>
                )}
                <div className="media-item-overlay">
                  {item.title && !/^s3:\/\//.test(item.title) && !/^https?:\/\//.test(item.title) && (
                    <h3 className="font-medium text-foreground">{item.title}</h3>
                  )}
                  {item.description && <p className="text-sm text-gray-300">{item.description}</p>}
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-gray-400 col-span-full text-center">No media items in this lightbox.</div>
        )}
      </div>
      <MediaPreviewModal
        isOpen={isPreviewOpen}
        onClose={handleClosePreview}
        mediaItems={lightbox.mediaItems}
        initialIndex={selectedMediaIndex}
        shareLinkId={shareLink.id}
      />
    </div>
  );
} 
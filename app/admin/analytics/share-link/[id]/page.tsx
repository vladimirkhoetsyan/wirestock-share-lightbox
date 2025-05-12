"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, BarChart2, ImageIcon, Video } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import MediaPreviewModal from "@/components/media-preview-modal";
import countryCentroids from "@/lib/country-centroids.json";
import { MapContainer, TileLayer, CircleMarker, Tooltip as LeafletTooltip } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import "leaflet/dist/leaflet.css";
import ModernHeader from "@/components/modern-header";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import dynamic from "next/dynamic";

// Helper: format seconds as human readable
function formatDuration(seconds: number): string {
  if (!seconds || seconds < 1) return '0s';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [
    h ? `${h}h` : '',
    m ? `${m}m` : '',
    s ? `${s}s` : ''
  ].filter(Boolean).join(' ');
}

const ActivityMap = dynamic(() => import("./ActivityMap"), { ssr: false });

export default function ShareLinkAnalyticsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const shareLinkId = typeof params.id === "string" ? params.id : Array.isArray(params.id) ? params.id[0] : undefined;
  const fromLightbox = searchParams.get("from") === "lightbox";
  const lightboxId = searchParams.get("lightboxId");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);

  useEffect(() => {
    if (!shareLinkId) return;
    setLoading(true);
    fetch(`/api/admin/analytics/share-link/${shareLinkId}`)
      .then((res) => res.json())
      .then(setAnalytics)
      .finally(() => setLoading(false));
  }, [shareLinkId]);

  // Prepare time series data for chart
  const chartData = analytics && analytics.engagementByHour
    ? Object.entries(analytics.engagementByHour).map(([hour, count]) => ({ hour, count }))
    : [];

  return (
    <div className="min-h-screen bg-[#0a0a0c]">
      <ModernHeader />
      <main className="pt-20 pb-16 min-h-screen">
        <div className="container mx-auto px-4">
          <div className="flex items-center mb-8">
            <Button variant="ghost" size="sm" asChild className="mr-4 text-white hover:bg-white/10">
              <Link href={fromLightbox && lightboxId ? `/admin/lightboxes/${lightboxId}` : "/admin/dashboard"}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Link>
            </Button>
            <h1 className="text-3xl font-bold flex-grow text-white">
              Share Link Analytics
              {analytics?.shareLinkName && (
                <span className="ml-3 text-blue-300 font-normal text-2xl">{analytics.shareLinkName}</span>
              )}
            </h1>
            <Button
              onClick={() => {
                if (!shareLinkId) return;
                window.open(`/api/admin/analytics/share-link/${shareLinkId}/export`, "_blank");
              }}
              className="ml-auto bg-gradient-to-r from-blue-500 to-purple-600 text-white flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download CSV
            </Button>
          </div>

          {loading ? (
            <div className="glass-card rounded-xl p-8 text-center text-white">Loading analytics...</div>
          ) : analytics ? (
            <>
              {/* Summary Tiles */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
                <Card className="glass-card p-6 flex flex-col items-center">
                  <span className="text-2xl font-bold text-blue-400">{analytics.totalViews}</span>
                  <span className="text-gray-300 mt-2">Total Views</span>
                </Card>
                <Card className="glass-card p-6 flex flex-col items-center">
                  <span className="text-2xl font-bold text-purple-400">{analytics.totalSessions}</span>
                  <span className="text-gray-300 mt-2">Unique Sessions</span>
                </Card>
                <Card className="glass-card p-6 flex flex-col items-center">
                  <span className="text-2xl font-bold text-green-400">{analytics.uniqueDevices}</span>
                  <span className="text-gray-300 mt-2">Unique Devices</span>
                </Card>
                <Card className="glass-card p-6 flex flex-col items-center">
                  <span className="text-2xl font-bold text-yellow-400">{formatDuration(analytics.avgSessionDuration)}</span>
                  <span className="text-gray-300 mt-2">Avg. Session Duration</span>
                </Card>
              </div>

              {/* Time Series Chart */}
              <div className="glass-card rounded-xl p-6 mb-10">
                <h2 className="text-xl font-bold text-white mb-4">Engagement by Hour</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData} margin={{ left: 10, right: 10, top: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                    <XAxis dataKey="hour" stroke="#aaa" />
                    <YAxis stroke="#aaa" allowDecimals={false} />
                    <RechartsTooltip contentStyle={{ background: '#18181B', border: 'none', color: '#fff' }} />
                    <Line type="monotone" dataKey="count" stroke="#6366F1" strokeWidth={3} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Most Interacted Items */}
              <div className="glass-card rounded-xl p-6 mb-10">
                <h2 className="text-xl font-bold text-white mb-4">Top Interacted Media Items</h2>
                <ul className="text-white space-y-2">
                  {analytics.mostInteractedItems && analytics.mostInteractedItems.length > 0 ? (
                    analytics.mostInteractedItems.map((item: any, idx: number) => {
                      const type = item.media_type || item.type;
                      const isImage = type === "image";
                      const isVideo = type === "video";
                      return (
                        <li key={item.id} className="flex items-center gap-3">
                          <span className="font-bold text-lg text-blue-400">#{idx + 1}</span>
                          {(isImage || isVideo) ? (
                            <img
                              src={item.thumbnailUrl || "/placeholder.svg"}
                              alt={item.title}
                              className="w-16 h-16 object-cover rounded cursor-pointer hover:opacity-80 transition"
                              onClick={() => {
                                setPreviewIndex(idx);
                                setPreviewOpen(true);
                              }}
                            />
                          ) : (
                            <div
                              className="w-16 h-16 bg-gray-800 flex items-center justify-center rounded cursor-pointer hover:opacity-80 transition"
                              onClick={() => {
                                setPreviewIndex(idx);
                                setPreviewOpen(true);
                              }}
                            >
                              <ImageIcon className="h-8 w-8 text-white opacity-60" />
                            </div>
                          )}
                          <span className="text-white truncate max-w-xs">{item.title}</span>
                          <span className="ml-2 text-xs text-gray-400">[{type}]</span>
                          <span className="ml-auto text-gray-400">{item.count} interactions</span>
                        </li>
                      );
                    })
                  ) : (
                    <li className="text-gray-400">No interactions yet.</li>
                  )}
                </ul>
              </div>

              {/* Geolocation Map Widget */}
              <div className="glass-card rounded-xl p-6 mt-10">
                <h2 className="text-xl font-bold text-white mb-4">Activity Map</h2>
                <ActivityMap activityLocations={analytics.activityLocations} countryCentroids={countryCentroids} />
              </div>

              {/* Media Preview Modal */}
              {analytics && (
                <MediaPreviewModal
                  isOpen={previewOpen}
                  onClose={() => setPreviewOpen(false)}
                  mediaItems={analytics.mostInteractedItems || []}
                  initialIndex={previewIndex}
                  shareLinkId={shareLinkId || ""}
                />
              )}
            </>
          ) : (
            <div className="glass-card rounded-xl p-8 text-center text-white">No analytics data found.</div>
          )}
        </div>
      </main>
    </div>
  );
} 
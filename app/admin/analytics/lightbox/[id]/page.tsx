"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, BarChart2, ImageIcon, Video } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import MediaPreviewModal from "@/components/media-preview-modal";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, CircleMarker, Tooltip as LeafletTooltip } from "react-leaflet";
import countryCentroids from "@/lib/country-centroids.json";
import MarkerClusterGroup from "react-leaflet-cluster";
import ModernHeader from "@/components/modern-header";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function LightboxAnalyticsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const lightboxId = typeof params.id === "string" ? params.id : Array.isArray(params.id) ? params.id[0] : undefined;
  const fromLightbox = searchParams.get("from") === "lightbox";
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);

  useEffect(() => {
    if (!lightboxId) return;
    setLoading(true);
    fetch(`/api/admin/analytics/lightbox/${lightboxId}`)
      .then((res) => res.json())
      .then(setAnalytics)
      .finally(() => setLoading(false));
  }, [lightboxId]);

  const handleExportCSV = () => {
    window.open(`/api/admin/analytics/lightbox/${lightboxId}/export`, "_blank");
  };

  // Prepare time series data for chart (grouped by share link)
  let chartData: any[] = [];
  let shareLinkIds: string[] = [];
  if (analytics && analytics.engagementByHour && analytics.shareLinkIdToName) {
    // Get all share link ids present in the data
    const allIds = new Set<string>();
    Object.values(analytics.engagementByHour).forEach((byLink: any) => {
      Object.keys(byLink).forEach((id) => allIds.add(id));
    });
    shareLinkIds = Array.from(allIds);
    chartData = Object.entries(analytics.engagementByHour).map(([hour, byLink]) => {
      const row: any = { hour };
      shareLinkIds.forEach((id) => {
        row[id] = byLink[id] || 0;
      });
      return row;
    });
  }

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
              Lightbox Analytics
              {analytics?.lightboxName && (
                <span className="ml-3 text-blue-300 font-normal text-2xl">{analytics.lightboxName}</span>
              )}
            </h1>
            <Button onClick={handleExportCSV} className="ml-auto bg-gradient-to-r from-blue-500 to-purple-600 text-white flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export CSV
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
                  <span className="text-2xl font-bold text-yellow-400">{analytics.avgSessionDuration}s</span>
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
                    <RechartsTooltip
                      contentStyle={{ background: '#18181B', border: 'none', color: '#fff' }}
                      content={({ active, payload, label }) => {
                        if (!active || !payload || !payload.length) return null;
                        const shareLinkIdToName = analytics.shareLinkIdToName || {};
                        return (
                          <div className="p-2 bg-[#18181B] rounded shadow text-white">
                            <div className="font-bold mb-1">Hour: {label}</div>
                            {shareLinkIds.map((id) => (
                              <div key={id}>
                                <span className="font-semibold">{shareLinkIdToName[id] || id}:</span> {payload[0].payload[id] || 0}
                              </div>
                            ))}
                          </div>
                        );
                      }}
                    />
                    {shareLinkIds.map((id, idx) => (
                      <Line
                        key={id}
                        type="monotone"
                        dataKey={id}
                        stroke={['#6366F1', '#22d3ee', '#f59e42', '#a78bfa', '#f472b6', '#facc15'][idx % 6]}
                        strokeWidth={3}
                        dot={{ r: 4 }}
                        name={analytics.shareLinkIdToName[id] || id}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Most Interacted Items */}
              <div className="glass-card rounded-xl p-6 mb-10">
                <h2 className="text-xl font-bold text-white mb-4">Top Interacted Media Items</h2>
                <ul className="text-white space-y-2">
                  {analytics.mostInteractedItems && analytics.mostInteractedItems.length > 0 ? (
                    analytics.mostInteractedItems.map((item: any, idx: number) => (
                      <li key={item.id} className="flex items-center gap-3">
                        <span className="font-bold text-lg text-blue-400">#{idx + 1}</span>
                        {item.media_type === "image" && item.signedUrl ? (
                          <img
                            src={item.signedUrl}
                            alt={item.title}
                            className="w-16 h-16 object-cover rounded cursor-pointer hover:opacity-80 transition"
                            onClick={() => {
                              setPreviewIndex(idx);
                              setPreviewOpen(true);
                            }}
                          />
                        ) : item.media_type === "video" ? (
                          <div
                            className="w-16 h-16 bg-black flex items-center justify-center rounded cursor-pointer hover:opacity-80 transition"
                            onClick={() => {
                              setPreviewIndex(idx);
                              setPreviewOpen(true);
                            }}
                          >
                            <Video className="h-8 w-8 text-white opacity-60" />
                          </div>
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
                        <span className="ml-2 text-xs text-gray-400">[{item.media_type}]</span>
                        <span className="ml-auto text-gray-400">{item.count} interactions</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-gray-400">No interactions yet.</li>
                  )}
                </ul>
              </div>

              {/* Placeholder for future advanced analytics */}
              <div className="glass-card rounded-xl p-6 text-center text-gray-400">
                <span>More advanced analytics coming soon...</span>
              </div>

              {/* Geolocation Map Widget */}
              <div className="glass-card rounded-xl p-6 mt-10">
                <h2 className="text-xl font-bold text-white mb-4">Activity Map</h2>
                <div style={{ height: 400, width: "100%" }} className="relative z-10">
                  {analytics.activityLocations && analytics.activityLocations.length > 0 ? (
                    <MapContainer center={[20, 0]} zoom={2} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      <MarkerClusterGroup>
                        {/* Aggregate unknown countries */}
                        {(() => {
                          let unknownCount = 0;
                          let unknownRegions: string[] = [];
                          analytics.activityLocations.forEach((loc: any) => {
                            const code = (loc.country || '').toUpperCase().trim();
                            const centroid = (countryCentroids as Record<string, { lat: number; lng: number }>)[code];
                            if (!loc.country || !centroid) {
                              unknownCount += loc.count;
                              if (loc.region) unknownRegions.push(loc.region);
                            }
                          });
                          if (unknownCount > 0) {
                            return (
                              <CircleMarker
                                key="unknown"
                                center={[0, -160]} // Pacific Ocean fallback location
                                radius={8 + Math.log2(unknownCount) * 4}
                                pathOptions={{ color: "#f59e42", fillColor: "#f59e42", fillOpacity: 0.6 }}
                              >
                                <LeafletTooltip>
                                  <span className="text-xs">
                                    <b>Unknown or Unmapped</b><br />
                                    {unknownCount} activities<br />
                                    {unknownRegions.length > 0 && (
                                      <span>Regions: {unknownRegions.join(", ")}</span>
                                    )}
                                  </span>
                                </LeafletTooltip>
                              </CircleMarker>
                            );
                          }
                          return null;
                        })()}
                        {/* Known countries */}
                        {analytics.activityLocations.map((loc: any, idx: number) => {
                          const code = (loc.country || '').toUpperCase().trim();
                          const centroid = (countryCentroids as Record<string, { lat: number; lng: number }>)[code];
                          if (!loc.country || !centroid) return null;
                          const { lat, lng } = centroid;
                          // @ts-ignore
                          return (
                            <CircleMarker
                              key={idx}
                              center={[lat, lng]}
                              radius={6 + Math.log2(loc.count) * 4}
                              pathOptions={{ color: "#6366F1", fillColor: "#6366F1", fillOpacity: 0.5 }}
                            >
                              <LeafletTooltip>
                                <span className="text-xs">
                                  <b>{loc.country}</b>{loc.region ? `, ${loc.region}` : ""}<br />
                                  {loc.count} activities
                                </span>
                              </LeafletTooltip>
                            </CircleMarker>
                          );
                        })}
                      </MarkerClusterGroup>
                    </MapContainer>
                  ) : (
                    <div className="text-gray-400">No geolocation data available.</div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="glass-card rounded-xl p-8 text-center text-white">No analytics data found.</div>
          )}
        </div>
      </main>
      {analytics && (
        <MediaPreviewModal
          isOpen={previewOpen}
          onClose={() => setPreviewOpen(false)}
          mediaItems={analytics.mostInteractedItems || []}
          initialIndex={previewIndex}
        />
      )}
    </div>
  );
} 
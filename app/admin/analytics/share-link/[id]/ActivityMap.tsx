"use client";

import { MapContainer, TileLayer, CircleMarker, Tooltip as LeafletTooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type React from "react";

interface ActivityMapProps {
  activityLocations: any[];
  countryCentroids: Record<string, { lat: number; lng: number }>;
}

export default function ActivityMap({ activityLocations, countryCentroids }: ActivityMapProps) {
  return (
    <div style={{ height: 400, width: "100%" }} className="relative z-10">
      {activityLocations && activityLocations.length > 0 ? (
        <MapContainer center={[20, 0]} zoom={2} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {/* Aggregate unknown countries */}
          {(() => {
            let unknownCount = 0;
            let unknownRegions: string[] = [];
            activityLocations.forEach((loc: any) => {
              const code = (loc.country || '').toUpperCase().trim();
              const centroid = countryCentroids[code];
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
          {activityLocations.map((loc: any, idx: number) => {
            const code = (loc.country || '').toUpperCase().trim();
            const centroid = countryCentroids[code];
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
        </MapContainer>
      ) : (
        <div className="text-gray-400 text-center py-20">No activity location data available.</div>
      )}
    </div>
  );
} 
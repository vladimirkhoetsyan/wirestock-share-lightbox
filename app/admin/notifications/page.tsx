"use client";
import ModernHeader from "@/components/modern-header";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { ExternalLink, Info } from "lucide-react";
import React from "react";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const PAGE_SIZE = 10;

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [seenFilter, setSeenFilter] = useState<"all" | "seen" | "unseen">("all");
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });
  const [lightboxes, setLightboxes] = useState<{ id: string; name: string }[]>([]);
  const [lightboxId, setLightboxId] = useState<string | undefined | 'all'>('all');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsNotification, setDetailsNotification] = useState<any | null>(null);

  const lastSelectedIndex = React.useRef<number | null>(null);

  // Fetch lightboxes for filter
  useEffect(() => {
    async function fetchLightboxes() {
      const token = localStorage.getItem("token");
      if (!token) return;
      const res = await fetch("/api/lightboxes", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return;
      const data = await res.json();
      setLightboxes(data);
    }
    fetchLightboxes();
  }, []);

  useEffect(() => {
    fetchNotifications();
    // eslint-disable-next-line
  }, [page, search, seenFilter, dateRange, lightboxId]);

  async function fetchNotifications() {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No token");
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        page: String(page),
      });
      if (search) params.append("q", search);
      if (seenFilter === "seen") params.append("seen", "true");
      if (seenFilter === "unseen") params.append("seen", "false");
      if (dateRange.from) params.append("dateFrom", dateRange.from.toISOString().slice(0, 10));
      if (dateRange.to) params.append("dateTo", dateRange.to.toISOString().slice(0, 10));
      if (lightboxId && lightboxId !== 'all') params.append("lightboxId", lightboxId);
      const res = await fetch(`/api/admin/notifications?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch notifications");
      const data = await res.json();
      setNotifications(data.notifications || []);
      setTotal(data.total || 0);
    } catch (e: any) {
      setError(e.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  // Handle select all
  function handleSelectAll(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.checked) {
      setSelected(notifications.map(n => n.id));
    } else {
      setSelected([]);
    }
  }

  // Handle select one (with shift-click support)
  function handleSelectOne(id: string, checked: boolean, e?: React.MouseEvent<HTMLInputElement>) {
    const idx = notifications.findIndex(n => n.id === id);
    if (e && e.shiftKey && lastSelectedIndex.current !== null) {
      const start = Math.min(lastSelectedIndex.current, idx);
      const end = Math.max(lastSelectedIndex.current, idx);
      const idsInRange = notifications.slice(start, end + 1).map(n => n.id);
      setSelected(prev => {
        const set = new Set(prev);
        idsInRange.forEach(i => set.add(i));
        return Array.from(set);
      });
    } else {
      setSelected(prev => checked ? [...prev, id] : prev.filter(x => x !== id));
      if (checked) lastSelectedIndex.current = idx;
    }
  }

  // Bulk mark as seen
  async function bulkMarkAsSeen() {
    if (selected.length === 0) return;
    // Optimistically mark as seen in UI
    const prevNotifications = notifications;
    setNotifications(notifications => notifications.map(n => selected.includes(n.id) ? { ...n, seen: true } : n));
    setBulkLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No token");
      const res = await fetch(`/api/admin/notifications`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selected }),
      });
      if (!res.ok) throw new Error("Failed to mark as seen");
      setSelected([]);
    } catch (e: any) {
      // Revert to previous state if failed
      setNotifications(prevNotifications);
      setError(e.message || "Unknown error");
    } finally {
      setBulkLoading(false);
    }
  }

  // Bulk mark as unseen
  async function bulkMarkAsUnseen() {
    if (selected.length === 0) return;
    // Optimistically mark as unseen in UI
    const prevNotifications = notifications;
    setNotifications(notifications => notifications.map(n => selected.includes(n.id) ? { ...n, seen: false } : n));
    setBulkLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No token");
      const res = await fetch(`/api/admin/notifications/unseen`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selected }),
      });
      if (!res.ok) throw new Error("Failed to mark as unseen");
      setSelected([]);
    } catch (e: any) {
      // Revert to previous state if failed
      setNotifications(prevNotifications);
      setError(e.message || "Unknown error");
    } finally {
      setBulkLoading(false);
    }
  }

  // Helper: check if any selected notification is seen
  const anySelectedSeen = selected.some(id => notifications.find(n => n.id === id)?.seen);

  // Mark a single notification as seen
  async function markNotificationAsSeen(id: string) {
    const prevNotifications = notifications;
    setNotifications(notifications => notifications.map(n => n.id === id ? { ...n, seen: true } : n));
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No token");
      const res = await fetch(`/api/admin/notifications/${id}`, {
        method: "PATCH",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ seen: true }),
      });
      if (!res.ok) throw new Error("Failed to mark as seen");
    } catch (e) {
      setNotifications(prevNotifications);
      setError("Failed to mark as seen");
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0c]">
      <ModernHeader />
      <main className="pt-20 pb-16 min-h-screen">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold text-white mb-6">All Notifications</h1>
          <div className="mb-4 flex gap-2 items-center justify-between">
            <div className="flex gap-2 items-center">
              {/* Seen/unseen filter */}
              <Select value={seenFilter} onValueChange={v => { setPage(1); setSeenFilter(v as any); }}>
                <SelectTrigger className="w-28">
                  <SelectValue>{seenFilter === "all" ? "All" : seenFilter === "seen" ? "Seen" : "Unseen"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="unseen">Unseen</SelectItem>
                  <SelectItem value="seen">Seen</SelectItem>
                </SelectContent>
              </Select>
              {/* Date range picker */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="w-40 justify-start text-left">
                    {dateRange.from && dateRange.to
                      ? `${format(dateRange.from, "yyyy-MM-dd")} - ${format(dateRange.to, "yyyy-MM-dd")}`
                      : dateRange.from
                      ? format(dateRange.from, "yyyy-MM-dd")
                      : "Date range"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto p-0">
                  <Calendar
                    mode="range"
                    selected={dateRange}
                    onSelect={range => { setPage(1); setDateRange(range as any); }}
                    numberOfMonths={2}
                  />
                  <div className="flex justify-end p-2">
                    <Button size="sm" variant="ghost" onClick={() => setDateRange({ from: undefined, to: undefined })}>Clear</Button>
                  </div>
                </PopoverContent>
              </Popover>
              {/* Lightbox filter */}
              <Select value={lightboxId ?? 'all'} onValueChange={v => { setPage(1); setLightboxId(v as any); }}>
                <SelectTrigger className="w-40">
                  <SelectValue>{lightboxId && lightboxId !== 'all' ? (lightboxes.find(lb => lb.id === lightboxId)?.name || "Lightbox") : "All Lightboxes"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Lightboxes</SelectItem>
                  {lightboxes.map(lb => (
                    <SelectItem key={lb.id} value={lb.id}>{lb.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* Search input (already present) */}
              <input
                className="px-3 py-2 rounded bg-white/10 text-white placeholder:text-gray-400 focus:outline-none"
                placeholder="Search notifications..."
                value={search}
                onChange={e => { setPage(1); setSearch(e.target.value); }}
                style={{ minWidth: 220 }}
              />
              <Button variant="outline" size="sm" onClick={fetchNotifications} disabled={loading}>
                Refresh
              </Button>
            </div>
            {selected.length > 0 && (
              <div className="flex items-center gap-2 bg-blue-900/80 border border-blue-400 rounded-lg px-3 py-2 h-[40px]">
                <span className="text-white text-sm">{selected.length} selected</span>
                {anySelectedSeen ? (
                  <Button size="sm" onClick={bulkMarkAsUnseen} disabled={bulkLoading}>Mark as Unseen</Button>
                ) : (
                  <Button size="sm" onClick={bulkMarkAsSeen} disabled={bulkLoading}>Mark as seen</Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => setSelected([])} disabled={bulkLoading}>Clear</Button>
              </div>
            )}
          </div>
          {loading ? (
            <div className="glass-card rounded-xl p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lightbox</TableHead>
                    <TableHead>Share Link</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Password</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>Country</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...Array(PAGE_SIZE)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : error ? (
            <div className="glass-card rounded-xl p-8 text-center text-red-400">
              Error: {error} <Button variant="outline" size="sm" onClick={fetchNotifications}>Retry</Button>
            </div>
          ) : notifications.length === 0 ? (
            <div className="glass-card rounded-xl p-8 text-center text-white">No notifications found.</div>
          ) : (
            <>
            <div className="glass-card rounded-xl p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <input
                        type="checkbox"
                        checked={selected.length === notifications.length && notifications.length > 0}
                        onChange={handleSelectAll}
                        aria-label="Select all"
                      />
                    </TableHead>
                    <TableHead>Lightbox</TableHead>
                    <TableHead>Share Link</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Password</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notifications.map((n) => (
                    <TableRow
                      key={n.id}
                      className={
                        selected.includes(n.id)
                          ? "bg-yellow-900/40"
                          : !n.seen
                          ? ""
                          : ""
                      }
                      onClick={e => {
                        if ((e.target as HTMLElement).closest('input[type="checkbox"]')) return;
                        if (!n.seen) markNotificationAsSeen(n.id);
                      }}
                      style={{ cursor: !n.seen ? 'pointer' : undefined }}
                    >
                      <TableCell className="w-8">
                        <div className="flex items-center gap-2">
                          <div
                            onClick={e => {
                              if ((e as React.MouseEvent<HTMLInputElement>).shiftKey) {
                                handleSelectOne(n.id, !selected.includes(n.id), e as React.MouseEvent<HTMLInputElement>);
                              }
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={selected.includes(n.id)}
                              onChange={e => handleSelectOne(n.id, e.target.checked)}
                              aria-label="Select notification"
                              disabled={bulkLoading}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {!n.seen && <span className="inline-block w-2 h-2 rounded-full bg-green-400 mr-2 align-middle" title="Unseen" />}
                        {n.lightboxName}
                      </TableCell>
                      <TableCell>{n.shareLinkName}</TableCell>
                      <TableCell>{n.enteredAtRelative}</TableCell>
                      <TableCell>{n.passwordCorrect ? <span className="text-yellow-400">Correct</span> : <span className="text-gray-400">No</span>}</TableCell>
                      <TableCell>{n.ip || <span className="text-gray-400">-</span>}</TableCell>
                      <TableCell>{n.country || <span className="text-gray-400">-</span>}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <a href={n.analyticsLink} target="_blank" rel="noopener noreferrer" title="Open analytics">
                            <ExternalLink className="text-blue-400 hover:text-blue-300" size={18} />
                          </a>
                          <button
                            className="text-gray-400 hover:text-blue-400"
                            title="Show details"
                            onClick={e => {
                              e.stopPropagation();
                              setDetailsNotification(n);
                              setDetailsOpen(true);
                            }}
                          >
                            <Info size={18} />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            </>
          )}
          {/* Pagination */}
          <div className="flex justify-between items-center mt-4">
            <span className="text-white text-sm">
              Page {page} of {Math.max(1, Math.ceil(total / PAGE_SIZE))}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Prev</Button>
              <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / PAGE_SIZE)}>Next</Button>
            </div>
          </div>
          {/* Details Modal */}
          <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Notification Details</DialogTitle>
              </DialogHeader>
              {detailsNotification && (
                <div className="space-y-2 text-sm">
                  <div><span className="font-semibold">Lightbox:</span> {detailsNotification.lightboxName}</div>
                  <div><span className="font-semibold">Share Link:</span> {detailsNotification.shareLinkName}</div>
                  <div><span className="font-semibold">Time:</span> {detailsNotification.enteredAt ? new Date(detailsNotification.enteredAt).toLocaleString() : ''}</div>
                  <div><span className="font-semibold">Seen:</span> {detailsNotification.seen ? 'Yes' : 'No'}</div>
                  <div><span className="font-semibold">Password Correct:</span> {detailsNotification.passwordCorrect ? 'Yes' : 'No'}</div>
                  <div><span className="font-semibold">IP:</span> {detailsNotification.ip || '-'}</div>
                  <div><span className="font-semibold">Country:</span> {detailsNotification.country || '-'}</div>
                  <div><span className="font-semibold">Session ID:</span> {detailsNotification.sessionId || '-'}</div>
                  <div><span className="font-semibold">Analytics Link:</span> <a href={detailsNotification.analyticsLink} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">Open</a></div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </main>
    </div>
  );
} 
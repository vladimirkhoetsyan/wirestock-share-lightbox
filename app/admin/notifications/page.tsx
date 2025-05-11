import ModernHeader from "@/components/modern-header";

export default function NotificationsPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0c]">
      <ModernHeader />
      <main className="pt-20 pb-16 min-h-screen">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold text-white mb-6">All Notifications</h1>
          <div className="glass-card rounded-xl p-8 text-center text-white">
            This is the notifications page. (Coming soon: full notification list, bulk actions, filters, etc.)
          </div>
        </div>
      </main>
    </div>
  );
} 
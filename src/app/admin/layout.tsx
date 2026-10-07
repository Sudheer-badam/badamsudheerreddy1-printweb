"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  FileText,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Bell,
  TrendingUp,
  CreditCard,
  Shield,
  Database,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { href: "/admin", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/admin/orders", icon: FileText, label: "All Orders" },
  { href: "/admin/customers", icon: Users, label: "Customers" },
  { href: "/admin/analytics", icon: TrendingUp, label: "Analytics" },
  { href: "/admin/payments", icon: CreditCard, label: "Payments" },
  { href: "/admin/notifications", icon: Bell, label: "Notifications" },
  { href: "/admin/storage", icon: Database, label: "Storage" },
  { href: "/admin/settings", icon: Settings, label: "Settings" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, userRole, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) router.push("/auth/login");
      else if (userRole === "CUSTOMER") router.push("/dashboard");
    }
  }, [user, userRole, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#f5f7fa" }}>
        <div
          className="w-12 h-12 border-[3px] rounded-full animate-spin"
          style={{ borderColor: "#2D63FF", borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  if (!user || userRole !== "ADMIN") return null;

  return (
    <div className="min-h-screen flex" style={{ background: "#f5f7fa" }}>
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 lg:hidden"
            style={{ background: "rgba(11,29,58,0.45)" }}
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Sidebar ── */}
      <aside
        className={`fixed left-0 top-0 bottom-0 w-64 z-50 lg:relative lg:translate-x-0 lg:z-auto flex flex-col transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{
          background: "#0B1D3A",
          borderRight: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "2px 0 20px rgba(0,0,0,0.12)",
        }}
      >
        {/* Logo */}
        <div className="p-6" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0" style={{ border: "2.5px solid #F39C12", boxShadow: "0 2px 10px rgba(243,156,18,0.3)" }}>
              <Image src="/logo.png" alt="PRINT DOCKER | BADAM SUDHEER REDDY" width={40} height={40} className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="font-bold text-white text-sm">PRINT DOCKER | BADAM SUDHEER REDDY</div>
              <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "#F39C12" }}>
                <Shield className="w-3 h-3" />
                Admin Panel
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all group"
                style={{
                  background: isActive ? "rgba(45,99,255,0.20)" : "transparent",
                  color: isActive ? "#ffffff" : "rgba(255,255,255,0.55)",
                  border: isActive ? "1px solid rgba(45,99,255,0.35)" : "1px solid transparent",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "rgba(255,255,255,0.07)";
                    e.currentTarget.style.color = "#ffffff";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "rgba(255,255,255,0.55)";
                  }
                }}
              >
                <item.icon
                  className="w-4 h-4 flex-shrink-0"
                  style={{ color: isActive ? "#2D63FF" : "rgba(255,255,255,0.55)" }}
                />
                {item.label}
                {isActive && <ChevronRight className="w-3.5 h-3.5 ml-auto" style={{ color: "#2D63FF" }} />}
              </Link>
            );
          })}
        </nav>

        {/* User + Logout */}
        <div className="p-4" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="flex items-center gap-3 mb-3 px-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-[#0B1D3A]"
              style={{ background: "#F39C12" }}
            >
              A
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-white">Admin</div>
              <div className="text-xs truncate" style={{ color: "rgba(255,255,255,0.4)" }}>
                {user.email}
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
            style={{ color: "rgba(239,68,68,0.85)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(239,68,68,0.12)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header
          className="h-16 flex items-center gap-4 px-4 lg:px-8 sticky top-0 z-30"
          style={{
            background: "rgba(255,255,255,0.97)",
            borderBottom: "1px solid #E2E6EF",
            backdropFilter: "blur(12px)",
          }}
        >
          <div className="lg:hidden flex items-center gap-2">
            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0" style={{ border: "2px solid #F39C12" }}>
              <Image src="/logo.png" alt="Logo" width={32} height={32} className="w-full h-full object-cover" />
            </div>
          </div>
          {/* Admin badge */}
          <div
            className="px-3 py-1 rounded-lg text-xs font-bold"
            style={{
              background: "rgba(243,156,18,0.10)",
              color: "#F39C12",
              border: "1px solid rgba(243,156,18,0.25)",
            }}
          >
            ADMIN
          </div>
          <div className="flex-1" />
          <Link
            href="/admin/notifications"
            className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-blue-50 transition-colors"
            style={{ color: "#6B7280", border: "1px solid #E2E6EF", background: "#ffffff" }}
          >
            <Bell className="w-4 h-4" />
          </Link>
        </header>

        <main className="flex-1 p-4 pb-24 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>

      {/* ── Bottom Navigation (Mobile Only) ── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex items-center justify-around z-40 pb-safe shadow-[0_-4px_12px_rgba(0,0,0,0.05)] h-16">
        <Link href="/admin" className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${pathname === "/admin" ? "text-[#F39C12]" : "text-gray-500 hover:text-gray-900"}`}>
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] font-medium">Home</span>
        </Link>
        <Link href="/admin/orders" className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${pathname === "/admin/orders" ? "text-[#F39C12]" : "text-gray-500 hover:text-gray-900"}`}>
          <FileText className="w-5 h-5" />
          <span className="text-[10px] font-medium">Orders</span>
        </Link>
        
        {/* Accent FAB style for Analytics or Customers */}
        <div className="relative w-full h-full flex justify-center">
          <Link href="/admin/customers" className="absolute -top-6 w-14 h-14 bg-[#F39C12] text-white rounded-full flex items-center justify-center shadow-lg shadow-amber-500/40 border-4 border-[#f5f7fa] hover:bg-amber-500 transition-colors">
            <Users className="w-6 h-6" />
          </Link>
        </div>

        <Link href="/admin/settings" className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${pathname === "/admin/settings" ? "text-[#F39C12]" : "text-gray-500 hover:text-gray-900"}`}>
          <Settings className="w-5 h-5" />
          <span className="text-[10px] font-medium">Settings</span>
        </Link>
        <button onClick={() => setSidebarOpen(true)} className="flex flex-col items-center justify-center w-full h-full space-y-1 text-gray-500 hover:text-gray-900">
          <Menu className="w-5 h-5" />
          <span className="text-[10px] font-medium">Menu</span>
        </button>
      </nav>
    </div>
  );
}

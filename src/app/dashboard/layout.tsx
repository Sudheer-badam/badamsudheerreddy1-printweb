"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Upload,
  FileText,
  CreditCard,
  Bell,
  User,
  HelpCircle,
  LogOut,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/dashboard/upload", icon: Upload, label: "Upload PDF" },
  { href: "/dashboard/orders", icon: FileText, label: "My Orders" },
  { href: "/dashboard/payments", icon: CreditCard, label: "Payments" },
  { href: "/dashboard/notifications", icon: Bell, label: "Notifications" },
  { href: "/dashboard/profile", icon: User, label: "Profile" },
  { href: "/dashboard/support", icon: HelpCircle, label: "Support" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, userRole, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) router.push("/auth/login");
      else if (userRole === "ADMIN") router.push("/admin");
    }
  }, [user, userRole, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#f5f7fa" }}>
        <div
          className="w-12 h-12 border-[3px] border-t-transparent rounded-full animate-spin"
          style={{ borderColor: "#2D63FF", borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  if (!user || userRole === "ADMIN") return null;

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
          background: "#ffffff",
          borderRight: "1px solid #E2E6EF",
          boxShadow: "2px 0 16px rgba(0,0,0,0.04)",
        }}
      >
        {/* Logo */}
        <div className="p-6" style={{ borderBottom: "1px solid #E2E6EF" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0" style={{ border: "2.5px solid #2D63FF", boxShadow: "0 2px 8px rgba(45,99,255,0.2)" }}>
              <Image src="/logo.png" alt="PRINT DOCKER | BADAM SUDHEER REDDY" width={40} height={40} className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="font-bold text-sm" style={{ color: "#0B1D3A" }}>PRINT DOCKER | BADAM SUDHEER REDDY</div>
              <div className="text-xs font-medium" style={{ color: "#6B7280" }}>Customer Portal</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all group ${
                  isActive ? "sidebar-item-active" : "sidebar-item"
                }`}
              >
                <item.icon
                  className="w-4 h-4 flex-shrink-0"
                  style={{ color: isActive ? "#2D63FF" : "#6B7280" }}
                />
                {item.label}
                {isActive && <ChevronRight className="w-3.5 h-3.5 ml-auto" style={{ color: "#2D63FF" }} />}
              </Link>
            );
          })}
        </nav>

        {/* User + Logout */}
        <div className="p-4" style={{ borderTop: "1px solid #E2E6EF" }}>
          <div className="flex items-center gap-3 mb-3 px-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-[#0B1D3A]"
              style={{ background: "#2D63FF" }}
            >
              {user.displayName?.charAt(0) || user.email?.charAt(0) || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate" style={{ color: "#0B1D3A" }}>
                {user.displayName || "User"}
              </div>
              <div className="text-xs truncate" style={{ color: "#6B7280" }}>
                {user.email || user.phoneNumber}
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
            style={{ color: "#ef4444" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#fef2f2")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header
          className="h-16 flex items-center gap-4 px-4 lg:px-8 sticky top-0 z-30"
          style={{
            background: "rgba(255,255,255,0.95)",
            borderBottom: "1px solid #E2E6EF",
            backdropFilter: "blur(12px)",
          }}
        >
          <button
            className="lg:hidden p-2 rounded-lg transition-colors"
            style={{ color: "#444B54" }}
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex-1" />
          <Link
            href="/dashboard/notifications"
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors hover:bg-blue-50"
            style={{ color: "#6B7280", border: "1px solid #E2E6EF", background: "#ffffff" }}
          >
            <Bell className="w-4 h-4" />
          </Link>
          <Link href="/dashboard/profile">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-[#0B1D3A] cursor-pointer"
              style={{ background: "#2D63FF" }}
            >
              {user.displayName?.charAt(0) || user.email?.charAt(0) || "U"}
            </div>
          </Link>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

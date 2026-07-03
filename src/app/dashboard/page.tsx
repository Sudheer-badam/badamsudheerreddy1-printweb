"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Upload, FileText, CreditCard, Clock, CheckCircle,
  Printer, AlertCircle, ArrowRight, TrendingUp,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency, formatDate, ORDER_STATUS_COLORS, ORDER_STATUS_LABELS, PAYMENT_STATUS_COLORS } from "@/lib/utils";

interface Order {
  id: string; orderNumber: string; fileName: string; totalPages: number;
  paperSize: string; printColor: string; totalAmount: number;
  status: string; paymentStatus: string; createdAt: string;
}
interface DashboardStats {
  totalOrders: number; completedOrders: number; pendingOrders: number; totalSpent: number;
}

export default function CustomerDashboard() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<DashboardStats>({ totalOrders: 0, completedOrders: 0, pendingOrders: 0, totalSpent: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (user) fetchOrders(); }, [user]);

  const fetchOrders = async () => {
    try {
      const res = await fetch(`/api/orders?uid=${user?.uid}&limit=5`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders);
        const allOrders = data.orders;
        setStats({
          totalOrders: data.pagination.total,
          completedOrders: allOrders.filter((o: Order) => o.status === "COMPLETED").length,
          pendingOrders: allOrders.filter((o: Order) => ["UPLOADED","VERIFIED","ACCEPTED","PRINTING"].includes(o.status)).length,
          totalSpent: allOrders.filter((o: Order) => o.paymentStatus === "PAID").reduce((sum: number, o: Order) => sum + o.totalAmount, 0),
        });
      }
    } catch (error) { console.error("Failed to fetch orders:", error); }
    finally { setLoading(false); }
  };

  const statsCards = [
    { label: "Total Orders",   value: stats.totalOrders,              icon: FileText,    bg: "#EEF2FF", color: "#2D63FF", href: "/dashboard/orders" },
    { label: "Completed",      value: stats.completedOrders,          icon: CheckCircle, bg: "#F0FDF4", color: "#00C851", href: "/dashboard/orders?status=COMPLETED" },
    { label: "In Progress",    value: stats.pendingOrders,            icon: Clock,       bg: "#FFF7ED", color: "#F39C12", href: "/dashboard/orders?status=PRINTING" },
    { label: "Total Spent",    value: formatCurrency(stats.totalSpent), icon: CreditCard, bg: "#EEF2FF", color: "#2D63FF", href: "/dashboard/payments" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold" style={{ color: "#0B1D3A" }}>
            Welcome back, {user?.displayName?.split(" ")[0] || "User"} 👋
          </h1>
          <p className="mt-1 font-medium" style={{ color: "#6B7280" }}>Here&apos;s what&apos;s happening with your print orders.</p>
        </div>
        <Link href="/dashboard/upload"
          className="btn-primary hidden sm:flex items-center gap-2 px-5 py-2.5 text-sm">
          <Upload className="w-4 h-4" /> New Print Job
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Link href={card.href}>
              <div className="iom-card p-5 cursor-pointer">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: card.bg }}>
                  <card.icon className="w-5 h-5" style={{ color: card.color }} />
                </div>
                <div className="text-2xl font-extrabold" style={{ color: "#0B1D3A" }}>{card.value}</div>
                <div className="text-xs font-semibold mt-1" style={{ color: "#6B7280" }}>{card.label}</div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { href: "/dashboard/upload",  icon: Upload,      label: "Upload New PDF",   sub: "Start a new print order",   bg: "#EEF2FF", color: "#2D63FF", border: "rgba(45,99,255,0.2)" },
          { href: "/dashboard/orders",  icon: Printer,     label: "Track Orders",     sub: "View live order status",    bg: "#EEF2FF", color: "#2D63FF", border: "#E2E6EF" },
          { href: "/dashboard/support", icon: AlertCircle, label: "Get Support",      sub: "Contact us for help",       bg: "#F0FDF4", color: "#00C851", border: "#E2E6EF" },
        ].map(q => (
          <Link key={q.href} href={q.href}>
            <div className="iom-card p-5 cursor-pointer" style={{ borderColor: q.border }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: q.bg }}>
                <q.icon className="w-5 h-5" style={{ color: q.color }} />
              </div>
              <div className="font-bold" style={{ color: "#0B1D3A" }}>{q.label}</div>
              <div className="text-xs font-medium mt-1" style={{ color: "#6B7280" }}>{q.sub}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Orders */}
      <div className="iom-card overflow-hidden">
        <div className="flex items-center justify-between p-6" style={{ borderBottom: "1px solid #E2E6EF" }}>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" style={{ color: "#2D63FF" }} />
            <h2 className="font-extrabold" style={{ color: "#0B1D3A" }}>Recent Orders</h2>
          </div>
          <Link href="/dashboard/orders" className="text-sm font-semibold flex items-center gap-1 hover:opacity-70 transition-opacity" style={{ color: "#2D63FF" }}>
            View All <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-16 skeleton rounded-xl" />)}
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-10 h-10 mx-auto mb-3" style={{ color: "#CBD5E1" }} />
            <p className="font-medium" style={{ color: "#6B7280" }}>No orders yet</p>
            <Link href="/dashboard/upload"
              className="btn-primary mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm">
              <Upload className="w-4 h-4" /> Upload Your First PDF
            </Link>
          </div>
        ) : (
          <div style={{ borderTop: "none" }}>
            {orders.map((order, i) => (
              <Link key={order.id} href={`/dashboard/orders/${order.id}`}>
                <div
                  className="flex items-center gap-4 p-4 transition-colors cursor-pointer hover:bg-blue-50"
                  style={{ borderBottom: i < orders.length - 1 ? "1px solid #E2E6EF" : "none" }}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#EEF2FF" }}>
                    <FileText className="w-5 h-5" style={{ color: "#2D63FF" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm truncate" style={{ color: "#0B1D3A" }}>{order.fileName}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs border ${ORDER_STATUS_COLORS[order.status]}`}>
                        {ORDER_STATUS_LABELS[order.status]}
                      </span>
                    </div>
                    <div className="text-xs font-medium mt-0.5" style={{ color: "#6B7280" }}>
                      {order.orderNumber} • {order.totalPages} pages • {formatDate(order.createdAt)}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-bold text-sm" style={{ color: "#0B1D3A" }}>{formatCurrency(order.totalAmount)}</div>
                    <div className={`text-xs px-2 py-0.5 rounded-full border ${PAYMENT_STATUS_COLORS[order.paymentStatus]}`}>
                      {order.paymentStatus}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

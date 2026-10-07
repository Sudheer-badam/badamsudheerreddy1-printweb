"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  TrendingUp,
  ShoppingBag,
  Users,
  IndianRupee,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  ArrowUpRight,
  Activity,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency, formatDate, ORDER_STATUS_COLORS, ORDER_STATUS_LABELS, PAYMENT_STATUS_COLORS } from "@/lib/utils";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface Analytics {
  stats: {
    totalOrders: number;
    todayOrders: number;
    pendingOrders: number;
    completedOrders: number;
    totalRevenue: number;
    todayRevenue: number;
    monthRevenue: number;
    totalCustomers: number;
    totalPages: number;
    pendingPayments: number;
    mostActiveCustomer: { name: string; email: string; phone: string; orderCount: number } | null;
  };
  recentOrders: {
    id: string;
    orderNumber: string;
    fileName: string;
    totalAmount: number;
    status: string;
    paymentStatus: string;
    createdAt: string;
    user: { name: string; email: string; phone: string };
  }[];
  ordersByStatus: { status: string; _count: { id: number } }[];
}

const STATUS_COLORS = {
  UPLOADED: "#7c3aed",
  VERIFIED: "#0ea5e9",
  ACCEPTED: "#4f46e5",
  PRINTING: "#f59e0b",
  PRINTED: "#f97316",
  READY_FOR_PICKUP: "#8b5cf6",
  DELIVERED: "#22c55e",
  CANCELLED: "#ef4444",
  COMPLETED: "#10b981",
};

// Mock chart data for display
const mockRevenueData = [
  { month: "Feb", revenue: 12000, orders: 24 },
  { month: "Mar", revenue: 18500, orders: 37 },
  { month: "Apr", revenue: 15000, orders: 30 },
  { month: "May", revenue: 22000, orders: 44 },
  { month: "Jun", revenue: 28000, orders: 56 },
  { month: "Jul", revenue: 19500, orders: 39 },
];

export default function AdminDashboard() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchAnalytics();
  }, [user]);

  const fetchAnalytics = async () => {
    try {
      const res = await fetch(`/api/admin/analytics?uid=${user?.uid}`);
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-28 skeleton rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const stats = analytics?.stats;
  const statCards = [
    {
      label: "Today's Orders",
      value: stats?.todayOrders || 0,
      icon: ShoppingBag,
      color: "from-violet-500 to-purple-600",
      trend: "+12%",
    },
    {
      label: "Pending Orders",
      value: stats?.pendingOrders || 0,
      icon: Clock,
      color: "from-amber-500 to-orange-500",
      trend: "",
    },
    {
      label: "Completed Orders",
      value: stats?.completedOrders || 0,
      icon: CheckCircle,
      color: "from-emerald-500 to-green-600",
      trend: "+8%",
    },
    {
      label: "Total Customers",
      value: stats?.totalCustomers || 0,
      icon: Users,
      color: "from-blue-500 to-cyan-500",
      trend: "+3",
    },
    {
      label: "Today's Revenue",
      value: formatCurrency(stats?.todayRevenue || 0),
      icon: IndianRupee,
      color: "from-green-500 to-emerald-600",
      trend: "+15%",
    },
    {
      label: "Monthly Revenue",
      value: formatCurrency(stats?.monthRevenue || 0),
      icon: TrendingUp,
      color: "from-pink-500 to-rose-500",
      trend: "+22%",
    },
    {
      label: "Total Pages",
      value: (stats?.totalPages || 0).toLocaleString(),
      icon: FileText,
      color: "from-indigo-500 to-blue-600",
      trend: "",
    },
    {
      label: "Pending Payments",
      value: formatCurrency(stats?.pendingPayments || 0),
      icon: AlertCircle,
      color: "from-red-500 to-rose-600",
      trend: "",
    },
  ];

  const pieData = (analytics?.ordersByStatus || []).map((s) => ({
    name: ORDER_STATUS_LABELS[s.status] || s.status,
    value: s._count.id,
    color: STATUS_COLORS[s.status as keyof typeof STATUS_COLORS] || "#6b7280",
  }));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#0B1D3A]">Admin Dashboard</h1>
        <p className="text-gray-500 mt-1">PRINT DOCKER Management Overview</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="glass rounded-2xl p-5 border border-gray-200 hover-card"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center`}>
                <card.icon className="w-5 h-5 text-[#0B1D3A]" />
              </div>
              {card.trend && (
                <div className="flex items-center gap-1 text-xs text-emerald-400">
                  <ArrowUpRight className="w-3 h-3" />
                  {card.trend}
                </div>
              )}
            </div>
            <div className="text-xl font-bold text-[#0B1D3A]">{card.value}</div>
            <div className="text-xs text-gray-500 mt-1">{card.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 glass rounded-3xl p-6 border border-gray-200">
          <div className="flex items-center gap-2 mb-6">
            <Activity className="w-5 h-5 text-violet-400" />
            <h2 className="font-bold text-[#0B1D3A]">Revenue Trend</h2>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={mockRevenueData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" stroke="rgba(255,255,255,0.3)" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 12 }} />
              <YAxis stroke="rgba(255,255,255,0.3)" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  background: "rgba(15,15,25,0.95)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "12px",
                  color: "white",
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#7c3aed"
                strokeWidth={2}
                fill="url(#colorRevenue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Order Status Pie */}
        <div className="glass rounded-3xl p-6 border border-gray-200">
          <h2 className="font-bold text-[#0B1D3A] mb-6">Order Status</h2>
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "rgba(15,15,25,0.95)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "8px",
                      color: "white",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-4">
                {pieData.slice(0, 5).map((d) => (
                  <div key={d.name} className="flex items-center gap-2 text-xs">
                    <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                    <span className="text-gray-600 flex-1">{d.name}</span>
                    <span className="text-[#0B1D3A] font-medium">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center text-gray-400 py-8">No order data</div>
          )}
        </div>
      </div>

      {/* Most Active Customer */}
      {stats?.mostActiveCustomer && (
        <div className="glass rounded-2xl p-5 border border-amber-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="text-xs text-amber-400 font-medium">Most Active Customer</div>
              <div className="font-bold text-[#0B1D3A]">{stats.mostActiveCustomer.name}</div>
            </div>
            <div className="ml-auto text-right">
              <div className="text-sm text-gray-600">{stats.mostActiveCustomer.email}</div>
              <div className="text-sm text-gray-600"><a href={`https://wa.me/${(stats.mostActiveCustomer.phone || "").replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="hover:text-green-500 hover:underline cursor-pointer flex items-center gap-1">{stats.mostActiveCustomer.phone}</a></div>
            </div>
            <div className="text-2xl font-extrabold text-amber-400 ml-4">
              {stats.mostActiveCustomer.orderCount} orders
            </div>
          </div>
        </div>
      )}

      {/* Recent Orders */}
      <div className="glass rounded-3xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="font-bold text-[#0B1D3A]">Recent Orders</h2>
          <Link href="/admin/orders" className="text-sm text-amber-400 hover:text-amber-300 flex items-center gap-1">
            View All <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left px-6 py-3 text-xs text-gray-400 font-medium uppercase tracking-wider">Order</th>
                <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium uppercase tracking-wider">Customer</th>
                <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium uppercase tracking-wider">Payment</th>
                <th className="text-right px-6 py-3 text-xs text-gray-400 font-medium uppercase tracking-wider">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {(analytics?.recentOrders || []).map((order) => (
                <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-[#0B1D3A] truncate max-w-[140px]">{order.fileName}</div>
                    <div className="text-xs text-gray-400">{order.orderNumber}</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm text-[#0B1D3A]">{order.user.name}</div>
                    <div className="text-xs text-gray-500"><a href={`https://wa.me/${(order.user.phone || "").replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="hover:text-green-500 hover:underline cursor-pointer flex items-center gap-1">{order.user.phone}</a></div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`px-2 py-1 rounded-lg text-xs border ${ORDER_STATUS_COLORS[order.status]}`}>
                      {ORDER_STATUS_LABELS[order.status]}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`px-2 py-1 rounded-lg text-xs border ${PAYMENT_STATUS_COLORS[order.paymentStatus]}`}>
                      {order.paymentStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-semibold text-[#0B1D3A] text-sm">
                    {formatCurrency(order.totalAmount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!analytics?.recentOrders || analytics.recentOrders.length === 0) && (
            <div className="p-10 text-center text-gray-400">No orders yet</div>
          )}
        </div>
      </div>
    </div>
  );
}

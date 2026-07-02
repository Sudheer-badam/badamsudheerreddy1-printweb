"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { TrendingUp, IndianRupee, FileText, Users, Activity } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency } from "@/lib/utils";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";

// Mock analytics data
const weeklyData = [
  { day: "Mon", orders: 5, revenue: 2400 },
  { day: "Tue", orders: 8, revenue: 3800 },
  { day: "Wed", orders: 6, revenue: 2900 },
  { day: "Thu", orders: 12, revenue: 5500 },
  { day: "Fri", orders: 15, revenue: 7200 },
  { day: "Sat", orders: 10, revenue: 4800 },
  { day: "Sun", orders: 3, revenue: 1400 },
];

const monthlyData = [
  { month: "Jan", color: 8000, bw: 15000 },
  { month: "Feb", color: 12000, bw: 18000 },
  { month: "Mar", color: 9500, bw: 14000 },
  { month: "Apr", color: 16000, bw: 22000 },
  { month: "May", color: 14000, bw: 20000 },
  { month: "Jun", color: 18000, bw: 25000 },
];

export default function AdminAnalyticsPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Record<string, number>>({});

  useEffect(() => {
    if (user) {
      fetch(`/api/admin/analytics?uid=${user.uid}`)
        .then((r) => r.json())
        .then((d) => setStats(d.stats || {}))
        .catch(console.error);
    }
  }, [user]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <p className="text-white/40 mt-1">Business performance overview</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Revenue", value: formatCurrency(stats.totalRevenue || 0), icon: IndianRupee, color: "from-emerald-500 to-green-600" },
          { label: "Total Orders", value: stats.totalOrders || 0, icon: FileText, color: "from-violet-500 to-purple-600" },
          { label: "Customers", value: stats.totalCustomers || 0, icon: Users, color: "from-blue-500 to-cyan-500" },
          { label: "Pages Printed", value: (stats.totalPages || 0).toLocaleString(), icon: Activity, color: "from-amber-500 to-orange-500" },
        ].map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass rounded-2xl p-5 border border-white/5"
          >
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${kpi.color} flex items-center justify-center mb-3`}>
              <kpi.icon className="w-5 h-5 text-white" />
            </div>
            <div className="text-2xl font-bold text-white">{kpi.value}</div>
            <div className="text-xs text-white/40 mt-1">{kpi.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Weekly Revenue + Orders */}
      <div className="glass rounded-3xl p-6 border border-white/5">
        <h2 className="font-bold text-white mb-6">Weekly Performance</h2>
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={weeklyData}>
            <defs>
              <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="day" stroke="rgba(255,255,255,0.2)" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 12 }} />
            <YAxis stroke="rgba(255,255,255,0.2)" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 12 }} />
            <Tooltip
              contentStyle={{ background: "rgba(15,15,25,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "white" }}
            />
            <Legend />
            <Area type="monotone" dataKey="revenue" stroke="#7c3aed" fill="url(#revGrad)" name="Revenue (₹)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Color vs B&W Revenue */}
      <div className="glass rounded-3xl p-6 border border-white/5">
        <h2 className="font-bold text-white mb-6">Color vs B&W Revenue (Monthly)</h2>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="month" stroke="rgba(255,255,255,0.2)" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 12 }} />
            <YAxis stroke="rgba(255,255,255,0.2)" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 12 }} />
            <Tooltip
              contentStyle={{ background: "rgba(15,15,25,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "white" }}
            />
            <Legend />
            <Bar dataKey="color" fill="#7c3aed" name="Color (₹)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="bw" fill="#0ea5e9" name="B&W (₹)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CreditCard, CheckCircle, Clock, XCircle, TrendingUp } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency, formatDate, PAYMENT_STATUS_COLORS } from "@/lib/utils";

interface Payment {
  id: string;
  amount: number;
  method: string | null;
  status: string;
  transactionId: string | null;
  paidAt: string | null;
  createdAt: string;
  order: { orderNumber: string; fileName: string };
  user: { name: string; email: string; phone: string };
}

export default function AdminPaymentsPage() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetch(`/api/payments?uid=${user.uid}`)
        .then((r) => r.json())
        .then(setPayments)
        .finally(() => setLoading(false));
    }
  }, [user]);

  const totalRevenue = payments
    .filter((p) => p.status === "PAID")
    .reduce((s, p) => s + p.amount, 0);
  const pending = payments.filter((p) => p.status === "PENDING").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0B1D3A]">Payments</h1>
        <p className="text-gray-500 mt-1">All payment transactions</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="glass rounded-2xl p-5 border border-gray-200">
          <TrendingUp className="w-5 h-5 text-emerald-400 mb-2" />
          <div className="text-2xl font-bold text-gradient">{formatCurrency(totalRevenue)}</div>
          <div className="text-xs text-gray-500">Total Revenue</div>
        </div>
        <div className="glass rounded-2xl p-5 border border-gray-200">
          <CreditCard className="w-5 h-5 text-violet-400 mb-2" />
          <div className="text-2xl font-bold text-[#0B1D3A]">{payments.length}</div>
          <div className="text-xs text-gray-500">Transactions</div>
        </div>
        <div className="glass rounded-2xl p-5 border border-amber-500/20">
          <Clock className="w-5 h-5 text-amber-400 mb-2" />
          <div className="text-2xl font-bold text-amber-400">{pending}</div>
          <div className="text-xs text-gray-500">Pending</div>
        </div>
      </div>

      {/* Table */}
      <div className="glass rounded-3xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs text-gray-400 uppercase tracking-wider">Customer</th>
                <th className="text-left px-4 py-3 text-xs text-gray-400 uppercase tracking-wider hidden md:table-cell">Order</th>
                <th className="text-left px-4 py-3 text-xs text-gray-400 uppercase tracking-wider">Method</th>
                <th className="text-left px-4 py-3 text-xs text-gray-400 uppercase tracking-wider">Status</th>
                <th className="text-right px-4 py-3 text-xs text-gray-400 uppercase tracking-wider">Amount</th>
                <th className="text-left px-4 py-3 text-xs text-gray-400 uppercase tracking-wider hidden lg:table-cell">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="h-10 skeleton rounded-lg" /></td></tr>
                  ))
                : payments.map((p, i) => (
                    <motion.tr
                      key={p.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.04 }}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-[#0B1D3A]">{p.user?.name}</div>
                        <div className="text-xs text-gray-400">{p.user?.phone}</div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-gray-500 truncate max-w-[140px]">
                        {p.order?.fileName}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{p.method || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-lg border ${PAYMENT_STATUS_COLORS[p.status]}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-[#0B1D3A]">{formatCurrency(p.amount)}</td>
                      <td className="px-4 py-3 text-xs text-gray-400 hidden lg:table-cell">
                        {formatDate(p.paidAt || p.createdAt)}
                      </td>
                    </motion.tr>
                  ))}
            </tbody>
          </table>
          {!loading && payments.length === 0 && (
            <div className="p-12 text-center text-gray-400">
              <CreditCard className="w-10 h-10 mx-auto mb-3" />
              No payment records
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

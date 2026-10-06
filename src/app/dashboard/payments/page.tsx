"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CreditCard, CheckCircle, XCircle, Clock, TrendingUp } from "lucide-react";
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
}

export default function CustomerPaymentsPage() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchPayments();
  }, [user]);

  const fetchPayments = async () => {
    try {
      const res = await fetch(`/api/payments?uid=${user?.uid}`);
      if (res.ok) setPayments(await res.json());
    } finally {
      setLoading(false);
    }
  };

  const totalPaid = payments
    .filter((p) => p.status === "PAID")
    .reduce((s, p) => s + p.amount, 0);

  const statusIcon = (status: string) => {
    if (status === "PAID") return <CheckCircle className="w-4 h-4 text-emerald-400" />;
    if (status === "FAILED") return <XCircle className="w-4 h-4 text-red-400" />;
    return <Clock className="w-4 h-4 text-amber-400" />;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0B1D3A]">Payments</h1>
        <p className="text-gray-500 mt-1">Your payment history</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="glass rounded-2xl p-5 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-gray-500">Total Paid</span>
          </div>
          <div className="text-2xl font-bold text-gradient">{formatCurrency(totalPaid)}</div>
        </div>
        <div className="glass rounded-2xl p-5 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard className="w-4 h-4 text-violet-400" />
            <span className="text-xs text-gray-500">Transactions</span>
          </div>
          <div className="text-2xl font-bold text-[#0B1D3A]">{payments.length}</div>
        </div>
      </div>

      {/* Payments List */}
      <div className="glass rounded-3xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-16 skeleton rounded-xl" />)}
          </div>
        ) : payments.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <CreditCard className="w-10 h-10 mx-auto mb-3" />
            <p>No payment records yet</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {payments.map((payment, i) => (
              <motion.div
                key={payment.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-4 p-5"
              >
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center flex-shrink-0">
                  {statusIcon(payment.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-[#0B1D3A] text-sm truncate">
                    {payment.order?.fileName || "Unknown order"}
                  </div>
                  <div className="text-xs text-gray-400">
                    {payment.order?.orderNumber} • {formatDate(payment.createdAt)}
                  </div>
                  {payment.transactionId && (
                    <div className="text-xs text-gray-300 font-mono mt-0.5">TXN: {payment.transactionId}</div>
                  )}
                </div>
                <div className="text-right">
                  <div className="font-bold text-[#0B1D3A]">{formatCurrency(payment.amount)}</div>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${PAYMENT_STATUS_COLORS[payment.status]}`}>
                    {payment.status}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CreditCard, CheckCircle, XCircle, Clock, TrendingUp, FileText } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency, formatDate, PAYMENT_STATUS_COLORS, PAYMENT_STATUS_LABELS } from "@/lib/utils";
import PaymentReceiptModal, {
  PaymentReceiptData,
  formatReceiptDateTime,
  generateReceiptNumber,
} from "@/components/PaymentReceiptModal";

interface Payment {
  id: string;
  amount: number;
  method: string | null;
  status: string;
  transactionId: string | null;
  paidAt: string | null;
  createdAt: string;
  paymentLatitude?: number | null;
  paymentLongitude?: number | null;
  paymentLocationAccuracy?: number | null;
  paymentLocationAddress?: string | null;
  paymentLocationCity?: string | null;
  order: {
    orderNumber: string;
    fileName: string;
    orderLatitude?: number | null;
    orderLongitude?: number | null;
    orderLocationAddress?: string | null;
    orderLocationCity?: string | null;
  };
}

export default function CustomerPaymentsPage() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState<PaymentReceiptData | null>(null);

  const openReceipt = (p: Payment) => {
    setSelectedReceipt({
      orderNumber: p.order?.orderNumber || "ORD",
      orderId: p.id,
      fileName: p.order?.fileName,
      customerName: user?.displayName || user?.email?.split("@")[0] || "Customer",
      receiptNumber: generateReceiptNumber(p.order?.orderNumber, p.id),
      transactionId: p.transactionId,
      amount: p.amount,
      status: p.status === "PAID" ? "successful" : p.status.toLowerCase(),
      timestamp: formatReceiptDateTime(p.paidAt || p.createdAt),
      latitude: p.paymentLatitude ?? p.order?.orderLatitude ?? null,
      longitude: p.paymentLongitude ?? p.order?.orderLongitude ?? null,
      locationAddress: p.paymentLocationAddress ?? p.order?.orderLocationAddress ?? null,
      locationCity: p.paymentLocationCity ?? p.order?.orderLocationCity ?? null,
      locationAccuracy: p.paymentLocationAccuracy ?? null,
    });
  };

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#0B1D3A]">Payments</h1>
          <p className="text-gray-500 mt-1">Your payment history</p>
        </div>
        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-gray-200/90 shadow-2xs self-start sm:self-auto flex-wrap">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Accepted:</span>
          {[
            { name: "Google Pay", src: "/payment-logos/gpay.jpeg", h: "h-3.5" },
            { name: "PhonePe", src: "/payment-logos/phonepe.webp", h: "h-3.5" },
            { name: "Paytm", src: "/payment-logos/paytm.jpeg", h: "h-3" },
            { name: "BHIM", src: "/payment-logos/bhim.png", h: "h-3" },
            { name: "UPI", src: "/payment-logos/upi.jpeg", h: "h-3" },
          ].map((app) => (
            <div key={app.name} className="px-1 py-0.5" title={app.name}>
              <img src={app.src} alt={app.name} className={`${app.h} w-auto max-w-[36px] object-contain`} />
            </div>
          ))}
        </div>
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
                <div className="text-right flex flex-col items-end gap-1.5">
                  <div className="font-bold text-[#0B1D3A]">{formatCurrency(payment.amount)}</div>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full border font-medium ${PAYMENT_STATUS_COLORS[payment.status] || "bg-gray-100 text-gray-700"}`}>
                    {PAYMENT_STATUS_LABELS[payment.status] || payment.status}
                  </span>
                  <button
                    type="button"
                    onClick={() => openReceipt(payment)}
                    className="mt-1 px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                    title="View Official Receipt"
                  >
                    <FileText className="w-3.5 h-3.5" /> Receipt
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Official Payment Receipt Modal */}
      <PaymentReceiptModal
        isOpen={!!selectedReceipt}
        onClose={() => setSelectedReceipt(null)}
        data={selectedReceipt}
      />
    </div>
  );
}

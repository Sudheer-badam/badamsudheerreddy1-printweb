"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard,
  CheckCircle,
  Clock,
  XCircle,
  TrendingUp,
  Search,
  ExternalLink,
  Copy,
  AlertTriangle,
  Eye,
  RefreshCw,
  ShieldCheck,
  Check,
  X,
  FileText,
  User,
  Phone,
  Mail,
  Calendar,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency, formatDate, PAYMENT_STATUS_COLORS, PAYMENT_STATUS_LABELS } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";
import PaymentReceiptModal, {
  PaymentReceiptData,
  formatReceiptDateTime,
  generateReceiptNumber,
} from "@/components/PaymentReceiptModal";

interface PaymentRecord {
  id: string;
  orderId: string;
  amount: number;
  method: string | null;
  status: string;
  transactionId: string | null;
  paymentProofUrl: string | null;
  rejectionReason: string | null;
  adminNotes: string | null;
  verifiedBy: string | null;
  verifiedAt: string | null;
  paidAt: string | null;
  createdAt: string;
  paymentLatitude?: number | null;
  paymentLongitude?: number | null;
  paymentLocationAccuracy?: number | null;
  paymentLocationAddress?: string | null;
  paymentLocationCity?: string | null;
  order: {
    id: string;
    orderNumber: string;
    fileName: string;
    totalAmount: number;
    status: string;
    paymentStatus: string;
    totalPages: number;
    copies: number;
    printColor: string;
    orderLatitude?: number | null;
    orderLongitude?: number | null;
    orderLocationAccuracy?: number | null;
    orderLocationAddress?: string | null;
    orderLocationCity?: string | null;
  };
  user: {
    id: string;
    name: string;
    email: string;
    phone: string;
    profilePhoto: string | null;
    latitude?: number | null;
    longitude?: number | null;
    locationAddress?: string | null;
    locationCity?: string | null;
  };
}

export default function AdminPaymentsPage() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<"PENDING_VERIFICATION" | "PAID" | "REJECTED" | "ALL">(
    "PENDING_VERIFICATION"
  );
  const [search, setSearch] = useState("");

  // Action Modals
  const [selectedProofUrl, setSelectedProofUrl] = useState<string | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<PaymentReceiptData | null>(null);
  const [actionPayment, setActionPayment] = useState<PaymentRecord | null>(null);
  const [actionType, setActionType] = useState<"APPROVE" | "REJECT" | "UNDER_REVIEW" | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [processingAction, setProcessingAction] = useState(false);

  const openPaymentReceipt = (p: PaymentRecord) => {
    setSelectedReceipt({
      orderNumber: p.order?.orderNumber || "ORD",
      orderId: p.order?.id,
      fileName: p.order?.fileName,
      customerName: p.user?.name || "Customer",
      customerContact: p.user?.phone || p.user?.email,
      receiptNumber: generateReceiptNumber(p.order?.orderNumber, p.id),
      transactionId: p.transactionId,
      amount: p.amount || p.order?.totalAmount || 0,
      status: p.status === "PAID" ? "successful" : p.status.toLowerCase(),
      timestamp: formatReceiptDateTime(p.paidAt || p.createdAt),
      rejectionReason: p.rejectionReason,
      latitude: p.paymentLatitude ?? p.order?.orderLatitude ?? p.user?.latitude ?? null,
      longitude: p.paymentLongitude ?? p.order?.orderLongitude ?? p.user?.longitude ?? null,
      locationAddress: p.paymentLocationAddress ?? p.order?.orderLocationAddress ?? p.user?.locationAddress ?? null,
      locationCity: p.paymentLocationCity ?? p.order?.orderLocationCity ?? p.user?.locationCity ?? null,
      locationAccuracy: p.paymentLocationAccuracy ?? p.order?.orderLocationAccuracy ?? null,
    });
  };

  useEffect(() => {
    if (user) {
      fetchPayments();
    }
  }, [user]);

  const fetchPayments = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/payments?uid=${user.uid}`);
      if (res.ok) {
        const data = await res.json();
        setPayments(data);
      }
    } catch (e) {
      toast.error("Failed to load payment records");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAction = async () => {
    if (!user || !actionPayment || !actionType) return;

    if (actionType === "REJECT" && !rejectionReason.trim()) {
      toast.error("Please provide a rejection reason so the customer can be notified.");
      return;
    }

    setProcessingAction(true);
    try {
      const res = await fetch("/api/payments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: user.uid,
          paymentId: actionPayment.id,
          action: actionType,
          rejectionReason: rejectionReason.trim(),
          adminNotes: adminNotes.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        if (actionType === "APPROVE") {
          toast.success(`Payment for Order #${actionPayment.order.orderNumber} verified and approved!`);
        } else if (actionType === "REJECT") {
          toast.warning(`Payment for Order #${actionPayment.order.orderNumber} rejected.`);
        } else {
          toast.info("Payment marked as under review.");
        }
        setActionPayment(null);
        setActionType(null);
        setRejectionReason("");
        setAdminNotes("");
        fetchPayments();
      } else {
        toast.error(data.error || "Failed to complete payment verification");
      }
    } catch {
      toast.error("An error occurred during verification");
    } finally {
      setProcessingAction(false);
    }
  };

  // Stats calculation
  const pendingCount = payments.filter((p) => p.status === "SUBMITTED" || p.status === "UNDER_REVIEW").length;
  const verifiedCount = payments.filter((p) => p.status === "PAID").length;
  const rejectedCount = payments.filter((p) => p.status === "REJECTED").length;
  const totalVerifiedRevenue = payments
    .filter((p) => p.status === "PAID")
    .reduce((sum, p) => sum + p.amount, 0);

  // Filtered Payments
  const filteredPayments = payments.filter((p) => {
    // Tab filter
    if (filterTab === "PENDING_VERIFICATION") {
      if (p.status !== "SUBMITTED" && p.status !== "UNDER_REVIEW") return false;
    } else if (filterTab === "PAID") {
      if (p.status !== "PAID") return false;
    } else if (filterTab === "REJECTED") {
      if (p.status !== "REJECTED") return false;
    }

    // Search query
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchOrder = p.order?.orderNumber?.toLowerCase().includes(q);
      const matchFile = p.order?.fileName?.toLowerCase().includes(q);
      const matchName = p.user?.name?.toLowerCase().includes(q);
      const matchPhone = p.user?.phone?.toLowerCase().includes(q);
      const matchEmail = p.user?.email?.toLowerCase().includes(q);
      const matchTx = p.transactionId?.toLowerCase().includes(q);
      return matchOrder || matchFile || matchName || matchPhone || matchEmail || matchTx;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0B1D3A]">Payment Verification Center</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Verify customer UPI / Google Pay transactions against merchant records
          </p>
        </div>
        <button
          onClick={fetchPayments}
          disabled={loading}
          className="px-4 py-2 bg-white border border-gray-200 text-[#0B1D3A] rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors flex items-center gap-2 shadow-sm self-start"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh Records
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass rounded-2xl p-5 border border-blue-500/30 bg-blue-50/30">
          <Clock className="w-5 h-5 text-blue-600 mb-2" />
          <div className="text-2xl font-black text-blue-600">{pendingCount}</div>
          <div className="text-xs text-blue-700 font-medium">Awaiting Verification</div>
        </div>

        <div className="glass rounded-2xl p-5 border border-emerald-500/20">
          <TrendingUp className="w-5 h-5 text-emerald-500 mb-2" />
          <div className="text-2xl font-black text-emerald-600">{formatCurrency(totalVerifiedRevenue)}</div>
          <div className="text-xs text-gray-500">Total Verified Revenue</div>
        </div>

        <div className="glass rounded-2xl p-5 border border-gray-200">
          <CheckCircle className="w-5 h-5 text-teal-600 mb-2" />
          <div className="text-2xl font-bold text-[#0B1D3A]">{verifiedCount}</div>
          <div className="text-xs text-gray-500">Verified & Paid Orders</div>
        </div>

        <div className="glass rounded-2xl p-5 border border-rose-500/20">
          <XCircle className="w-5 h-5 text-rose-500 mb-2" />
          <div className="text-2xl font-bold text-rose-600">{rejectedCount}</div>
          <div className="text-xs text-gray-500">Rejected Submissions</div>
        </div>
      </div>

      {/* Tabs and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Filter Tabs */}
        <div className="flex bg-gray-100 p-1 rounded-2xl text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setFilterTab("PENDING_VERIFICATION")}
            className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-2 ${
              filterTab === "PENDING_VERIFICATION"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <span>Pending Verification</span>
            {pendingCount > 0 && (
              <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setFilterTab("PAID")}
            className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
              filterTab === "PAID" ? "bg-white text-emerald-600 shadow-sm" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Verified ({verifiedCount})
          </button>
          <button
            onClick={() => setFilterTab("REJECTED")}
            className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
              filterTab === "REJECTED" ? "bg-white text-rose-600 shadow-sm" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Rejected ({rejectedCount})
          </button>
          <button
            onClick={() => setFilterTab("ALL")}
            className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
              filterTab === "ALL" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            All ({payments.length})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[280px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by UTR, Order ID, name, phone..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-blue-500 bg-white"
          />
        </div>
      </div>

      {/* Payments Table */}
      <div className="glass rounded-3xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/80 text-left">
                <th className="px-4 py-3.5 text-xs text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-4 py-3.5 text-xs text-gray-500 uppercase tracking-wider">Order</th>
                <th className="px-4 py-3.5 text-xs text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-4 py-3.5 text-xs text-gray-500 uppercase tracking-wider">UTR / Ref No.</th>
                <th className="px-4 py-3.5 text-xs text-gray-500 uppercase tracking-wider">Proof</th>
                <th className="px-4 py-3.5 text-xs text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3.5 text-xs text-gray-500 uppercase tracking-wider">Submitted</th>
                <th className="px-4 py-3.5 text-xs text-gray-500 uppercase tracking-wider text-right">Verification Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={8} className="px-4 py-4">
                      <div className="h-10 skeleton rounded-xl" />
                    </td>
                  </tr>
                ))
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-gray-400">
                    <CreditCard className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="font-semibold text-gray-600">No payment records found</p>
                    <p className="text-xs mt-1">There are no records matching your current filter.</p>
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => {
                  const isPending = p.status === "SUBMITTED" || p.status === "UNDER_REVIEW";

                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-blue-50/30 transition-colors ${
                        isPending ? "bg-blue-50/15 font-normal" : ""
                      }`}
                    >
                      {/* Customer */}
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-[#0B1D3A]">{p.user?.name || "Customer"}</div>
                        <div className="text-xs text-gray-500 font-mono">{p.user?.phone || p.user?.email}</div>
                      </td>

                      {/* Order info */}
                      <td className="px-4 py-3.5">
                        <Link
                          href={`/dashboard/orders/${p.order?.id}`}
                          className="font-mono text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
                        >
                          {p.order?.orderNumber}
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                        <div className="text-xs text-gray-500 truncate max-w-[130px]" title={p.order?.fileName}>
                          {p.order?.fileName}
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-3.5">
                        <span className="font-bold text-[#0B1D3A] text-base">{formatCurrency(p.amount)}</span>
                      </td>

                      {/* UTR */}
                      <td className="px-4 py-3.5">
                        {p.transactionId ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded text-gray-800 font-semibold">
                              {p.transactionId}
                            </span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(p.transactionId || "");
                                toast.success("UTR copied to clipboard");
                              }}
                              className="p-1 hover:bg-gray-200 rounded text-gray-500"
                              title="Copy UTR"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">No UTR provided</span>
                        )}
                      </td>

                      {/* Proof Screenshot */}
                      <td className="px-4 py-3.5">
                        {p.paymentProofUrl ? (
                          <button
                            onClick={() => setSelectedProofUrl(p.paymentProofUrl)}
                            className="relative group block w-11 h-11 rounded-lg overflow-hidden border border-gray-200 hover:border-blue-500 transition-all shadow-sm"
                            title="Click to view full screenshot"
                          >
                            <img
                              src={p.paymentProofUrl}
                              alt="Proof"
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                              <Eye className="w-4 h-4" />
                            </div>
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <span
                          className={`text-xs px-2.5 py-1 rounded-lg border font-semibold inline-block ${
                            PAYMENT_STATUS_COLORS[p.status] || "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {PAYMENT_STATUS_LABELS[p.status] || p.status}
                        </span>
                        {p.rejectionReason && (
                          <div className="text-[11px] text-rose-500 mt-0.5 max-w-[120px] truncate" title={p.rejectionReason}>
                            Reason: {p.rejectionReason}
                          </div>
                        )}
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3.5 text-xs text-gray-500 whitespace-nowrap">
                        {formatDate(p.createdAt)}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Official Payment Receipt for All Users */}
                          <button
                            type="button"
                            onClick={() => openPaymentReceipt(p)}
                            className="px-2.5 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors shadow-xs cursor-pointer"
                            title="View Official Payment Receipt"
                          >
                            <FileText className="w-3.5 h-3.5" /> Receipt
                          </button>

                          {isPending ? (
                            <>
                              {p.status === "SUBMITTED" && (
                                <button
                                  onClick={() => {
                                    setActionPayment(p);
                                    setActionType("UNDER_REVIEW");
                                    handleVerifyAction();
                                  }}
                                  className="px-2 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 rounded-lg text-xs font-semibold transition-colors"
                                  title="Mark as reviewing"
                                >
                                  Reviewing
                                </button>
                              )}

                              <button
                                onClick={() => {
                                  setActionPayment(p);
                                  setActionType("REJECT");
                                  setRejectionReason("");
                                }}
                                className="px-2.5 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                                title="Reject payment"
                              >
                                <X className="w-3.5 h-3.5" /> Reject
                              </button>

                              <button
                                onClick={() => {
                                  setActionPayment(p);
                                  setActionType("APPROVE");
                                }}
                                className="px-3 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm transition-colors"
                                title="Verify and Approve Payment"
                              >
                                <Check className="w-3.5 h-3.5" /> Approve
                              </button>
                            </>
                          ) : (
                            <div className="text-xs">
                              {p.status === "PAID" && (
                                <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1">
                                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Verified
                                </span>
                              )}
                              {p.status === "REJECTED" && (
                                <span className="text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1">
                                  <XCircle className="w-3.5 h-3.5 text-rose-600" /> Rejected
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================ */}
      {/* VERIFY / APPROVE / REJECT CONFIRMATION MODAL */}
      {/* ============================================================ */}
      <AnimatePresence>
        {actionPayment && actionType && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl p-6 space-y-5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      actionType === "APPROVE" ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
                    }`}
                  >
                    {actionType === "APPROVE" ? <CheckCircle className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#0B1D3A]">
                      {actionType === "APPROVE" ? "Approve Payment" : "Reject Payment"}
                    </h3>
                    <p className="text-xs text-gray-500">Order #{actionPayment.order?.orderNumber}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setActionPayment(null);
                    setActionType(null);
                  }}
                  className="p-1 hover:bg-gray-100 rounded-full text-gray-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Payment Details Preview */}
              <div className="bg-gray-50 rounded-2xl p-4 text-xs space-y-2 border border-gray-100">
                <div className="flex justify-between">
                  <span className="text-gray-500">Customer:</span>
                  <span className="font-semibold text-gray-800">{actionPayment.user?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Payable Amount:</span>
                  <span className="font-bold text-gray-800 text-sm">{formatCurrency(actionPayment.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Submitted UTR / Ref:</span>
                  <span className="font-mono font-bold text-blue-600">{actionPayment.transactionId || "Proof uploaded"}</span>
                </div>
              </div>

              {/* Rejection Reason Input (Mandatory if REJECT) */}
              {actionType === "REJECT" && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-rose-600">
                    Rejection Reason <span className="text-red-500">* (Customer will see this)</span>
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="e.g. UTR reference not found in Google Pay business statement, or incorrect amount received."
                    className="w-full p-3 rounded-xl border border-gray-300 text-xs focus:outline-none focus:border-rose-500"
                  />
                  <div className="flex flex-wrap gap-1 mt-1">
                    {[
                      "UTR not found in merchant records",
                      "Amount mismatch in statement",
                      "Duplicate reference submitted",
                      "Screenshot unreadable",
                    ].map((reason) => (
                      <button
                        key={reason}
                        type="button"
                        onClick={() => setRejectionReason(reason)}
                        className="text-[11px] bg-gray-100 hover:bg-gray-200 px-2 py-0.5 rounded text-gray-700"
                      >
                        {reason}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Admin Internal Notes (Optional) */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-600">
                  Admin Internal Note <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="e.g. Verified on Axis Bank / GPay Business Soundbox"
                  className="w-full p-2.5 rounded-xl border border-gray-300 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setActionPayment(null);
                    setActionType(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold text-xs hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={processingAction || (actionType === "REJECT" && !rejectionReason.trim())}
                  onClick={handleVerifyAction}
                  className={`flex-1 py-2.5 rounded-xl font-bold text-xs text-white transition-all shadow-md disabled:opacity-50 ${
                    actionType === "APPROVE"
                      ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/25"
                      : "bg-rose-600 hover:bg-rose-700 shadow-rose-500/25"
                  }`}
                >
                  {processingAction
                    ? "Updating..."
                    : actionType === "APPROVE"
                    ? "Confirm & Approve Payment"
                    : "Confirm Rejection"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/* PROOF SCREENSHOT LIGHTBOX MODAL */}
      {/* ============================================================ */}
      <AnimatePresence>
        {selectedProofUrl && (
          <div
            onClick={() => setSelectedProofUrl(null)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm cursor-zoom-out"
          >
            <div className="relative max-w-2xl max-h-[90vh] bg-white rounded-3xl overflow-hidden shadow-2xl p-3">
              <div className="flex justify-between items-center mb-2 px-2">
                <span className="text-xs font-bold text-gray-600">Customer Uploaded Payment Proof</span>
                <button
                  onClick={() => setSelectedProofUrl(null)}
                  className="text-gray-400 hover:text-gray-700 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <img
                src={selectedProofUrl}
                alt="Payment Proof"
                className="max-h-[80vh] w-auto object-contain rounded-xl mx-auto"
              />
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Official Payment Receipt Modal for All Users */}
      <PaymentReceiptModal
        isOpen={!!selectedReceipt}
        onClose={() => setSelectedReceipt(null)}
        data={selectedReceipt}
      />
    </div>
  );
}

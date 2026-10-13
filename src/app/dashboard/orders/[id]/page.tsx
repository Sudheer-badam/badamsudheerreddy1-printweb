"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  Clock,
  CheckCircle,
  Printer,
  Package,
  Truck,
  XCircle,
  Download,
  ShieldCheck,
  RefreshCw,
  Copy,
  Trash2,
  AlertTriangle,
  QrCode,
  Eye,
  Info,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency, formatDate, ORDER_STATUS_LABELS, PAYMENT_STATUS_COLORS, PAYMENT_STATUS_LABELS } from "@/lib/utils";
import { toast } from "sonner";
import { upload } from "@vercel/blob/client";

interface OrderDetail {
  id: string;
  orderNumber: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  totalPages: number;
  colorPages: number;
  bwPages: number;
  paperSize: string;
  orientation: string;
  printSide: string;
  printColor: string;
  copies: number;
  binding: boolean;
  lamination: boolean;
  paperQuality: string;
  instructions: string | null;
  colorPrice: number;
  bwPrice: number;
  bindingCost: number;
  laminationCost: number;
  subtotal: number;
  gstRate: number;
  gstAmount: number;
  discount: number;
  documents?: any[];
  totalAmount: number;
  status: string;
  paymentStatus: string;
  paymentProofUrl: string | null;
  rejectionReason: string | null;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  payments?: {
    id: string;
    amount: number;
    method: string | null;
    status: string;
    transactionId: string | null;
    paymentProofUrl: string | null;
    rejectionReason: string | null;
    adminNotes: string | null;
    verifiedAt: string | null;
    verifiedBy: string | null;
    createdAt: string;
  }[];
  statusHistory: {
    id: string;
    status: string;
    notes: string | null;
    createdAt: string;
  }[];
  user: { name: string; email: string; phone: string };
  review?: { id: string; rating: number; comment: string | null };
}

const STATUS_STEPS = [
  { status: "UPLOADED", icon: FileText, label: "Uploaded" },
  { status: "VERIFIED", icon: CheckCircle, label: "Verified" },
  { status: "ACCEPTED", icon: CheckCircle, label: "Accepted" },
  { status: "PRINTING", icon: Printer, label: "Printing" },
  { status: "PRINTED", icon: Printer, label: "Printed" },
  { status: "READY_FOR_PICKUP", icon: Package, label: "Ready" },
  { status: "DELIVERED", icon: Truck, label: "Delivered" },
  { status: "COMPLETED", icon: CheckCircle, label: "Completed" },
];

const STATUS_ORDER = [
  "UPLOADED", "VERIFIED", "ACCEPTED", "PRINTING",
  "PRINTED", "READY_FOR_PICKUP", "DELIVERED", "COMPLETED",
];

export default function OrderDetailPage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Merchant Settings
  const [merchantUpiId, setMerchantUpiId] = useState(
    process.env.NEXT_PUBLIC_MERCHANT_UPI_ID || "gpay-12208028036@okbizaxis"
  );
  const [merchantName, setMerchantName] = useState(
    process.env.NEXT_PUBLIC_MERCHANT_NAME || "SUDHEER REDDY PRINTING SHOP"
  );
  const [merchantQrImage, setMerchantQrImage] = useState(
    process.env.NEXT_PUBLIC_MERCHANT_QR_IMAGE || "/payments/gpay-merchant-qr.png"
  );

  // Payment Modal States
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [qrType, setQrType] = useState<"DYNAMIC" | "MERCHANT">("DYNAMIC");
  const [transactionId, setTransactionId] = useState("");
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [selectedProofPreview, setSelectedProofPreview] = useState<string | null>(null);

  // Review States
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  // Fetch Admin Settings for Merchant info
  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data?.upiId) setMerchantUpiId(data.upiId);
        if (data?.merchantName) setMerchantName(data.merchantName);
        if (data?.merchantQrImage) setMerchantQrImage(data.merchantQrImage);
      })
      .catch(() => {});
  }, []);

  // Poll Order
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (user && params.id) {
      fetchOrder();
      // Poll every 3 seconds for live updates
      interval = setInterval(() => {
        fetchOrderSilent();
      }, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [user, params.id]);

  const fetchOrderSilent = async () => {
    try {
      const res = await fetch(`/api/orders/${params.id}?uid=${user?.uid}`);
      if (res.ok) {
        const data = await res.json();
        setOrder(data);
      }
    } catch {
      // Ignore silent polling error
    }
  };

  const fetchOrder = async () => {
    try {
      const res = await fetch(`/api/orders/${params.id}?uid=${user?.uid}`);
      if (res.ok) {
        const data = await res.json();
        setOrder(data);
      } else {
        router.push("/dashboard/orders");
      }
    } finally {
      setLoading(false);
    }
  };

  const copyUpiId = () => {
    navigator.clipboard.writeText(merchantUpiId);
    toast.success("Merchant UPI ID copied: " + merchantUpiId);
  };

  const copyOrderId = () => {
    navigator.clipboard.writeText(order?.orderNumber || "");
    toast.success("Order ID copied!");
  };

  const handleDownloadQr = () => {
    if (!order) return;
    const qrUrl =
      qrType === "DYNAMIC"
        ? `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(
            `upi://pay?pa=${merchantUpiId}&pn=${merchantName}&am=${order.totalAmount.toFixed(2)}&cu=INR&tn=Order ${order.orderNumber}`
          )}`
        : merchantQrImage;

    const link = document.createElement("a");
    link.href = qrUrl;
    link.target = "_blank";
    link.download = `PrintDocker-QR-${order.orderNumber}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("QR code download initiated");
  };

  const handlePaymentSubmission = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!order || !user) return;

    const cleanTx = transactionId.trim();
    if (!cleanTx && !screenshotFile) {
      toast.error("Please enter your 12-digit UPI UTR number or upload a screenshot as proof of payment.");
      return;
    }

    if (cleanTx && cleanTx.length < 6) {
      toast.error("Please enter a valid UPI transaction reference number (typically 12 digits).");
      return;
    }

    setSubmittingPayment(true);
    try {
      let paymentProofUrl = null;

      if (screenshotFile) {
        toast.loading("Uploading payment screenshot securely...", { id: "screenshot-upload" });
        const storageKey = `payments/${user.uid}/${Date.now()}-${screenshotFile.name.replace(/\s+/g, "_")}`;
        const newBlob = await upload(storageKey, screenshotFile, {
          access: "public",
          handleUploadUrl: "/api/upload",
        });
        paymentProofUrl = newBlob.url;
        toast.dismiss("screenshot-upload");
      }

      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: user.uid,
          orderId: order.id,
          transactionId: cleanTx || "SCREENSHOT_PROOF",
          paymentProofUrl,
          method: "GOOGLEPAY",
          upiId: merchantUpiId,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Payment submitted! Verification pending by store admin.");
        setShowPaymentModal(false);
        setTransactionId("");
        setScreenshotFile(null);
        setScreenshotPreview(null);
        fetchOrder();
      } else {
        toast.error(data.error || "Payment submission failed. Please try again.");
      }
    } catch (error: any) {
      console.error(error);
      toast.dismiss("screenshot-upload");
      toast.error("Failed to submit payment. Please check your connection.");
    } finally {
      setSubmittingPayment(false);
    }
  };



  const deleteOrder = async () => {
    if (!confirm("Are you sure you want to permanently delete this order?")) return;
    try {
      const res = await fetch(`/api/orders/${order!.id}?uid=${user!.uid}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Order deleted successfully");
        router.push("/dashboard/orders");
      } else {
        toast.error("Failed to delete order");
      }
    } catch {
      toast.error("Failed to delete order");
    }
  };

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order || !user) return;
    setSubmittingReview(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          orderId: order.id,
          rating,
          comment,
        }),
      });
      if (res.ok) {
        toast.success("Thank you for your feedback!");
        fetchOrder();
      } else {
        toast.error("Failed to submit feedback");
      }
    } catch {
      toast.error("Failed to submit feedback");
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 max-w-3xl">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 skeleton rounded-2xl" />
        ))}
      </div>
    );
  }

  if (!order) return null;

  const currentStepIndex = STATUS_ORDER.indexOf(order.status);
  const isCancelled = order.status === "CANCELLED";
  const latestPayment = order.payments && order.payments.length > 0 ? order.payments[0] : null;

  // Dynamic UPI URI with auto-filled order parameters
  const dynamicUpiUri = `upi://pay?pa=${encodeURIComponent(merchantUpiId)}&pn=${encodeURIComponent(
    merchantName
  )}&am=${order.totalAmount.toFixed(2)}&cu=INR&tn=${encodeURIComponent("Order " + order.orderNumber)}`;

  return (
    <>
      <div className="space-y-6 max-w-3xl">
        {/* Back navigation */}
        <div>
          <Link
            href="/dashboard/orders"
            className="inline-flex items-center gap-2 text-gray-500 hover:text-[#0B1D3A] text-sm transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Orders
          </Link>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold text-[#0B1D3A]">{order.fileName}</h1>
              <button
                onClick={copyOrderId}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#0B1D3A] mt-1 transition-colors"
                title="Click to copy Order ID"
              >
                <span className="font-mono">{order.orderNumber}</span>
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={deleteOrder}
                  className="p-1.5 rounded-lg text-gray-500 hover:text-red-500 hover:bg-red-50 border border-gray-200 transition-all"
                  title="Delete Order"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className={`px-3 py-1.5 rounded-xl text-sm font-medium border ${PAYMENT_STATUS_COLORS[order.paymentStatus] || "bg-gray-100 text-gray-700"}`}>
                  {PAYMENT_STATUS_LABELS[order.paymentStatus] || order.paymentStatus}
                </div>
              </div>

              {(order.paymentStatus === "PENDING" || order.paymentStatus === "REJECTED") && !isCancelled && (
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  <button
                    onClick={() => setShowPaymentModal(true)}
                    className="px-4 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white rounded-xl text-xs sm:text-sm font-semibold hover:opacity-95 transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/25"
                  >
                    <QrCode className="w-4 h-4" />
                    {order.paymentStatus === "REJECTED" ? "Resubmit Google Pay Details" : "Pay with Google Pay"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* PAYMENT STATUS BANNERS */}
        {/* ============================================================ */}

        {/* 1. PAYMENT SUBMITTED — VERIFICATION PENDING */}
        {(order.paymentStatus === "SUBMITTED" || order.paymentStatus === "UNDER_REVIEW") && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-6 text-white shadow-xl shadow-blue-500/20"
          >
            <div className="flex items-start justify-between gap-4 flex-wrap sm:flex-nowrap">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shrink-0 mt-0.5">
                  <Clock className="w-6 h-6 text-white animate-pulse" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-1">
                    Verification In Progress
                  </div>
                  <h2 className="text-xl font-bold">Payment Submitted — Verification Pending</h2>
                  <p className="text-blue-100 text-sm mt-1 max-w-xl">
                    We received your payment details. Store admin is verifying the transaction with the Google Pay for Business merchant account. Your documents will proceed to printing as soon as verification completes.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowPaymentModal(true)}
                className="shrink-0 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl px-4 py-2 text-xs font-semibold transition-colors"
              >
                Update Reference
              </button>
            </div>

            <div className="mt-5 pt-4 border-t border-white/15 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-black/10 rounded-xl p-3 border border-white/10">
                <span className="text-blue-200 block mb-0.5">Submitted UTR / Ref</span>
                <span className="font-mono font-bold text-sm text-white">
                  {latestPayment?.transactionId || "Proof Uploaded"}
                </span>
              </div>
              <div className="bg-black/10 rounded-xl p-3 border border-white/10">
                <span className="text-blue-200 block mb-0.5">Amount Submitted</span>
                <span className="font-bold text-sm text-white">{formatCurrency(order.totalAmount)}</span>
              </div>
              <div className="bg-black/10 rounded-xl p-3 border border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-blue-200 block mb-0.5">Payment Screenshot</span>
                  <span className="font-medium text-white">
                    {latestPayment?.paymentProofUrl || order.paymentProofUrl ? "Attached" : "Not Provided"}
                  </span>
                </div>
                {(latestPayment?.paymentProofUrl || order.paymentProofUrl) && (
                  <button
                    onClick={() => setSelectedProofPreview(latestPayment?.paymentProofUrl || order.paymentProofUrl)}
                    className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-white"
                    title="View uploaded proof"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* 2. PAYMENT REJECTED */}
        {order.paymentStatus === "REJECTED" && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-rose-500 to-red-600 rounded-3xl p-6 text-white shadow-xl shadow-red-500/20"
          >
            <div className="flex items-start justify-between gap-4 flex-wrap sm:flex-nowrap">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shrink-0 mt-0.5">
                  <AlertTriangle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-1">
                    Action Required
                  </div>
                  <h2 className="text-xl font-bold">Payment Verification Rejected</h2>
                  <p className="text-rose-100 text-sm mt-1">
                    The store administrator could not verify this transaction in the merchant records.
                  </p>
                  {(order.rejectionReason || latestPayment?.rejectionReason) && (
                    <div className="mt-3 p-3 bg-black/20 border border-white/20 rounded-xl text-sm">
                      <span className="font-semibold text-rose-200">Reason: </span>
                      <span className="text-white">{order.rejectionReason || latestPayment?.rejectionReason}</span>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={() => setShowPaymentModal(true)}
                className="shrink-0 bg-white text-rose-600 hover:bg-rose-50 font-bold px-4 py-2.5 rounded-xl text-sm shadow transition-colors"
              >
                Resubmit Payment Details
              </button>
            </div>
          </motion.div>
        )}

        {/* 3. PAYMENT SUCCESSFUL (PAID) */}
        {order.paymentStatus === "PAID" && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-3xl p-6 text-white shadow-xl shadow-emerald-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="inline-flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-1">
                  Payment Verified
                </div>
                <h2 className="text-xl font-bold">Payment Verified & Successful</h2>
                <p className="text-emerald-100 text-sm">
                  Verified by Print Docker Admin via Google Pay Merchant records.
                </p>
              </div>
            </div>

            <div className="w-full sm:w-auto flex flex-col gap-2">
              <button
                onClick={() => {
                  const baseUrl = window.location.origin;
                  const receiptHtml = `
                    <html>
                      <head>
                        <title>Receipt - ${order.orderNumber}</title>
                        <style>
                          body { font-family: 'Inter', sans-serif; padding: 40px; color: #0B1D3A; max-width: 800px; margin: 0 auto; }
                          .header { border-bottom: 2px solid #f3f4f6; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
                          .title { font-size: 24px; font-weight: 800; color: #2563eb; margin-bottom: 5px; }
                          .subtitle { color: #6b7280; font-size: 14px; }
                          .row { display: flex; justify-content: space-between; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px dashed #f3f4f6; }
                          .total { font-weight: 800; font-size: 20px; border-top: 2px solid #e5e7eb; border-bottom: none; padding-top: 20px; margin-top: 10px; color: #0B1D3A; }
                          .badge { background: #10b981; color: white; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: bold; }
                        </style>
                      </head>
                      <body>
                        <div class="header">
                          <div>
                            <div class="title">PRINT DOCKER</div>
                            <div class="subtitle">Merchant: ${merchantName}</div>
                            <div class="subtitle">UPI ID: ${merchantUpiId}</div>
                          </div>
                          <div style="text-align: right;">
                            <div style="font-weight: bold; margin-bottom: 5px;">Order #${order.orderNumber}</div>
                            <div class="badge">VERIFIED & PAID</div>
                          </div>
                        </div>
                        <div class="row"><span>Date & Time:</span> <strong>${new Date().toLocaleString("en-IN")}</strong></div>
                        <div class="row"><span>Customer:</span> <strong>${user?.displayName || user?.email || "Customer"}</strong></div>
                        <div class="row"><span>Payment Ref / UTR:</span> <strong>${latestPayment?.transactionId || order.orderNumber}</strong></div>
                        <br/>
                        <h3 style="margin-bottom: 15px; color: #4b5563;">Print Order Summary</h3>
                        <div class="row"><span>Document:</span> <strong>${order.fileName}</strong></div>
                        <div class="row"><span>Pages / Copies:</span> <strong>${order.totalPages} Pages • ${order.copies} Copies</strong></div>
                        <div class="row"><span>Print Mode:</span> <strong>${order.printColor} • ${order.paperSize}</strong></div>
                        <br/>
                        <div class="row total">
                          <span>Total Amount Paid:<br><span style="font-size: 10px; color: #666; font-weight: bold;">(Inclusive of all taxes)</span></span>
                          <span>₹${order.totalAmount.toFixed(2)}</span>
                        </div>
                        <div style="text-align: center; color: #9ca3af; font-size: 14px; margin-top: 40px;">
                          Thank you for your business!
                        </div>
                        <script>window.onload = function() { window.print(); }</script>
                      </body>
                    </html>
                  `;
                  const printWindow = window.open("", "", "width=800,height=900");
                  if (printWindow) {
                    printWindow.document.open();
                    printWindow.document.write(receiptHtml);
                    printWindow.document.close();
                  }
                }}
                className="bg-white text-emerald-600 font-bold py-2.5 px-4 rounded-xl shadow hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <Download className="w-4 h-4" /> Download Official Receipt
              </button>
            </div>
          </motion.div>
        )}

        {/* 4. PAYMENT PENDING NOTICE */}
        {order.paymentStatus === "PENDING" && !isCancelled && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-3 text-amber-800 text-sm">
            <div className="flex items-center gap-3">
              <Info className="w-5 h-5 text-amber-600 shrink-0" />
              <span>
                Please complete payment of <strong>{formatCurrency(order.totalAmount)}</strong> via Google Pay / UPI QR to proceed with printing.
              </span>
            </div>
            <button
              onClick={() => setShowPaymentModal(true)}
              className="px-3.5 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700 transition-colors shrink-0"
            >
              Pay Now
            </button>
          </div>
        )}

        {/* Status Timeline */}
        {!isCancelled ? (
          <div className="glass rounded-3xl p-6 border border-gray-200 overflow-hidden">
            <h2 className="font-bold text-[#0B1D3A] mb-6">Order Status</h2>
            <div className="overflow-x-auto pb-4">
              <div className="relative min-w-[700px] px-2">
                <div className="absolute top-5 left-7 right-7 h-0.5 bg-gray-100" />
                <div
                  className="absolute top-5 left-7 h-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-1000"
                  style={{
                    width: `calc(${Math.max(0, (currentStepIndex / (STATUS_STEPS.length - 1)) * 100)}% - 28px)`,
                  }}
                />
                <div className="relative flex justify-between">
                  {STATUS_STEPS.map((step, i) => {
                    const isDone = i <= currentStepIndex;
                    const isCurrent = i === currentStepIndex;
                    return (
                      <div key={step.status} className="flex flex-col items-center gap-2">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center border-2 z-10 transition-all ${
                            isDone
                              ? "bg-blue-600 border-blue-600 text-white"
                              : "bg-background border-gray-300 text-gray-300"
                          } ${isCurrent ? "ring-4 ring-blue-500/30" : ""}`}
                        >
                          <step.icon className="w-4 h-4" />
                        </div>
                        <span className={`text-xs text-center font-medium ${isDone ? "text-[#0B1D3A]" : "text-gray-400"}`}>
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="glass rounded-2xl p-5 border border-red-500/20 flex items-center gap-3">
            <XCircle className="w-6 h-6 text-red-400" />
            <div>
              <div className="font-semibold text-red-500">Order Cancelled</div>
              {order.adminNotes && <div className="text-sm text-gray-500 mt-0.5">{order.adminNotes}</div>}
            </div>
          </div>
        )}

        {/* Print Specifications & Cost Breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="glass rounded-2xl p-5 border border-gray-200">
            <h3 className="font-semibold text-[#0B1D3A] mb-4 text-sm">Print Specifications</h3>
            {order.documents && order.documents.length > 0 ? (
              <div className="space-y-6">
                {order.documents.map((doc: any, index: number) => (
                  <div key={index} className="space-y-2.5 text-sm pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                    <div className="font-semibold text-blue-600 mb-2 truncate" title={doc.fileName}>
                      {doc.fileName}
                    </div>
                    <DetailRow label="Paper Size" value={doc.paperSize} />
                    <DetailRow label="Orientation" value={doc.orientation} />
                    <DetailRow label="Print Side" value={doc.printSide === "SINGLE" ? "Single Side" : "Double Side"} />
                    <DetailRow label="Color Mode" value={doc.printColor === "COLOR" ? "Full Color" : "Black & White"} />
                    <DetailRow label="Copies" value={doc.copies.toString()} />
                    <DetailRow label="Total Pages" value={doc.totalPages.toString()} />
                    {doc.binding && <DetailRow label="Binding" value="Yes" />}
                    {doc.lamination && <DetailRow label="Lamination" value="Yes" />}
                    <DetailRow label="Paper Quality" value={doc.paperQuality} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2.5 text-sm">
                <DetailRow label="Paper Size" value={order.paperSize} />
                <DetailRow label="Orientation" value={order.orientation} />
                <DetailRow label="Print Side" value={order.printSide === "SINGLE" ? "Single Side" : "Double Side"} />
                <DetailRow label="Color Mode" value={order.printColor === "COLOR" ? "Full Color" : "Black & White"} />
                <DetailRow label="Copies" value={order.copies.toString()} />
                <DetailRow label="Total Pages" value={order.totalPages.toString()} />
                {order.binding && <DetailRow label="Binding" value="Yes" />}
                {order.lamination && <DetailRow label="Lamination" value="Yes" />}
                <DetailRow label="Paper Quality" value={order.paperQuality} />
              </div>
            )}
          </div>

          <div className="glass rounded-2xl p-5 border border-gray-200">
            <h3 className="font-semibold text-[#0B1D3A] mb-4 text-sm">Cost Breakdown</h3>
            <div className="space-y-2.5 text-sm">
              {order.printColor === "COLOR" && order.colorPrice > 0 && (
                <DetailRow
                  label="Color Print Charges"
                  value={formatCurrency(order.colorPrice * order.colorPages * order.copies)}
                />
              )}
              <DetailRow
                label="B&W Print Charges"
                value={formatCurrency(order.bwPrice * order.bwPages * order.copies)}
              />
              {order.binding && <DetailRow label="Binding Charges" value={formatCurrency(order.bindingCost)} />}
              {order.lamination && <DetailRow label="Lamination Charges" value={formatCurrency(order.laminationCost)} />}
              <DetailRow label="Subtotal" value={formatCurrency(order.subtotal)} />
              {order.discount > 0 && (
                <DetailRow label="Discount" value={`- ${formatCurrency(order.discount)}`} />
              )}
              <div className="border-t border-gray-200 pt-3 flex justify-between font-bold">
                <div className="flex flex-col">
                  <span className="text-[#0B1D3A] text-sm">Final Payable Amount</span>
                  <span className="text-[10px] text-gray-500 font-medium">(Inclusive of GST taxes)</span>
                </div>
                <span className="text-xl font-extrabold text-blue-600">{formatCurrency(order.totalAmount)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        {order.instructions && (
          <div className="glass rounded-2xl p-5 border border-gray-200">
            <h3 className="font-semibold text-[#0B1D3A] mb-2 text-sm">Special Instructions</h3>
            <p className="text-gray-600 text-sm">{order.instructions}</p>
          </div>
        )}

        {/* Order History */}
        {order.statusHistory && order.statusHistory.length > 0 && (
          <div className="glass rounded-3xl p-6 border border-gray-200">
            <h2 className="font-bold text-[#0B1D3A] mb-4">Activity & Audit Timeline</h2>
            <div className="relative pl-5 space-y-4">
              <div className="absolute left-1.5 top-0 bottom-0 w-0.5 bg-gray-100" />
              {order.statusHistory.map((entry) => (
                <div key={entry.id} className="relative flex items-start gap-3">
                  <div className="absolute -left-4 top-1 w-2.5 h-2.5 rounded-full bg-blue-600 border-2 border-background" />
                  <div>
                    <div className="text-sm font-semibold text-[#0B1D3A]">{ORDER_STATUS_LABELS[entry.status] || entry.status}</div>
                    {entry.notes && <div className="text-xs text-gray-500">{entry.notes}</div>}
                    <div className="text-[11px] text-gray-400 mt-0.5">{formatDate(entry.createdAt)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* GOOGLE PAY / UPI QR PAYMENT MODAL */}
      {/* ============================================================ */}
      <AnimatePresence>
        {showPaymentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#0B1D3A]/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col border border-gray-100"
            >
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-[#0B1D3A] via-indigo-950 to-[#0B1D3A] p-5 text-white flex justify-between items-center border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/10">
                    <QrCode className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold">Google Pay for Business Payment</h3>
                    <p className="text-xs text-blue-200">
                      Scan Merchant QR code with Google Pay • 0% Fee UPI
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="p-2 hover:bg-white/20 rounded-full transition-colors text-white"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
                {/* Order & Amount Header Box */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200/70 rounded-2xl p-4 flex justify-between items-center">
                  <div>
                    <span className="text-xs text-gray-500 font-medium">Order Reference</span>
                    <div className="font-mono font-bold text-sm text-[#0B1D3A]">{order.orderNumber}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-gray-500 font-medium">Payable Amount</span>
                    <div className="text-2xl font-black text-blue-600">{formatCurrency(order.totalAmount)}</div>
                  </div>
                </div>

                {/* GOOGLE PAY / UPI QR PAYMENT */}
                <div className="space-y-5">
                    {/* QR Type Switcher */}
                    <div className="flex rounded-xl bg-gray-100 p-1 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setQrType("DYNAMIC")}
                    className={`flex-1 py-2 rounded-lg transition-all ${
                      qrType === "DYNAMIC"
                        ? "bg-white text-blue-600 shadow-sm"
                        : "text-gray-500 hover:text-gray-800"
                    }`}
                  >
                    Auto-Fill Amount QR (₹{order.totalAmount.toFixed(2)})
                  </button>
                  <button
                    type="button"
                    onClick={() => setQrType("MERCHANT")}
                    className={`flex-1 py-2 rounded-lg transition-all ${
                      qrType === "MERCHANT"
                        ? "bg-white text-blue-600 shadow-sm"
                        : "text-gray-500 hover:text-gray-800"
                    }`}
                  >
                    Google Pay Merchant QR
                  </button>
                </div>

                {/* QR Display Area */}
                <div className="flex flex-col items-center">
                  <div className="bg-white p-3.5 rounded-2xl border-2 border-indigo-100 shadow-md mb-3 relative group">
                    <img
                      src={
                        qrType === "DYNAMIC"
                          ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
                              dynamicUpiUri
                            )}`
                          : merchantQrImage
                      }
                      alt="Google Pay / UPI QR Code"
                      className="w-44 h-44 object-contain rounded-lg"
                    />
                  </div>

                  {/* Merchant info */}
                  <div className="text-center space-y-1 mb-2">
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Merchant Name</div>
                    <div className="font-bold text-[#0B1D3A] text-sm">{merchantName}</div>
                  </div>

                  {/* Copy UPI ID Button */}
                  <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs text-gray-600">
                    <span className="font-mono text-gray-800">{merchantUpiId}</span>
                    <button
                      onClick={copyUpiId}
                      className="p-1 hover:bg-gray-200 rounded text-blue-600 transition-colors"
                      title="Copy UPI ID"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Actions: Download QR */}
                  <div className="flex flex-wrap items-center justify-center gap-2 mt-3 w-full">
                    <button
                      type="button"
                      onClick={handleDownloadQr}
                      className="px-3.5 py-1.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" /> Download QR
                    </button>
                  </div>
                </div>

                {/* Security Badge Warning */}
                <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-3.5 flex items-start gap-3 text-xs text-amber-900">
                  <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-amber-800">100% Secure Merchant Payment</div>
                    <p className="mt-0.5 text-amber-700 leading-relaxed">
                      Never enter or share your UPI PIN or bank OTP here. Print Docker will <strong>NEVER</strong> ask for your PIN. You only enter your PIN securely inside your official UPI app.
                    </p>
                  </div>
                </div>

                {/* Payment Verification Submission Form */}
                <form onSubmit={handlePaymentSubmission} className="space-y-4 pt-2 border-t border-gray-100">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#0B1D3A] mb-1.5">
                      UPI Transaction ID / 12-Digit UTR <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      placeholder="e.g. 412389123456 (Found in GPay transaction details)"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-mono"
                    />
                    <p className="text-[11px] text-gray-400 mt-1">
                      Open your UPI app payment receipt and copy the 12-digit UPI Ref ID / UTR.
                    </p>
                  </div>

                  {/* Payment Screenshot (Optional but recommended) */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#0B1D3A] mb-1.5">
                      Payment Screenshot Proof <span className="text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 10 * 1024 * 1024) {
                            toast.error("File size must be under 10MB");
                            return;
                          }
                          setScreenshotFile(file);
                          setScreenshotPreview(URL.createObjectURL(file));
                        }
                      }}
                      className="w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                    />

                    {screenshotPreview && (
                      <div className="mt-2 relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50 p-1 flex items-center justify-between">
                        <img
                          src={screenshotPreview}
                          alt="Screenshot Proof"
                          className="h-16 w-16 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setScreenshotFile(null);
                            setScreenshotPreview(null);
                          }}
                          className="text-xs text-red-500 hover:text-red-700 px-3 py-1 font-semibold"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={submittingPayment || (!transactionId.trim() && !screenshotFile)}
                    className="w-full py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white rounded-xl font-bold text-sm hover:opacity-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25"
                  >
                    {submittingPayment ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> Submitting for Verification...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" /> Submit Payment for Verification
                      </>
                    )}
                  </button>

                  <p className="text-[11px] text-center text-gray-400">
                    Status will become <strong>Payment Submitted — Verification Pending</strong> until shop admin verifies the credit.
                  </p>
                </form>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>

      {/* Lightbox / Image Preview Modal */}
      <AnimatePresence>
        {selectedProofPreview && (
          <div
            onClick={() => setSelectedProofPreview(null)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm cursor-zoom-out"
          >
            <div className="relative max-w-xl max-h-[85vh] bg-white rounded-2xl overflow-hidden shadow-2xl p-2">
              <img
                src={selectedProofPreview}
                alt="Payment Proof"
                className="max-h-[80vh] w-auto object-contain rounded-xl"
              />
            </div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-500">{label}</span>
      <span className="text-[#0B1D3A] font-medium">{value}</span>
    </div>
  );
}

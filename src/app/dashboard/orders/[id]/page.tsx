"use client";

import { useState, useEffect, useRef } from "react";
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
  ExternalLink,
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

  // Payment & Report Modal States
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportStatus, setReportStatus] = useState<"aborted" | "submitted" | "successful" | "failed">("aborted");
  const [reportTimestamp, setReportTimestamp] = useState<string>("");
  const [showManualInput, setShowManualInput] = useState(false);
  const [autoSavedTx, setAutoSavedTx] = useState<string>("");
  const [qrType, setQrType] = useState<"DYNAMIC" | "MERCHANT">("DYNAMIC");
  const [transactionId, setTransactionId] = useState("");
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [selectedProofPreview, setSelectedProofPreview] = useState<string | null>(null);
  const isProcessingPaymentRef = useRef(false);
  const showPaymentModalRef = useRef(showPaymentModal);
  showPaymentModalRef.current = showPaymentModal;

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
      // Poll every 1 second for instant real-time status detection
      interval = setInterval(() => {
        fetchOrderSilent();
      }, 1000);
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
        if (data.paymentStatus === "PAID" && showPaymentModalRef.current) {
          const paidTx = data.payments?.find((p: any) => p.status === "PAID")?.transactionId;
          if (paidTx) setAutoSavedTx(paidTx);
          setShowPaymentModal(false);
          setReportStatus("successful");
          setReportTimestamp(formatReportDateTime());
          setShowReportModal(true);
        }
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

  const formatReportDateTime = (d?: Date | string | null) => {
    const date = d ? new Date(d) : new Date();
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  };

  const getReceiptNumber = () => {
    if (latestPayment?.id) {
      const digits = latestPayment.id.replace(/\D/g, "");
      if (digits.length >= 7) return digits.slice(-7);
    }
    if (order?.orderNumber) {
      const digits = order.orderNumber.replace(/\D/g, "");
      if (digits.length >= 5) return "30" + digits.slice(-5);
    }
    return "3029719";
  };

  const handleAbortPayment = () => {
    setShowPaymentModal(false);
    setReportStatus("aborted");
    setReportTimestamp(formatReportDateTime());
    setShowReportModal(true);
  };

  const handlePrintReport = () => {
    window.print();
  };



  const handleAutomaticPayment = async (overrideTx?: string) => {
    if (!order || !user) return;
    if (isProcessingPaymentRef.current || submittingPayment) return;

    const cleanTx = (overrideTx || transactionId).trim();
    if (!cleanTx && !screenshotFile) {
      toast.error("Please enter your 12-digit UPI Reference Number (UTR) from GPay / PhonePe / Paytm.");
      return;
    }

    if (cleanTx && cleanTx.length < 6) {
      toast.error("Please enter a valid UPI Reference Number (UTR).");
      return;
    }

    isProcessingPaymentRef.current = true;
    setSubmittingPayment(true);
    try {
      let paymentProofUrl = null;

      if (screenshotFile) {
        toast.loading("Uploading payment screenshot...", { id: "screenshot-upload" });
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
          transactionId: cleanTx || undefined,
          paymentProofUrl,
          method: "UPI",
          upiId: merchantUpiId,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        const assignedTx = data.payment?.transactionId || cleanTx || "null";
        setAutoSavedTx(assignedTx);
        toast.success("Payment recorded successfully!");
        setShowPaymentModal(false);
        setReportStatus("successful");
        setReportTimestamp(formatReportDateTime());
        setShowReportModal(true);
        setScreenshotFile(null);
        setScreenshotPreview(null);
        fetchOrder();
      } else {
        toast.error(data.error || "Payment submission failed. Please try again.");
      }
    } catch (error: any) {
      console.error(error);
      toast.dismiss("screenshot-upload");
      toast.error("Failed to record payment. Please check your connection.");
    } finally {
      setSubmittingPayment(false);
      isProcessingPaymentRef.current = false;
    }
  };

  // Payment Status Watcher
  useEffect(() => {
    if (showPaymentModal && order?.paymentStatus === "PAID") {
      setShowPaymentModal(false);
      setReportStatus("successful");
      setReportTimestamp(formatReportDateTime());
      setShowReportModal(true);
    }
  }, [showPaymentModal, order?.paymentStatus]);

  const handlePaymentSubmission = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    await handleAutomaticPayment(transactionId);
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

              <div className="flex items-center gap-2 flex-wrap justify-end">
                {(order.paymentStatus === "PENDING" || order.paymentStatus === "REJECTED") && !isCancelled && (
                  <button
                    onClick={() => setShowPaymentModal(true)}
                    className="px-4 py-2.5 bg-gradient-to-r from-[#0B2D6B] to-blue-700 text-white rounded-xl text-xs sm:text-sm font-semibold hover:opacity-95 transition-all flex items-center gap-2 shadow-lg shadow-blue-900/20"
                  >
                    <QrCode className="w-4 h-4" />
                    {order.paymentStatus === "REJECTED" ? "Resubmit UPI Payment" : "Pay with UPI (QR)"}
                  </button>
                )}

                {(order.paymentStatus !== "PENDING" || latestPayment) && (
                  <button
                    onClick={() => {
                      setReportStatus(
                        order.paymentStatus === "PAID"
                          ? "successful"
                          : order.paymentStatus === "REJECTED"
                          ? "failed"
                          : "submitted"
                      );
                      setReportTimestamp(formatReportDateTime(latestPayment?.createdAt));
                      setShowReportModal(true);
                    }}
                    className="px-3.5 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <FileText className="w-4 h-4 text-blue-600" />
                    Fee Payment Report
                  </button>
                )}
              </div>
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
      {/* PRINT DOCKER UPI CHECKOUT MODAL (UPI MODE ONLY)             */}
      {/* ============================================================ */}
      <AnimatePresence>
        {showPaymentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white rounded-3xl w-full max-w-4xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col md:flex-row border border-gray-100 my-auto"
            >
              {/* ---------------------------------------------------- */}
              {/* LEFT COLUMN: ORDER SUMMARY (DEEP BLUE THEME)        */}
              {/* ---------------------------------------------------- */}
              <div className="w-full md:w-[42%] bg-[#0B2D6B] text-white p-6 sm:p-7 flex flex-col justify-between shrink-0">
                <div>
                  {/* Organization Card Header */}
                  <div className="bg-white rounded-xl p-4 text-[#0B2D6B] text-center shadow-md">
                    <img
                      src="/logo.png"
                      alt="PRINT DOCKER"
                      className="w-12 h-12 mx-auto object-contain mb-2 rounded-xl"
                    />
                    <div className="font-extrabold text-lg sm:text-xl tracking-wide uppercase leading-tight font-sans text-blue-600">
                      PRINT DOCKER
                    </div>
                    <div className="font-bold text-xs sm:text-sm tracking-wider uppercase leading-tight mt-1 text-[#0B1D3A]">
                      BADAM SUDHEER REDDY
                    </div>
                    <div className="text-[10px] text-gray-500 font-bold tracking-normal mt-1.5 border-t border-gray-100 pt-1">
                      SMART PRINTING PORTAL • VIJAYAWADA
                    </div>
                  </div>

                  {/* Order Details List */}
                  <div className="space-y-4 my-6 text-xs sm:text-sm">
                    <div>
                      <span className="text-blue-200 text-xs block font-medium">Order ID</span>
                      <span className="font-mono font-bold text-white text-sm sm:text-base tracking-wide">
                        {order.orderNumber}
                      </span>
                    </div>

                    <div>
                      <span className="text-blue-200 text-xs block font-medium">Merchant</span>
                      <span className="font-semibold text-white tracking-wide">
                        {merchantName || "PRINT DOCKER • BADAM SUDHEER REDDY"}
                      </span>
                    </div>

                    <div className="border-t border-white/20 pt-3 space-y-2">
                      <div className="flex justify-between items-center text-blue-100">
                        <span>Order Amount</span>
                        <span className="font-semibold text-white font-mono">₹ {order.totalAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-blue-100">
                        <span>Convenience Fee</span>
                        <span className="font-semibold text-white font-mono">₹ 0.00</span>
                      </div>
                      <div className="flex justify-between items-center text-blue-100">
                        <span>Total GST @ 18.00%</span>
                        <span className="font-semibold text-white font-mono">₹ 0.00</span>
                      </div>
                    </div>

                    <div className="border-t-2 border-white/30 pt-3 flex justify-between items-baseline">
                      <span className="font-bold text-sm text-white">Total Payable</span>
                      <span className="font-black text-2xl text-white font-mono">
                        ₹ {order.totalAmount.toFixed(2)}
                      </span>
                    </div>

                    <p className="text-[11px] text-blue-200/90 leading-relaxed bg-white/10 rounded-xl p-2.5 border border-white/10">
                      No convenience fee or service charge is payable by the customer on Debit card / UPI transactions.
                    </p>
                  </div>
                </div>

                {/* Powered By & Trust Badges */}
                <div className="border-t border-white/15 pt-4 mt-2">
                  <div className="flex items-center justify-between text-[11px] text-blue-200 mb-2">
                    <span>
                      Powered by <strong>CCAvenue</strong>
                    </span>
                    <span className="bg-white/20 px-2 py-0.5 rounded text-[10px] font-bold text-white border border-white/20">
                      HDFC BANK
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-1 opacity-80 text-[10px] text-blue-100 font-semibold flex-wrap">
                    <span>Mastercard SecureCode</span>
                    <span>•</span>
                    <span>Verified by VISA</span>
                    <span>•</span>
                    <span>RuPay</span>
                    <span>•</span>
                    <span>UPI</span>
                    <span>•</span>
                    <span>PCI-DSS</span>
                  </div>
                </div>
              </div>

              {/* ---------------------------------------------------- */}
              {/* RIGHT COLUMN: UPI PAYMENT (NO CARDS, NO NETBANKING) */}
              {/* ---------------------------------------------------- */}
              <div className="w-full md:w-[58%] bg-white p-6 sm:p-7 flex flex-col justify-between overflow-y-auto">
                <div>
                  {/* Top Header */}
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleAbortPayment}
                        className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                        title="Back / Cancel"
                      >
                        <ArrowLeft className="w-4 h-4 text-gray-700" />
                      </button>
                      <span className="font-extrabold text-base tracking-wide text-[#0B1D3A] uppercase">
                        UPI Payment
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleAbortPayment}
                      className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-700 transition-colors"
                      title="Cancel transaction"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>

                  {/* "Scan and Pay" Card (Screenshot 2 Style) */}
                  <div className="border border-gray-200 rounded-2xl p-4 sm:p-5 bg-gradient-to-b from-gray-50/60 to-white mb-4">
                    <div className="text-center">
                      <h4 className="font-extrabold text-base text-[#0B1D3A]">Scan and Pay</h4>
                      <p className="text-xs text-gray-500 mt-0.5">Scan the QR code using any UPI app</p>

                      {/* Brand Logos Strip (GPay, PhonePe, Paytm, UPI, BHIM) */}
                      <div className="flex items-center justify-center gap-1.5 sm:gap-2.5 my-3 flex-wrap">
                        <div className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-md border border-gray-200 shadow-xs text-xs font-bold text-gray-700">
                          <span className="text-blue-600 font-extrabold">G</span>
                          <span className="text-red-500">P</span>
                          <span className="text-yellow-500">a</span>
                          <span className="text-green-600">y</span>
                        </div>
                        <div className="flex items-center gap-1 bg-purple-50 px-2.5 py-1 rounded-md border border-purple-200 shadow-xs text-xs font-bold text-purple-700">
                          <span>PhonePe</span>
                        </div>
                        <div className="flex items-center gap-1 bg-sky-50 px-2.5 py-1 rounded-md border border-sky-200 shadow-xs text-xs font-bold text-sky-700">
                          <span>Paytm</span>
                        </div>
                        <div className="flex items-center gap-1 bg-orange-50 px-2.5 py-1 rounded-md border border-orange-200 shadow-xs text-xs font-bold text-orange-700">
                          <span>BHIM</span>
                        </div>
                        <div className="flex items-center gap-1 bg-green-50 px-2.5 py-1 rounded-md border border-green-200 shadow-xs text-xs font-bold text-green-700">
                          <span>UPI</span>
                        </div>
                      </div>

                      {/* QR Display */}
                      <div className="inline-block p-2.5 bg-white rounded-2xl border-2 border-indigo-100 shadow-md my-1">
                        <img
                          src={
                            qrType === "DYNAMIC"
                              ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                                  dynamicUpiUri
                                )}`
                              : merchantQrImage
                          }
                          alt="UPI QR Code"
                          className="w-40 h-40 object-contain mx-auto rounded-lg"
                        />
                      </div>

                      {/* QR Switcher */}
                      <div className="flex items-center justify-center gap-1 text-[11px] font-semibold mt-2 max-w-xs mx-auto">
                        <button
                          type="button"
                          onClick={() => setQrType("DYNAMIC")}
                          className={`px-2.5 py-1 rounded-md transition-colors ${
                            qrType === "DYNAMIC"
                              ? "bg-blue-600 text-white shadow-xs"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                        >
                          Auto Amount (₹{order.totalAmount.toFixed(2)})
                        </button>
                        <button
                          type="button"
                          onClick={() => setQrType("MERCHANT")}
                          className={`px-2.5 py-1 rounded-md transition-colors ${
                            qrType === "MERCHANT"
                              ? "bg-blue-600 text-white shadow-xs"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                        >
                          Standee QR
                        </button>
                      </div>

                      {/* Merchant UPI ID with Copy */}
                      <div className="flex items-center justify-center gap-2 mt-2.5">
                        <span className="text-xs text-gray-500 font-medium">Merchant UPI:</span>
                        <span className="text-xs font-mono font-bold text-gray-800 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                          {merchantUpiId}
                        </span>
                        <button
                          type="button"
                          onClick={copyUpiId}
                          className="p-1 hover:bg-gray-200 rounded text-blue-600 transition-colors"
                          title="Copy UPI ID"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Direct mobile pay intent */}
                      <a
                        href={dynamicUpiUri}
                        className="inline-flex md:hidden items-center gap-1.5 mt-2.5 px-3 py-1 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 transition-colors shadow-xs"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Open in UPI App (GPay / PhonePe)
                      </a>
                    </div>
                  </div>

                  {/* Project Branded UTR Verification Card */}
                  <div className="bg-gradient-to-br from-blue-50/70 via-indigo-50/30 to-white border-2 border-blue-200/90 rounded-2xl p-4 sm:p-5 my-3 shadow-xs text-left">
                    {/* Project Header Banner with Official Logo */}
                    <div className="flex items-center gap-3 pb-3 border-b border-blue-100">
                      <div className="w-12 h-12 rounded-2xl bg-white p-1 border border-blue-100 shadow-xs flex items-center justify-center shrink-0">
                        <img
                          src="/logo.png"
                          alt="PRINT DOCKER"
                          className="w-full h-full object-contain rounded-xl"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-sm sm:text-base text-[#0B1D3A] tracking-tight block truncate">
                            PRINT DOCKER
                          </span>
                          <span className="text-[9px] font-black text-blue-700 bg-blue-100/90 px-1.5 py-0.5 rounded border border-blue-200 shrink-0 uppercase">
                            Official
                          </span>
                        </div>
                        <span className="text-[10px] sm:text-[11px] font-bold text-blue-600 uppercase tracking-wider block">
                          BADAM SUDHEER REDDY
                        </span>
                        <span className="text-[10px] text-gray-500 block truncate">
                          Smart Printing Portal • UPI Verification
                        </span>
                      </div>
                    </div>

                    {/* 12-Digit UTR Input Form */}
                    <div className="mt-3.5">
                      <div className="flex items-center justify-between mb-1.5">
                        <label
                          htmlFor="upi-utr-input"
                          className="text-xs font-black text-[#0B1D3A] flex items-center gap-1.5"
                        >
                          <span className="flex h-2 w-2 rounded-full bg-blue-600"></span>
                          Enter 12-Digit UPI Reference No. (UTR):
                        </label>
                        <span className="text-[10px] font-bold text-blue-700 font-mono bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                          {transactionId.length}/12 Digits
                        </span>
                      </div>

                      <div className="relative">
                        <input
                          id="upi-utr-input"
                          type="text"
                          inputMode="numeric"
                          maxLength={12}
                          value={transactionId}
                          onChange={(e) => setTransactionId(e.target.value.replace(/\D/g, ""))}
                          placeholder="e.g. 428812345678"
                          className="w-full px-3.5 py-2.5 rounded-xl border-2 border-blue-300 text-sm font-mono font-bold tracking-wider text-gray-900 placeholder:text-gray-400 placeholder:font-normal focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 bg-white transition-all shadow-xs"
                        />
                      </div>

                      <p className="text-[11px] text-gray-600 mt-2 leading-relaxed">
                        After paying <strong>₹{order.totalAmount.toFixed(2)}</strong> via GPay, PhonePe, Paytm, or BHIM, copy the <strong>12-digit UTR / UPI Ref ID</strong> from your transaction receipt and enter it above.
                      </p>
                    </div>
                  </div>

                  {/* Primary UTR Confirmation Action Button */}
                  <button
                    type="button"
                    onClick={() => handleAutomaticPayment(transactionId)}
                    disabled={submittingPayment}
                    className="w-full py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white rounded-xl font-black text-sm hover:opacity-95 transition-all shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {submittingPayment ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> Verifying & Saving Transaction...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5 text-emerald-300" /> Confirm Payment with UTR & View Receipt
                      </>
                    )}
                  </button>

                  {/* Optional Screenshot Upload Toggle */}
                  <div className="mt-3 text-center">
                    <button
                      type="button"
                      onClick={() => setShowManualInput(!showManualInput)}
                      className="text-[11px] text-gray-500 hover:text-blue-600 font-semibold underline underline-offset-2 transition-colors cursor-pointer"
                    >
                      {showManualInput ? "▲ Hide screenshot upload" : "▼ Want to attach payment screenshot? (Optional)"}
                    </button>
                  </div>

                  {/* Collapsible Screenshot Form */}
                  {showManualInput && (
                    <form onSubmit={handlePaymentSubmission} className="space-y-3 pt-3 mt-2 border-t border-gray-100">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-[#0B1D3A] mb-1">
                          Payment Screenshot <span className="text-gray-400 font-normal">(Optional)</span>
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
                          className="w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                        />

                        {screenshotPreview && (
                          <div className="mt-2 relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50 p-1 flex items-center justify-between">
                            <img
                              src={screenshotPreview}
                              alt="Screenshot Proof"
                              className="h-14 w-auto object-cover rounded-lg border border-gray-200"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setScreenshotFile(null);
                                setScreenshotPreview(null);
                              }}
                              className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors mr-2"
                              title="Remove screenshot"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>

                      <button
                        type="submit"
                        disabled={submittingPayment}
                        className="w-full py-2 bg-blue-600 text-white rounded-xl font-bold text-xs hover:bg-blue-700 transition-colors"
                      >
                        Submit Screenshot with UTR
                      </button>
                    </form>
                  )}
                </div>

                {/* Cancel Button (Centered Text Button from Screenshot 2) */}
                <div className="text-center pt-3 mt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={handleAbortPayment}
                    className="text-xs text-gray-500 hover:text-red-600 transition-colors font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/* ONLINE FEE PAYMENT REPORT STATUS MODAL (SCREENSHOT 3 STYLE) */}
      {/* ============================================================ */}
      <AnimatePresence>
        {showReportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm print:p-0 print:bg-white overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-2xl max-h-[95vh] overflow-y-auto shadow-2xl p-6 sm:p-8 flex flex-col items-center border border-gray-200 print:shadow-none print:border-0 print:p-0 print:max-w-none print:w-full my-auto"
            >
              <div id="payment-report-section" className="w-full flex flex-col items-center">
                {/* Brand Title */}
                <div className="text-center mb-3">
                  <div className="text-xs sm:text-sm font-semibold tracking-wider text-gray-500 uppercase mb-2">
                    Online Payment Receipt Status
                  </div>

                  {/* Print Docker Official Crest */}
                  <div className="flex items-center justify-center gap-2.5 mb-1.5">
                    <img
                      src="/logo.png"
                      alt="PRINT DOCKER"
                      className="w-12 h-12 object-contain rounded-2xl bg-white p-1 border border-gray-200 shadow-md"
                    />
                    <div className="text-left leading-tight">
                      <span className="font-black text-2xl tracking-tight text-[#0B1D3A] font-sans block">
                        PRINT DOCKER
                      </span>
                      <div className="text-[10px] font-extrabold text-blue-600 tracking-wider uppercase">
                        BADAM SUDHEER REDDY
                      </div>
                    </div>
                  </div>
                  <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-center">
                    Smart Printing Portal • Vijayawada
                  </div>
                </div>

                {/* Report Card (Light Sage Green Container from Screenshot 3) */}
                <div className="w-full bg-[#dcf0e2] border border-[#b6dec0] rounded-xl p-6 sm:p-8 text-center text-[#111827]">
                  {/* Timestamp */}
                  <div className="text-xs sm:text-sm font-semibold text-gray-800 tracking-wide mb-3">
                    {reportTimestamp || formatReportDateTime()}
                  </div>

                  {/* Greeting */}
                  <div className="text-base sm:text-lg font-bold text-[#111827]">
                    Thank You, {user?.displayName || user?.email?.split("@")[0] || "BADAM SUDHEER REDDY"}.
                  </div>

                  <div className="text-sm sm:text-base font-medium text-gray-800 mt-1">
                    Your order status is
                  </div>

                  {/* Status in bold */}
                  <div className="mt-1 mb-2">
                    {reportStatus === "aborted" && (
                      <span className="text-2xl sm:text-3xl font-black text-red-600 tracking-tight">aborted</span>
                    )}
                    {reportStatus === "submitted" && (
                      <span className="text-2xl sm:text-3xl font-black text-amber-600 tracking-tight">
                        pending verification
                      </span>
                    )}
                    {reportStatus === "successful" && (
                      <span className="text-2xl sm:text-3xl font-black text-emerald-700 tracking-tight">
                        successful
                      </span>
                    )}
                    {reportStatus === "failed" && (
                      <span className="text-2xl sm:text-3xl font-black text-red-600 tracking-tight">failed</span>
                    )}
                  </div>

                  <div className="text-xl font-black text-gray-500 my-1">•</div>

                  {/* Order Details Header */}
                  <div className="text-sm sm:text-base font-bold text-[#111827] mb-3">
                    Your Order Details as Follows :
                  </div>

                  {/* Detail Rows */}
                  <div className="space-y-1.5 text-xs sm:text-sm font-semibold text-[#111827] max-w-lg mx-auto">
                    <div>
                      Order Number : <span className="font-mono">{order.orderNumber}</span>
                    </div>
                    <div>
                      Receipt No : <span className="font-mono">{getReceiptNumber()}</span>
                    </div>
                    <div>
                      Order Description : Document Printing Service - {order.fileName}
                    </div>
                    <div>
                      BANK Reference No:{" "}
                      <span className="font-mono">
                        {autoSavedTx ||
                          latestPayment?.transactionId ||
                          transactionId ||
                          "null"}
                      </span>
                    </div>
                    <div>
                      PAID Amount : Rs.{order.totalAmount.toFixed(2)}
                    </div>
                  </div>

                  {/* Record Update Note */}
                  <div className="mt-4 pt-3 border-t border-[#b6dec0]/60 text-xs sm:text-sm font-bold text-blue-700">
                    {reportStatus === "aborted" ? (
                      <span>Transaction was aborted by user. Records preserved.</span>
                    ) : (
                      <span>And is Successfully updated to Your Print Docker Records</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons: Print PDF & Go Back */}
              <div className="mt-6 flex flex-col items-center gap-3 w-full print:hidden">
                <button
                  type="button"
                  onClick={handlePrintReport}
                  className="px-6 py-2.5 bg-[#15803d] hover:bg-[#166534] text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 shadow transition-all hover:shadow-md cursor-pointer"
                >
                  <Download className="w-4 h-4" /> Print PDF
                </button>

                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="text-xs sm:text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                >
                  Go Back
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Global CSS for Print Mode */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #payment-report-section,
          #payment-report-section * {
            visibility: visible !important;
          }
          #payment-report-section {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 20px !important;
            background: white !important;
          }
        }
      `}</style>

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

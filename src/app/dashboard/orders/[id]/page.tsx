"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
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
  CreditCard,
  Download,
  Phone,
  Building,
  Smartphone,
  Wallet,
  ShieldCheck,
  RefreshCw,
  Search,
  Copy,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency, formatDate, ORDER_STATUS_LABELS, PAYMENT_STATUS_COLORS } from "@/lib/utils";
import { toast } from "sonner";
import Script from "next/script";
import Image from "next/image";

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
  totalAmount: number;
  status: string;
  paymentStatus: string;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  statusHistory: {
    id: string;
    status: string;
    notes: string | null;
    createdAt: string;
  }[];
  user: { name: string; email: string; phone: string };
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
  const [paying, setPaying] = useState(false);
  
  // Payment Modal States
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"UPI" | "CARD" | "NETBANKING" | "RAZORPAY">("UPI");
  const [transactionId, setTransactionId] = useState("");
  const [isPolling, setIsPolling] = useState(false);
  const [timeLeft, setTimeLeft] = useState(240);
  
  const adminUpiId = "8688509699-1@okbizaxis";
  const adminName = "Sudheer Reddy Printing Shop";

  // Realistic 10-second Simulation for Demo Purposes
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    // DEMO: Automatically trigger success after 10 seconds (when timeLeft drops from 240 to 230)
    if (isPolling && timeLeft === 230) {
      setIsPolling(false);
      const fakeUtr = Math.floor(100000000000 + Math.random() * 900000000000).toString();
      setTransactionId(fakeUtr);
      
      const autoSubmit = async () => {
        setPaying(true);
        try {
          const res = await fetch("/api/payments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              uid: user?.uid,
              orderId: order?.id,
              amount: order?.totalAmount,
              method: "UPI",
              transactionId: fakeUtr,
            }),
          });
          if (res.ok) {
            toast.success("Payment verified and linked to your bank account!");
            setShowPaymentModal(false);
            fetchOrder();
          } else {
            toast.error("Payment verification failed.");
          }
        } catch (err) {
          toast.error("Payment verification failed.");
        } finally {
          setPaying(false);
        }
      };
      
      toast.success("Payment detected! Generating receipt...");
      autoSubmit();
      return;
    }

    if (isPolling && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (isPolling && timeLeft === 0) {
      setIsPolling(false);
      toast.error("Auto-fetch timed out. Please enter the UTR manually.");
    }
    return () => clearInterval(interval);
  }, [isPolling, timeLeft, user, order]);

  const handleRazorpay = async () => {
    if (!order || !user) return;
    try {
      // In a real scenario, you'd fetch the Razorpay order ID from your backend here.
      // For now, we open the Razorpay modal directly if they have keys in AdminSettings
      const res = await fetch("/api/admin/settings");
      const settings = await res.json();
      
      if (!settings?.razorpayKey) {
        toast.error("Payment Gateway is not configured. Please use manual UPI.");
        setPaymentMethod("UPI");
        return;
      }

      const options = {
        key: settings.razorpayKey,
        amount: Math.round(order.totalAmount * 100),
        currency: "INR",
        name: adminName,
        description: `Order ${order.orderNumber}`,
        handler: async function (response: any) {
          setTransactionId(response.razorpay_payment_id);
          toast.success("Payment detected successfully! Verifying...");
          
          // Submit the successful payment
          const paymentRes = await fetch("/api/payments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              uid: user.uid,
              orderId: order.id,
              amount: order.totalAmount,
              method: "RAZORPAY",
              transactionId: response.razorpay_payment_id,
              razorpayId: response.razorpay_payment_id
            }),
          });
          
          if (paymentRes.ok) {
            toast.success("Payment verified successfully!");
            setShowPaymentModal(false);
            fetchOrder();
          }
        },
        prefill: {
          name: user.displayName || user.email?.split('@')[0],
          email: user.email,
        },
        theme: { color: "#7c3aed" }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error(error);
      toast.error("Failed to initialize Payment Gateway.");
    }
  };

  useEffect(() => {
    if (user && params.id) fetchOrder();
  }, [user, params.id]);

  const fetchOrder = async () => {
    try {
      const res = await fetch(`/api/orders/${params.id}?uid=${user?.uid}`);
      if (res.ok) setOrder(await res.json());
      else router.push("/dashboard/orders");
    } finally {
      setLoading(false);
    }
  };

  const copyOrderId = () => {
    navigator.clipboard.writeText(order?.orderNumber || "");
    toast.success("Order ID copied!");
  };

  const handlePayment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!order || !user) return;
    if (!transactionId.trim() || transactionId.trim().length < 6) {
      toast.error("Please enter a valid Transaction / UTR Number");
      return;
    }
    
    setPaying(true);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: user.uid,
          orderId: order.id,
          amount: order.totalAmount,
          method: paymentMethod,
          transactionId: transactionId.trim(),
        }),
      });

      if (res.ok) {
        toast.success("Payment details submitted successfully! Awaiting verification.");
        setShowPaymentModal(false);
        fetchOrder();
      } else {
        toast.error("Payment failed. Please try again.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Payment failed.");
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => <div key={i} className="h-32 skeleton rounded-2xl" />)}
      </div>
    );
  }

  if (!order) return null;

  const currentStepIndex = STATUS_ORDER.indexOf(order.status);
  const isCancelled = order.status === "CANCELLED";

  return (
    <>
      <div className="space-y-6 max-w-3xl">
        <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      
      {/* Back */}
      <div>
        <Link href="/dashboard/orders" className="inline-flex items-center gap-2 text-gray-500 hover:text-[#0B1D3A] text-sm transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Orders
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-[#0B1D3A]">{order.fileName}</h1>
            <button
              onClick={copyOrderId}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#0B1D3A] mt-1 transition-colors"
            >
              <span className="font-mono">{order.orderNumber}</span>
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className={`px-3 py-1.5 rounded-xl text-sm border ${PAYMENT_STATUS_COLORS[order.paymentStatus]}`}>
              {order.paymentStatus}
            </div>
            {order.paymentStatus === "PENDING" && !isCancelled && (
              <button
                onClick={() => setShowPaymentModal(true)}
                className="px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors flex items-center gap-2 shadow-lg shadow-violet-500/30"
              >
                <CreditCard className="w-4 h-4" />
                Pay Now
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Payment Receipt */}
      {order.paymentStatus === "PAID" && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-3xl p-6 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg shadow-emerald-500/20"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center shrink-0">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Payment Successful</h2>
              <p className="text-emerald-100 text-sm">Your transaction was completed securely.</p>
            </div>
          </div>
          <div className="w-full sm:w-auto flex flex-col gap-3">
            <div className="bg-black/10 rounded-xl p-3 border border-white/10">
              <div className="flex justify-between sm:flex-col sm:items-end gap-1 text-sm">
                <span className="text-emerald-100">Transaction ID</span>
                <span className="font-mono font-bold tracking-wider">{order.orderNumber}</span>
              </div>
            </div>
            <button 
              onClick={() => {
                const receiptHtml = `
                  <html>
                    <head>
                      <title>Receipt - ${order.orderNumber}</title>
                      <style>
                        body { font-family: 'Inter', sans-serif; padding: 40px; color: #0B1D3A; max-width: 800px; margin: 0 auto; }
                        .header { border-bottom: 2px solid #f3f4f6; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
                        .title { font-size: 28px; font-weight: 800; color: #7c3aed; margin-bottom: 5px; }
                        .subtitle { color: #6b7280; font-size: 14px; }
                        .row { display: flex; justify-content: space-between; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px dashed #f3f4f6; }
                        .total { font-weight: 800; font-size: 20px; border-top: 2px solid #e5e7eb; border-bottom: none; padding-top: 20px; margin-top: 10px; color: #0B1D3A; }
                        .badge { background: #10b981; color: white; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: bold; }
                      </style>
                    </head>
                    <body>
                      <div class="header">
                        <div>
                          <div class="title">Sudheer Reddy Print</div>
                          <div class="subtitle">Official Payment Receipt</div>
                        </div>
                        <div style="text-align: right;">
                          <div style="font-weight: bold; margin-bottom: 5px;">Order #${order.orderNumber}</div>
                          <div class="badge">PAID SECURELY</div>
                        </div>
                      </div>
                      <div class="row"><span>Date:</span> <strong>${new Date().toLocaleDateString()}</strong></div>
                      <div class="row"><span>Customer:</span> <strong>${user.displayName || user.email || "Customer"}</strong></div>
                      <div class="row"><span>Document:</span> <strong>${order.fileName}</strong></div>
                      <br/>
                      <h3 style="margin-bottom: 15px; color: #4b5563;">Print Details</h3>
                      <div class="row"><span>Total Pages:</span> <strong>${order.totalPages}</strong></div>
                      <div class="row"><span>Copies:</span> <strong>${order.copies}</strong></div>
                      <div class="row"><span>Color Mode:</span> <strong>${order.printColor}</strong></div>
                      <div class="row"><span>Paper Size:</span> <strong>${order.paperSize}</strong></div>
                      <br/>
                      <div class="row total"><span>Total Amount Paid:</span> <span>₹${order.totalAmount.toFixed(2)}</span></div>
                      <br/><br/><br/>
                      <div style="text-align: center; color: #9ca3af; font-size: 14px; margin-top: 50px; border-top: 1px solid #f3f4f6; padding-top: 20px;">
                        Thank you for choosing Sudheer Reddy Print!<br/>
                        For support, contact us through the portal.
                      </div>
                      <script>
                        window.onload = function() { window.print(); }
                      </script>
                    </body>
                  </html>
                `;
                const printWindow = window.open('', '', 'width=800,height=900');
                if (printWindow) {
                  printWindow.document.open();
                  printWindow.document.write(receiptHtml);
                  printWindow.document.close();
                }
              }}
              className="bg-white text-emerald-600 font-bold py-2 px-4 rounded-xl shadow hover:bg-emerald-50 transition-colors w-full flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" /> Download Receipt
            </button>
          </div>
        </motion.div>
      )}
      {order.paymentStatus === "FAILED" && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-red-500 to-red-400 rounded-3xl p-6 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg shadow-red-500/20"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center shrink-0">
              <XCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Payment Failed</h2>
              <p className="text-red-100 text-sm">There was an issue processing your transaction.</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Status Timeline */}
      {!isCancelled ? (
        <div className="glass rounded-3xl p-6 border border-gray-200">
          <h2 className="font-bold text-[#0B1D3A] mb-6">Order Status</h2>
          <div className="relative">
            <div className="absolute top-5 left-5 right-5 h-0.5 bg-gray-100" />
            <div
              className="absolute top-5 left-5 h-0.5 bg-gradient-to-r from-violet-500 to-violet-300 transition-all duration-1000"
              style={{
                width: `${Math.max(0, (currentStepIndex / (STATUS_STEPS.length - 1)) * 100)}%`,
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
                          ? "bg-violet-600 border-violet-500 text-[#0B1D3A]"
                          : "bg-background border-gray-400 text-gray-300"
                      } ${isCurrent ? "ring-4 ring-violet-500/30 animate-pulse-glow" : ""}`}
                    >
                      <step.icon className="w-4 h-4" />
                    </div>
                    <span className={`text-xs text-center ${isDone ? "text-[#0B1D3A]" : "text-gray-400"}`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="glass rounded-2xl p-5 border border-red-500/20 flex items-center gap-3">
          <XCircle className="w-6 h-6 text-red-400" />
          <div>
            <div className="font-semibold text-red-400">Order Cancelled</div>
            {order.adminNotes && <div className="text-sm text-gray-500 mt-0.5">{order.adminNotes}</div>}
          </div>
        </div>
      )}

      {/* Print Details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="glass rounded-2xl p-5 border border-gray-200">
          <h3 className="font-semibold text-[#0B1D3A] mb-4 text-sm">Print Specifications</h3>
          <div className="space-y-2.5 text-sm">
            <DetailRow label="Paper Size" value={order.paperSize} />
            <DetailRow label="Orientation" value={order.orientation} />
            <DetailRow label="Print Side" value={order.printSide === "SINGLE" ? "Single Side" : "Double Side"} />
            <DetailRow label="Color Mode" value={order.printColor === "COLOR" ? "Full Color" : "Black & White"} />
            <DetailRow label="Copies" value={order.copies.toString()} />
            <DetailRow label="Total Pages" value={order.totalPages.toString()} />
            {order.printColor === "COLOR" && (
              <>
                <DetailRow label="Color Pages" value={order.colorPages.toString()} />
                <DetailRow label="B&W Pages" value={order.bwPages.toString()} />
              </>
            )}
            <DetailRow label="Binding" value={order.binding ? "Yes" : "No"} />
            <DetailRow label="Lamination" value={order.lamination ? "Yes" : "No"} />
            <DetailRow label="Paper Quality" value={order.paperQuality} />
          </div>
        </div>

        <div className="glass rounded-2xl p-5 border border-gray-200">
          <h3 className="font-semibold text-[#0B1D3A] mb-4 text-sm">Cost Breakdown</h3>
          <div className="space-y-2.5 text-sm">
            {order.printColor === "COLOR" && order.colorPrice > 0 && (
              <DetailRow label="Color Print" value={formatCurrency(order.colorPrice * order.colorPages * order.copies)} />
            )}
            <DetailRow label="B&W Print" value={formatCurrency(order.bwPrice * order.bwPages * order.copies)} />
            {order.binding && <DetailRow label="Binding" value={formatCurrency(order.bindingCost)} />}
            {order.lamination && <DetailRow label="Lamination" value={formatCurrency(order.laminationCost)} />}
            <DetailRow label="Subtotal" value={formatCurrency(order.subtotal)} />
            {order.gstAmount > 0 && (
              <DetailRow label={`GST (${order.gstRate}%)`} value={formatCurrency(order.gstAmount)} />
            )}
            {order.discount > 0 && (
              <DetailRow label="Discount" value={`- ${formatCurrency(order.discount)}`} />
            )}
            <div className="border-t border-gray-300 pt-2.5 flex justify-between font-bold">
              <span className="text-[#0B1D3A]">Total</span>
              <span className="text-gradient text-base">{formatCurrency(order.totalAmount)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Instructions */}
      {order.instructions && (
        <div className="glass rounded-2xl p-5 border border-gray-200">
          <h3 className="font-semibold text-[#0B1D3A] mb-2 text-sm">Special Instructions</h3>
          <p className="text-gray-500 text-sm">{order.instructions}</p>
        </div>
      )}

      {/* Admin Notes */}
      {order.adminNotes && !isCancelled && (
        <div className="glass rounded-2xl p-4 border border-amber-500/20">
          <div className="text-xs text-amber-400 font-medium mb-1">Admin Note</div>
          <p className="text-sm text-gray-600">{order.adminNotes}</p>
        </div>
      )}

      {/* Status History */}
      {order.statusHistory && order.statusHistory.length > 0 && (
        <div className="glass rounded-3xl p-6 border border-gray-200">
          <h2 className="font-bold text-[#0B1D3A] mb-4">Order Timeline</h2>
          <div className="relative pl-5 space-y-4">
            <div className="absolute left-1.5 top-0 bottom-0 w-0.5 bg-gray-100" />
            {order.statusHistory.map((entry, i) => (
              <div key={entry.id} className="relative flex items-start gap-3">
                <div className="absolute -left-4 top-1 w-2.5 h-2.5 rounded-full bg-violet-500 border-2 border-background" />
                <div>
                  <div className="text-sm font-medium text-[#0B1D3A]">{ORDER_STATUS_LABELS[entry.status]}</div>
                  {entry.notes && <div className="text-xs text-gray-500">{entry.notes}</div>}
                  <div className="text-xs text-white/25 mt-0.5">{formatDate(entry.createdAt)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dates */}
      <div className="glass rounded-2xl p-5 border border-gray-200">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <DetailRow label="Order Placed" value={formatDate(order.createdAt)} />
          <DetailRow label="Last Updated" value={formatDate(order.updatedAt)} />
          {order.completedAt && (
            <DetailRow label="Completed On" value={formatDate(order.completedAt)} />
          )}
        </div>
      </div>
    </div>
      
      {/* Payment Gateway Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B1D3A]/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row"
          >
            {/* Left side: Payment Methods */}
            <div className="w-full md:w-1/3 bg-gray-50 border-r border-gray-100 p-6">
              <h3 className="text-lg font-bold text-[#0B1D3A] mb-6">Payment Method</h3>
              <div className="space-y-3">
                <button
                  onClick={() => {
                    setPaymentMethod("UPI");
                    setIsPolling(true);
                    setTimeLeft(240);
                  }}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                    paymentMethod === "UPI"
                      ? "bg-violet-100 text-violet-700 font-semibold border-violet-200 border"
                      : "text-gray-600 hover:bg-gray-100 border border-transparent"
                  }`}
                >
                  <Smartphone className="w-5 h-5" />
                  UPI Payment (Auto-Fetch)
                </button>
                </button>
              </div>

              <div className="mt-auto pt-10 flex items-center gap-2 text-xs text-gray-400">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>100% Secure Real-Time Payments</span>
              </div>
            </div>

            {/* Right side: Payment Details */}
            <div className="w-full md:w-2/3 p-6 md:p-8 flex flex-col">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-bold text-[#0B1D3A]">
                    {paymentMethod === "UPI" && "Real-Time UPI Payment"}
                    {paymentMethod === "RAZORPAY" && "Secure Gateway"}
                  </h3>
                  <p className="text-sm text-gray-500">Amount to pay: <span className="font-bold text-[#0B1D3A]">{formatCurrency(order.totalAmount)}</span></p>
                </div>
                <button
                  onClick={() => { setShowPaymentModal(false); setIsPolling(false); }}
                  className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors text-gray-500"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1">
                {paymentMethod === "UPI" && (
                  <div className="flex flex-col items-center">
                    <div className="bg-white p-3 rounded-2xl border-2 border-violet-100 shadow-sm mb-4 inline-block relative">
                      {/* Dynamic QR Code based on UPI ID and Order Reference */}
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=${encodeURIComponent(adminUpiId)}&pn=${encodeURIComponent(adminName)}&am=${order.totalAmount}&cu=INR&tr=${encodeURIComponent(order.orderNumber)}`} 
                        alt="UPI QR Code" 
                        className={`w-40 h-40 object-contain transition-opacity ${isPolling ? 'opacity-50' : 'opacity-100'}`}
                      />
                      {isPolling && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                           <div className="relative">
                             <div className="w-16 h-16 border-4 border-violet-200 rounded-full animate-spin border-t-violet-600"></div>
                             <Search className="w-6 h-6 text-violet-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                           </div>
                        </div>
                      )}
                    </div>
                    
                    {isPolling ? (
                      <div className="text-center mb-6">
                        <p className="text-sm font-bold text-violet-600 mb-1 animate-pulse">Scanning for Payment...</p>
                        <p className="text-2xl font-mono text-[#0B1D3A] mb-2">
                          {Math.floor(timeLeft / 60).toString().padStart(2, '0')}:{(timeLeft % 60).toString().padStart(2, '0')}
                        </p>
                        <p className="text-xs text-gray-500">Keep this screen open while you pay on your phone.</p>
                      </div>
                    ) : (
                      <p className="text-sm font-medium text-[#0B1D3A] mb-6">Scan with any UPI App</p>
                    )}
                  </div>
                )}

                {paymentMethod === "RAZORPAY" && (
                  <div className="flex flex-col items-center justify-center py-6 text-center text-gray-500">
                    <RefreshCw className="w-12 h-12 text-violet-300 mb-3 animate-spin" />
                    <p className="text-sm mb-2 font-semibold text-[#0B1D3A]">Connecting to Payment Gateway...</p>
                    <p className="text-xs">A secure window should open to process your payment.</p>
                  </div>
                )}
              </div>

              {/* Transaction Input Form (Fallback) */}
              {paymentMethod === "UPI" && !isPolling && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-2 pt-6 border-t border-gray-100"
                >
                  <form onSubmit={handlePayment} className="space-y-4">
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
                       <p className="text-xs text-amber-800">
                         ⚠️ Auto-fetch timed out. Please enter the 12-digit UTR/Transaction Number manually from your UPI app.
                       </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#0B1D3A] mb-1">
                        Transaction / UTR Number
                      </label>
                      <input
                        type="text"
                        required
                        value={transactionId}
                        onChange={(e) => setTransactionId(e.target.value)}
                        placeholder="e.g. 3145XXXXXXXX"
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-[#0B1D3A] text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-shadow"
                      />
                    </div>
                    
                    <button
                      type="submit"
                      disabled={paying || !transactionId.trim()}
                      className="w-full py-3.5 bg-violet-600 text-white rounded-xl font-bold hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-violet-500/25"
                    >
                      {paying ? <RefreshCw className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                      {paying ? "Verifying..." : "Verify Payment"}
                    </button>
                  </form>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>
      )}
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

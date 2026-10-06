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
  Mail,
  Copy,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency, formatDate, ORDER_STATUS_LABELS, PAYMENT_STATUS_COLORS } from "@/lib/utils";
import { toast } from "sonner";

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
    <div className="space-y-6 max-w-3xl">
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
          <div className={`px-3 py-1.5 rounded-xl text-sm border ${PAYMENT_STATUS_COLORS[order.paymentStatus]}`}>
            {order.paymentStatus}
          </div>
        </div>
      </div>

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

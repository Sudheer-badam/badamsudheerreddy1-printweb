"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  Download,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  Printer,
  MessageSquare,
  FileText,
  Phone,
  Mail,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import { formatCurrency, formatDate, ORDER_STATUS_COLORS, ORDER_STATUS_LABELS, PAYMENT_STATUS_COLORS } from "@/lib/utils";
import { toast } from "sonner";

interface Order {
  id: string;
  orderNumber: string;
  fileName: string;
  totalPages: number;
  paperSize: string;
  printColor: string;
  printSide: string;
  copies: number;
  binding: boolean;
  lamination: boolean;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
  updatedAt: string;
  adminNotes: string | null;
  paymentProofUrl: string | null;
  user: { id: string; name: string; email: string; phone: string };
}

const STATUSES = [
  "UPLOADED", "VERIFIED", "ACCEPTED", "PRINTING",
  "PRINTED", "READY_FOR_PICKUP", "DELIVERED", "CANCELLED", "COMPLETED",
];

const STATUS_FILTERS = [
  { label: "All", value: "" },
  { label: "Pending", value: "UPLOADED" },
  { label: "Accepted", value: "ACCEPTED" },
  { label: "Printing", value: "PRINTING" },
  { label: "Ready", value: "READY_FOR_PICKUP" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Cancelled", value: "CANCELLED" },
];

export default function AdminOrdersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [newStatus, setNewStatus] = useState("");

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (user) {
      fetchOrders();
      interval = setInterval(() => {
        fetchOrdersSilent();
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    }
  }, [user, statusFilter, paymentFilter, page]);

  const fetchOrdersSilent = async () => {
    try {
      const params = new URLSearchParams({
        uid: user!.uid,
        role: "ADMIN",
        page: page.toString(),
        limit: "10",
        ...(statusFilter && { status: statusFilter }),
        ...(paymentFilter && { paymentStatus: paymentFilter }),
        ...(search && { search }),
      });
      const res = await fetch(`/api/orders?${params}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (e) {
      // Ignore silent errors
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        uid: user!.uid,
        role: "ADMIN",
        page: page.toString(),
        limit: "10",
        ...(statusFilter && { status: statusFilter }),
        ...(paymentFilter && { paymentStatus: paymentFilter }),
        ...(search && { search }),
      });
      const res = await fetch(`/api/orders?${params}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders);
        setTotalPages(data.pagination.totalPages);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchOrders();
  };

  const updateOrderStatus = async (orderId: string, status: string, notes?: string) => {
    setUpdating(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: user!.uid,
          status,
          adminNotes: notes,
        }),
      });
      if (res.ok) {
        toast.success(`Order status updated to ${ORDER_STATUS_LABELS[status]}`);
        fetchOrders();
        setShowModal(false);
      } else {
        toast.error("Failed to update status");
      }
    } finally {
      setUpdating(null);
    }
  };

  const updatePaymentStatus = async (orderId: string, paymentStatus: string) => {
    setUpdating(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: user!.uid, paymentStatus }),
      });
      if (res.ok) {
        toast.success("Payment status updated");
        fetchOrders();
      } else {
        toast.error("Failed to update payment");
      }
    } finally {
      setUpdating(null);
    }
  };

  const getEmailDraft = (order: any) => {
    if (!order) return "";
    const subject = encodeURIComponent(`Update on your Print Docker Order #${order.orderNumber}`);
    let body = `Hello ${order.user.name},\n\n`;

    switch (order.status) {
      case "ACCEPTED":
        body += `We have accepted your order for "${order.fileName}" and will begin processing it soon.`;
        break;
      case "PRINTING":
        body += `Your order for "${order.fileName}" is currently being printed.`;
        break;
      case "PRINTED":
        body += `Good news! Your order for "${order.fileName}" has been printed successfully.`;
        break;
      case "READY_FOR_PICKUP":
        body += `Your order for "${order.fileName}" is now ready for pickup! Please visit our store to collect it.`;
        break;
      case "DELIVERED":
        body += `Your order for "${order.fileName}" has been delivered. Thank you for choosing Print Docker!`;
        break;
      case "CANCELLED":
        body += `We regret to inform you that your order for "${order.fileName}" has been cancelled. Please contact us for more details.`;
        break;
      default:
        body += `We are processing your order for "${order.fileName}".`;
    }

    body += `\n\nOrder Details:\n- Total Pages: ${order.totalPages}\n- Copies: ${order.copies}\n- Amount: ${formatCurrency(order.totalAmount)}\n\nThank you,\nPrint Docker`;
    return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(order.user.email)}&su=${subject}&body=${encodeURIComponent(body)}`;
  };

  const deleteOrder = async (orderId: string) => {
    if (!confirm("Are you sure you want to delete this order?")) return;
    try {
      const res = await fetch(`/api/orders/${orderId}?uid=${user!.uid}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Order deleted");
        fetchOrders();
      }
    } catch {
      toast.error("Failed to delete order");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0B1D3A]">All Orders</h1>
          <p className="text-gray-500 mt-1">Manage all customer print orders</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col gap-3">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, phone, email, order ID..."
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-300 rounded-xl text-[#0B1D3A] text-sm placeholder-white/30 focus:outline-none focus:border-violet-500"
            />
          </div>
          <button type="submit" className="px-4 py-2.5 rounded-xl gradient-primary text-white text-sm font-medium">
            Search
          </button>
        </form>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => { setStatusFilter(f.value); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                statusFilter === f.value
                  ? "bg-amber-500 text-white"
                  : "glass border border-gray-300 text-gray-500 hover:text-[#0B1D3A]"
              }`}
            >
              {f.label}
            </button>
          ))}
          <div className="w-px bg-gray-100 mx-1" />
          {["", "PENDING", "PAID"].map((p) => (
            <button
              key={p}
              onClick={() => { setPaymentFilter(p); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                paymentFilter === p
                  ? "bg-green-600 text-white"
                  : "glass border border-gray-300 text-gray-500 hover:text-[#0B1D3A]"
              }`}
            >
              {p === "" ? "All Payments" : p === "PAID" ? "Paid" : "Unpaid"}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="glass rounded-3xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium uppercase tracking-wider">Order ID</th>
                <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium uppercase tracking-wider">Customer</th>
                <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium uppercase tracking-wider hidden lg:table-cell">File</th>
                <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium uppercase tracking-wider hidden md:table-cell">Details</th>
                <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium uppercase tracking-wider">Payment</th>
                <th className="text-right px-4 py-3 text-xs text-gray-400 font-medium uppercase tracking-wider">Amount</th>
                <th className="px-4 py-3 text-xs text-gray-400 font-medium uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={8} className="px-4 py-3">
                      <div className="h-12 skeleton rounded-lg" />
                    </td>
                  </tr>
                ))
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center text-gray-400">
                    <FileText className="w-8 h-8 mx-auto mb-2" />
                    No orders found
                  </td>
                </tr>
              ) : (
                orders.map((order, i) => (
                  <motion.tr
                    key={order.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.04 }}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="font-mono text-xs text-gray-600 truncate max-w-[100px]">{order.orderNumber}</div>
                      <div className="text-xs text-gray-400">{formatDate(order.createdAt)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-[#0B1D3A]">{order.user.name}</div>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <a href={`https://wa.me/${(order.user.phone || "").replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="hover:text-green-500 hover:underline cursor-pointer flex items-center gap-1"><Phone className="w-3 h-3" /> {order.user.phone}</a>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                        <a href={getEmailDraft(order)} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="hover:text-blue-500 hover:underline cursor-pointer flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {order.user.email}
                        </a>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="text-[#0B1D3A] truncate max-w-[150px]">{order.fileName}</div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-xs text-gray-500">
                      <div>{order.totalPages}p • {order.paperSize} • {order.copies}x</div>
                      <div>{order.printColor === "COLOR" ? "Color" : "B&W"} • {order.printSide === "SINGLE" ? "1-sided" : "2-sided"}</div>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={order.status}
                        onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                        disabled={updating === order.id}
                        className={`text-xs px-2 py-1 rounded-lg border cursor-pointer bg-transparent focus:outline-none ${ORDER_STATUS_COLORS[order.status]}`}
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s} className="bg-white text-[#0B1D3A]">{ORDER_STATUS_LABELS[s]}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={order.paymentStatus}
                        onChange={(e) => updatePaymentStatus(order.id, e.target.value)}
                        disabled={updating === order.id}
                        className={`text-xs px-2 py-1 rounded-lg border cursor-pointer bg-transparent focus:outline-none ${PAYMENT_STATUS_COLORS[order.paymentStatus]}`}
                      >
                        {["PENDING", "PAID", "FAILED", "REFUNDED"].map((s) => (
                          <option key={s} value={s} className="bg-white text-[#0B1D3A]">{s}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-[#0B1D3A]">
                      {formatCurrency(order.totalAmount)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => { setSelectedOrder(order); setNewStatus(order.status); setAdminNotes(order.adminNotes || ""); setShowModal(true); }}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 transition-all"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => router.push(`/admin/orders/${order.id}/print`)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-amber-400 hover:bg-amber-500/10 transition-all"
                          title="Print Room (Acrobat View)"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => updateOrderStatus(order.id, "COMPLETED")}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all"
                          title="Mark Completed"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => updateOrderStatus(order.id, "CANCELLED")}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                          title="Cancel"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteOrder(order.id)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-gray-200">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-[#0B1D3A] disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>
            <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-[#0B1D3A] disabled:opacity-30"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      {showModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="glass-strong rounded-3xl border border-gray-300 p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[#0B1D3A]">Order Details</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-[#0B1D3A]">
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Customer Info */}
              <div className="glass rounded-2xl p-4 border border-gray-200">
                <h3 className="text-sm font-semibold text-amber-400 mb-3">Customer Information</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <InfoRow label="Name" value={selectedOrder.user.name} />
                  <InfoRow label="Phone" value={<a href={`https://wa.me/${(selectedOrder.user.phone || "").replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="hover:text-green-500 hover:underline cursor-pointer flex items-center gap-1">{selectedOrder.user.phone}</a>} />
                  <InfoRow label="Email" value={<a href={getEmailDraft(selectedOrder)} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="hover:text-blue-500 hover:underline cursor-pointer flex items-center gap-1">{selectedOrder.user.email}</a>} />
                  <InfoRow label="Order ID" value={selectedOrder.orderNumber} />
                </div>
              </div>

              {/* Print Details */}
              <div className="glass rounded-2xl p-4 border border-gray-200">
                <h3 className="text-sm font-semibold text-amber-400 mb-3">Print Details</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <InfoRow label="File" value={selectedOrder.fileName} />
                  <InfoRow label="Pages" value={selectedOrder.totalPages.toString()} />
                  <InfoRow label="Paper Size" value={selectedOrder.paperSize} />
                  <InfoRow label="Color Mode" value={selectedOrder.printColor} />
                  <InfoRow label="Print Side" value={selectedOrder.printSide} />
                  <InfoRow label="Copies" value={selectedOrder.copies.toString()} />
                  <InfoRow label="Binding" value={selectedOrder.binding ? "Yes" : "No"} />
                  <InfoRow label="Lamination" value={selectedOrder.lamination ? "Yes" : "No"} />
                </div>
              </div>

              {/* Status Update */}
              <div className="glass rounded-2xl p-4 border border-gray-200">
                <h3 className="text-sm font-semibold text-amber-400 mb-3">Update Status</h3>
                <div className="space-y-3">
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-xl text-[#0B1D3A] text-sm focus:outline-none focus:border-violet-500"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s} className="bg-white text-[#0B1D3A]">{ORDER_STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Add admin notes..."
                    rows={3}
                    className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-xl text-[#0B1D3A] text-sm placeholder-white/30 focus:outline-none focus:border-violet-500 resize-none"
                  />
                  <button
                    onClick={() => updateOrderStatus(selectedOrder.id, newStatus, adminNotes)}
                    disabled={updating === selectedOrder.id}
                    className="w-full py-2.5 rounded-xl gradient-primary text-white text-sm font-semibold hover:opacity-90"
                  >
                    Update Status
                  </button>
                </div>
              </div>

              {/* Amount */}
              <div className="glass rounded-2xl p-4 border border-violet-500/20 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-gray-600 font-bold">Total Amount</span>
                  <span className="text-[10px] text-gray-500 font-bold tracking-wide uppercase mt-0.5">(Incl. of GST taxes)</span>
                </div>
                <span className="text-2xl font-extrabold text-gradient">{formatCurrency(selectedOrder.totalAmount)}</span>
              </div>

              {/* Payment Proof */}
              {selectedOrder.paymentProofUrl && (
                <div className="glass rounded-2xl p-4 border border-gray-200 mt-4">
                  <h3 className="text-sm font-semibold text-amber-400 mb-3">Payment Proof</h3>
                  <a href={selectedOrder.paymentProofUrl} target="_blank" rel="noopener noreferrer">
                    <img src={selectedOrder.paymentProofUrl} alt="Payment Proof" className="w-full max-h-64 object-contain rounded-xl border border-gray-300 hover:opacity-90 transition-opacity" />
                  </a>
                  <p className="text-xs text-gray-400 mt-2 text-center">Click image to view full size</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-gray-400">{label}</div>
      <div className="text-[#0B1D3A] font-medium">{value || "—"}</div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  FileText,
  Search,
  Filter,
  ChevronRight,
  ChevronLeft,
  Eye,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  formatCurrency,
  formatDate,
  ORDER_STATUS_COLORS,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_COLORS,
} from "@/lib/utils";

interface Order {
  id: string;
  orderNumber: string;
  fileName: string;
  totalPages: number;
  paperSize: string;
  printColor: string;
  copies: number;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
}

const STATUS_FILTERS = [
  { label: "All", value: "" },
  { label: "Pending", value: "UPLOADED" },
  { label: "Accepted", value: "ACCEPTED" },
  { label: "Printing", value: "PRINTING" },
  { label: "Ready", value: "READY_FOR_PICKUP" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Cancelled", value: "CANCELLED" },
];

export default function OrdersPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

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
  }, [user, statusFilter, page]);

  const fetchOrdersSilent = async () => {
    try {
      const params = new URLSearchParams({
        uid: user!.uid,
        page: page.toString(),
        limit: "10",
        ...(statusFilter && { status: statusFilter }),
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
        page: page.toString(),
        limit: "10",
        ...(statusFilter && { status: statusFilter }),
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

  const filteredOrders = orders.filter(
    (o) =>
      !search ||
      o.fileName.toLowerCase().includes(search.toLowerCase()) ||
      o.orderNumber.toLowerCase().includes(search.toLowerCase())
  );

  const deleteOrder = async (orderId: string) => {
    if (!confirm("Are you sure you want to permanently delete this order?")) return;
    try {
      const res = await fetch(`/api/orders/${orderId}?uid=${user!.uid}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Order deleted successfully");
        fetchOrders(); // Refresh table
      } else {
        toast.error("Failed to delete order");
      }
    } catch {
      toast.error("Failed to delete order");
    }
  };



  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0B1D3A]">My Orders</h1>
        <p className="text-gray-500 mt-1">Track all your print orders</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search orders..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-300 rounded-xl text-[#0B1D3A] text-sm placeholder-white/30 focus:outline-none focus:border-violet-500"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => { setStatusFilter(f.value); setPage(1); }}
              className={`px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                statusFilter === f.value
                  ? "bg-violet-600 text-white"
                  : "glass border border-gray-300 text-gray-500 hover:text-[#0B1D3A]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="glass rounded-3xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 skeleton rounded-xl" />
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No orders found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left px-6 py-4 text-xs text-gray-400 font-medium uppercase tracking-wider">Order</th>
                    <th className="text-left px-4 py-4 text-xs text-gray-400 font-medium uppercase tracking-wider hidden md:table-cell">Details</th>
                    <th className="text-left px-4 py-4 text-xs text-gray-400 font-medium uppercase tracking-wider">Status</th>
                    <th className="text-left px-4 py-4 text-xs text-gray-400 font-medium uppercase tracking-wider hidden sm:table-cell">Payment</th>
                    <th className="text-right px-6 py-4 text-xs text-gray-400 font-medium uppercase tracking-wider">Amount</th>
                    <th className="px-4 py-4" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredOrders.map((order, i) => (
                    <motion.tr
                      key={order.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                            <FileText className="w-4 h-4 text-violet-400" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-[#0B1D3A] truncate max-w-[150px]">{order.fileName}</div>
                            <div className="text-xs text-gray-400">{order.orderNumber}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 hidden md:table-cell">
                        <div className="text-xs text-gray-500">
                          {order.totalPages} pages • {order.paperSize} • {order.copies}x
                        </div>
                        <div className="text-xs text-gray-400">{formatDate(order.createdAt)}</div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-2 py-1 rounded-lg text-xs border ${ORDER_STATUS_COLORS[order.status]}`}>
                          {ORDER_STATUS_LABELS[order.status]}
                        </span>
                      </td>
                      <td className="px-4 py-4 hidden sm:table-cell">
                        <span className={`px-2 py-1 rounded-lg text-xs border ${PAYMENT_STATUS_COLORS[order.paymentStatus]}`}>
                          {order.paymentStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-semibold text-[#0B1D3A] text-sm">{formatCurrency(order.totalAmount)}</span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1">
                          <Link href={`/dashboard/orders/${order.id}`}>
                            <button className="p-2 rounded-lg text-gray-500 hover:text-[#0B1D3A] hover:bg-gray-100 transition-all" title="View Details">
                              <Eye className="w-4 h-4" />
                            </button>
                          </Link>
                          <button 
                            onClick={() => deleteOrder(order.id)}
                            className="p-2 rounded-lg text-gray-500 hover:text-red-500 hover:bg-red-50 transition-all" title="Delete Order">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-gray-200">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-[#0B1D3A] disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>
                <span className="text-sm text-gray-500">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-[#0B1D3A] disabled:opacity-30 transition-colors"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

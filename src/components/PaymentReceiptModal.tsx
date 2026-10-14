"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Download } from "lucide-react";

export interface PaymentReceiptData {
  orderNumber: string;
  orderId?: string;
  fileName?: string;
  customerName?: string;
  customerContact?: string;
  receiptNumber?: string;
  transactionId?: string | null;
  amount: number;
  status: "successful" | "submitted" | "under_review" | "rejected" | "aborted" | "failed" | string;
  timestamp?: string;
  rejectionReason?: string | null;
}

interface PaymentReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: PaymentReceiptData | null;
}

export function formatReceiptDateTime(d?: Date | string | null): string {
  const date = d ? new Date(d) : new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function generateReceiptNumber(orderNumber?: string, paymentId?: string): string {
  if (paymentId) {
    const digits = paymentId.replace(/\D/g, "");
    if (digits.length >= 7) return digits.slice(-7);
  }
  if (orderNumber) {
    const digits = orderNumber.replace(/\D/g, "");
    if (digits.length >= 5) return "30" + digits.slice(-5);
  }
  return "3029719";
}

export default function PaymentReceiptModal({ isOpen, onClose, data }: PaymentReceiptModalProps) {
  if (!isOpen || !data) return null;

  const receiptNum = data.receiptNumber || generateReceiptNumber(data.orderNumber, data.orderId);
  const formattedTime = data.timestamp || formatReceiptDateTime();

  const handlePrint = () => {
    window.print();
  };

  const normalizedStatus = (data.status || "successful").toLowerCase();

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm print:p-0 print:bg-white overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-3xl w-full max-w-2xl max-h-[95vh] overflow-y-auto shadow-2xl p-6 sm:p-8 flex flex-col items-center border border-gray-200 print:shadow-none print:border-0 print:p-0 print:max-w-none print:w-full my-auto"
        >
          <div id="payment-receipt-print-section" className="w-full flex flex-col items-center">
            {/* Brand Title */}
            <div className="text-center mb-3 w-full">
              <div className="text-xs sm:text-sm font-semibold tracking-wider text-gray-500 uppercase mb-2">
                Online Payment Receipt Status
              </div>

              {/* Print Docker Official Crest */}
              <div className="flex items-center justify-center gap-2.5 mb-1.5">
                <img
                  src="/logo.png"
                  alt="PRINT DOCKER"
                  className="w-12 h-12 object-contain rounded-2xl bg-white p-1 border border-gray-200 shadow-md shrink-0"
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

            {/* Report Card (Light Sage Green Container) */}
            <div className="w-full bg-[#dcf0e2] border border-[#b6dec0] rounded-xl p-6 sm:p-8 text-center text-[#111827]">
              {/* Timestamp */}
              <div className="text-xs sm:text-sm font-semibold text-gray-800 tracking-wide mb-3">
                {formattedTime}
              </div>

              {/* Greeting */}
              <div className="text-base sm:text-lg font-bold text-[#111827]">
                Thank You, {data.customerName || "Customer"}.
              </div>

              <div className="text-sm sm:text-base font-medium text-gray-800 mt-1">
                Your order status is
              </div>

              {/* Status in bold */}
              <div className="mt-1 mb-2">
                {(normalizedStatus === "successful" || normalizedStatus === "paid") && (
                  <span className="text-2xl sm:text-3xl font-black text-emerald-700 tracking-tight">
                    successful
                  </span>
                )}
                {(normalizedStatus === "submitted" || normalizedStatus === "pending") && (
                  <span className="text-2xl sm:text-3xl font-black text-amber-600 tracking-tight">
                    pending verification
                  </span>
                )}
                {normalizedStatus === "under_review" && (
                  <span className="text-2xl sm:text-3xl font-black text-purple-600 tracking-tight">
                    under review
                  </span>
                )}
                {normalizedStatus === "rejected" && (
                  <span className="text-2xl sm:text-3xl font-black text-red-600 tracking-tight">
                    rejected
                  </span>
                )}
                {normalizedStatus === "aborted" && (
                  <span className="text-2xl sm:text-3xl font-black text-red-600 tracking-tight">
                    aborted
                  </span>
                )}
                {normalizedStatus === "failed" && (
                  <span className="text-2xl sm:text-3xl font-black text-red-600 tracking-tight">
                    failed
                  </span>
                )}
              </div>

              <div className="text-xl font-black text-gray-500 my-1">•</div>

              {/* Order Details Header */}
              <div className="text-sm sm:text-base font-bold text-[#111827] mb-3">
                Your Order Details as Follows :
              </div>

              {/* Detail Rows */}
              <div className="space-y-1.5 text-xs sm:text-sm font-semibold text-[#111827] max-w-lg mx-auto text-left sm:text-center">
                <div>
                  Order Number : <span className="font-mono">{data.orderNumber}</span>
                </div>
                <div>
                  Receipt No : <span className="font-mono">{receiptNum}</span>
                </div>
                {data.customerName && (
                  <div>
                    Customer :{" "}
                    <span>
                      {data.customerName}
                      {data.customerContact ? ` (${data.customerContact})` : ""}
                    </span>
                  </div>
                )}
                <div>
                  Order Description : Document Printing Service - {data.fileName || "Print Documents"}
                </div>
                <div>
                  BANK Reference No:{" "}
                  <span className="font-mono font-bold">
                    {data.transactionId || "null"}
                  </span>
                </div>
                <div>
                  PAID Amount : Rs.{data.amount.toFixed(2)}
                </div>
              </div>

              {/* Record Update Note */}
              <div className="mt-4 pt-3 border-t border-[#b6dec0]/60 text-xs sm:text-sm font-bold text-blue-700">
                {normalizedStatus === "successful" || normalizedStatus === "paid" ? (
                  <span>And is Successfully updated to Your Print Docker Records</span>
                ) : normalizedStatus === "aborted" ? (
                  <span>Transaction was aborted by user. Records preserved.</span>
                ) : normalizedStatus === "rejected" ? (
                  <span className="text-red-700">Payment rejected: {data.rejectionReason || "Verification failed"}</span>
                ) : (
                  <span>Payment record saved to Print Docker portal for verification</span>
                )}
              </div>

              {/* Verified UPI Payment Gateways */}
              <div className="mt-4 pt-3 border-t border-[#b6dec0]/60 flex items-center justify-between gap-2 flex-wrap">
                <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">
                  Supported via UPI
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { name: "Google Pay", src: "/payment-logos/gpay.jpeg", h: "h-3.5" },
                    { name: "PhonePe", src: "/payment-logos/phonepe.webp", h: "h-3.5" },
                    { name: "Paytm", src: "/payment-logos/paytm.jpeg", h: "h-3" },
                    { name: "BHIM", src: "/payment-logos/bhim.png", h: "h-3" },
                    { name: "UPI", src: "/payment-logos/upi.jpeg", h: "h-3" },
                  ].map((app) => (
                    <div
                      key={app.name}
                      className="bg-white border border-[#b6dec0] rounded px-1.5 py-0.5 shadow-2xs"
                      title={app.name}
                    >
                      <img src={app.src} alt={app.name} className={`${app.h} w-auto max-w-[36px] object-contain`} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons: Print PDF & Close */}
          <div className="mt-6 flex items-center justify-center gap-3 w-full print:hidden">
            <button
              type="button"
              onClick={handlePrint}
              className="px-6 py-2.5 bg-[#15803d] hover:bg-[#166534] text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 shadow transition-all hover:shadow-md cursor-pointer"
            >
              <Download className="w-4 h-4" /> Print PDF
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-bold text-sm transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>

      {/* Global CSS for Print Mode */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #payment-receipt-print-section,
          #payment-receipt-print-section * {
            visibility: visible !important;
          }
          #payment-receipt-print-section {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 20px !important;
          }
        }
      `}</style>
    </AnimatePresence>
  );
}

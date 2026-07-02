import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export function generateOrderNumber(): string {
  const prefix = "AGP";
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

export function generateInvoiceNumber(): string {
  const prefix = "INV";
  const year = new Date().getFullYear();
  const timestamp = Date.now().toString(36).toUpperCase();
  return `${prefix}-${year}-${timestamp}`;
}

export const ORDER_STATUS_LABELS: Record<string, string> = {
  UPLOADED: "Uploaded",
  VERIFIED: "Verified",
  ACCEPTED: "Accepted",
  PRINTING: "Printing",
  PRINTED: "Printed",
  READY_FOR_PICKUP: "Ready for Pickup",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  COMPLETED: "Completed",
};

export const ORDER_STATUS_COLORS: Record<string, string> = {
  UPLOADED: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  VERIFIED: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  ACCEPTED: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  PRINTING: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  PRINTED: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  READY_FOR_PICKUP: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  DELIVERED: "bg-green-500/10 text-green-400 border-green-500/20",
  CANCELLED: "bg-red-500/10 text-red-400 border-red-500/20",
  COMPLETED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

export const PAYMENT_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  PAID: "bg-green-500/10 text-green-400 border-green-500/20",
  FAILED: "bg-red-500/10 text-red-400 border-red-500/20",
  REFUNDED: "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

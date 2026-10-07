"use client";

import { useState, useEffect } from "react";
import { formatFileSize } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { HardDrive, Trash2, FileText, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface StorageItem {
  url: string;
  pathname: string;
  size: number;
  uploadedAt: string;
  orderNumber?: string;
  status: string;
  isSafeToDelete: boolean;
}

interface StorageData {
  items: StorageItem[];
  totalSize: number;
  totalCount: number;
  capacity: number;
}

export default function AdminStoragePage() {
  const { user } = useAuth();
  const [data, setData] = useState<StorageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"ACTIVE" | "SAFE">("ACTIVE");

  const fetchStorage = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/storage?uid=${user.uid}`);
      if (res.ok) {
        setData(await res.json());
      } else {
        toast.error("Failed to load storage data");
      }
    } catch (error) {
      toast.error("Error connecting to server");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStorage();
  }, [user]);

  const handleDelete = async (url: string) => {
    if (!user) return;
    if (!confirm("Are you sure you want to delete this file? This will break any orders associated with it.")) return;
    
    setDeleting(url);
    try {
      const res = await fetch(`/api/admin/storage?uid=${user.uid}&url=${encodeURIComponent(url)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("File deleted successfully");
        fetchStorage();
      } else {
        toast.error("Failed to delete file");
      }
    } catch (error) {
      toast.error("Error connecting to server");
    } finally {
      setDeleting(null);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  const percentUsed = data ? Math.min(100, (data.totalSize / data.capacity) * 100) : 0;
  const freeSpace = data ? data.capacity - data.totalSize : 0;

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0B1D3A]">Storage Management</h1>
          <p className="text-gray-500 mt-1">Manage your uploaded PDFs and storage capacity</p>
        </div>
        <button
          onClick={fetchStorage}
          className="p-2.5 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          title="Refresh Storage"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-3 glass rounded-3xl p-6 border border-gray-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                <HardDrive className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-[#0B1D3A]">Storage Usage</h2>
                <div className="text-sm text-gray-500">
                  {formatFileSize(data.totalSize)} used of {formatFileSize(data.capacity)}
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-blue-600">{percentUsed.toFixed(1)}% Used</span>
                <span className="text-emerald-600">{formatFileSize(freeSpace)} Free</span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${percentUsed}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              </div>
            </div>
            
            <div className="flex gap-6 pt-2">
              <div className="text-sm">
                <span className="text-gray-500">Total Files: </span>
                <span className="font-semibold text-[#0B1D3A]">{data.totalCount}</span>
              </div>
            </div>
          </div>

          <div className="md:col-span-3 glass rounded-3xl p-6 border border-gray-200">
            <div className="flex items-center gap-4 mb-4 border-b border-gray-100">
              <button 
                onClick={() => setActiveTab("ACTIVE")}
                className={`pb-3 text-sm font-semibold transition-colors relative ${activeTab === "ACTIVE" ? "text-blue-600" : "text-gray-400 hover:text-gray-600"}`}
              >
                Active Files
                {activeTab === "ACTIVE" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full" />}
              </button>
              <button 
                onClick={() => setActiveTab("SAFE")}
                className={`pb-3 text-sm font-semibold transition-colors relative ${activeTab === "SAFE" ? "text-red-500" : "text-gray-400 hover:text-gray-600"}`}
              >
                Ready for Deletion
                {activeTab === "SAFE" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-500 rounded-t-full" />}
              </button>
            </div>
            
            {data.items.filter(i => activeTab === "SAFE" ? i.isSafeToDelete : !i.isSafeToDelete).length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No files found in this category.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wider">
                      <th className="pb-3 font-semibold">File Name</th>
                      <th className="pb-3 font-semibold">Status</th>
                      <th className="pb-3 font-semibold">Size</th>
                      <th className="pb-3 font-semibold">Uploaded At</th>
                      <th className="pb-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-sm">
                    {data.items.filter(i => activeTab === "SAFE" ? i.isSafeToDelete : !i.isSafeToDelete).map((item) => (
                      <tr key={item.url} className="group hover:bg-gray-50/50 transition-colors">
                        <td className="py-3">
                          <div className="flex items-center gap-3">
                            <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <a 
                              href={item.url} 
                              target="_blank" 
                              rel="noreferrer"
                              className="font-medium text-[#0B1D3A] hover:text-blue-600 transition-colors line-clamp-1 max-w-[200px] sm:max-w-xs"
                              title={item.pathname}
                            >
                              {item.pathname.split('/').pop()}
                            </a>
                          </div>
                        </td>
                        <td className="py-3">
                          <div className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            item.isSafeToDelete ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                          }`}>
                            {item.status}
                          </div>
                          {item.orderNumber && (
                            <div className="text-xs text-gray-400 mt-0.5">{item.orderNumber}</div>
                          )}
                        </td>
                        <td className="py-3 text-gray-600 whitespace-nowrap">
                          {formatFileSize(item.size)}
                        </td>
                        <td className="py-3 text-gray-500 whitespace-nowrap">
                          {new Date(item.uploadedAt).toLocaleString()}
                        </td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => handleDelete(item.url)}
                            disabled={deleting === item.url}
                            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Delete File"
                          >
                            {deleting === item.url ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

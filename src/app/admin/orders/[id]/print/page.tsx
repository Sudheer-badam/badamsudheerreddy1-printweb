"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  ArrowLeft,
  Download,
  FileText,
  Settings2,
  Printer,
  Droplet,
  Layers,
  Info,
  Maximize,
  Copy,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

export default function AdminPrintRoomPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [activeDocIndex, setActiveDocIndex] = useState(0);

  const currentDoc = order?.documents && order.documents.length > 0 
    ? order.documents[activeDocIndex] 
    : order;

  useEffect(() => {
    if (currentDoc?.fileUrl) {
      setPreviewUrl(null);
      fetch(currentDoc.fileUrl)
        .then(res => res.blob())
        .then(blob => setPreviewUrl(URL.createObjectURL(blob)))
        .catch(err => {
          console.error("Failed to fetch inline PDF:", err);
          setPreviewUrl(currentDoc.fileUrl);
        });
    }
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [currentDoc?.fileUrl]);

  useEffect(() => {
    if (user && id) {
      fetchOrder();
    }
  }, [user, id]);

  const fetchOrder = async () => {
    try {
      const res = await fetch(`/api/orders/${id}?uid=${user!.uid}`);
      if (res.ok) {
        const data = await res.json();
        setOrder(data);
      } else {
        setError("Failed to load order details.");
      }
    } catch (err) {
      setError("An error occurred while fetching the order.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-violet-500"></div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Order Not Found</h2>
        <p className="text-white/60 mb-6">{error}</p>
        <button 
          onClick={() => router.push("/admin/orders")}
          className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors"
        >
          Back to Orders
        </button>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col gap-4 overflow-y-auto lg:overflow-hidden -mx-4 -my-4 sm:-mx-6 sm:-my-6 p-4 sm:p-6 bg-[#0a0a0a]">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0 flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push("/admin/orders")}
            className="p-2 hover:bg-white/10 rounded-xl text-white/70 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Printer className="w-5 h-5 text-amber-500" />
              Print Room
            </h1>
            <p className="text-xs text-white/50">Order {order.orderNumber} • {order.user.name}</p>
          </div>
        </div>

        <div className="flex gap-2">
          {currentDoc?.fileUrl && (
            <a
              href={currentDoc.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-xl text-sm font-medium transition-colors"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Download Current PDF</span>
              <span className="sm:hidden">Download</span>
            </a>
          )}
        </div>
      </div>

      {order.documents && order.documents.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2 shrink-0">
          {order.documents.map((doc: any, idx: number) => (
            <button
              key={idx}
              onClick={() => setActiveDocIndex(idx)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                activeDocIndex === idx
                  ? "bg-violet-600 text-white"
                  : "bg-white/10 text-white/70 hover:bg-white/20"
              }`}
            >
              Doc {idx + 1}: {doc.fileName}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0 pb-10 lg:pb-0">
        {/* PDF Preview Frame */}
        <div className="flex-1 flex flex-col rounded-3xl overflow-hidden border border-white/10 bg-black min-h-[400px] lg:min-h-0">
          <div className="bg-white/5 px-4 py-3 flex items-center justify-between border-b border-white/10 shrink-0">
            <div className="flex items-center gap-2 text-sm font-medium text-white/70 truncate mr-2">
              <FileText className="w-4 h-4 shrink-0" />
              <span className="truncate">{currentDoc.fileName}</span>
            </div>
            <div className="text-xs text-white/40 shrink-0">{currentDoc.totalPages} Pages total</div>
          </div>
          {previewUrl ? (
            <iframe 
              src={`${previewUrl}#view=FitH`}
              className="w-full flex-1 border-0 bg-white" 
              title="PDF Preview"
            />
          ) : (
            <div className="w-full flex-1 flex flex-col items-center justify-center text-white/50">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500 mb-4"></div>
              <p>Loading document preview...</p>
            </div>
          )}
        </div>

        {/* Acrobat Settings Checklist */}
        <div className="w-full lg:w-[400px] flex flex-col gap-4 lg:overflow-y-auto pr-2 shrink-0">
          <div className="glass rounded-3xl p-6 border border-amber-500/30 shadow-[0_0_30px_rgba(245,158,11,0.1)] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
            
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-6">
              <Settings2 className="w-5 h-5 text-amber-500" />
              Printer Settings
            </h2>

            <div className="space-y-5">
              <SettingBlock 
                label="Pages to Print" 
                value={currentDoc.pagesToPrint === "ALL" ? "All Pages" : `Custom: ${currentDoc.customPageRange}`}
                icon={<Layers className="w-4 h-4" />}
                highlight={currentDoc.pagesToPrint === "CUSTOM"}
              />

              <SettingBlock 
                label="Copies & Collate" 
                value={`${currentDoc.copies} Copies • ${currentDoc.collate ? "Collate ON" : "Collate OFF"}`}
                icon={<Copy className="w-4 h-4" />}
                highlight={currentDoc.copies > 1}
              />

              <SettingBlock 
                label="Color / Grayscale" 
                value={currentDoc.printColor === "COLOR" ? "Color" : "Black & White (Grayscale)"}
                icon={<Droplet className="w-4 h-4" />}
                highlight={currentDoc.printColor === "COLOR"}
              />

              <div className="h-px w-full bg-white/10 my-2" />

              <SettingBlock 
                label="Paper Size" 
                value={currentDoc.paperSize}
                icon={<Maximize className="w-4 h-4" />}
              />

              <SettingBlock 
                label="Page Sizing & Handling" 
                value={
                  currentDoc.pageSizing === "FIT" ? "Fit" : 
                  currentDoc.pageSizing === "ACTUAL_SIZE" ? "Actual Size" : 
                  "Shrink oversized pages"
                }
                icon={<Settings2 className="w-4 h-4" />}
              />

              <SettingBlock 
                label="Orientation" 
                value={
                  currentDoc.orientation === "AUTO" ? "Auto portrait/landscape" : 
                  currentDoc.orientation === "PORTRAIT" ? "Portrait" : 
                  "Landscape"
                }
                icon={<Info className="w-4 h-4" />}
              />

              <SettingBlock 
                label="Print on both sides" 
                value={
                  currentDoc.printSide === "SINGLE" ? "Single Sided" : 
                  (currentDoc.printSide === "DOUBLE" || currentDoc.printSide === "DOUBLE_LONG_EDGE") ? "Double Sided (Long Edge)" : 
                  "Double Sided (Short Edge)"
                }
                icon={<Layers className="w-4 h-4" />}
                highlight={currentDoc.printSide !== "SINGLE"}
              />

              {currentDoc.saveInk && (
                <div className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl mt-4">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <div className="text-sm font-bold text-emerald-400">Save Ink/Toner Requested</div>
                    <div className="text-xs text-emerald-400/70">Please enable eco/draft mode on your printer.</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {(currentDoc.binding || currentDoc.lamination || currentDoc.instructions || order.instructions) && (
            <div className="glass rounded-3xl p-6 border border-white/10">
              <h3 className="font-bold text-white mb-4">Post-Print Instructions</h3>
              <div className="space-y-3">
                {currentDoc.binding && <div className="text-sm text-white/70 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-violet-400"/> Binding Required</div>}
                {currentDoc.lamination && <div className="text-sm text-white/70 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-violet-400"/> Lamination Required</div>}
                {(currentDoc.instructions || order.instructions) && (
                  <div className="mt-4 p-3 bg-white/5 rounded-xl border border-white/10 text-sm text-white/70">
                    <span className="font-semibold block mb-1">Customer Notes:</span>
                    &quot;{currentDoc.instructions || order.instructions}&quot;
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SettingBlock({ label, value, icon, highlight = false }: { label: string, value: string, icon: React.ReactNode, highlight?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="text-xs font-medium text-white/40 uppercase tracking-wider">{label}</div>
      <div className={`flex items-center gap-2 text-sm font-semibold p-2.5 rounded-xl border ${highlight ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-white/5 border-white/5 text-white'}`}>
        <span className="opacity-70">{icon}</span>
        {value}
      </div>
    </div>
  );
}

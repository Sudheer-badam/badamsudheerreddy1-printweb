"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDropzone } from "react-dropzone";
import { PDFDocument } from "pdf-lib";
import {
  Upload,
  FileText,
  X,
  ChevronDown,
  Loader2,
  CheckCircle,
  AlertCircle,
  IndianRupee,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatCurrency, formatFileSize } from "@/lib/utils";
import { storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

interface Pricing {
  colorPrice: number;
  bwPrice: number;
  a3Multiplier: number;
  bindingCost: number;
  laminationCost: number;
  gstRate: number;
  maxFileSize: number;
}

interface AdminSettings {
  enableBinding: boolean;
  enableLamination: boolean;
  enableGST: boolean;
  paperSizes: { id: string; label: string; multiplier: number; isActive: boolean }[];
  paperQualities: { id: string; label: string; price: number; isActive: boolean }[];
}

interface FileAnalysis {
  totalPages: number;
  colorPages: number;
  bwPages: number;
  paperSize: string;
}



const getPrintablePageCount = (rangeStr: string, totalPages: number): number => {
  if (!rangeStr.trim()) return 0;
  const parts = rangeStr.split(',');
  let count = 0;
  for (const part of parts) {
    const p = part.trim();
    if (p.includes('-')) {
      const [start, end] = p.split('-').map(Number);
      if (!isNaN(start) && !isNaN(end) && start <= end && start >= 1 && end <= totalPages) {
        count += (end - start + 1);
      }
    } else {
      const pageNum = Number(p);
      if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
        count += 1;
      }
    }
  }
  return count;
};

export default function UploadPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [pricing, setPricing] = useState<Pricing | null>(null);
  const [adminSettings, setAdminSettings] = useState<AdminSettings | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileAnalysis, setFileAnalysis] = useState<FileAnalysis | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [fileUrl, setFileUrl] = useState<string | null>(null);

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setFileUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setFileUrl(null);
    }
  }, [file]);

  const [options, setOptions] = useState({
    copies: 1,
    collate: true,
    pagesToPrint: "ALL",
    customPageRange: "",
    printColor: "BLACK_AND_WHITE",
    pageSizing: "FIT",
    printSide: "SINGLE",
    orientation: "AUTO",
    paperSize: "A4",
    paperQuality: "standard",
    saveInk: false,
    binding: false,
    lamination: false,
    instructions: "",
  });

  useEffect(() => {
    fetch("/api/pricing").then((r) => r.json()).then(setPricing);
    fetch("/api/admin/settings").then((r) => r.json()).then(setAdminSettings);
  }, []);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const uploadedFile = acceptedFiles[0];
      if (!uploadedFile) return;

      if (uploadedFile.type !== "application/pdf") {
        toast.error("Only PDF files are allowed");
        return;
      }

      if (pricing && uploadedFile.size > pricing.maxFileSize) {
        toast.error(`File too large. Maximum ${formatFileSize(pricing.maxFileSize)}`);
        return;
      }

      setFile(uploadedFile);
      setAnalyzing(true);

      try {
        const arrayBuffer = await uploadedFile.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        const actualPageCount = pdfDoc.getPageCount();

        setFileAnalysis({
          totalPages: actualPageCount,
          colorPages: 0,
          bwPages: actualPageCount,
          paperSize: "A4",
        });
        toast.success("PDF analyzed successfully!");
      } catch (error) {
        console.error("PDF analysis error:", error);
        toast.error("Failed to read PDF file.");
        setFile(null);
      } finally {
        setAnalyzing(false);
      }
    },
    [pricing]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
  });

  const calculateCost = () => {
    if (!pricing || !fileAnalysis) return null;

    const { colorPages, bwPages, totalPages } = fileAnalysis;
    const { copies, binding, lamination, paperSize, printColor, pagesToPrint, customPageRange } = options;
    // Get dynamic size multiplier
    let sizeMultiplier = 1;
    if (adminSettings?.paperSizes) {
      const pSize = adminSettings.paperSizes.find(s => s.id === paperSize);
      if (pSize) sizeMultiplier = pSize.multiplier;
    } else {
      sizeMultiplier = paperSize === "A3" ? pricing.a3Multiplier : 1;
    }

    // Get dynamic quality cost per page
    let qualityCost = 0;
    if (adminSettings?.paperQualities) {
      const pQual = adminSettings.paperQualities.find(q => q.id === options.paperQuality);
      if (pQual) qualityCost = pQual.price;
    }

    const pagesToCharge = pagesToPrint === "ALL" 
      ? totalPages 
      : getPrintablePageCount(customPageRange, totalPages);
      
    if (pagesToCharge === 0) return null;

    const estimatedColorPages = printColor === "COLOR" ? pagesToCharge : 0;
    const estimatedBwPages = printColor === "BLACK_AND_WHITE" ? pagesToCharge : 0;

    const colorCost = estimatedColorPages * (pricing.colorPrice + qualityCost) * sizeMultiplier * copies;
    const bwCost = estimatedBwPages * (pricing.bwPrice + qualityCost) * sizeMultiplier * copies;

    const bindingCost = binding ? pricing.bindingCost : 0;
    const laminationCost = lamination ? pagesToCharge * pricing.laminationCost * copies : 0;
    const subtotal = colorCost + bwCost + bindingCost + laminationCost;
    const gstAmount = adminSettings?.enableGST ? (subtotal * pricing.gstRate) / 100 : 0;
    const total = subtotal + gstAmount;

    return {
      pagesToCharge,
      estimatedColorPages,
      estimatedBwPages,
      colorCost,
      bwCost,
      bindingCost,
      laminationCost,
      subtotal,
      gstAmount,
      total,
      colorPrice: pricing.colorPrice,
      bwPrice: pricing.bwPrice,
    };
  };

  const cost = calculateCost();

  const handleSubmit = async () => {
    if (!file || !fileAnalysis || !cost || !user) return;
    setUploading(true);
    setUploadProgress(0);

    try {
      let downloadURL = "";
      const storageKey = `orders/${user.uid}/${Date.now()}-${file.name}`;

      // Upload to Firebase Storage
      const storageRef = ref(storage, storageKey);
      
      // Simulate progress for UI since uploadBytes doesn't have on-progress
      setUploadProgress(30);

      try {
        toast.loading("Uploading to secure storage...", { id: "upload-toast" });
        
        const uploadPromise = uploadBytes(storageRef, file);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Firebase upload timed out. This is usually caused by missing CORS configuration in your Firebase Storage bucket.")), 15000)
        );
        
        const snapshot = await Promise.race([uploadPromise, timeoutPromise]) as any;
        
        setUploadProgress(80);
        downloadURL = await getDownloadURL(snapshot.ref);
        setUploadProgress(100);
        toast.loading("Syncing authentication...", { id: "upload-toast" });
      } catch (error: any) {
        toast.dismiss("upload-toast");
        console.error("Firebase Upload failed:", error);
        if (error.code === 'storage/unauthorized') {
          throw new Error("Storage permission denied. Please check Firebase rules.");
        } else {
          throw new Error(error.message || "File upload failed.");
        }
      }

      const idToken = await user.getIdToken();
      
      // Force auth sync to prevent 'User not found' if they haven't refreshed the page
      await fetch("/api/auth/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          uid: user.uid,
          email: user.email,
          name: user.displayName,
          phone: user.phoneNumber,
          photoURL: user.photoURL,
          provider: user.providerData?.[0]?.providerId,
        }),
      });

      toast.loading("Creating your order...", { id: "upload-toast" });

      const orderRes = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: user.uid,
          fileName: file.name,
          fileUrl: downloadURL,
          fileKey: storageKey,
          fileSize: file.size,
          totalPages: fileAnalysis.totalPages,
          colorPages: cost.estimatedColorPages,
          bwPages: cost.estimatedBwPages,
          ...options,
          colorPrice: cost.colorPrice,
          bwPrice: cost.bwPrice,
          bindingCost: cost.bindingCost,
          laminationCost: cost.laminationCost,
          subtotal: cost.subtotal,
          gstRate: pricing?.gstRate || 0,
          gstAmount: cost.gstAmount,
          discount: 0,
          totalAmount: cost.total,
        }),
      });

      if (orderRes.ok) {
        toast.dismiss("upload-toast");
        const order = await orderRes.json();
        setSubmitted(true);
        toast.success("Order placed successfully!");
        setTimeout(() => router.push(`/dashboard/orders/${order.id}`), 2000);
      } else {
        toast.dismiss("upload-toast");
        throw new Error("Failed to create order");
      }
    } catch (error: any) {
      toast.dismiss("upload-toast");
      toast.error(error.message || "Failed to submit order. Please try again.");
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-[#0B1D3A] mb-2">Order Submitted!</h2>
          <p className="text-gray-500">Redirecting to your order...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0B1D3A]">Upload PDF</h1>
        <p className="text-gray-500 mt-1">Upload your PDF and configure print options</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left: Upload + Options */}
        <div className="xl:col-span-2 space-y-6">
          {/* Drop Zone */}
          {!file && (
            <div
              {...getRootProps()}
              className={`upload-zone rounded-3xl p-10 text-center cursor-pointer transition-all ${
                isDragActive ? "drag-over" : ""
              }`}
            >
              <input {...getInputProps()} />
              <div className="space-y-3">
                <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                <div>
                  <p className="font-medium text-[#0B1D3A]">
                    {isDragActive ? "Drop your PDF here" : "Drag & drop PDF or click to browse"}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    PDF only • Max {pricing ? formatFileSize(pricing.maxFileSize) : "50MB"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* File Preview */}
          {file && (
            <div className="glass rounded-3xl p-4 border border-gray-200 space-y-4">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-[#0B1D3A] line-clamp-1">{file.name}</div>
                    <div className="text-xs text-gray-500">{formatFileSize(file.size)}</div>
                  </div>
                </div>
                <button
                  onClick={() => { setFile(null); setFileAnalysis(null); }}
                  className="p-2 rounded-xl text-red-500 hover:bg-red-50 transition-colors"
                  title="Remove File"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {analyzing ? (
                <div className="w-full h-[500px] rounded-2xl bg-gray-50 border border-gray-200 flex flex-col items-center justify-center space-y-3">
                  <Loader2 className="w-10 h-10 text-violet-400 animate-spin" />
                  <p className="text-gray-500 font-medium">Analyzing PDF...</p>
                </div>
              ) : fileUrl ? (
                <div className="w-full h-[500px] rounded-2xl overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center">
                  <object 
                    data={`${fileUrl}#view=FitH`} 
                    type="application/pdf"
                    className="w-full h-full" 
                  >
                    <div className="flex flex-col items-center justify-center text-gray-500 space-y-2">
                      <FileText className="w-12 h-12 text-gray-300" />
                      <p>Preview not available in this browser.</p>
                      <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-violet-600 hover:underline">Click here to open PDF</a>
                    </div>
                  </object>
                </div>
              ) : null}
            </div>
          )}

          {/* File Analysis */}
          <AnimatePresence>
            {fileAnalysis && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-2xl p-5 border border-gray-200"
              >
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-4 h-4 text-violet-400" />
                  <h3 className="font-semibold text-[#0B1D3A] text-sm">PDF Analysis</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <Stat label="Total Pages" value={fileAnalysis.totalPages} />
                  <Stat label="Color Pages" value={fileAnalysis.colorPages} />
                  <Stat label="B&W Pages" value={fileAnalysis.bwPages} />
                  <Stat label="Paper Size" value={fileAnalysis.paperSize} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Print Options */}
          <div className="glass rounded-3xl p-6 border border-gray-200 space-y-5">
            <h3 className="font-bold text-[#0B1D3A]">Print Options</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SelectField
                label="Pages to Print"
                value={options.pagesToPrint}
                onChange={(v) => setOptions({ ...options, pagesToPrint: v })}
                options={[
                  {value:"ALL", label:"All"}, 
                  {value:"CUSTOM", label:"Custom Range"}
                ]}
              />
              
              {options.pagesToPrint === "CUSTOM" && (
                <div>
                  <label className="text-xs text-gray-500 mb-2 block">Page Range</label>
                  <input
                    type="text"
                    value={options.customPageRange}
                    onChange={(e) => setOptions({ ...options, customPageRange: e.target.value })}
                    placeholder="e.g. 1-5, 8, 11-13"
                    className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-xl text-[#0B1D3A] text-sm focus:outline-none focus:border-violet-500"
                  />
                </div>
              )}

              <SelectField
                label="Page Sizing & Handling"
                value={options.pageSizing}
                onChange={(v) => setOptions({ ...options, pageSizing: v })}
                options={[
                  {value:"FIT", label:"Fit"},
                  {value:"ACTUAL_SIZE", label:"Actual Size"},
                  {value:"SHRINK", label:"Shrink oversized pages"}
                ]}
              />

              <SelectField
                label="Print on both sides of paper"
                value={options.printSide}
                onChange={(v) => setOptions({ ...options, printSide: v })}
                options={[
                  {value:"SINGLE", label:"None (Single Sided)"},
                  {value:"DOUBLE_LONG_EDGE", label:"Flip on long edge"},
                  {value:"DOUBLE_SHORT_EDGE", label:"Flip on short edge"}
                ]}
              />

              <SelectField
                label="Orientation"
                value={options.orientation}
                onChange={(v) => setOptions({ ...options, orientation: v })}
                options={[
                  {value:"AUTO", label:"Auto portrait/landscape"},
                  {value:"PORTRAIT", label:"Portrait"},
                  {value:"LANDSCAPE", label:"Landscape"}
                ]}
              />

              <SelectField
                label="Color/Grayscale"
                value={options.printColor}
                onChange={(v) => setOptions({ ...options, printColor: v })}
                options={[
                  { value: "BLACK_AND_WHITE", label: "Black & White" },
                  { value: "COLOR", label: "Color" },
                ]}
              />

              <SelectField
                label="Paper Size"
                value={options.paperSize}
                onChange={(v) => setOptions({ ...options, paperSize: v })}
                options={(adminSettings?.paperSizes?.filter(s => s.isActive) || [{id:"A4", label:"A4 Size", multiplier: 1, isActive: true}]).map(s => ({ value: s.id, label: s.label }))}
              />

              <SelectField
                label="Paper Quality"
                value={options.paperQuality}
                onChange={(v) => setOptions({ ...options, paperQuality: v })}
                options={(adminSettings?.paperQualities?.filter(q => q.isActive) || [{id:"standard", label:"Standard", price:0, isActive:true}]).map(q => ({ value: q.id, label: `${q.label} ${q.price > 0 ? `(+₹${q.price})` : ''}` }))}
              />

              <div>
                <label className="text-xs text-gray-500 mb-2 block">Copies</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setOptions({ ...options, copies: Math.max(1, options.copies - 1) })}
                    className="w-9 h-9 rounded-lg bg-white border border-gray-300 text-[#0B1D3A] hover:bg-gray-100 flex items-center justify-center"
                  >
                    -
                  </button>
                  <span className="w-8 text-center font-bold text-[#0B1D3A]">{options.copies}</span>
                  <button
                    onClick={() => setOptions({ ...options, copies: options.copies + 1 })}
                    className="w-9 h-9 rounded-lg bg-white border border-gray-300 text-[#0B1D3A] hover:bg-gray-100 flex items-center justify-center"
                  >
                    +
                  </button>
                  
                  {options.copies > 1 && (
                    <label className="flex items-center gap-2 ml-3 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={options.collate} 
                        onChange={(e) => setOptions({...options, collate: e.target.checked})}
                        className="rounded border-gray-300 text-violet-600 focus:ring-violet-500 w-4 h-4 cursor-pointer"
                      />
                      <span className="text-sm text-[#0B1D3A]">Collate</span>
                    </label>
                  )}
                </div>
              </div>
            </div>

            {/* Extras */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <ToggleField
                label="Save Ink/Toner"
                sublabel="Eco-friendly draft printing"
                checked={options.saveInk}
                onChange={(v) => setOptions({ ...options, saveInk: v })}
              />
              <ToggleField
                label="Binding"
                sublabel={pricing ? `₹${pricing.bindingCost}` : ""}
                checked={options.binding}
                onChange={(v) => setOptions({ ...options, binding: v })}
              />
              <ToggleField
                label="Lamination"
                sublabel={pricing ? `₹${pricing.laminationCost}/page` : ""}
                checked={options.lamination}
                onChange={(v) => setOptions({ ...options, lamination: v })}
              />
            </div>

            {/* Instructions */}
            <div>
              <label className="text-xs text-gray-500 mb-2 block">Special Instructions (Optional)</label>
              <textarea
                value={options.instructions}
                onChange={(e) => setOptions({ ...options, instructions: e.target.value })}
                placeholder="Any special requirements..."
                rows={3}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-[#0B1D3A] text-sm placeholder-white/30 focus:outline-none focus:border-violet-500 transition-colors resize-none"
              />
            </div>
          </div>
        </div>

        {/* Right: Cost Summary */}
        <div>
          <div className="glass rounded-3xl p-6 border border-gray-200 sticky top-24 space-y-5">
            <div className="flex items-center gap-2">
              <IndianRupee className="w-5 h-5 text-violet-400" />
              <h3 className="font-bold text-[#0B1D3A]">Cost Estimate</h3>
            </div>

            {!fileAnalysis ? (
              <div className="text-center py-6 text-gray-400">
                <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                <p className="text-sm">Upload a PDF to see cost estimate</p>
              </div>
            ) : cost ? (
              <div className="space-y-3">
                <CostRow label={`B&W Pages (${cost.estimatedBwPages} × ${options.copies} copies)`} value={cost.bwCost} />
                {options.printColor === "COLOR" && cost.colorCost > 0 && (
                  <CostRow label={`Color Pages (${cost.estimatedColorPages} × ${options.copies} copies)`} value={cost.colorCost} />
                )}
                {options.binding && <CostRow label="Binding" value={cost.bindingCost} />}
                {options.lamination && <CostRow label="Lamination" value={cost.laminationCost} />}

                <div className="border-t border-gray-300 pt-3">
                  <CostRow label="Subtotal" value={cost.subtotal} />
                  {pricing && pricing.gstRate > 0 && (
                    <CostRow label={`GST (${pricing.gstRate}%)`} value={cost.gstAmount} />
                  )}
                </div>

                <div className="glass rounded-xl p-4 border border-violet-500/20">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-[#0B1D3A]">Total Amount</span>
                    <span className="text-xl font-extrabold text-gradient">{formatCurrency(cost.total)}</span>
                  </div>
                </div>

                {/* Upload Progress */}
                {uploading && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Uploading...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full gradient-primary rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${uploadProgress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </div>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={!file || uploading}
                  className="w-full py-3.5 rounded-xl gradient-primary text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {uploading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</>
                  ) : (
                    <><Upload className="w-4 h-4" /> Submit Order</>
                  )}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3 text-center">
      <div className="text-lg font-bold text-[#0B1D3A]">{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}

function CostRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="text-[#0B1D3A] font-medium">{formatCurrency(value)}</span>
    </div>
  );
}

interface SelectOption { value: string; label: string }

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: (string | SelectOption)[];
}) {
  return (
    <div>
      <label className="text-xs text-gray-500 mb-2 block">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-xl text-[#0B1D3A] text-sm focus:outline-none focus:border-violet-500 appearance-none cursor-pointer"
        >
          {options.map((opt) => {
            const v = typeof opt === "string" ? opt : opt.value;
            const l = typeof opt === "string" ? opt : opt.label;
            return <option key={v} value={v} className="bg-gray-900">{l}</option>;
          })}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>
    </div>
  );
}

function ToggleField({
  label,
  sublabel,
  checked,
  onChange,
}: {
  label: string;
  sublabel: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div
      onClick={() => onChange(!checked)}
      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
        checked
          ? "border-violet-500/30 bg-violet-500/10"
          : "border-gray-300 bg-gray-50 hover:border-gray-400"
      }`}
    >
      <div>
        <div className="text-sm font-medium text-[#0B1D3A]">{label}</div>
        {sublabel && <div className="text-xs text-gray-400">{sublabel}</div>}
      </div>
      <div
        className={`w-10 h-5 rounded-full transition-colors ${
          checked ? "bg-violet-600" : "bg-gray-100"
        }`}
      >
        <div
          className={`w-4 h-4 rounded-full bg-white m-0.5 transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </div>
    </div>
  );
}

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
  FileImage
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatCurrency, formatFileSize } from "@/lib/utils";
import { upload } from '@vercel/blob/client';

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
  allowDoubleSided: boolean;
  paperSizes: { id: string; label: string; multiplier: number; isActive: boolean }[];
  paperQualities: { id: string; label: string; colorPrice?: number; bwPrice?: number; price?: number; isActive: boolean }[];
}

interface FileAnalysis {
  totalPages: number;
  colorPages: number;
  bwPages: number;
  paperSize: string;
}

interface PrintOptions {
  copies: number;
  collate: boolean;
  pagesToPrint: string;
  customPageRange: string;
  printColor: string;
  pageSizing: string;
  printSide: string;
  orientation: string;
  paperSize: string;
  paperQuality: string;
  saveInk: boolean;
  binding: boolean;
  lamination: boolean;
  instructions: string;
}

interface FileItem {
  id: string;
  file: File;
  previewUrl: string;
  type: "pdf" | "image";
  analysis: FileAnalysis;
  options: PrintOptions;
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
  const [fileItems, setFileItems] = useState<FileItem[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    return () => {
      // Cleanup object URLs on unmount
      fileItems.forEach(item => URL.revokeObjectURL(item.previewUrl));
    };
  }, [fileItems]);

  useEffect(() => {
    const loadSettings = () => {
      fetch("/api/pricing", { cache: "no-store" }).then((r) => r.json()).then(setPricing);
      fetch("/api/admin/settings", { cache: "no-store" }).then((r) => r.json()).then(setAdminSettings);
    };

    loadSettings();
    window.addEventListener("focus", loadSettings);
    return () => window.removeEventListener("focus", loadSettings);
  }, []);

  const getDefaultOptions = (data: AdminSettings | null): PrintOptions => {
    const opts: PrintOptions = {
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
    };
    if (data) {
      let sizes = data.paperSizes;
      if (!Array.isArray(sizes)) sizes = [];
      const activeSizes = sizes.filter((s: any) => s.isActive);
      if (activeSizes.length > 0) opts.paperSize = activeSizes[0].id;
      
      let qualities = data.paperQualities;
      if (!Array.isArray(qualities)) qualities = [];
      const activeQualities = qualities.filter((q: any) => q.isActive);
      if (activeQualities.length > 0) opts.paperQuality = activeQualities[0].id;

      if (data.allowDoubleSided === false) opts.printSide = "SINGLE";
    }
    return opts;
  };

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (!acceptedFiles.length) return;

      const validFiles = acceptedFiles.filter(f => f.type === "application/pdf" || f.type === "image/jpeg" || f.type === "image/png" || f.type === "image/jpg");
      if (validFiles.length !== acceptedFiles.length) {
        toast.error("Only PDF, JPEG, and PNG files are allowed");
        if (!validFiles.length) return;
      }

      setAnalyzing(true);
      try {
        const newItems: FileItem[] = [];

        for (const newFile of validFiles) {
          if (pricing && newFile.size > pricing.maxFileSize) {
            toast.error(`File ${newFile.name} is too large. Maximum ${formatFileSize(pricing.maxFileSize)}`);
            continue;
          }

          const type: "pdf" | "image" = newFile.type.startsWith("image/") ? "image" : "pdf";
          let totalPages = 1;

          if (type === "pdf") {
            try {
              const pdfDoc = await PDFDocument.load(await newFile.arrayBuffer());
              totalPages = pdfDoc.getPageCount();
            } catch(e) {
              console.error("Failed to parse PDF", e);
              toast.error(`Failed to read ${newFile.name}`);
              continue;
            }
          }

          const id = Date.now().toString() + Math.random().toString();
          
          newItems.push({
            id,
            file: newFile,
            previewUrl: URL.createObjectURL(newFile),
            type,
            analysis: {
              totalPages,
              colorPages: type === "image" ? 1 : 0, // Assume images are color
              bwPages: type === "image" ? 0 : totalPages,
              paperSize: "A4",
            },
            options: getDefaultOptions(adminSettings),
          });
        }

        if (newItems.length > 0) {
          setFileItems(prev => {
            const updated = [...prev, ...newItems];
            if (!activeFileId) setActiveFileId(newItems[0].id);
            return updated;
          });
          toast.success("Files added and analyzed!");
        }
      } catch (error) {
        console.error("File analysis error:", error);
        toast.error("Failed to read file(s).");
      } finally {
        setAnalyzing(false);
      }
    },
    [pricing, adminSettings, activeFileId]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 
      "application/pdf": [".pdf"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"]
    },
  });

  const updateItemOptions = (id: string, newOptions: Partial<PrintOptions>) => {
    setFileItems(prev => prev.map(item => 
      item.id === id ? { ...item, options: { ...item.options, ...newOptions } } : item
    ));
  };

  const removeItem = (id: string) => {
    setFileItems(prev => {
      const updated = prev.filter(item => item.id !== id);
      if (activeFileId === id) {
        setActiveFileId(updated.length > 0 ? updated[0].id : null);
      }
      return updated;
    });
  };

  const calculateItemCost = (item: FileItem) => {
    if (!pricing) return null;

    const { colorPages, bwPages, totalPages } = item.analysis;
    const { copies, binding, lamination, paperSize, printColor, pagesToPrint, customPageRange, printSide, paperQuality } = item.options;
    
    let sizeMultiplier = 1;
    if (adminSettings?.paperSizes) {
      const pSize = adminSettings.paperSizes.find((s: any) => s.id === paperSize);
      if (pSize) sizeMultiplier = pSize.multiplier;
    } else {
      sizeMultiplier = paperSize === "A3" ? pricing.a3Multiplier : 1;
    }

    let activeColorPrice = pricing.colorPrice;
    let activeBwPrice = pricing.bwPrice;

    if (adminSettings?.paperQualities) {
      const pQual = adminSettings.paperQualities.find((q: any) => q.id === paperQuality);
      if (pQual) {
        activeColorPrice = pQual.colorPrice || pQual.price || pricing.colorPrice;
        activeBwPrice = pQual.bwPrice || pQual.price || pricing.bwPrice;
      }
    }

    const pagesToCharge = pagesToPrint === "ALL" 
      ? totalPages 
      : getPrintablePageCount(customPageRange, totalPages);
      
    if (pagesToCharge === 0) return null;

    let estimatedColorPages = 0;
    let estimatedBwPages = 0;

    if (printColor === "BLACK_AND_WHITE") {
      estimatedBwPages = pagesToCharge;
      estimatedColorPages = 0;
    } else {
      estimatedColorPages = pagesToCharge;
      estimatedBwPages = 0;
    }

    const isDoubleSided = printSide !== "SINGLE";
    
    const bwCost = estimatedBwPages * activeBwPrice * sizeMultiplier * copies;
    const colorCost = estimatedColorPages * activeColorPrice * sizeMultiplier * copies;

    const bindingCost = binding ? (pricing.bindingCost * copies) : 0;
    const totalSheets = isDoubleSided ? Math.ceil(pagesToCharge / 2) : pagesToCharge;
    const laminationCost = lamination ? (totalSheets * pricing.laminationCost * copies) : 0;
    
    const subtotal = colorCost + bwCost + bindingCost + laminationCost;
    const gstAmount = 0; // inclusive
    const total = subtotal;

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
      colorPrice: activeColorPrice, // Store actual price used
      bwPrice: activeBwPrice,
    };
  };

  const getTotalCost = () => {
    if (fileItems.length === 0) return null;
    let total = 0;
    let subtotal = 0;
    for (const item of fileItems) {
      const cost = calculateItemCost(item);
      if (cost) {
        total += cost.total;
        subtotal += cost.subtotal;
      }
    }
    return { total, subtotal };
  };

  const activeItem = fileItems.find(i => i.id === activeFileId);
  const activeCost = activeItem ? calculateItemCost(activeItem) : null;
  const totalCostEstimate = getTotalCost();

  const createExtractPdf = async (item: FileItem) => {
    // If it's custom pages, extract them to a new PDF before uploading
    if (item.type === 'pdf' && item.options.pagesToPrint === 'CUSTOM' && item.options.customPageRange.trim()) {
      const parts = item.options.customPageRange.split(',');
      const pageIndices: number[] = [];
      for (const part of parts) {
        const p = part.trim();
        if (p.includes('-')) {
          const [start, end] = p.split('-').map(Number);
          if (!isNaN(start) && !isNaN(end) && start <= end && start >= 1 && end <= item.analysis.totalPages) {
            for(let i = start; i <= end; i++) {
              pageIndices.push(i - 1); // 0-indexed for pdf-lib
            }
          }
        } else {
          const pageNum = Number(p);
          if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= item.analysis.totalPages) {
            pageIndices.push(pageNum - 1);
          }
        }
      }
      
      // Deduplicate indices
      const uniqueIndices = Array.from(new Set(pageIndices)).sort((a,b)=>a-b);
      
      if (uniqueIndices.length > 0) {
        const originalPdf = await PDFDocument.load(await item.file.arrayBuffer());
        const newPdf = await PDFDocument.create();
        const copiedPages = await newPdf.copyPages(originalPdf, uniqueIndices);
        copiedPages.forEach((page) => newPdf.addPage(page));
        const newPdfBytes = await newPdf.save();
        return new File([newPdfBytes as any], `${item.file.name.replace('.pdf', '')}_CustomPages.pdf`, { type: "application/pdf" });
      }
    }
    return item.file;
  };

  const handleSubmit = async () => {
    if (fileItems.length === 0 || !user || !pricing) return;
    setUploading(true);
    setUploadProgress(0);

    try {
      const idToken = await user.getIdToken();
      // Sync user
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

      const uploadedDocuments: any[] = [];
      let totalAmount = 0;
      let totalSubtotal = 0;

      for (let i = 0; i < fileItems.length; i++) {
        const item = fileItems[i];
        const cost = calculateItemCost(item);
        if (!cost) continue;
        
        toast.loading(`Processing file ${i+1} of ${fileItems.length}...`, { id: "upload-toast" });

        const fileToUpload = await createExtractPdf(item);
        const storageKey = `orders/${user.uid}/${Date.now()}-${fileToUpload.name}`;

        setUploadProgress(Math.floor((i / fileItems.length) * 100) + 5);
        
        const newBlob = await upload(storageKey, fileToUpload, {
          access: 'public',
          handleUploadUrl: '/api/upload',
        });
        
        setUploadProgress(Math.floor(((i + 1) / fileItems.length) * 100));

        uploadedDocuments.push({
          fileName: fileToUpload.name,
          fileUrl: newBlob.url,
          fileKey: storageKey,
          fileSize: fileToUpload.size,
          totalPages: cost.pagesToCharge,
          colorPages: cost.estimatedColorPages,
          bwPages: cost.estimatedBwPages,
          ...item.options,
          colorPrice: cost.colorPrice,
          bwPrice: cost.bwPrice,
          bindingCost: cost.bindingCost,
          laminationCost: cost.laminationCost,
          subtotal: cost.subtotal,
          gstRate: pricing?.gstRate || 0,
          gstAmount: cost.gstAmount,
          discount: 0,
          totalAmount: cost.total,
        });

        totalAmount += cost.total;
        totalSubtotal += cost.subtotal;
      }

      if (uploadedDocuments.length === 0) {
        toast.dismiss("upload-toast");
        return;
      }

      toast.loading("Creating order...", { id: "upload-toast" });

      const orderRes = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: user.uid,
          documents: uploadedDocuments,
          subtotal: totalSubtotal,
          totalAmount: totalAmount,
          // We provide a fallback for root fields if needed
          fileName: uploadedDocuments.length > 1 ? "Multiple Files" : uploadedDocuments[0].fileName,
          fileUrl: uploadedDocuments[0].fileUrl,
        }),
      });

      if (orderRes.ok) {
        const order = await orderRes.json();
        toast.dismiss("upload-toast");
        setSubmitted(true);
        toast.success("Order placed successfully!");
        setTimeout(() => {
          router.push(`/dashboard/orders/${order.id}`);
        }, 2000);
      } else {
        const errorData = await orderRes.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to create order");
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
          <h2 className="text-2xl font-bold text-[#0B1D3A] mb-2">Order(s) Submitted!</h2>
          <p className="text-gray-500">Redirecting to your orders...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0B1D3A]">Upload Files</h1>
        <p className="text-gray-500 mt-1">Upload your PDFs or Images and configure settings for each</p>
      </div>

      {fileItems.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {fileItems.map((item, idx) => (
            <div 
              key={item.id}
              onClick={() => setActiveFileId(item.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer transition-colors border ${
                activeFileId === item.id 
                  ? "bg-violet-50 border-violet-500 text-violet-700 font-semibold" 
                  : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {item.type === 'pdf' ? <FileText className="w-4 h-4" /> : <FileImage className="w-4 h-4" />}
              <span className="text-sm max-w-[120px] truncate">{item.file.name}</span>
              <button 
                onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}
                className="ml-2 p-1 rounded-full hover:bg-red-100 hover:text-red-600 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          <button
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.accept = "application/pdf,image/jpeg,image/png";
              input.multiple = true;
              input.onchange = (e) => {
                const files = Array.from((e.target as HTMLInputElement).files || []);
                if (files.length > 0) onDrop(files);
              };
              input.click();
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer transition-colors border border-dashed border-gray-400 bg-gray-50 text-gray-600 hover:bg-gray-100 hover:border-gray-500"
          >
            <span className="text-sm font-semibold">+ Add More</span>
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left: Upload + Options */}
        <div className="xl:col-span-2 space-y-6">
          {/* Drop Zone */}
          {fileItems.length === 0 && (
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
                    {isDragActive ? "Drop your files here" : "Drag & drop PDFs/Images or click to browse"}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    PDF, JPEG, PNG • Max {pricing ? formatFileSize(pricing.maxFileSize) : "50MB"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Active File Preview */}
          {activeItem && (
            <div className="glass rounded-3xl p-4 border border-gray-200 space-y-4">
              {analyzing ? (
                <div className="w-full h-[500px] rounded-2xl bg-gray-50 border border-gray-200 flex flex-col items-center justify-center space-y-3">
                  <Loader2 className="w-10 h-10 text-violet-400 animate-spin" />
                  <p className="text-gray-500 font-medium">Analyzing File...</p>
                </div>
              ) : activeItem.previewUrl ? (
                <div className="w-full h-[500px] rounded-2xl overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center">
                  {activeItem.type === 'image' ? (
                    <img 
                      src={activeItem.previewUrl} 
                      alt="Preview" 
                      className="max-w-full max-h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 text-gray-400 space-y-4 p-6 text-center">
                      <div className="w-24 h-24 bg-red-100 rounded-2xl flex items-center justify-center mb-2 shadow-sm">
                        <FileText className="w-12 h-12 text-red-500" />
                      </div>
                      <p className="font-bold text-gray-700 text-lg line-clamp-1">{activeItem.file.name}</p>
                      <p className="text-sm font-medium">PDF Document • {formatFileSize(activeItem.file.size)}</p>
                      <p className="text-xs text-gray-400 max-w-[250px] mt-2">Ready to upload and print. Settings below will be applied.</p>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}

          {/* Active File Analysis */}
          <AnimatePresence mode="wait">
            {activeItem && (
              <motion.div
                key={activeItem.id + "_analysis"}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="glass rounded-2xl p-5 border border-gray-200"
              >
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-4 h-4 text-violet-400" />
                  <h3 className="font-semibold text-[#0B1D3A] text-sm">File Analysis</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <Stat label="Total Pages" value={activeItem.analysis.totalPages} />
                  <Stat label="Color Pages" value={activeItem.analysis.colorPages} />
                  <Stat label="B&W Pages" value={activeItem.analysis.bwPages} />
                  <Stat label="Paper Size" value={activeItem.analysis.paperSize} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Active File Options */}
          {activeItem && (
            <div className="glass rounded-3xl p-6 border border-gray-200 space-y-5">
              <h3 className="font-bold text-[#0B1D3A]">Print Options for {activeItem.file.name}</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SelectField
                  label="Pages to Print"
                  value={activeItem.options.pagesToPrint}
                  onChange={(v) => updateItemOptions(activeItem.id, { pagesToPrint: v })}
                  options={[
                    {value:"ALL", label:"All"}, 
                    {value:"CUSTOM", label:"Custom Range"}
                  ]}
                />
                
                {activeItem.options.pagesToPrint === "CUSTOM" && (
                  <div>
                    <label className="text-xs text-gray-500 mb-2 block">Page Range</label>
                    <input
                      type="text"
                      value={activeItem.options.customPageRange}
                      onChange={(e) => updateItemOptions(activeItem.id, { customPageRange: e.target.value })}
                      placeholder="e.g. 1-5, 8, 11-13"
                      className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-xl text-[#0B1D3A] text-sm focus:outline-none focus:border-violet-500"
                    />
                  </div>
                )}

                <SelectField
                  label="Page Sizing & Handling"
                  value={activeItem.options.pageSizing}
                  onChange={(v) => updateItemOptions(activeItem.id, { pageSizing: v })}
                  options={[
                    {value:"FIT", label:"Fit"},
                    {value:"ACTUAL_SIZE", label:"Actual Size"},
                    {value:"SHRINK", label:"Shrink oversized pages"}
                  ]}
                />

                <SelectField
                  label="Print Sides"
                  value={activeItem.options.printSide}
                  onChange={(v) => updateItemOptions(activeItem.id, { printSide: v })}
                  options={[
                    {value:"SINGLE", label:"Single Sided"},
                    ...((adminSettings as any)?.allowDoubleSided !== false ? [{value:"DOUBLE", label:"Double Sided"}] : [])
                  ]}
                />

                <SelectField
                  label="Orientation"
                  value={activeItem.options.orientation}
                  onChange={(v) => updateItemOptions(activeItem.id, { orientation: v })}
                  options={[
                    {value:"AUTO", label:"Auto portrait/landscape"},
                    {value:"PORTRAIT", label:"Portrait"},
                    {value:"LANDSCAPE", label:"Landscape"}
                  ]}
                />

                <SelectField
                  label="Color/Grayscale"
                  value={activeItem.options.printColor}
                  onChange={(v) => updateItemOptions(activeItem.id, { printColor: v })}
                  options={[
                    { value: "BLACK_AND_WHITE", label: "Black & White" },
                    { value: "COLOR", label: "Color" },
                  ]}
                />

                <SelectField
                  label="Paper Size"
                  value={activeItem.options.paperSize}
                  onChange={(v) => updateItemOptions(activeItem.id, { paperSize: v })}
                  options={(() => {
                    let sizes = adminSettings?.paperSizes;
                    if (!Array.isArray(sizes)) sizes = [];
                    let activeSizes = sizes.filter(s => s.isActive);
                    if (activeSizes.length === 0) activeSizes = [{id:"A4", label:"A4 Size", multiplier: 1, isActive: true}];
                    return activeSizes.map(s => ({ value: s.id, label: s.label }));
                  })()}
                />

                <SelectField
                  label="Paper Quality"
                  value={activeItem.options.paperQuality}
                  onChange={(v) => updateItemOptions(activeItem.id, { paperQuality: v })}
                  options={(() => {
                    let qualities = adminSettings?.paperQualities;
                    if (!Array.isArray(qualities)) qualities = [];
                    let activeQualities = qualities.filter(q => q.isActive);
                    if (activeQualities.length === 0) activeQualities = [{id:"standard", label:"Standard", colorPrice:0, bwPrice:0, price:0, isActive:true}];
                    
                    return activeQualities.map((q: any) => {
                      const cp = q.colorPrice ?? q.price ?? 0;
                      const bp = q.bwPrice ?? q.price ?? 0;
                      let extraText = '';
                      
                      if (activeItem.options.printColor === 'COLOR' && cp > 0) {
                        extraText = `(+₹${cp})`;
                      } else if (activeItem.options.printColor === 'BLACK_AND_WHITE' && bp > 0) {
                        extraText = `(+₹${bp})`;
                      } else if (activeItem.options.printColor !== 'COLOR' && activeItem.options.printColor !== 'BLACK_AND_WHITE' && (q.price || 0) > 0) {
                        extraText = `(+₹${q.price})`;
                      }
                      
                      return { value: q.id, label: `${q.label} ${extraText}`.trim() };
                    });
                  })()}
                />

                <div>
                  <label className="text-xs text-gray-500 mb-2 block">Copies</label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateItemOptions(activeItem.id, { copies: Math.max(1, activeItem.options.copies - 1) })}
                      className="w-9 h-9 rounded-lg bg-white border border-gray-300 text-[#0B1D3A] hover:bg-gray-100 flex items-center justify-center"
                    >
                      -
                    </button>
                    <span className="w-8 text-center font-bold text-[#0B1D3A]">{activeItem.options.copies}</span>
                    <button
                      onClick={() => updateItemOptions(activeItem.id, { copies: activeItem.options.copies + 1 })}
                      className="w-9 h-9 rounded-lg bg-white border border-gray-300 text-[#0B1D3A] hover:bg-gray-100 flex items-center justify-center"
                    >
                      +
                    </button>
                    
                    {activeItem.options.copies > 1 && (
                      <label className="flex items-center gap-2 ml-3 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={activeItem.options.collate} 
                          onChange={(e) => updateItemOptions(activeItem.id, { collate: e.target.checked })}
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
                  checked={activeItem.options.saveInk}
                  onChange={(v) => updateItemOptions(activeItem.id, { saveInk: v })}
                />
                {adminSettings?.enableBinding !== false && (
                  <ToggleField
                    label="Binding"
                    sublabel={pricing ? `₹${pricing.bindingCost}` : ""}
                    checked={activeItem.options.binding}
                    onChange={(v) => updateItemOptions(activeItem.id, { binding: v })}
                  />
                )}
                {adminSettings?.enableLamination !== false && (
                  <ToggleField
                    label="Lamination"
                    sublabel={pricing ? `₹${pricing.laminationCost}/sheet` : ""}
                    checked={activeItem.options.lamination}
                    onChange={(v) => updateItemOptions(activeItem.id, { lamination: v })}
                  />
                )}
              </div>

              {/* Instructions */}
              <div>
                <label className="text-xs text-gray-500 mb-2 block">Special Instructions (Optional)</label>
                <textarea
                  value={activeItem.options.instructions}
                  onChange={(e) => updateItemOptions(activeItem.id, { instructions: e.target.value })}
                  placeholder="Any special requirements..."
                  rows={3}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-[#0B1D3A] text-sm placeholder-white/30 focus:outline-none focus:border-violet-500 transition-colors resize-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Right: Cost Summary */}
        <div>
          <div className="glass rounded-3xl p-6 border border-gray-200 sticky top-24 space-y-5">
            <div className="flex items-center gap-2">
              <IndianRupee className="w-5 h-5 text-violet-400" />
              <h3 className="font-bold text-[#0B1D3A]">Cost Estimate</h3>
            </div>

            {fileItems.length === 0 ? (
              <div className="text-center py-6 text-gray-400">
                <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                <p className="text-sm">Upload a file to see cost estimate</p>
              </div>
            ) : totalCostEstimate ? (
              <div className="space-y-3">
                {activeItem && activeCost && (
                  <div className="pb-3 border-b border-gray-200 mb-3">
                    <h4 className="text-sm font-semibold text-[#0B1D3A] mb-2">Current File Breakdown</h4>
                    <CostRow label={`B&W Pages (${activeCost.estimatedBwPages} × ${activeItem.options.copies})`} value={activeCost.bwCost} />
                    {activeItem.options.printColor === "COLOR" && activeCost.colorCost > 0 && (
                      <CostRow label={`Color Pages (${activeCost.estimatedColorPages} × ${activeItem.options.copies})`} value={activeCost.colorCost} />
                    )}
                    {activeItem.options.binding && <CostRow label="Binding" value={activeCost.bindingCost} />}
                    {activeItem.options.lamination && <CostRow label="Lamination" value={activeCost.laminationCost} />}
                  </div>
                )}
                
                {fileItems.length > 1 && (
                  <div className="flex justify-between text-sm pb-2">
                    <span className="text-gray-600 font-medium">All {fileItems.length} Files Subtotal</span>
                    <span className="text-[#0B1D3A] font-semibold">{formatCurrency(totalCostEstimate.subtotal)}</span>
                  </div>
                )}

                <div className="glass rounded-xl p-4 border border-violet-500/20 mt-4">
                  <div className="flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className="font-bold text-[#0B1D3A]">Total Amount</span>
                      <span className="text-[10px] text-gray-500 font-bold tracking-wide uppercase mt-0.5">(Incl. of GST taxes)</span>
                    </div>
                    <span className="text-xl font-extrabold text-gradient">{formatCurrency(totalCostEstimate.total)}</span>
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
                  disabled={uploading}
                  className="w-full py-3.5 rounded-xl gradient-primary text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {uploading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</>
                  ) : (
                    <><Upload className="w-4 h-4" /> Submit Order{fileItems.length > 1 ? "s" : ""}</>
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
            return <option key={v} value={v} className="bg-white text-[#0B1D3A]">{l}</option>;
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

import { prisma } from "@/lib/prisma";

export interface DocumentPrintOptions {
  fileName?: string;
  fileUrl?: string;
  fileKey?: string;
  fileSize?: number;
  totalPages?: number;
  colorPages?: number;
  bwPages?: number;
  paperSize?: string;
  orientation?: string;
  printSide?: string;
  printColor?: string;
  copies?: number;
  binding?: boolean;
  lamination?: boolean;
  paperQuality?: string;
  pagesToPrint?: string;
  customPageRange?: string | null;
  collate?: boolean;
  pageSizing?: string;
  saveInk?: boolean;
  instructions?: string | null;
}

export function parsePageRangeCount(customRange: string | null | undefined, totalPages: number): number {
  if (!customRange || !customRange.trim()) return totalPages;
  const parts = customRange.split(",");
  const pageSet = new Set<number>();
  for (const part of parts) {
    const p = part.trim();
    if (p.includes("-")) {
      const [start, end] = p.split("-").map(Number);
      if (!isNaN(start) && !isNaN(end) && start <= end && start >= 1 && end <= totalPages) {
        for (let i = start; i <= end; i++) pageSet.add(i);
      }
    } else {
      const num = Number(p);
      if (!isNaN(num) && num >= 1 && num <= totalPages) pageSet.add(num);
    }
  }
  return pageSet.size > 0 ? pageSet.size : totalPages;
}

export async function calculateOrderCost(options: {
  documents?: DocumentPrintOptions[] | null;
  singleDoc?: DocumentPrintOptions;
}) {
  let pricing = await prisma.pricing.findFirst({ where: { name: "default" } });
  if (!pricing) {
    pricing = await prisma.pricing.create({
      data: {
        name: "default",
        colorPrice: 10.0,
        bwPrice: 2.0,
        a3Multiplier: 2.0,
        bindingCost: 50.0,
        laminationCost: 20.0,
        gstRate: 18.0,
        maxFileSize: 52428800,
      },
    });
  }

  const settings = await prisma.adminSettings.findFirst();
  const paperSizes = (settings?.paperSizes as any[]) || [];
  const paperQualities = (settings?.paperQualities as any[]) || [];

  const docs = options.documents && options.documents.length > 0 
    ? options.documents 
    : (options.singleDoc ? [options.singleDoc] : []);

  let calculatedSubtotal = 0;
  let calculatedTotal = 0;
  let calculatedBindingCost = 0;
  let calculatedLaminationCost = 0;
  let calculatedTotalPages = 0;
  let calculatedColorPages = 0;
  let calculatedBwPages = 0;

  const verifiedDocuments = docs.map((doc) => {
    const totalPages = Math.max(1, doc.totalPages || 1);
    const copies = Math.max(1, doc.copies || 1);
    const paperSize = doc.paperSize || "A4";
    const paperQuality = doc.paperQuality || "standard";
    const printColor = doc.printColor || "BLACK_AND_WHITE";
    const printSide = doc.printSide || "SINGLE";
    const pagesToPrint = doc.pagesToPrint || "ALL";

    let sizeMultiplier = 1;
    const pSize = paperSizes.find((s: any) => s.id === paperSize);
    if (pSize) {
      sizeMultiplier = pSize.multiplier || 1;
    } else {
      sizeMultiplier = paperSize === "A3" ? pricing!.a3Multiplier : 1;
    }

    let activeColorPrice = pricing!.colorPrice;
    let activeBwPrice = pricing!.bwPrice;
    const pQual = paperQualities.find((q: any) => q.id === paperQuality);
    if (pQual) {
      activeColorPrice = pQual.colorPrice ?? pQual.price ?? pricing!.colorPrice;
      activeBwPrice = pQual.bwPrice ?? pQual.price ?? pricing!.bwPrice;
    }

    const pagesToCharge = pagesToPrint === "ALL" 
      ? totalPages 
      : parsePageRangeCount(doc.customPageRange, totalPages);

    const isDoubleSided = printSide !== "SINGLE";
    const estimatedColorPages = printColor !== "BLACK_AND_WHITE" ? pagesToCharge : 0;
    const estimatedBwPages = printColor === "BLACK_AND_WHITE" ? pagesToCharge : 0;

    const bwCost = estimatedBwPages * activeBwPrice * sizeMultiplier * copies;
    const colorCost = estimatedColorPages * activeColorPrice * sizeMultiplier * copies;

    const docBindingCost = doc.binding ? (pricing!.bindingCost * copies) : 0;
    const totalSheets = isDoubleSided ? Math.ceil(pagesToCharge / 2) : pagesToCharge;
    const docLaminationCost = doc.lamination ? (totalSheets * pricing!.laminationCost * copies) : 0;

    const docSubtotal = Math.round((colorCost + bwCost + docBindingCost + docLaminationCost) * 100) / 100;
    const docTotal = docSubtotal; // inclusive pricing model

    calculatedSubtotal += docSubtotal;
    calculatedTotal += docTotal;
    calculatedBindingCost += docBindingCost;
    calculatedLaminationCost += docLaminationCost;
    calculatedTotalPages += pagesToCharge * copies;
    calculatedColorPages += estimatedColorPages * copies;
    calculatedBwPages += estimatedBwPages * copies;

    return {
      ...doc,
      totalPages: pagesToCharge,
      colorPages: estimatedColorPages,
      bwPages: estimatedBwPages,
      colorPrice: activeColorPrice,
      bwPrice: activeBwPrice,
      bindingCost: docBindingCost,
      laminationCost: docLaminationCost,
      subtotal: docSubtotal,
      gstRate: pricing!.gstRate,
      gstAmount: 0,
      discount: 0,
      totalAmount: docTotal,
    };
  });

  const finalSubtotal = Math.round(calculatedSubtotal * 100) / 100;
  const finalTotal = Math.round(calculatedTotal * 100) / 100;

  return {
    pricing,
    settings,
    subtotal: finalSubtotal,
    totalAmount: finalTotal,
    bindingCost: calculatedBindingCost,
    laminationCost: calculatedLaminationCost,
    totalPages: calculatedTotalPages,
    colorPages: calculatedColorPages,
    bwPages: calculatedBwPages,
    colorPrice: pricing.colorPrice,
    bwPrice: pricing.bwPrice,
    verifiedDocuments,
  };
}

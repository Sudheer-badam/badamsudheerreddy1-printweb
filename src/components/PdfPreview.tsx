"use client";

import { Document, Page, pdfjs } from 'react-pdf';
import { Loader2 } from "lucide-react";
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfPreviewProps {
  url: string;
}

export default function PdfPreview({ url }: PdfPreviewProps) {
  return (
    <div className="w-full h-full overflow-y-auto flex items-start justify-center pt-4 custom-scrollbar">
      <Document
        file={url}
        loading={<Loader2 className="w-8 h-8 text-violet-400 animate-spin" />}
        error={<p className="text-gray-500 text-sm">Preview not available.</p>}
      >
        <Page 
          pageNumber={1} 
          renderTextLayer={false}
          renderAnnotationLayer={false}
          width={350}
          className="shadow-lg"
        />
      </Document>
    </div>
  );
}

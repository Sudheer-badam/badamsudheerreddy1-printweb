const fs = require('fs');
const file = 'src/app/dashboard/upload/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Update Pricing interface and add AdminSettings interface
content = content.replace(
  `interface Pricing {
  colorPrice: number;
  bwPrice: number;
  a3Multiplier: number;
  bindingCost: number;
  laminationCost: number;
  gstRate: number;
  maxFileSize: number;
}`,
  `interface Pricing {
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
}`
);

// 2. Add adminSettings state
content = content.replace(
  `  const [pricing, setPricing] = useState<Pricing | null>(null);`,
  `  const [pricing, setPricing] = useState<Pricing | null>(null);
  const [adminSettings, setAdminSettings] = useState<AdminSettings | null>(null);`
);

// 3. Fetch adminSettings
content = content.replace(
  `  useEffect(() => {
    fetch("/api/pricing").then((r) => r.json()).then(setPricing);
  }, []);`,
  `  useEffect(() => {
    fetch("/api/pricing").then((r) => r.json()).then(setPricing);
    fetch("/api/admin/settings").then((r) => r.json()).then(setAdminSettings);
  }, []);`
);

// 4. Update cost calculation for paper multipliers and qualities
content = content.replace(
  `    const sizeMultiplier = paperSize === "A3" ? pricing.a3Multiplier : 1;`,
  `    // Get dynamic size multiplier
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
    }`
);

// 5. Add quality cost to color/bw cost
content = content.replace(
  `    const colorCost = estimatedColorPages * pricing.colorPrice * sizeMultiplier * copies;
    const bwCost = estimatedBwPages * pricing.bwPrice * sizeMultiplier * copies;`,
  `    const colorCost = estimatedColorPages * (pricing.colorPrice + qualityCost) * sizeMultiplier * copies;
    const bwCost = estimatedBwPages * (pricing.bwPrice + qualityCost) * sizeMultiplier * copies;`
);

// 6. Update GST rate to check if GST is enabled
content = content.replace(
  `    const gstAmount = (subtotal * pricing.gstRate) / 100;`,
  `    const gstAmount = adminSettings?.enableGST ? (subtotal * pricing.gstRate) / 100 : 0;`
);

// We need to replace the paperSizes map and paperQualities map in the JSX.
// This is trickier because the original uses hardcoded arrays.
// First, let's remove the hardcoded arrays.
content = content.replace(
  `const PAPER_SIZES = ["A4", "A3", "LETTER", "LEGAL"];
const PAPER_QUALITIES = ["standard", "premium", "glossy"];`,
  ``
);

// Replace mapping for paper sizes
content = content.replace(
  `              {PAPER_SIZES.map((size) => (
                <button
                  key={size}
                  onClick={() => setOptions({ ...options, paperSize: size })}`,
  `              {(adminSettings?.paperSizes?.filter(s => s.isActive) || [{id:"A4", label:"A4 Size", multiplier: 1, isActive: true}]).map((size) => (
                <button
                  key={size.id}
                  onClick={() => setOptions({ ...options, paperSize: size.id })}`
);

content = content.replace(
  `                  className={\`px-4 py-2 rounded-xl text-sm font-medium transition-all \${
                    options.paperSize === size`,
  `                  className={\`px-4 py-2 rounded-xl text-sm font-medium transition-all \${
                    options.paperSize === size.id`
);

content = content.replace(
  `                  {size}
                </button>`,
  `                  {size.label}
                </button>`
);

// Replace mapping for paper qualities
content = content.replace(
  `              {PAPER_QUALITIES.map((quality) => (
                <button
                  key={quality}
                  onClick={() => setOptions({ ...options, paperQuality: quality })}`,
  `              {(adminSettings?.paperQualities?.filter(q => q.isActive) || [{id:"standard", label:"Standard", price:0, isActive:true}]).map((quality) => (
                <button
                  key={quality.id}
                  onClick={() => setOptions({ ...options, paperQuality: quality.id })}`
);

content = content.replace(
  `                  className={\`px-4 py-2 rounded-xl text-sm font-medium transition-all capitalize \${
                    options.paperQuality === quality`,
  `                  className={\`px-4 py-2 rounded-xl text-sm font-medium transition-all capitalize \${
                    options.paperQuality === quality.id`
);

content = content.replace(
  `                  {quality}
                </button>`,
  `                  {quality.label} {quality.price > 0 && \`(+₹\${quality.price})\`}
                </button>`
);

// Hide Binding if disabled
content = content.replace(
  `          {/* Finishing */}
          <div className="space-y-4">
            <h3 className="font-semibold text-[#0B1D3A]">Finishing</h3>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setOptions({ ...options, binding: !options.binding })}`,
  `          {/* Finishing */}
          {(adminSettings?.enableBinding !== false || adminSettings?.enableLamination !== false) && (
          <div className="space-y-4">
            <h3 className="font-semibold text-[#0B1D3A]">Finishing</h3>
            <div className="grid grid-cols-2 gap-4">
              {adminSettings?.enableBinding !== false && (
              <button
                onClick={() => setOptions({ ...options, binding: !options.binding })}`
);

content = content.replace(
  `              <button
                onClick={() => setOptions({ ...options, lamination: !options.lamination })}`,
  `              )}
              {adminSettings?.enableLamination !== false && (
              <button
                onClick={() => setOptions({ ...options, lamination: !options.lamination })}`
);

content = content.replace(
  `                  Lamination (+₹{pricing?.laminationCost}/page)
                </div>
              </button>
            </div>
          </div>`,
  `                  Lamination (+₹{pricing?.laminationCost}/page)
                </div>
              </button>
              )}
            </div>
          </div>
          )}`
);

fs.writeFileSync(file, content);

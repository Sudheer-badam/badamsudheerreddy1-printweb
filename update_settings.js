const fs = require('fs');
const file = 'src/app/admin/settings/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Add states and fetching for settings
content = content.replace(
  `  const [services, setServices] = useState({
    enableBinding: true,
    enableLamination: true,
    enableGST: true,
    enableDiscount: false,
  });`,
  `  const [services, setServices] = useState({
    enableBinding: true,
    enableLamination: true,
    enableGST: true,
    enableDiscount: false,
  });
  const [paperSizes, setPaperSizes] = useState([
    { id: "A4", label: "A4 Size", multiplier: 1, isActive: true },
    { id: "A3", label: "A3 Size", multiplier: 2, isActive: true },
    { id: "LETTER", label: "Letter", multiplier: 1, isActive: true },
    { id: "LEGAL", label: "Legal", multiplier: 1.2, isActive: true },
  ]);
  const [paperQualities, setPaperQualities] = useState([
    { id: "standard", label: "Standard 70 GSM", price: 0, isActive: true },
    { id: "premium", label: "Premium 75 GSM", price: 0.5, isActive: true },
    { id: "executive", label: "Executive 80 GSM", price: 1, isActive: true },
  ]);`
);

content = content.replace(
  `  useEffect(() => {
    fetchPricing();
  }, []);

  const fetchPricing = async () => {
    const res = await fetch("/api/pricing");
    if (res.ok) setPricing(await res.json());
  };`,
  `  useEffect(() => {
    fetchPricing();
    fetchSettings();
  }, []);

  const fetchPricing = async () => {
    const res = await fetch("/api/pricing");
    if (res.ok) setPricing(await res.json());
  };

  const fetchSettings = async () => {
    const res = await fetch("/api/admin/settings");
    if (res.ok) {
      const data = await res.json();
      setBusiness({
        businessName: data.businessName || "",
        ownerName: data.ownerName || "",
        phone: data.phone || "",
        whatsapp: data.whatsapp || "",
        email: data.email || "",
        address: data.address || "",
        googleMapsUrl: data.googleMapsUrl || "",
        workingHours: data.workingHours || "",
        pickupAddress: data.pickupAddress || "",
      });
      setServices({
        enableBinding: data.enableBinding ?? true,
        enableLamination: data.enableLamination ?? true,
        enableGST: data.enableGST ?? true,
        enableDiscount: data.enableDiscount ?? false,
      });
      if (data.paperSizes && Array.isArray(data.paperSizes)) setPaperSizes(data.paperSizes);
      if (data.paperQualities && Array.isArray(data.paperQualities)) setPaperQualities(data.paperQualities);
    }
  };`
);

content = content.replace(
  `body: JSON.stringify({ ...business, ...services }),`,
  `body: JSON.stringify({ ...business, ...services, paperSizes, paperQualities }),`
);

// We need to inject the Paper UI section right after pricing
const paperUI = `
      {/* Paper Sizes Configuration */}
      <section className="glass rounded-3xl p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-[#0B1D3A]">Paper Sizes</h2>
              <p className="text-xs text-gray-500">Configure available paper sizes and price multipliers</p>
            </div>
          </div>
          <button 
            onClick={() => setPaperSizes([...paperSizes, { id: "NEW", label: "New Size", multiplier: 1, isActive: true }])}
            className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-sm font-medium hover:bg-indigo-100"
          >
            + Add Size
          </button>
        </div>
        
        <div className="space-y-3">
          {paperSizes.map((size, index) => (
            <div key={index} className="flex flex-wrap items-center gap-2 sm:gap-4 p-4 rounded-xl border border-gray-100 bg-white/50">
              <input 
                value={size.id} 
                onChange={e => {
                  const newSizes = [...paperSizes];
                  newSizes[index].id = e.target.value;
                  setPaperSizes(newSizes);
                }}
                className="w-full sm:w-1/4 px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="ID (e.g. A4)" 
              />
              <input 
                value={size.label} 
                onChange={e => {
                  const newSizes = [...paperSizes];
                  newSizes[index].label = e.target.value;
                  setPaperSizes(newSizes);
                }}
                className="w-full sm:w-1/3 px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="Display Name" 
              />
              <div className="w-full sm:w-1/4 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">x</span>
                <input 
                  type="number" step="0.1" value={size.multiplier} 
                  onChange={e => {
                    const newSizes = [...paperSizes];
                    newSizes[index].multiplier = parseFloat(e.target.value) || 0;
                    setPaperSizes(newSizes);
                  }}
                  className="w-full pl-6 pr-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="Multiplier" 
                />
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    const newSizes = [...paperSizes];
                    newSizes[index].isActive = !newSizes[index].isActive;
                    setPaperSizes(newSizes);
                  }}
                  className={\`px-3 py-2 rounded-lg text-xs font-medium \${size.isActive ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}\`}
                >
                  {size.isActive ? "Active" : "Hidden"}
                </button>
                <button 
                  onClick={() => {
                    const newSizes = [...paperSizes];
                    newSizes.splice(index, 1);
                    setPaperSizes(newSizes);
                  }}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Paper Qualities Configuration */}
      <section className="glass rounded-3xl p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-[#0B1D3A]">Paper Qualities</h2>
              <p className="text-xs text-gray-500">Configure paper thickness and extra costs per page</p>
            </div>
          </div>
          <button 
            onClick={() => setPaperQualities([...paperQualities, { id: "new", label: "New Quality", price: 0, isActive: true }])}
            className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-sm font-medium hover:bg-emerald-100"
          >
            + Add Quality
          </button>
        </div>
        
        <div className="space-y-3">
          {paperQualities.map((quality, index) => (
            <div key={index} className="flex flex-wrap items-center gap-2 sm:gap-4 p-4 rounded-xl border border-gray-100 bg-white/50">
              <input 
                value={quality.id} 
                onChange={e => {
                  const newQ = [...paperQualities];
                  newQ[index].id = e.target.value;
                  setPaperQualities(newQ);
                }}
                className="w-full sm:w-1/4 px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="ID (e.g. standard)" 
              />
              <input 
                value={quality.label} 
                onChange={e => {
                  const newQ = [...paperQualities];
                  newQ[index].label = e.target.value;
                  setPaperQualities(newQ);
                }}
                className="w-full sm:w-1/3 px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="Display Name" 
              />
              <div className="w-full sm:w-1/4 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">+₹</span>
                <input 
                  type="number" step="0.5" value={quality.price} 
                  onChange={e => {
                    const newQ = [...paperQualities];
                    newQ[index].price = parseFloat(e.target.value) || 0;
                    setPaperQualities(newQ);
                  }}
                  className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="Extra Cost" 
                />
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    const newQ = [...paperQualities];
                    newQ[index].isActive = !newQ[index].isActive;
                    setPaperQualities(newQ);
                  }}
                  className={\`px-3 py-2 rounded-lg text-xs font-medium \${quality.isActive ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}\`}
                >
                  {quality.isActive ? "Active" : "Hidden"}
                </button>
                <button 
                  onClick={() => {
                    const newQ = [...paperQualities];
                    newQ.splice(index, 1);
                    setPaperQualities(newQ);
                  }}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
        
        <button
          onClick={saveBusiness}
          disabled={savingBusiness}
          className="mt-6 flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 transition-colors disabled:opacity-50"
        >
          {savingBusiness ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Paper Settings
        </button>
      </section>
`;

content = content.replace(
  `{/* Service Toggles */}`,
  paperUI + `\n\n      {/* Service Toggles */}`
);

// Import icons
content = content.replace(
  `import {
  Settings,`,
  `import {
  FileText,
  Layers,
  Trash2,
  Settings,`
);

fs.writeFileSync(file, content);

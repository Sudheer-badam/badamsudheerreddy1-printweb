"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  Layers,
  Trash2,
  Settings,
  Save,
  IndianRupee,
  Loader2,
  ToggleLeft,
  ToggleRight,
  Building2,
  Phone,
  Mail,
  MapPin,
  Clock,
  Image,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface PricingData {
  colorPrice: number;
  bwPrice: number;
  a3Multiplier: number;
  bindingCost: number;
  laminationCost: number;
  gstRate: number;
  maxFileSize: number;
}

export default function AdminSettingsPage() {
  const { user, logout } = useAuth();
  const [pricing, setPricing] = useState<PricingData>({
    colorPrice: 10,
    bwPrice: 2,
    a3Multiplier: 2,
    bindingCost: 50,
    laminationCost: 20,
    gstRate: 18,
    maxFileSize: 52428800,
  });
  const [business, setBusiness] = useState({
    businessName: "PRINT DOCKER",
    ownerName: "",
    phone: "",
    whatsapp: "",
    email: "",
    address: "",
    googleMapsUrl: "",
    workingHours: "Mon–Sat: 9AM–7PM",
    pickupAddress: "",
  });
  const [services, setServices] = useState({
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
    { id: "standard", label: "Standard 70 GSM", colorPrice: 0, bwPrice: 0, isActive: true },
    { id: "premium", label: "Premium 75 GSM", colorPrice: 0.5, bwPrice: 0.5, isActive: true },
    { id: "executive", label: "Executive 80 GSM", colorPrice: 1, bwPrice: 1, isActive: true },
  ]);
  const [savingPricing, setSavingPricing] = useState(false);
  const [savingBusiness, setSavingBusiness] = useState(false);

  useEffect(() => {
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
  };

  const savePricing = async () => {
    setSavingPricing(true);
    try {
      const res = await fetch(`/api/pricing?uid=${user?.uid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pricing),
      });
      if (res.ok) toast.success("Pricing updated successfully!");
      else toast.error("Failed to update pricing");
    } finally {
      setSavingPricing(false);
    }
  };

  const saveBusiness = async () => {
    setSavingBusiness(true);
    try {
      const res = await fetch(`/api/admin/settings?uid=${user?.uid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...business, ...services, paperSizes, paperQualities }),
      });
      if (res.ok) toast.success("Business settings saved!");
      else toast.error("Failed to save settings");
    } finally {
      setSavingBusiness(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#0B1D3A]">Settings</h1>
        <p className="text-gray-500 mt-1">Configure pricing, business info, and services</p>
      </div>

      {/* Pricing Settings */}
      <section className="glass rounded-3xl p-6 border border-gray-200">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
            <IndianRupee className="w-5 h-5 text-[#0B1D3A]" />
          </div>
          <div>
            <h2 className="font-bold text-[#0B1D3A]">Pricing Configuration</h2>
            <p className="text-xs text-gray-500">Set print prices per page</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <PriceField
            label="Color Print Price"
            sublabel="per page"
            value={pricing.colorPrice}
            onChange={(v) => setPricing({ ...pricing, colorPrice: v })}
          />
          <PriceField
            label="B&W Print Price"
            sublabel="per page"
            value={pricing.bwPrice}
            onChange={(v) => setPricing({ ...pricing, bwPrice: v })}
          />
          <PriceField
            label="A3 Size Multiplier"
            sublabel="multiplied with base price"
            value={pricing.a3Multiplier}
            onChange={(v) => setPricing({ ...pricing, a3Multiplier: v })}
            step={0.1}
          />
          <PriceField
            label="Binding Cost"
            sublabel="per order"
            value={pricing.bindingCost}
            onChange={(v) => setPricing({ ...pricing, bindingCost: v })}
          />
          <PriceField
            label="Lamination Cost"
            sublabel="per page"
            value={pricing.laminationCost}
            onChange={(v) => setPricing({ ...pricing, laminationCost: v })}
          />
          <PriceField
            label="GST Rate"
            sublabel="percentage (%)"
            value={pricing.gstRate}
            onChange={(v) => setPricing({ ...pricing, gstRate: v })}
            step={0.5}
          />
          <div>
            <label className="text-xs text-gray-500 mb-2 block">Max File Size (MB)</label>
            <input
              type="number"
              value={Math.round(pricing.maxFileSize / 1048576)}
              onChange={(e) => setPricing({ ...pricing, maxFileSize: parseInt(e.target.value) * 1048576 })}
              className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-[#0B1D3A] text-sm focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        <button
          onClick={savePricing}
          disabled={savingPricing}
          className="mt-6 flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 transition-colors disabled:opacity-50"
        >
          {savingPricing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Pricing
        </button>
      </section>

      
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
                  className={`px-3 py-2 rounded-lg text-xs font-medium ${size.isActive ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}
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

        <button
          onClick={saveBusiness}
          disabled={savingBusiness}
          className="mt-6 flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-500 text-white text-sm font-semibold hover:bg-indigo-600 transition-colors disabled:opacity-50"
        >
          {savingBusiness ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Paper Sizes
        </button>
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
              <p className="text-xs text-gray-500">Configure paper thickness and extra costs per physical sheet</p>
            </div>
          </div>
          <button 
            onClick={() => setPaperQualities([...paperQualities, { id: "new", label: "New Quality", colorPrice: 0, bwPrice: 0, isActive: true }])}
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
              <div className="w-full sm:w-[18%] relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-[10px] font-bold uppercase">Color +₹</span>
                <input 
                  type="number" step="0.5" value={quality.colorPrice ?? 0} 
                  onChange={e => {
                    const newQ = [...paperQualities];
                    newQ[index].colorPrice = parseFloat(e.target.value) || 0;
                    setPaperQualities(newQ);
                  }}
                  className="w-full pl-16 pr-2 py-2 border border-gray-200 rounded-lg text-sm" placeholder="Cost" 
                  title="Extra cost per sheet for Color print"
                />
              </div>
              <div className="w-full sm:w-[18%] relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-[10px] font-bold uppercase">B&W +₹</span>
                <input 
                  type="number" step="0.5" value={quality.bwPrice ?? 0} 
                  onChange={e => {
                    const newQ = [...paperQualities];
                    newQ[index].bwPrice = parseFloat(e.target.value) || 0;
                    setPaperQualities(newQ);
                  }}
                  className="w-full pl-14 pr-2 py-2 border border-gray-200 rounded-lg text-sm" placeholder="Cost" 
                  title="Extra cost per sheet for B&W print"
                />
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    const newQ = [...paperQualities];
                    newQ[index].isActive = !newQ[index].isActive;
                    setPaperQualities(newQ);
                  }}
                  className={`px-3 py-2 rounded-lg text-xs font-medium ${quality.isActive ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}
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
          Save Paper Qualities
        </button>
      </section>


      {/* Service Toggles */}
      <section className="glass rounded-3xl p-6 border border-gray-200">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
            <Settings className="w-5 h-5 text-[#0B1D3A]" />
          </div>
          <div>
            <h2 className="font-bold text-[#0B1D3A]">Service Toggles</h2>
            <p className="text-xs text-gray-500">Enable or disable services</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { key: "enableBinding", label: "Binding Service", desc: "Allow customers to request binding" },
            { key: "enableLamination", label: "Lamination Service", desc: "Allow customers to request lamination" },
            { key: "enableGST", label: "GST on Orders", desc: "Apply GST to order total" },
            { key: "enableDiscount", label: "Discount System", desc: "Allow admin to apply discounts" },
          ].map(({ key, label, desc }) => (
            <div
              key={key}
              onClick={() => setServices({ ...services, [key]: !services[key as keyof typeof services] })}
              className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all ${
                services[key as keyof typeof services]
                  ? "border-blue-500/30 bg-blue-500/10"
                  : "border-gray-300 bg-gray-50 hover:border-gray-400"
              }`}
            >
              <div>
                <div className="font-medium text-[#0B1D3A] text-sm">{label}</div>
                <div className="text-xs text-gray-500">{desc}</div>
              </div>
              {services[key as keyof typeof services] ? (
                <ToggleRight className="w-8 h-8 text-blue-400" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-gray-300" />
              )}
            </div>
          ))}
        </div>

        <button
          onClick={saveBusiness}
          disabled={savingBusiness}
          className="mt-6 flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 transition-colors disabled:opacity-50"
        >
          {savingBusiness ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Services
        </button>
      </section>

      {/* Business Info */}
      <section className="glass rounded-3xl p-6 border border-gray-200">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-[#0B1D3A]" />
          </div>
          <div>
            <h2 className="font-bold text-[#0B1D3A]">Business Information</h2>
            <p className="text-xs text-gray-500">Shown on support page and invoices</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <TextField
            label="Business Name"
            icon={<Building2 className="w-4 h-4 text-gray-400" />}
            value={business.businessName}
            onChange={(v) => setBusiness({ ...business, businessName: v })}
          />
          <TextField
            label="Owner Name"
            value={business.ownerName}
            onChange={(v) => setBusiness({ ...business, ownerName: v })}
          />
          <TextField
            label="Phone"
            icon={<Phone className="w-4 h-4 text-gray-400" />}
            value={business.phone}
            onChange={(v) => setBusiness({ ...business, phone: v })}
          />
          <TextField
            label="WhatsApp"
            icon={<Phone className="w-4 h-4 text-gray-400" />}
            value={business.whatsapp}
            onChange={(v) => setBusiness({ ...business, whatsapp: v })}
          />
          <TextField
            label="Email"
            icon={<Mail className="w-4 h-4 text-gray-400" />}
            value={business.email}
            onChange={(v) => setBusiness({ ...business, email: v })}
          />
          <TextField
            label="Working Hours"
            icon={<Clock className="w-4 h-4 text-gray-400" />}
            value={business.workingHours}
            onChange={(v) => setBusiness({ ...business, workingHours: v })}
          />
          <div className="sm:col-span-2">
            <TextField
              label="Business Address"
              icon={<MapPin className="w-4 h-4 text-gray-400" />}
              value={business.address}
              onChange={(v) => setBusiness({ ...business, address: v })}
            />
          </div>
          <div className="sm:col-span-2">
            <TextField
              label="Pickup Address"
              icon={<MapPin className="w-4 h-4 text-gray-400" />}
              value={business.pickupAddress}
              onChange={(v) => setBusiness({ ...business, pickupAddress: v })}
            />
          </div>
          <div className="sm:col-span-2">
            <TextField
              label="Google Maps URL"
              value={business.googleMapsUrl}
              onChange={(v) => setBusiness({ ...business, googleMapsUrl: v })}
            />
          </div>
        </div>

        <button
          onClick={saveBusiness}
          disabled={savingBusiness}
          className="mt-6 flex items-center gap-2 px-6 py-2.5 rounded-xl gradient-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {savingBusiness ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Business Info
        </button>
      </section>

      {/* Danger Zone */}
      <section className="glass rounded-3xl p-6 border border-red-500/20 bg-red-500/5">
        <h3 className="font-bold text-red-600 mb-2">Account Actions</h3>
        <p className="text-gray-500 text-sm mb-4">
          You can safely sign out of your admin account here.
        </p>
        <button
          onClick={logout}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-red-50 text-red-600 text-sm font-semibold hover:bg-red-100 transition-colors border border-red-200 w-fit"
        >
          Sign Out
        </button>
      </section>
    </div>
  );
}

function PriceField({
  label,
  sublabel,
  value,
  onChange,
  step = 1,
}: {
  label: string;
  sublabel: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <div>
      <label className="text-xs text-gray-500 mb-1 block">{label}</label>
      <div className="text-xs text-gray-400 mb-2">{sublabel}</div>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
        <input
          type="number"
          step={step}
          min={0}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-full pl-7 pr-4 py-2.5 bg-white border border-gray-300 rounded-xl text-[#0B1D3A] text-sm focus:outline-none focus:border-amber-500 transition-colors"
        />
      </div>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  icon,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-xs text-gray-500 mb-2 block">{label}</label>
      <div className="relative">
        {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2">{icon}</div>}
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full ${icon ? "pl-9" : "pl-4"} pr-4 py-2.5 bg-white border border-gray-300 rounded-xl text-[#0B1D3A] text-sm placeholder-white/20 focus:outline-none focus:border-violet-500 transition-colors`}
          placeholder={label}
        />
      </div>
    </div>
  );
}

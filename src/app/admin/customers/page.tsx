"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Search, Users, Phone, Mail, Calendar, FileText, ChevronRight, MapPin } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { formatDate } from "@/lib/utils";

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  profilePhoto: string | null;
  authProvider: string;
  registrationDate: string;
  lastLogin: string | null;
  latitude?: number | null;
  longitude?: number | null;
  locationAddress?: string | null;
  locationCity?: string | null;
  isOnline?: boolean;
  lastLocationUpdate?: string | null;
  _count: { orders: number };
}

export default function AdminCustomersPage() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (user) fetchCustomers();
  }, [user]);

  const fetchCustomers = async () => {
    try {
      const res = await fetch(`/api/admin/customers?uid=${user?.uid}&search=${search}`);
      if (res.ok) setCustomers(await res.json());
    } finally {
      setLoading(false);
    }
  };

  const filtered = customers.filter(
    (c) =>
      !search ||
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0B1D3A]">Customers</h1>
          <p className="text-gray-500 mt-1">View and manage all registered customers with live GPS locations</p>
        </div>
        <Link
          href="/admin/locations"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0B1D3A] hover:bg-slate-800 text-white text-xs font-bold shadow-md transition-all self-start sm:self-auto"
        >
          <MapPin className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span>Open Live Map View</span>
        </Link>
      </div>

      {/* Search & Stats */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone, or email..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-300 rounded-xl text-[#0B1D3A] text-sm placeholder-gray-400 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-xl border border-gray-200">
            <Users className="w-4 h-4 text-amber-500" />
            <span className="text-[#0B1D3A] font-bold text-sm">{customers.length}</span>
            <span className="text-gray-500 text-xs">Total Customers</span>
          </div>

          <div className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-xl border border-gray-200">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="text-[#0B1D3A] font-bold text-sm">
              {customers.filter((c) => c.isOnline).length}
            </span>
            <span className="text-gray-500 text-xs">Live Online</span>
          </div>
        </div>
      </div>

      {/* Customer Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-36 skeleton rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Users className="w-10 h-10 mx-auto mb-3" />
          <p>No customers found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((customer, i) => (
            <motion.div
              key={customer.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass rounded-2xl p-5 border border-gray-200 hover-card"
            >
              {/* Avatar */}
              <div className="flex items-start gap-3 mb-4">
                {customer.profilePhoto ? (
                  <img 
                    src={customer.profilePhoto} 
                    alt="" 
                    className="w-11 h-11 rounded-xl object-cover flex-shrink-0" 
                    onError={(e) => { 
                      e.currentTarget.onerror = null; 
                      e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(customer.name || 'User')}&background=F39C12&color=fff&size=128`;
                    }}
                  />
                ) : (
                  <img 
                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(customer.name || 'User')}&background=F39C12&color=fff&size=128`} 
                    alt="" 
                    className="w-11 h-11 rounded-xl object-cover flex-shrink-0" 
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[#0B1D3A] truncate">{customer.name || "Unknown"}</div>
                  <div className="text-xs text-gray-400">{customer.authProvider}</div>
                </div>
                <Link href={`/admin/orders?search=${encodeURIComponent(customer.email || customer.phone || customer.name || "")}`}>
                  <div className="flex items-center gap-1 text-xs text-amber-500 bg-amber-500/10 hover:bg-amber-500/20 px-3 py-1.5 rounded-lg transition-colors cursor-pointer" title="View Customer Orders">
                    <FileText className="w-3.5 h-3.5" />
                    <span className="font-bold">{customer._count?.orders || 0}</span>
                  </div>
                </Link>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <a href={`https://wa.me/${(customer.phone || "").replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="hover:text-green-500 hover:underline cursor-pointer flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" /> <span>{customer.phone || "—"}</span>
                  </a>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Mail className="w-3.5 h-3.5" />
                  <span className="truncate">{customer.email || "—"}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Joined {customer.registrationDate ? formatDate(customer.registrationDate) : "—"}</span>
                </div>

                {customer.latitude && customer.longitude && (
                  <div className="flex items-center gap-2 text-xs text-gray-600 font-medium pt-1.5 border-t border-gray-100">
                    <MapPin className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                    <span className="truncate">{customer.locationCity || customer.locationAddress || `${customer.latitude.toFixed(3)}, ${customer.longitude.toFixed(3)}`}</span>
                    {customer.isOnline && (
                      <span className="ml-auto inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Online
                      </span>
                    )}
                  </div>
                )}
              </div>

              {customer.latitude && customer.longitude && (
                <Link
                  href={`/admin/locations?userId=${customer.id}`}
                  className="mt-3 w-full py-2 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                >
                  <MapPin className="w-3.5 h-3.5 text-blue-600" />
                  <span>View on Live Map</span>
                  <ChevronRight className="w-3.5 h-3.5 ml-auto text-blue-500" />
                </Link>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

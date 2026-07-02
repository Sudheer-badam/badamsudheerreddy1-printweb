"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, Users, Phone, Mail, Calendar, FileText, ChevronRight } from "lucide-react";
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
      <div>
        <h1 className="text-2xl font-bold text-white">Customers</h1>
        <p className="text-white/40 mt-1">View and manage all registered customers</p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, phone, or email..."
          className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-white/30 focus:outline-none focus:border-amber-500"
        />
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 px-4 py-3 glass rounded-2xl border border-white/5 w-fit">
        <Users className="w-5 h-5 text-amber-400" />
        <span className="text-white font-bold">{customers.length}</span>
        <span className="text-white/40 text-sm">total customers</span>
      </div>

      {/* Customer Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-36 skeleton rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-white/30">
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
              className="glass rounded-2xl p-5 border border-white/5 hover-card"
            >
              {/* Avatar */}
              <div className="flex items-start gap-3 mb-4">
                {customer.profilePhoto ? (
                  <img src={customer.profilePhoto} alt="" className="w-11 h-11 rounded-xl object-cover" />
                ) : (
                  <div className="w-11 h-11 rounded-xl bg-amber-500/20 flex items-center justify-center text-lg font-bold text-amber-300">
                    {customer.name?.charAt(0) || "?"}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white truncate">{customer.name || "Unknown"}</div>
                  <div className="text-xs text-white/30">{customer.authProvider}</div>
                </div>
                <div className="flex items-center gap-1 text-xs text-amber-400 bg-amber-500/10 px-2 py-1 rounded-lg">
                  <FileText className="w-3 h-3" />
                  {customer._count?.orders || 0}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-white/40">
                  <Phone className="w-3.5 h-3.5" />
                  <span>{customer.phone || "—"}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-white/40">
                  <Mail className="w-3.5 h-3.5" />
                  <span className="truncate">{customer.email || "—"}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-white/30">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Joined {customer.registrationDate ? formatDate(customer.registrationDate) : "—"}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  MessageSquare,
  Send,
  ChevronDown,
  HelpCircle,
  Printer,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Settings {
  businessName: string;
  ownerName: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  googleMapsUrl: string;
  workingHours: string;
  pickupAddress: string;
}

const faqs = [
  {
    q: "What file formats do you accept?",
    a: "We accept PDF files only. Please ensure your document is properly formatted before uploading.",
  },
  {
    q: "How long does printing take?",
    a: "Most orders are processed within 1–2 business hours. You will receive a notification when your order is ready for pickup.",
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept UPI (PhonePe, Google Pay, Paytm), Razorpay, and Cash. Payment can be made online or at the time of pickup.",
  },
  {
    q: "Can I cancel my order?",
    a: "You can request a cancellation if the order has not started printing. Contact us immediately after placing the order.",
  },
  {
    q: "How do I track my order?",
    a: "You can track your order in real-time on the 'My Orders' page. We also send notifications via SMS and WhatsApp at every status update.",
  },
  {
    q: "Is my document safe and private?",
    a: "Yes. All files are stored securely and are only accessible to you and our admin team. We never share your documents with anyone.",
  },
  {
    q: "What is the maximum file size?",
    a: "The maximum file size is configurable by our admin. Currently up to 50MB PDFs are supported.",
  },
];

export default function SupportPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [form, setForm] = useState({ subject: "", message: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings").then((r) => r.json()).then(setSettings).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error("Please log in to submit a support request"); return; }
    setSubmitting(true);
    try {
      // In production, create a support ticket via API
      await new Promise((r) => setTimeout(r, 1000));
      toast.success("Support request submitted! We'll get back to you shortly.");
      setForm({ subject: "", message: "" });
    } finally {
      setSubmitting(false);
    }
  };

  const contactItems = [
    {
      icon: <Phone className="w-5 h-5 text-emerald-400" />,
      label: "Call Us",
      value: settings?.phone || "+91 XXXXXXXXXX",
      href: `tel:${settings?.phone}`,
      bg: "bg-emerald-500/10 border-emerald-500/20",
    },
    {
      icon: (
        <svg className="w-5 h-5 text-green-400" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      ),
      label: "WhatsApp",
      value: settings?.whatsapp || "+91 XXXXXXXXXX",
      href: `https://wa.me/${settings?.whatsapp?.replace(/\D/g, "")}`,
      bg: "bg-green-500/10 border-green-500/20",
    },
    {
      icon: <Mail className="w-5 h-5 text-blue-400" />,
      label: "Email Us",
      value: settings?.email || "support@antigravity.in",
      href: `mailto:${settings?.email}`,
      bg: "bg-blue-500/10 border-blue-500/20",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Support Center</h1>
        <p className="text-white/40 mt-1">Get help from our team</p>
      </div>

      {/* Business Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-3xl p-6 border border-violet-500/20"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center glow-purple">
            <Printer className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">
              {settings?.businessName || "Antigravity"}
            </h2>
            {settings?.ownerName && (
              <p className="text-white/50 text-sm">Owner: {settings.ownerName}</p>
            )}
          </div>
        </div>

        {/* Contact Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {contactItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              target={item.href?.startsWith("http") ? "_blank" : undefined}
              rel="noopener noreferrer"
              className={`flex items-center gap-3 p-4 rounded-2xl border ${item.bg} hover:opacity-80 transition-opacity`}
            >
              <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center">
                {item.icon}
              </div>
              <div>
                <div className="text-xs text-white/40">{item.label}</div>
                <div className="text-sm font-medium text-white">{item.value}</div>
              </div>
            </a>
          ))}
        </div>

        {/* Address & Hours */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-white/3 border border-white/5">
            <MapPin className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-xs text-white/40">Pickup Address</div>
              <div className="text-sm text-white mt-1">
                {settings?.pickupAddress || settings?.address || "Address will be updated soon"}
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-white/3 border border-white/5">
            <Clock className="w-5 h-5 text-violet-400 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-xs text-white/40">Working Hours</div>
              <div className="text-sm text-white mt-1">
                {settings?.workingHours || "Mon–Sat: 9AM–7PM"}
              </div>
            </div>
          </div>
        </div>

        {/* Google Maps */}
        {settings?.googleMapsUrl && (
          <a
            href={settings.googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm hover:text-white hover:border-white/20 transition-all w-fit"
          >
            <MapPin className="w-4 h-4" /> View on Google Maps
          </a>
        )}
      </motion.div>

      {/* FAQ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass rounded-3xl border border-white/5 overflow-hidden"
      >
        <div className="flex items-center gap-2 p-6 border-b border-white/5">
          <HelpCircle className="w-5 h-5 text-violet-400" />
          <h2 className="font-bold text-white">Frequently Asked Questions</h2>
        </div>
        <div className="divide-y divide-white/5">
          {faqs.map((faq, i) => (
            <div key={i}>
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between p-5 text-left hover:bg-white/3 transition-colors"
              >
                <span className="font-medium text-white text-sm">{faq.q}</span>
                <ChevronDown
                  className={`w-4 h-4 text-white/30 transition-transform flex-shrink-0 ${openFaq === i ? "rotate-180" : ""}`}
                />
              </button>
              {openFaq === i && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-5 pb-5"
                >
                  <p className="text-sm text-white/50 leading-relaxed">{faq.a}</p>
                </motion.div>
              )}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Support Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass rounded-3xl p-6 border border-white/5"
      >
        <div className="flex items-center gap-2 mb-5">
          <MessageSquare className="w-5 h-5 text-violet-400" />
          <h2 className="font-bold text-white">Send a Support Request</h2>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-white/50 mb-2 block">Subject</label>
            <input
              type="text"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              placeholder="What is your issue about?"
              required
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-white/30 focus:outline-none focus:border-violet-500"
            />
          </div>
          <div>
            <label className="text-xs text-white/50 mb-2 block">Message</label>
            <textarea
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="Describe your issue in detail..."
              rows={5}
              required
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-white/30 focus:outline-none focus:border-violet-500 resize-none"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 px-6 py-3 rounded-xl gradient-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Submit Request
          </button>
        </form>
      </motion.div>
    </div>
  );
}

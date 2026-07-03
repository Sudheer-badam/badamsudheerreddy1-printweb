"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import {
  Printer, Upload, Shield, Zap, Star, ArrowRight, CheckCircle,
  FileText, Clock, CreditCard, Bell, ChevronRight,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const features = [
  { icon: Upload,     title: "Easy PDF Upload",          description: "Upload your PDF files securely. Real-time progress tracking and instant confirmation.",    iconBg: "#EEF2FF", iconColor: "#2D63FF" },
  { icon: Zap,        title: "Instant Cost Calculation",  description: "Auto-pricing based on pages, color, paper size and finishing options — no surprises.",      iconBg: "#FFF7ED", iconColor: "#F39C12" },
  { icon: Bell,       title: "Real-time Notifications",   description: "SMS, Email & WhatsApp updates at every step — from upload to ready for pickup.",           iconBg: "#F0FDF4", iconColor: "#00C851" },
  { icon: Shield,     title: "Enterprise Security",       description: "Files encrypted end-to-end. Only you and our admin can access your documents.",             iconBg: "#EEF2FF", iconColor: "#2D63FF" },
  { icon: CreditCard, title: "Multiple Payments",         description: "UPI, PhonePe, Google Pay, Paytm, Razorpay, or Cash. Instant payment confirmation.",        iconBg: "#FFF7ED", iconColor: "#F39C12" },
  { icon: Clock,      title: "Live Order Tracking",       description: "Track your print from upload to completion with a beautiful visual status timeline.",       iconBg: "#F0FDF4", iconColor: "#00C851" },
];

const steps = [
  { step: "01", title: "Upload PDF",      desc: "Select and upload your PDF file securely in seconds" },
  { step: "02", title: "Choose Options",  desc: "Pick paper size, color mode, copies & finishing" },
  { step: "03", title: "Pay Online",      desc: "Pay securely via your preferred payment method" },
  { step: "04", title: "Track & Collect", desc: "Get real-time updates and collect your prints" },
];

const stats = [
  { label: "Orders Completed", value: "10,000+", color: "#2D63FF" },
  { label: "Happy Customers",  value: "2,500+",  color: "#00C851" },
  { label: "Pages Printed",    value: "5M+",     color: "#F39C12" },
  { label: "Uptime",           value: "99.9%",   color: "#2D63FF" },
];

const testimonials = [
  { name: "Ravi Kumar",    role: "Engineering Student",   text: "Got my project report printed in minutes! The tracking feature is incredible.",   avatar: "R" },
  { name: "Priya Sharma",  role: "MBA Student",           text: "Super easy to use. Uploaded from my phone and collected prints same day.",         avatar: "P" },
  { name: "Arjun Reddy",   role: "Research Scholar",      text: "Best printing service in the city. Fast, affordable, and always on time.",         avatar: "A" },
];

export default function HomePage() {
  const { user, userRole, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push(userRole === "ADMIN" ? "/admin" : "/dashboard");
    }
  }, [user, userRole, loading, router]);

  return (
    <div className="min-h-screen" style={{ background: "#f5f7fa", color: "#1A1F2E" }}>

      {/* ── NAVBAR ── */}
      <nav className="fixed top-0 left-0 right-0 z-50" style={{ background: "rgba(255,255,255,0.97)", borderBottom: "1px solid #E2E6EF", backdropFilter: "blur(16px)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0" style={{ border: "2.5px solid #2D63FF", boxShadow: "0 2px 10px rgba(45,99,255,0.25)" }}>
                <Image src="/BADAMSUDHEERREDDY.jpg" alt="Sudheer Reddy Print" width={40} height={40} className="w-full h-full object-cover" />
              </div>
              <span className="font-extrabold text-xl" style={{ color: "#0B1D3A" }}>Sudheer Reddy Print</span>
            </div>
            <div className="hidden md:flex items-center gap-8 text-sm font-semibold" style={{ color: "#444B54" }}>
              <a href="#features"     className="hover:text-[#2D63FF] transition-colors">Features</a>
              <a href="#videos"       className="hover:text-[#2D63FF] transition-colors">Videos</a>
              <a href="#how-it-works" className="hover:text-[#2D63FF] transition-colors">How It Works</a>
              <a href="#testimonials" className="hover:text-[#2D63FF] transition-colors">Reviews</a>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/auth/login" className="px-4 py-2 text-sm font-semibold transition-colors" style={{ color: "#444B54" }}>Sign In</Link>
              <Link href="/auth/register" className="btn-primary px-5 py-2 text-sm inline-flex items-center gap-1.5">
                Get Started <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="pt-24 pb-0 overflow-hidden" style={{ background: "linear-gradient(160deg,#cfd8ff 0%,#e8eeff 50%,#f3f5f7 100%)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center pt-16 pb-0">
            {/* Left */}
            <motion.div initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7 }}>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold mb-6"
                style={{ background: "rgba(45,99,255,0.12)", color: "#2D63FF", border: "1px solid rgba(45,99,255,0.22)" }}>
                <Star className="w-3.5 h-3.5 fill-current" />
                Smart Online Printing Management
              </div>
              <h1 className="text-5xl lg:text-6xl font-extrabold leading-[1.1] mb-6" style={{ color: "#0B1D3A" }}>
                Print Smarter,<br />
                <span style={{ color: "#2D63FF" }}>Faster & Easier</span>
              </h1>
              <p className="text-lg font-medium mb-8 max-w-lg" style={{ color: "#444B54", lineHeight: "1.75" }}>
                Upload PDFs from your phone, get instant quotes, track your order live, and receive WhatsApp alerts at every step. Professional printing, completely online.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/auth/register" className="btn-primary inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-bold">
                  Start Printing Now <ArrowRight className="w-5 h-5" />
                </Link>
                <Link href="/auth/login" className="btn-ghost inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-bold">
                  Sign In <ChevronRight className="w-5 h-5" />
                </Link>
              </div>
              <div className="flex items-center gap-5 mt-8">
                {["Free to sign up", "No credit card", "Instant access"].map(t => (
                  <div key={t} className="flex items-center gap-1.5 text-sm font-medium" style={{ color: "#444B54" }}>
                    <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: "#00C851" }} />
                    {t}
                  </div>
                ))}
              </div>
            </motion.div>
            {/* Right — Hero Printer Image */}
            <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, delay: 0.15 }} className="relative flex justify-center lg:justify-end">
              <div className="relative w-full max-w-xl">
                <Image src="/hero_printer.png" alt="Premium Office Printer" width={600} height={500} className="rounded-3xl object-cover w-full"
                  style={{ boxShadow: "0 30px 80px rgba(45,99,255,0.2)", filter: "drop-shadow(0 20px 40px rgba(45,99,255,0.15))" }} />
                {/* Floating badge */}
                <div className="absolute -bottom-4 -left-4 iom-card px-4 py-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "#EEF2FF" }}>
                    <Printer className="w-5 h-5" style={{ color: "#2D63FF" }} />
                  </div>
                  <div>
                    <div className="text-sm font-bold" style={{ color: "#0B1D3A" }}>Order Ready!</div>
                    <div className="text-xs font-medium" style={{ color: "#6B7280" }}>2 mins ago</div>
                  </div>
                </div>
                <div className="absolute -top-4 -right-4 iom-card px-4 py-3">
                  <div className="text-xs font-semibold mb-0.5" style={{ color: "#6B7280" }}>Total Orders</div>
                  <div className="text-2xl font-extrabold" style={{ color: "#2D63FF" }}>10K+</div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 pb-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {stats.map(s => (
              <div key={s.label} className="iom-card p-5 text-center">
                <div className="text-3xl font-extrabold mb-1" style={{ color: s.color }}>{s.value}</div>
                <div className="text-sm font-semibold" style={{ color: "#6B7280" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRINT SHOP VISUAL BAND ── */}
      <section className="relative h-72 overflow-hidden">
        <Image src="/print_shop_interior.png" alt="Our Print Shop" fill className="object-cover" />
        <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(11,29,58,0.65)" }}>
          <div className="text-center px-4">
            <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-3">State-of-the-Art Printing Facility</h2>
            <p className="text-lg font-medium" style={{ color: "rgba(255,255,255,0.85)" }}>Professional equipment. Precision results. Every time.</p>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-24 px-4" style={{ background: "#ffffff" }}>
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center mb-20">
            <div>
              <div className="inline-block px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-4"
                style={{ background: "rgba(45,99,255,0.08)", color: "#2D63FF" }}>Features</div>
              <h2 className="text-4xl md:text-5xl font-extrabold mb-5" style={{ color: "#0B1D3A" }}>
                Everything You Need<br />
                <span style={{ color: "#2D63FF" }}>To Print Like a Pro</span>
              </h2>
              <p className="text-lg font-medium" style={{ color: "#444B54", lineHeight: "1.75" }}>
                From upload to delivery, Antigravity handles every step of your printing journey — so you can focus on what matters.
              </p>
            </div>
            <div className="rounded-3xl overflow-hidden" style={{ boxShadow: "0 20px 60px rgba(45,99,255,0.12)" }}>
              <Image src="/features_flatlay.png" alt="Printing workspace" width={600} height={400} className="w-full object-cover" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div key={f.title} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.08 }} className="iom-card p-7">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5" style={{ background: f.iconBg }}>
                  <f.icon className="w-6 h-6" style={{ color: f.iconColor }} />
                </div>
                <h3 className="text-lg font-bold mb-2" style={{ color: "#0B1D3A" }}>{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "#6B7280" }}>{f.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── VIDEO SHOWCASE ── */}
      <section id="videos" className="py-24 px-4" style={{ background: "#f3f5f7" }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-block px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-4"
              style={{ background: "rgba(45,99,255,0.08)", color: "#2D63FF" }}>See It In Action</div>
            <h2 className="text-4xl md:text-5xl font-extrabold mb-4" style={{ color: "#0B1D3A" }}>
              Watch How <span style={{ color: "#2D63FF" }}>Printing Works</span>
            </h2>
            <p className="text-lg font-medium max-w-2xl mx-auto" style={{ color: "#444B54" }}>
              See the incredible engineering behind inkjet printing — from ink droplets to finished documents.
            </p>
          </div>

          {/* Featured Large Video */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="iom-card overflow-hidden mb-8"
            style={{ borderRadius: 24 }}
          >
            <div className="relative w-full" style={{ paddingBottom: "45%", minHeight: 280 }}>
              <iframe
                src="https://www.youtube-nocookie.com/embed/q6yPj6oXJ_8?rel=0&modestbranding=1&color=white"
                title="Canon Inkjet Printer Technology — Official CG Demo"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
                style={{ border: "none" }}
              />
            </div>
            <div className="p-5 flex items-center gap-4" style={{ borderTop: "1px solid #E2E6EF" }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#EEF2FF" }}>
                <Printer className="w-5 h-5" style={{ color: "#2D63FF" }} />
              </div>
              <div>
                <div className="font-bold" style={{ color: "#0B1D3A" }}>Inkjet Printer Technology — Canon Official CG</div>
                <div className="text-sm font-medium" style={{ color: "#6B7280" }}>How thousands of nozzles eject microscopic ink droplets with precision</div>
              </div>
            </div>
          </motion.div>

          {/* 3 smaller videos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                id: "kYJ-l200T-c",
                title: "How Does an Inkjet Printer Actually Work?",
                desc: "Detailed breakdown of inkjet technology & printhead mechanics",
                icon: "🖨️",
              },
              {
                id: "M-5V8_24D6s",
                title: "Amazing Engineering — 3D Animation",
                desc: "3D animation explaining nozzle mechanics and CMYK color mixing",
                icon: "🎨",
              },
              {
                id: "68T3F2Uo-rY",
                title: "Industrial Inkjet Printing Process",
                desc: "High-speed industrial printing — on-the-fly & rotational methods",
                icon: "⚙️",
              },
            ].map((v, i) => (
              <motion.div
                key={v.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="iom-card overflow-hidden"
                style={{ borderRadius: 20 }}
              >
                <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${v.id}?rel=0&modestbranding=1`}
                    title={v.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="absolute inset-0 w-full h-full"
                    style={{ border: "none" }}
                  />
                </div>
                <div className="p-4" style={{ borderTop: "1px solid #E2E6EF" }}>
                  <div className="font-bold text-sm mb-1" style={{ color: "#0B1D3A" }}>
                    {v.icon} {v.title}
                  </div>
                  <div className="text-xs font-medium" style={{ color: "#6B7280" }}>{v.desc}</div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* 4th video — Engineering deep-dive */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="iom-card overflow-hidden mt-6"
            style={{ borderRadius: 20 }}
          >
            <div className="grid md:grid-cols-2 gap-0">
              <div className="relative" style={{ paddingBottom: "56.25%", minHeight: 260 }}>
                <iframe
                  src="https://www.youtube-nocookie.com/embed/J32RkG2259E?rel=0&modestbranding=1"
                  title="Inkjet Printers — The Interesting Engineering Behind Them"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full"
                  style={{ border: "none", borderRadius: "20px 0 0 20px" }}
                />
              </div>
              <div className="flex flex-col justify-center p-8" style={{ background: "linear-gradient(135deg,#0B1D3A,#1C3CB3)" }}>
                <div className="inline-block px-3 py-1 rounded-full text-xs font-bold mb-4"
                  style={{ background: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.9)" }}>
                  Deep Dive
                </div>
                <h3 className="text-2xl font-extrabold text-white mb-3">
                  The Engineering Behind Every Print
                </h3>
                <p className="font-medium mb-6" style={{ color: "rgba(255,255,255,0.75)" }}>
                  Discover how inkjet printers use piezoelectric crystals and thermal bubbles to place millions of ink droplets with sub-millimeter precision.
                </p>
                <div className="space-y-3">
                  {["Printhead nozzle technology", "CMYK color accuracy", "Paper feed mechanism", "Resolution & DPI explained"].map(pt => (
                    <div key={pt} className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: "#00C851" }} />
                      <span className="text-sm font-medium text-white">{pt}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="py-24 px-4" style={{ background: "#f3f5f7" }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-block px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-4"
              style={{ background: "rgba(45,99,255,0.08)", color: "#2D63FF" }}>How It Works</div>
            <h2 className="text-4xl md:text-5xl font-extrabold mb-4" style={{ color: "#0B1D3A" }}>
              Ready in <span style={{ color: "#2D63FF" }}>4 Simple Steps</span>
            </h2>
            <p className="text-lg font-medium" style={{ color: "#444B54" }}>Get your prints in minutes — no waiting in queues.</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-6">
              {steps.map((s, i) => (
                <motion.div key={s.step} initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.12 }}
                  className="flex items-start gap-5 iom-card p-5">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black text-white flex-shrink-0"
                    style={{ background: "linear-gradient(135deg,#2D63FF,#1C3CB3)", boxShadow: "0 8px 20px rgba(45,99,255,0.3)" }}>
                    {s.step}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold mb-1" style={{ color: "#0B1D3A" }}>{s.title}</h3>
                    <p className="text-sm font-medium" style={{ color: "#6B7280" }}>{s.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
            <div className="rounded-3xl overflow-hidden" style={{ boxShadow: "0 20px 60px rgba(45,99,255,0.12)" }}>
              <Image src="/printer_closeup.png" alt="Printer in action" width={600} height={500} className="w-full object-cover" />
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section id="testimonials" className="py-24 px-4" style={{ background: "#ffffff" }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-block px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-4"
              style={{ background: "rgba(0,200,81,0.08)", color: "#00C851" }}>Reviews</div>
            <h2 className="text-4xl md:text-5xl font-extrabold mb-4" style={{ color: "#0B1D3A" }}>
              Loved by <span style={{ color: "#2D63FF" }}>Thousands</span>
            </h2>
            <p className="text-lg font-medium" style={{ color: "#444B54" }}>Real students and professionals, real results.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-16">
            {testimonials.map((t, i) => (
              <motion.div key={t.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="iom-card p-7">
                <div className="flex mb-3 gap-0.5">
                  {[...Array(5)].map((_, j) => <Star key={j} className="w-4 h-4 fill-[#F39C12] text-[#F39C12]" />)}
                </div>
                <p className="text-base font-medium mb-5" style={{ color: "#444B54", lineHeight: "1.7" }}>"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
                    style={{ background: "#2D63FF" }}>{t.avatar}</div>
                  <div>
                    <div className="text-sm font-bold" style={{ color: "#0B1D3A" }}>{t.name}</div>
                    <div className="text-xs font-medium" style={{ color: "#6B7280" }}>{t.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Customer photo */}
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="rounded-3xl overflow-hidden" style={{ boxShadow: "0 20px 60px rgba(45,99,255,0.12)" }}>
              <Image src="/happy_customer.png" alt="Happy customer with prints" width={600} height={450} className="w-full object-cover" />
            </div>
            <div>
              <div className="inline-block px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-4"
                style={{ background: "rgba(45,99,255,0.08)", color: "#2D63FF" }}>Why Choose Us</div>
              <h2 className="text-4xl font-extrabold mb-5" style={{ color: "#0B1D3A" }}>
                Your Prints,<br /><span style={{ color: "#2D63FF" }}>Delivered Perfectly</span>
              </h2>
              <div className="space-y-4">
                {[
                  "Upload any PDF from phone or laptop",
                  "B&W from ₹1 | Color from ₹5 per page",
                  "WhatsApp notification when ready",
                  "Pay after pickup or pay online",
                  "Secure file deletion after 24 hours",
                ].map(pt => (
                  <div key={pt} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: "#00C851" }} />
                    <span className="text-base font-semibold" style={{ color: "#444B54" }}>{pt}</span>
                  </div>
                ))}
              </div>
              <Link href="/auth/register" className="btn-primary inline-flex items-center gap-2 px-8 py-4 text-base font-bold mt-8">
                Get Started Free <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA BAND ── */}
      <section className="py-24 px-4" style={{ background: "linear-gradient(160deg,#0B1D3A 0%,#1C3CB3 60%,#2D63FF 100%)" }}>
        <div className="max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-6">
              <FileText className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-4">
              Ready to Start Printing?
            </h2>
            <p className="text-xl font-medium mb-10" style={{ color: "rgba(255,255,255,0.85)" }}>
              Join 2,500+ customers who trust Antigravity for fast, reliable, affordable printing.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/register"
                className="inline-flex items-center justify-center gap-2 px-10 py-4 text-base font-bold rounded-full text-[#2D63FF] bg-white hover:bg-blue-50 transition-all"
                style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}>
                Create Free Account <ArrowRight className="w-5 h-5" />
              </Link>
              <Link href="/auth/login"
                className="inline-flex items-center justify-center gap-2 px-10 py-4 text-base font-bold rounded-full text-white transition-all"
                style={{ border: "2px solid rgba(255,255,255,0.4)" }}>
                Sign In <ChevronRight className="w-5 h-5" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-12 px-4" style={{ background: "#0B1D3A" }}>
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-start justify-between gap-10 mb-10">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0" style={{ border: "2.5px solid #2D63FF" }}>
                  <Image src="/BADAMSUDHEERREDDY.jpg" alt="Logo" width={40} height={40} className="w-full h-full object-cover" />
                </div>
                <span className="font-bold text-xl text-white">Sudheer Reddy Print</span>
              </div>
              <p className="text-sm max-w-xs" style={{ color: "rgba(255,255,255,0.55)" }}>
                Professional online printing management. Upload, track, and collect — all in one place.
              </p>
            </div>
            <div className="flex gap-16">
              <div>
                <div className="text-white font-bold text-sm mb-4">Quick Links</div>
                <div className="flex flex-col gap-2 text-sm font-medium" style={{ color: "rgba(255,255,255,0.55)" }}>
                  <a href="#features"     className="hover:text-white transition-colors">Features</a>
                  <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
                  <a href="#testimonials" className="hover:text-white transition-colors">Reviews</a>
                </div>
              </div>
              <div>
                <div className="text-white font-bold text-sm mb-4">Legal</div>
                <div className="flex flex-col gap-2 text-sm font-medium" style={{ color: "rgba(255,255,255,0.55)" }}>
                  <a href="/support" className="hover:text-white transition-colors">Support</a>
                  <a href="/privacy" className="hover:text-white transition-colors">Privacy</a>
                  <a href="/terms"   className="hover:text-white transition-colors">Terms</a>
                </div>
              </div>
            </div>
          </div>
          <div className="pt-6 text-sm font-medium" style={{ borderTop: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)" }}>
            © 2025 Antigravity. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

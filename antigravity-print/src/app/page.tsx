"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Printer,
  Upload,
  Shield,
  Zap,
  Star,
  ArrowRight,
  CheckCircle,
  FileText,
  Clock,
  CreditCard,
  Bell,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const features = [
  {
    icon: Upload,
    title: "Easy PDF Upload",
    description:
      "Upload your PDF files securely. We support all standard sizes with real-time progress tracking.",
    color: "from-violet-500 to-purple-600",
  },
  {
    icon: Zap,
    title: "Instant Cost Calculation",
    description:
      "Get automatic pricing based on pages, color, paper size, and finishing options instantly.",
    color: "from-blue-500 to-cyan-500",
  },
  {
    icon: Bell,
    title: "Real-time Notifications",
    description:
      "Receive SMS, Email, and WhatsApp updates at every step — from upload to ready for pickup.",
    color: "from-amber-500 to-orange-500",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description:
      "Your files are encrypted and only accessible to you and our admin. Zero data leakage.",
    color: "from-emerald-500 to-green-500",
  },
  {
    icon: CreditCard,
    title: "Multiple Payments",
    description:
      "Pay via UPI, PhonePe, Google Pay, Paytm, Razorpay, or Cash. Instant payment confirmation.",
    color: "from-pink-500 to-rose-500",
  },
  {
    icon: Clock,
    title: "Live Order Tracking",
    description:
      "Track your print order from upload to completion with a beautiful visual status timeline.",
    color: "from-indigo-500 to-blue-500",
  },
];

const steps = [
  { step: "01", title: "Upload PDF", desc: "Select and upload your PDF file securely" },
  { step: "02", title: "Choose Options", desc: "Select paper size, color, copies & finishing" },
  { step: "03", title: "Pay Online", desc: "Pay securely via your preferred payment method" },
  { step: "04", title: "Track & Collect", desc: "Get real-time updates and collect your prints" },
];

const stats = [
  { label: "Orders Completed", value: "10,000+" },
  { label: "Happy Customers", value: "2,500+" },
  { label: "Pages Printed", value: "5M+" },
  { label: "Uptime", value: "99.9%" },
];

export default function HomePage() {
  const { user, userRole, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      if (userRole === "ADMIN") {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
    }
  }, [user, userRole, loading, router]);

  return (
    <div className="min-h-screen mesh-gradient text-white">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center glow-purple">
                <Printer className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl text-gradient">Antigravity</span>
            </div>
            <div className="hidden md:flex items-center gap-8 text-sm text-white/70">
              <a href="#features" className="hover:text-white transition-colors">Features</a>
              <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
              <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/auth/login"
                className="px-4 py-2 text-sm text-white/80 hover:text-white transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/auth/register"
                className="px-4 py-2 rounded-xl gradient-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity glow-purple"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass border border-violet-500/30 text-violet-300 text-sm mb-8">
              <Star className="w-3.5 h-3.5 fill-current" />
              <span>Smart Online Printing Management System</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight">
              Print Smarter with{" "}
              <span className="text-gradient">Antigravity</span>
            </h1>
            <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto mb-10">
              Upload PDFs, get instant quotes, track your order live, and receive
              notifications at every step. Professional printing, simplified.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/auth/register"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl gradient-primary text-white font-semibold text-lg hover:opacity-90 transition-all glow-purple hover-card"
              >
                Start Printing Now
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl glass border border-white/10 text-white font-semibold text-lg hover:border-white/20 transition-all hover-card"
              >
                Sign In
                <ChevronRight className="w-5 h-5" />
              </Link>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20"
          >
            {stats.map((stat) => (
              <div key={stat.label} className="glass rounded-2xl p-5 border border-white/5">
                <div className="text-3xl font-extrabold text-gradient">{stat.value}</div>
                <div className="text-sm text-white/50 mt-1">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Everything You Need to{" "}
              <span className="text-gradient">Print Professionally</span>
            </h2>
            <p className="text-white/50 text-lg max-w-2xl mx-auto">
              From upload to delivery, Antigravity handles every step of your printing journey.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass rounded-3xl p-6 border border-white/5 hover-card"
              >
                <div
                  className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4`}
                >
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              How <span className="text-gradient">It Works</span>
            </h2>
            <p className="text-white/50 text-lg">Four simple steps to get your prints.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {steps.map((step, i) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="text-center"
              >
                <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4 text-2xl font-black glow-purple">
                  {step.step}
                </div>
                <h3 className="font-bold text-lg mb-2">{step.title}</h3>
                <p className="text-white/50 text-sm">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="glass rounded-3xl p-10 border border-violet-500/20 glow-purple">
            <FileText className="w-14 h-14 text-violet-400 mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Start Printing?
            </h2>
            <p className="text-white/60 text-lg mb-8">
              Join thousands of customers who trust Antigravity for their printing needs.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/auth/register"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl gradient-primary text-white font-semibold hover:opacity-90 transition-all"
              >
                Create Free Account <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
            <div className="flex items-center justify-center gap-6 mt-6 text-sm text-white/50">
              {["Free to sign up", "No credit card required", "Instant access"].map((item) => (
                <div key={item} className="flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-10 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center">
              <Printer className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gradient">Antigravity</span>
          </div>
          <p className="text-white/30 text-sm">
            © 2025 Antigravity. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm text-white/40">
            <a href="/support" className="hover:text-white/70 transition-colors">Support</a>
            <a href="/privacy" className="hover:text-white/70 transition-colors">Privacy</a>
            <a href="/terms" className="hover:text-white/70 transition-colors">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Printer, Mail, User, Eye, EyeOff, Loader2, CheckCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function RegisterPage() {
  const { signUpWithEmail, signInWithGoogle } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    name: "", email: "", password: "", confirmPassword: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) { toast.error("Passwords do not match"); return; }
    if (form.password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    setLoading(true);
    try {
      await signUpWithEmail(form.email, form.password, form.name);
      toast.success("Account created successfully!");
      router.push("/dashboard");
    } catch (error: any) {
      const msg = error?.message || "";
      if (msg.includes("auth/email-already-in-use")) {
        toast.error("This email is already registered. Please sign in instead.");
      } else {
        toast.error(msg || "Registration failed");
      }
    } finally { setLoading(false); }
  };

  const handleGoogleRegister = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
      toast.success("Account created with Google!");
      router.push("/dashboard");
    } catch (error: unknown) {
      toast.error((error as Error).message || "Google sign-up failed");
    } finally { setLoading(false); }
  };

  const inputCls = "w-full py-3 px-4 rounded-xl text-sm font-medium transition-all outline-none";
  const inputStyle = { background: "#F5F7FA", border: "1.5px solid #E2E6EF", color: "#0B1D3A" };
  const inputFocus = (e: React.FocusEvent<HTMLInputElement>) => (e.target.style.border = "1.5px solid #2D63FF");
  const inputBlur  = (e: React.FocusEvent<HTMLInputElement>) => (e.target.style.border = "1.5px solid #E2E6EF");

  return (
    <div className="min-h-screen flex" style={{ background: "linear-gradient(160deg,#cfd8ff 0%,#e8eeff 40%,#f3f5f7 100%)" }}>

      {/* Left branding panel */}
      <div className="hidden lg:flex flex-col justify-between w-5/12 p-12"
        style={{ background: "linear-gradient(160deg,#0B1D3A 0%,#1C3CB3 60%,#2D63FF 100%)" }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden" style={{ border: "2.5px solid rgba(255,255,255,0.5)" }}>
            <Image src="/BADAMSUDHEERREDDY.jpg" alt="Logo" width={40} height={40} className="w-full h-full object-cover" />
          </div>
          <span className="font-extrabold text-white text-lg">Sudheer Reddy Print</span>
        </div>
        <div>
          <h2 className="text-4xl font-extrabold text-white mb-4 leading-tight">
            Start Printing<br />in Minutes
          </h2>
          <p className="text-lg font-medium mb-8" style={{ color: "rgba(255,255,255,0.7)" }}>
            Create your free account and get access to professional printing at your fingertips.
          </p>
          {[
            "Free to sign up, no credit card needed",
            "Upload PDFs from phone or laptop",
            "Track orders with live status updates",
            "Pay via UPI, Razorpay or Cash",
          ].map(f => (
            <div key={f} className="flex items-center gap-3 mb-3">
              <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: "#00C851" }} />
              <span className="text-sm font-medium text-white">{f}</span>
            </div>
          ))}
        </div>
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>© 2025 Sudheer Reddy Print</p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 justify-center mb-8">
            <div className="w-10 h-10 rounded-full overflow-hidden" style={{ border: "2.5px solid #2D63FF" }}>
              <Image src="/BADAMSUDHEERREDDY.jpg" alt="Logo" width={40} height={40} className="w-full h-full object-cover" />
            </div>
            <span className="font-extrabold text-xl" style={{ color: "#0B1D3A" }}>Sudheer Reddy Print</span>
          </div>

          {/* Card */}
          <div className="rounded-3xl p-8" style={{ background: "#ffffff", boxShadow: "0 20px 60px rgba(45,99,255,0.12)", border: "1px solid #E2E6EF" }}>
            <h1 className="text-2xl font-extrabold mb-1" style={{ color: "#0B1D3A" }}>Create Account</h1>
            <p className="text-sm font-medium mb-6" style={{ color: "#6B7280" }}>Join thousands of customers printing with us</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label className="text-sm font-semibold mb-2 block" style={{ color: "#444B54" }}>Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#6B7280" }} />
                  <input type="text" name="name" value={form.name} onChange={handleChange}
                    placeholder="Your full name" required
                    className={`${inputCls} pl-10`} style={inputStyle}
                    onFocus={inputFocus} onBlur={inputBlur} />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="text-sm font-semibold mb-2 block" style={{ color: "#444B54" }}>Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#6B7280" }} />
                  <input type="email" name="email" value={form.email} onChange={handleChange}
                    placeholder="you@example.com" required
                    className={`${inputCls} pl-10`} style={inputStyle}
                    onFocus={inputFocus} onBlur={inputBlur} />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="text-sm font-semibold mb-2 block" style={{ color: "#444B54" }}>Password</label>
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} name="password"
                    value={form.password} onChange={handleChange}
                    placeholder="Min 8 characters" required
                    className={`${inputCls} pr-10`} style={inputStyle}
                    onFocus={inputFocus} onBlur={inputBlur} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2" style={{ color: "#6B7280" }}>
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="text-sm font-semibold mb-2 block" style={{ color: "#444B54" }}>Confirm Password</label>
                <input type="password" name="confirmPassword" value={form.confirmPassword}
                  onChange={handleChange} placeholder="Repeat password" required
                  className={inputCls} style={inputStyle}
                  onFocus={inputFocus} onBlur={inputBlur} />
              </div>

              <button type="submit" disabled={loading}
                className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-60 mt-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Create Account
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full" style={{ borderTop: "1px solid #E2E6EF" }} />
              </div>
              <div className="relative flex justify-center">
                <span className="px-3 text-xs font-semibold" style={{ background: "#ffffff", color: "#6B7280" }}>or continue with</span>
              </div>
            </div>

            {/* Google */}
            <button onClick={handleGoogleRegister} disabled={loading}
              className="w-full py-3 px-4 rounded-xl flex items-center justify-center gap-3 text-sm font-semibold transition-all hover:shadow-md"
              style={{ background: "#F5F7FA", border: "1.5px solid #E2E6EF", color: "#0B1D3A" }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = "#2D63FF")}
              onMouseLeave={e => (e.currentTarget.style.borderColor = "#E2E6EF")}>
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Sign up with Google
            </button>

            <div className="mt-5 text-center text-sm font-medium" style={{ color: "#6B7280" }}>
              Already have an account?{" "}
              <Link href="/auth/login" className="font-bold hover:opacity-80 transition-opacity" style={{ color: "#2D63FF" }}>
                Sign in
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

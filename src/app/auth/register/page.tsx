"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Mail, User, Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function RegisterPage() {
  const { signUpWithEmail, signInWithGoogle, signInWithMicrosoft } = useAuth();
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

  const handleSocialRegister = async (provider: "google" | "microsoft") => {
    setLoading(true);
    try {
      if (provider === "google") await signInWithGoogle();
      if (provider === "microsoft") await signInWithMicrosoft();
      toast.success("Account created successfully!");
      router.push("/dashboard");
    } catch (error: any) {
      toast.error(error?.message || "Social sign-up failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#F4F7FE] relative overflow-hidden font-sans">
      {/* Background Abstract Orbs (WeStud Vibe) */}
      <div className="absolute top-[10%] right-[-10%] w-[40%] h-[50%] rounded-full bg-gradient-to-br from-[#4318FF] to-[#868CFF] blur-[120px] opacity-40 mix-blend-multiply animate-pulse-slow pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[35%] h-[45%] rounded-full bg-gradient-to-br from-[#00E5FF] to-[#0075FF] blur-[130px] opacity-30 mix-blend-multiply animate-pulse-slow pointer-events-none" style={{ animationDelay: '2s' }} />
      <div className="absolute top-[30%] left-[15%] w-[25%] h-[35%] rounded-full bg-gradient-to-br from-[#FF9066] to-[#FF5E5E] blur-[100px] opacity-20 mix-blend-multiply animate-pulse-slow pointer-events-none" style={{ animationDelay: '4s' }} />

      <div className="w-full max-w-[1200px] h-[750px] bg-white/70 backdrop-blur-xl rounded-[40px] shadow-[0_20px_50px_rgba(11,29,58,0.05)] border border-white/50 flex overflow-hidden relative z-10 mx-4">
        
        {/* Left Side: Illustration / Branding (Creative WeStud Style) */}
        <div className="hidden lg:flex flex-col w-1/2 relative bg-[#4318FF] overflow-hidden p-12 justify-between">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
          
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 1, ease: "easeOut" }}
            className="absolute top-[-100px] right-[-100px] w-[500px] h-[500px] rounded-full bg-gradient-to-b from-[#868CFF] to-[#00E5FF] blur-3xl opacity-60"
          />
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
            className="absolute bottom-[-150px] left-[-150px] w-[400px] h-[400px] rounded-full bg-gradient-to-t from-[#FF9066] to-[#4318FF] blur-3xl opacity-50"
          />

          {/* Floating Abstract Elements */}
          <motion.div animate={{ y: [0, -25, 0], rotate: [0, -5, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-[30%] right-[15%] w-20 h-20 rounded-[20px] bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-md border border-white/30 shadow-xl overflow-hidden p-1"
            style={{ transformStyle: 'preserve-3d', transform: 'perspective(1000px) rotateX(15deg) rotateY(-15deg)' }}
          >
            <Image src="/BADAMSUDHEERREDDY.jpg" alt="Badam Sudheer Reddy" width={80} height={80} className="w-full h-full object-cover rounded-[1rem]" />
          </motion.div>
          <motion.div animate={{ y: [0, 25, 0], rotate: [0, 15, 0] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
            className="absolute bottom-[25%] right-[20%] w-28 h-28 rounded-full bg-gradient-to-tr from-[#00E5FF] to-[#0075FF] shadow-[0_10px_30px_rgba(0,229,255,0.4)] opacity-90"
          />

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-16">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-white shadow-lg border-2 border-white/20">
                <Image src="/logo.png" alt="PRINT DOCKER" width={48} height={48} className="w-full h-full object-cover" />
              </div>
              <span className="font-extrabold text-white text-xl tracking-tight">PRINT DOCKER</span>
            </div>
            
            <motion.div initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3, duration: 0.6 }}>
              <h1 className="text-5xl font-black text-white leading-[1.1] mb-6 tracking-tight">
                Start printing <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF9066] to-[#FF5E5E]">in seconds</span><br />
                today.
              </h1>
              <p className="text-[#E0E5FF] text-lg font-medium max-w-[80%] leading-relaxed">
                Join our modern platform to upload, manage, and print your documents with breathtaking ease and clarity.
              </p>
            </motion.div>
          </div>

          <div className="relative z-10 flex items-center gap-4">
            <div className="text-sm font-medium text-[#E0E5FF]">
              <span className="text-white font-bold">Free to sign up</span> — no credit card required
            </div>
          </div>
        </div>

        {/* Right Side: Register Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-16 relative overflow-y-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.5 }}
            className="w-full max-w-[420px] py-6"
          >
            <div className="mb-8 text-center lg:text-left">
              <div className="flex justify-center lg:justify-start mb-8">
                <Link href="/" className="flex flex-col items-center lg:items-start gap-3 group">
                  <div className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0" style={{ border: "2.5px solid #2D63FF", boxShadow: "0 4px 14px rgba(45,99,255,0.25)" }}>
                    <Image src="/logo.png" alt="PRINT DOCKER" width={56} height={56} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                  </div>
                  <span className="font-extrabold text-xl tracking-tight" style={{ color: "#0B1D3A" }}>PRINT DOCKER</span>
                </Link>
              </div>
              <h2 className="text-4xl font-extrabold text-[#1B254B] mb-2 tracking-tight">Create Account</h2>
              <p className="text-[#A3AED0] font-medium text-base">Join thousands of happy customers.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 mb-6">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-[#1B254B] ml-1">Full Name</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#A3AED0] group-focus-within:text-[#4318FF] transition-colors" />
                  <input
                    type="text" name="name" value={form.name} onChange={handleChange}
                    placeholder="John Doe" required
                    className="w-full py-4 pl-12 pr-4 bg-white border border-[#E0E5F2] rounded-2xl text-[#1B254B] text-sm font-medium outline-none transition-all focus:border-[#4318FF] focus:ring-4 focus:ring-[#4318FF]/10 placeholder:text-[#A3AED0]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-[#1B254B] ml-1">Email</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#A3AED0] group-focus-within:text-[#4318FF] transition-colors" />
                  <input
                    type="email" name="email" value={form.email} onChange={handleChange}
                    placeholder="mail@example.com" required
                    className="w-full py-4 pl-12 pr-4 bg-white border border-[#E0E5F2] rounded-2xl text-[#1B254B] text-sm font-medium outline-none transition-all focus:border-[#4318FF] focus:ring-4 focus:ring-[#4318FF]/10 placeholder:text-[#A3AED0]"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <div className="space-y-1.5 flex-1">
                  <label className="text-sm font-bold text-[#1B254B] ml-1">Password</label>
                  <div className="relative group">
                    <input
                      type={showPassword ? "text" : "password"} name="password"
                      value={form.password} onChange={handleChange}
                      placeholder="Min 8 chars" required
                      className="w-full py-4 pl-5 pr-10 bg-white border border-[#E0E5F2] rounded-2xl text-[#1B254B] text-sm font-medium outline-none transition-all focus:border-[#4318FF] focus:ring-4 focus:ring-[#4318FF]/10 placeholder:text-[#A3AED0]"
                    />
                  </div>
                </div>
                <div className="space-y-1.5 flex-1">
                  <label className="text-sm font-bold text-[#1B254B] ml-1">Confirm</label>
                  <div className="relative group">
                    <input
                      type={showPassword ? "text" : "password"} name="confirmPassword"
                      value={form.confirmPassword} onChange={handleChange}
                      placeholder="Repeat" required
                      className="w-full py-4 pl-5 pr-10 bg-white border border-[#E0E5F2] rounded-2xl text-[#1B254B] text-sm font-medium outline-none transition-all focus:border-[#4318FF] focus:ring-4 focus:ring-[#4318FF]/10 placeholder:text-[#A3AED0]"
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A3AED0] hover:text-[#1B254B] transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full py-4 bg-[#4318FF] hover:bg-[#3311DB] text-white rounded-2xl font-bold text-base shadow-[0_10px_20px_rgba(67,24,255,0.2)] hover:shadow-[0_15px_25px_rgba(67,24,255,0.3)] transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-70 disabled:hover:shadow-[0_10px_20px_rgba(67,24,255,0.2)]"
              >
                {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                Sign Up
              </button>
            </form>

            <div className="flex items-center gap-4 mb-6">
              <div className="h-[1px] flex-1 bg-[#E0E5F2]" />
              <span className="text-xs font-bold text-[#A3AED0] uppercase">Or</span>
              <div className="h-[1px] flex-1 bg-[#E0E5F2]" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => handleSocialRegister("google")} disabled={loading} className="w-full py-3 bg-white border border-[#E0E5F2] hover:border-[#4318FF] hover:bg-[#F4F7FE] rounded-2xl flex items-center justify-center gap-2 text-sm font-bold text-[#1B254B] transition-all shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                Google
              </button>
              <button onClick={() => handleSocialRegister("microsoft")} disabled={loading} className="w-full py-3 bg-white border border-[#E0E5F2] hover:border-[#4318FF] hover:bg-[#F4F7FE] rounded-2xl flex items-center justify-center gap-2 text-sm font-bold text-[#1B254B] transition-all shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none"><path d="M11 3H3v8h8V3z" fill="#F25022"/><path d="M21 3h-8v8h8V3z" fill="#7FBA00"/><path d="M11 13H3v8h8v-8z" fill="#00A4EF"/><path d="M21 13h-8v8h8v-8z" fill="#FFB900"/></svg>
                Microsoft
              </button>
            </div>

            <div className="mt-8 text-center text-sm font-medium text-[#A3AED0]">
              Already have an account?{" "}
              <Link href="/auth/login" className="font-bold text-[#4318FF] hover:text-[#3311DB] transition-colors">
                Sign In
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

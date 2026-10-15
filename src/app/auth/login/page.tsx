"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Mail, Eye, EyeOff, Loader2, MapPin, ShieldAlert, CheckCircle2, Lock, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getUserFullLocation } from "@/lib/location";
import { toast } from "sonner";

export default function LoginPage() {
  const { signInWithGoogle, signInWithMicrosoft, signInWithEmail, resetPassword } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<"email" | "social">("email");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [locationStatus, setLocationStatus] = useState<"idle" | "requesting" | "granted" | "denied">("idle");
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locationError, setLocationError] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const verifyLocationBeforeAuth = async () => {
    setLocationStatus("requesting");
    try {
      const loc = await getUserFullLocation();
      if (typeof window !== "undefined") {
        sessionStorage.setItem("user_last_location", JSON.stringify(loc));
      }
      setLocationStatus("granted");
      setShowLocationModal(false);
      return loc;
    } catch (locErr: any) {
      setLocationStatus("denied");
      const msg = locErr?.message || "Location permission is required to log in.";
      setLocationError(msg);
      setShowLocationModal(true);
      throw new Error("LOCATION_REQUIRED: " + msg);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmail(email, password);
      toast.success("Welcome back!");
      router.push("/dashboard");
    } catch (error: any) {
      toast.error(error?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email first");
      return;
    }
    try {
      await resetPassword(email);
      toast.success("Password reset email sent!");
    } catch (error: any) {
      toast.error(error?.message || "Failed to send reset email");
    }
  };

  const handleSocialLogin = async (provider: "google" | "microsoft") => {
    setLoading(true);
    try {
      if (provider === "google") await signInWithGoogle();
      if (provider === "microsoft") await signInWithMicrosoft();

      toast.success("Welcome back!");
      router.push("/dashboard");
    } catch (error: any) {
      toast.error(error?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#F4F7FE] relative overflow-hidden font-sans">
      {/* Background Abstract Orbs (WeStud Vibe) */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[50%] rounded-full bg-gradient-to-br from-[#4318FF] to-[#868CFF] blur-[120px] opacity-40 mix-blend-multiply animate-pulse-slow pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[35%] h-[45%] rounded-full bg-gradient-to-br from-[#00E5FF] to-[#0075FF] blur-[130px] opacity-30 mix-blend-multiply animate-pulse-slow pointer-events-none" style={{ animationDelay: '2s' }} />
      <div className="absolute top-[20%] right-[15%] w-[25%] h-[35%] rounded-full bg-gradient-to-br from-[#FF9066] to-[#FF5E5E] blur-[100px] opacity-20 mix-blend-multiply animate-pulse-slow pointer-events-none" style={{ animationDelay: '4s' }} />

      <div className="w-full max-w-[1200px] h-[750px] bg-white/70 backdrop-blur-xl rounded-[40px] shadow-[0_20px_50px_rgba(11,29,58,0.05)] border border-white/50 flex overflow-hidden relative z-10 mx-4">
        
        {/* Left Side: Illustration / Branding (Creative WeStud Style) */}
        <div className="hidden lg:flex flex-col w-1/2 relative bg-[#4318FF] overflow-hidden p-12 justify-between">
          {/* Decorative shapes inside the left panel */}
          <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }} 
            transition={{ duration: 1, ease: "easeOut" }}
            className="absolute top-[-150px] right-[-150px] w-[500px] h-[500px] rounded-full bg-gradient-to-b from-[#868CFF] to-[#4318FF] blur-3xl opacity-60"
          />
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }} 
            transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
            className="absolute bottom-[-100px] left-[-100px] w-[400px] h-[400px] rounded-full bg-gradient-to-t from-[#00E5FF] to-[#4318FF] blur-3xl opacity-50"
          />

          {/* Floating Abstract 3D-like Shapes */}
          <motion.div 
            animate={{ y: [0, -20, 0], rotate: [0, 5, 0] }} 
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-[25%] right-[10%] w-24 h-24 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl overflow-hidden p-1"
            style={{ transformStyle: 'preserve-3d', transform: 'perspective(1000px) rotateX(20deg) rotateY(-20deg)' }}
          >
            <Image src="/BADAMSUDHEERREDDY.jpg" alt="Badam Sudheer Reddy" width={96} height={96} className="w-full h-full object-cover rounded-[1.25rem]" />
          </motion.div>
          <motion.div 
            animate={{ y: [0, 30, 0], rotate: [0, -10, 0] }} 
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute bottom-[20%] right-[25%] w-32 h-32 rounded-full bg-gradient-to-tr from-[#FF9066] to-[#FF5E5E] shadow-[0_10px_30px_rgba(255,94,94,0.4)] opacity-90"
          />

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-16">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-white shadow-lg border-2 border-white/20">
                <Image src="/logo.png" alt="PRINT DOCKER" width={48} height={48} className="w-full h-full object-cover" />
              </div>
              <span className="font-extrabold text-white text-xl tracking-tight">PRINT DOCKER</span>
            </div>
            
            <motion.div
              initial={{ x: -30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              <h1 className="text-5xl font-black text-white leading-[1.1] mb-6 tracking-tight">
                Unlock your <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00E5FF] to-[#868CFF]">creative printing</span><br />
                potential.
              </h1>
              <p className="text-[#E0E5FF] text-lg font-medium max-w-[80%] leading-relaxed">
                Join our modern platform to upload, manage, and print your documents with breathtaking ease and clarity.
              </p>
            </motion.div>
          </div>


        </div>

        {/* Right Side: Login Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-16 relative">
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.5 }}
            className="w-full max-w-[420px]"
          >
            <div className="mb-10 text-center lg:text-left">
              <div className="flex justify-center lg:justify-start mb-8">
                <Link href="/" className="flex flex-col items-center lg:items-start gap-3 group">
                  <div className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0" style={{ border: "2.5px solid #2D63FF", boxShadow: "0 4px 14px rgba(45,99,255,0.25)" }}>
                    <Image src="/logo.png" alt="PRINT DOCKER" width={56} height={56} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                  </div>
                  <span className="font-extrabold text-xl tracking-tight" style={{ color: "#0B1D3A" }}>PRINT DOCKER</span>
                </Link>
              </div>
              <h2 className="text-4xl font-extrabold text-[#1B254B] mb-2 tracking-tight">Welcome Back</h2>
              <p className="text-[#A3AED0] font-medium text-base">Sign in to continue your printing journey.</p>
            </div>

            {/* Live Location Security Notice */}
            <div className="mb-6 p-3 rounded-2xl bg-[#EEF2FF] border border-[#C7D2FE] flex items-center gap-3 text-xs text-[#312E81] font-medium">
              <div className="w-8 h-8 rounded-xl bg-[#4318FF] text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="flex-1 text-left">
                <span className="font-bold text-[#1E1B4B] block">Live Location Required</span>
                <span className="text-gray-500 text-[11px]">Location access is required to log in for admin verification.</span>
              </div>
              {locationStatus === "granted" && (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              )}
            </div>

            {/* Tabs (WeStud Style Pill) */}
            <div className="flex p-1.5 bg-[#F4F7FE] rounded-2xl mb-8 border border-gray-100 shadow-inner">
              <button
                onClick={() => setTab("email")}
                className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-300 ${
                  tab === "email" ? "bg-white text-[#4318FF] shadow-[0_4px_12px_rgba(0,0,0,0.05)]" : "text-[#A3AED0] hover:text-[#1B254B]"
                }`}
              >
                Email Login
              </button>
              <button
                onClick={() => setTab("social")}
                className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-300 ${
                  tab === "social" ? "bg-white text-[#4318FF] shadow-[0_4px_12px_rgba(0,0,0,0.05)]" : "text-[#A3AED0] hover:text-[#1B254B]"
                }`}
              >
                Social Login
              </button>
            </div>

            <AnimatePresence mode="wait">
              {tab === "email" && (
                <motion.div key="email" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-5">
                  <form onSubmit={handleEmailLogin} className="space-y-5">
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-[#1B254B] ml-1">Email</label>
                      <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#A3AED0] group-focus-within:text-[#4318FF] transition-colors" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="mail@example.com"
                          required
                          className="w-full py-4 pl-12 pr-4 bg-white border border-[#E0E5F2] rounded-2xl text-[#1B254B] text-sm font-medium outline-none transition-all focus:border-[#4318FF] focus:ring-4 focus:ring-[#4318FF]/10 placeholder:text-[#A3AED0]"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center ml-1">
                        <label className="text-sm font-bold text-[#1B254B]">Password</label>
                        <button type="button" onClick={handleForgotPassword} className="text-sm font-bold text-[#4318FF] hover:text-[#3311DB] transition-colors">Forgot?</button>
                      </div>
                      <div className="relative group">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Min. 8 characters"
                          required
                          className="w-full py-4 pl-5 pr-12 bg-white border border-[#E0E5F2] rounded-2xl text-[#1B254B] text-sm font-medium outline-none transition-all focus:border-[#4318FF] focus:ring-4 focus:ring-[#4318FF]/10 placeholder:text-[#A3AED0]"
                        />
                        <button 
                          type="button" 
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-[#A3AED0] hover:text-[#1B254B] transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    <button 
                      type="submit" 
                      disabled={loading}
                      className="w-full py-4 bg-[#4318FF] hover:bg-[#3311DB] text-white rounded-2xl font-bold text-base shadow-[0_10px_20px_rgba(67,24,255,0.2)] hover:shadow-[0_15px_25px_rgba(67,24,255,0.3)] transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-70 disabled:hover:shadow-[0_10px_20px_rgba(67,24,255,0.2)]"
                    >
                      {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                      Sign In
                    </button>
                  </form>
                </motion.div>
              )}

              {tab === "social" && (
                <motion.div key="social" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-4">
                  {[
                    {
                      label: "Continue with Google", action: () => handleSocialLogin("google"),
                      icon: <svg className="w-6 h-6" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>,
                    },
                    {
                      label: "Continue with Microsoft", action: () => handleSocialLogin("microsoft"),
                      icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none"><path d="M11 3H3v8h8V3z" fill="#F25022"/><path d="M21 3h-8v8h8V3z" fill="#7FBA00"/><path d="M11 13H3v8h8v-8z" fill="#00A4EF"/><path d="M21 13h-8v8h8v-8z" fill="#FFB900"/></svg>,
                    },
                  ].map(({ label, action, icon }) => (
                    <button 
                      key={label} 
                      onClick={action} 
                      disabled={loading}
                      className="w-full py-4 px-6 bg-white border border-[#E0E5F2] hover:border-[#4318FF] hover:bg-[#F4F7FE] rounded-2xl flex items-center justify-center gap-4 text-sm font-bold text-[#1B254B] transition-all shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
                    >
                      {icon} {label}
                    </button>
                  ))}
                  {loading && <div className="flex justify-center py-4"><Loader2 className="w-8 h-8 animate-spin text-[#4318FF]" /></div>}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-8 text-center text-sm font-medium text-[#A3AED0]">
              Not registered yet?{" "}
              <Link href="/auth/register" className="font-bold text-[#4318FF] hover:text-[#3311DB] transition-colors">
                Create an Account
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Location Modal */}
      <AnimatePresence>
        {showLocationModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-gray-100 text-center relative"
            >
              <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 mx-auto flex items-center justify-center mb-4">
                <MapPin className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-black text-[#1B254B] mb-2 tracking-tight">Location Access Required</h3>
              <p className="text-gray-600 text-xs leading-relaxed mb-4">
                Every user must allow their live location to log in to PRINT DOCKER. This live location is required for admin dispatch verification and portal monitoring.
              </p>

              {locationError && (
                <div className="p-3 mb-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs text-left">
                  {locationError}
                </div>
              )}

              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-left text-xs text-gray-700 space-y-1 mb-5">
                <div className="font-bold text-[#1B254B] flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-blue-600" />
                  To enable location:
                </div>
                <ol className="list-decimal pl-4 space-y-0.5 text-gray-600">
                  <li>Click the padlock / site icon left of the URL in your browser.</li>
                  <li>Toggle Location permission to <strong>Allow</strong>.</li>
                  <li>Click &quot;Try Again&quot; below.</li>
                </ol>
              </div>

              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowLocationModal(false)}
                  className="flex-1 py-3 px-4 rounded-xl border border-gray-200 text-gray-700 font-bold text-xs hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await verifyLocationBeforeAuth();
                    } catch {}
                  }}
                  className="flex-1 py-3 px-4 rounded-xl bg-[#4318FF] hover:bg-[#3311DB] text-white font-bold text-xs shadow-md transition-colors flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Try Again
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}


"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Printer, Mail, Phone, Eye, EyeOff, ArrowLeft, Loader2, Monitor,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { RecaptchaVerifier, ConfirmationResult } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { toast } from "sonner";

type Tab = "phone" | "email" | "social";

export default function LoginPage() {
  const { signInWithGoogle, signInWithMicrosoft, signInWithApple, signInWithEmail, sendOTP, verifyOTP } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("phone");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpSent, setOtpSent] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const recaptchaRef = useRef<HTMLDivElement>(null);
  const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const initRecaptcha = useCallback(() => {
    if (!recaptchaVerifier && recaptchaRef.current) {
      const verifier = new RecaptchaVerifier(auth, recaptchaRef.current, {
        size: "invisible",
        callback: () => {},
      });
      setRecaptchaVerifier(verifier);
      return verifier;
    }
    return recaptchaVerifier;
  }, [recaptchaVerifier]);

  const handleSendOTP = async () => {
    if (!phone || phone.length < 10) { toast.error("Enter a valid phone number"); return; }
    setLoading(true);
    try {
      const formattedPhone = phone.startsWith("+") ? phone : `+91${phone}`;
      const verifier = initRecaptcha()!;
      const result = await sendOTP(formattedPhone, verifier);
      setConfirmationResult(result);
      setOtpSent(true);
      toast.success("OTP sent to your phone!");
    } catch (error: unknown) {
      toast.error((error as Error).message || "Failed to send OTP");
      setRecaptchaVerifier(null);
    } finally { setLoading(false); }
  };

  const handleVerifyOTP = async () => {
    const otpCode = otp.join("");
    if (otpCode.length !== 6) { toast.error("Enter the 6-digit OTP"); return; }
    if (!confirmationResult) return;
    setLoading(true);
    try {
      await verifyOTP(confirmationResult, otpCode);
      toast.success("Login successful!");
      router.push("/dashboard");
    } catch { toast.error("Invalid OTP. Please try again."); }
    finally { setLoading(false); }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) otpRefs.current[index - 1]?.focus();
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmail(email, password);
      toast.success("Login successful!");
      router.push("/dashboard");
    } catch (error: unknown) {
      toast.error((error as Error).message || "Login failed");
    } finally { setLoading(false); }
  };

  const handleSocialLogin = async (provider: "google" | "microsoft" | "apple") => {
    setLoading(true);
    try {
      if (provider === "google") await signInWithGoogle();
      else if (provider === "microsoft") await signInWithMicrosoft();
      else if (provider === "apple") await signInWithApple();
      toast.success("Login successful!");
      router.push("/dashboard");
    } catch (error: unknown) {
      toast.error((error as Error).message || "Login failed");
    } finally { setLoading(false); }
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "phone", label: "Phone OTP" },
    { id: "email", label: "Email" },
    { id: "social", label: "Social" },
  ];

  /* ── shared input style ── */
  const inputCls = "w-full py-3 px-4 rounded-xl text-sm font-medium transition-all outline-none";
  const inputStyle = {
    background: "#F5F7FA",
    border: "1.5px solid #E2E6EF",
    color: "#0B1D3A",
  };
  const inputFocus = (e: React.FocusEvent<HTMLInputElement>) =>
    (e.target.style.border = "1.5px solid #2D63FF");
  const inputBlur = (e: React.FocusEvent<HTMLInputElement>) =>
    (e.target.style.border = "1.5px solid #E2E6EF");

  return (
    <div
      className="min-h-screen flex"
      style={{ background: "linear-gradient(160deg,#cfd8ff 0%,#e8eeff 40%,#f3f5f7 100%)" }}
    >
      <div ref={recaptchaRef} id="recaptcha-container" />

      {/* Left panel — branding */}
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
            Professional Printing,<br />Completely Online
          </h2>
          <p className="text-lg font-medium" style={{ color: "rgba(255,255,255,0.7)" }}>
            Upload PDFs, track orders live, and get WhatsApp notifications — all from your phone.
          </p>
          <div className="mt-8 space-y-3">
            {["Upload from anywhere", "Instant price quote", "Real-time order tracking", "Multiple payment options"].map(f => (
              <div key={f} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.15)" }}>
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-white">{f}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>© 2025 Sudheer Reddy Print</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          {/* Logo (mobile only) */}
          <div className="flex lg:hidden items-center gap-3 justify-center mb-8">
            <div className="w-10 h-10 rounded-full overflow-hidden" style={{ border: "2.5px solid #2D63FF" }}>
              <Image src="/BADAMSUDHEERREDDY.jpg" alt="Logo" width={40} height={40} className="w-full h-full object-cover" />
            </div>
            <span className="font-extrabold text-xl" style={{ color: "#0B1D3A" }}>Sudheer Reddy Print</span>
          </div>

          {/* Card */}
          <div className="rounded-3xl p-8" style={{ background: "#ffffff", boxShadow: "0 20px 60px rgba(45,99,255,0.12)", border: "1px solid #E2E6EF" }}>
            <h1 className="text-2xl font-extrabold mb-1" style={{ color: "#0B1D3A" }}>Welcome Back</h1>
            <p className="text-sm font-medium mb-6" style={{ color: "#6B7280" }}>Sign in to your account to continue</p>

            {/* Tabs */}
            <div className="flex gap-1 p-1 rounded-xl mb-6" style={{ background: "#F5F7FA" }}>
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
                  style={tab === t.id
                    ? { background: "#2D63FF", color: "#ffffff", boxShadow: "0 2px 8px rgba(45,99,255,0.3)" }
                    : { background: "transparent", color: "#6B7280" }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {/* Phone OTP */}
              {tab === "phone" && (
                <motion.div key="phone" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                  {!otpSent ? (
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-semibold mb-2 block" style={{ color: "#444B54" }}>Phone Number</label>
                        <div className="relative">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2" style={{ color: "#6B7280" }}>
                            <Phone className="w-4 h-4" />
                            <span className="text-sm font-medium">+91</span>
                            <span className="text-sm" style={{ color: "#E2E6EF" }}>|</span>
                          </div>
                          <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                            placeholder="10-digit mobile number"
                            className={`${inputCls} pl-24`}
                            style={inputStyle}
                            onFocus={inputFocus} onBlur={inputBlur}
                          />
                        </div>
                      </div>
                      <button
                        onClick={handleSendOTP}
                        disabled={loading}
                        className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-60"
                      >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Phone className="w-4 h-4" />}
                        Send OTP
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      <div className="text-center p-4 rounded-xl" style={{ background: "#F0FDF4", border: "1px solid rgba(0,200,81,0.2)" }}>
                        <p className="text-sm font-medium" style={{ color: "#444B54" }}>
                          OTP sent to <span className="font-bold" style={{ color: "#00C851" }}>+91 {phone}</span>
                        </p>
                        <button
                          onClick={() => { setOtpSent(false); setOtp(["", "", "", "", "", ""]); }}
                          className="text-xs font-medium flex items-center gap-1 mx-auto mt-2 hover:opacity-70 transition-opacity"
                          style={{ color: "#6B7280" }}
                        >
                          <ArrowLeft className="w-3 h-3" /> Change number
                        </button>
                      </div>
                      <div className="flex gap-2 justify-center">
                        {otp.map((digit, i) => (
                          <input
                            key={i}
                            ref={(el) => { otpRefs.current[i] = el; }}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleOtpChange(i, e.target.value.replace(/\D/g, ""))}
                            onKeyDown={(e) => handleOtpKeyDown(i, e)}
                            className="w-11 h-12 text-center text-xl font-bold rounded-xl outline-none transition-all"
                            style={{
                              background: "#F5F7FA",
                              border: digit ? "2px solid #2D63FF" : "1.5px solid #E2E6EF",
                              color: "#0B1D3A",
                            }}
                          />
                        ))}
                      </div>
                      <button
                        onClick={handleVerifyOTP}
                        disabled={loading}
                        className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-60"
                      >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        Verify & Login
                      </button>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Email */}
              {tab === "email" && (
                <motion.div key="email" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                  <form onSubmit={handleEmailLogin} className="space-y-4">
                    <div>
                      <label className="text-sm font-semibold mb-2 block" style={{ color: "#444B54" }}>Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#6B7280" }} />
                        <input
                          type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@example.com" required
                          className={`${inputCls} pl-10`} style={inputStyle}
                          onFocus={inputFocus} onBlur={inputBlur}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-semibold mb-2 block" style={{ color: "#444B54" }}>Password</label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••" required
                          className={`${inputCls} pr-10`} style={inputStyle}
                          onFocus={inputFocus} onBlur={inputBlur}
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors"
                          style={{ color: "#6B7280" }}>
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <button type="submit" disabled={loading}
                      className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-60">
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      Sign In with Email
                    </button>
                  </form>
                </motion.div>
              )}

              {/* Social */}
              {tab === "social" && (
                <motion.div key="social" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-3">
                  {[
                    {
                      label: "Continue with Google", action: () => handleSocialLogin("google"),
                      icon: <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>,
                    },
                    {
                      label: "Continue with Microsoft", action: () => handleSocialLogin("microsoft"),
                      icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none"><path d="M11 3H3v8h8V3z" fill="#F25022"/><path d="M21 3h-8v8h8V3z" fill="#7FBA00"/><path d="M11 13H3v8h8v-8z" fill="#00A4EF"/><path d="M21 13h-8v8h8v-8z" fill="#FFB900"/></svg>,
                    },
                    {
                      label: "Continue with Apple", action: () => handleSocialLogin("apple"),
                      icon: <Monitor className="w-5 h-5" style={{ color: "#444B54" }} />,
                    },
                  ].map(({ label, action, icon }) => (
                    <button key={label} onClick={action} disabled={loading}
                      className="w-full py-3 px-4 rounded-xl flex items-center gap-3 text-sm font-semibold transition-all hover:shadow-md"
                      style={{ background: "#F5F7FA", border: "1.5px solid #E2E6EF", color: "#0B1D3A" }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = "#2D63FF")}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = "#E2E6EF")}
                    >
                      {icon} {label}
                    </button>
                  ))}
                  {loading && <div className="flex justify-center py-2"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "#2D63FF" }} /></div>}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-6 pt-5 text-center text-sm font-medium" style={{ borderTop: "1px solid #E2E6EF", color: "#6B7280" }}>
              Don&apos;t have an account?{" "}
              <Link href="/auth/register" className="font-bold hover:opacity-80 transition-opacity" style={{ color: "#2D63FF" }}>
                Create one
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

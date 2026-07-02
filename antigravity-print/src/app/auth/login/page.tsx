"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Printer,
  Mail,
  Phone,
  Eye,
  EyeOff,
  ArrowLeft,
  Loader2,
  Globe2,
  Monitor,
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

  // Phone OTP state
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpSent, setOtpSent] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const recaptchaRef = useRef<HTMLDivElement>(null);
  const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null);

  // Email state
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
    if (!phone || phone.length < 10) {
      toast.error("Enter a valid phone number");
      return;
    }
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
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    const otpCode = otp.join("");
    if (otpCode.length !== 6) {
      toast.error("Enter the 6-digit OTP");
      return;
    }
    if (!confirmationResult) return;
    setLoading(true);
    try {
      await verifyOTP(confirmationResult, otpCode);
      toast.success("Login successful!");
      router.push("/dashboard");
    } catch {
      toast.error("Invalid OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
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
    } finally {
      setLoading(false);
    }
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
    } finally {
      setLoading(false);
    }
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "phone", label: "Phone OTP" },
    { id: "email", label: "Email" },
    { id: "social", label: "Social" },
  ];

  return (
    <div className="min-h-screen mesh-gradient flex items-center justify-center px-4 py-12">
      <div ref={recaptchaRef} id="recaptcha-container" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4 glow-purple">
            <Printer className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gradient">Welcome Back</h1>
          <p className="text-white/50 mt-2">Sign in to your Antigravity account</p>
        </div>

        {/* Card */}
        <div className="glass-strong rounded-3xl p-8 border border-white/10">
          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-white/5 rounded-xl mb-6">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  tab === t.id
                    ? "bg-violet-600 text-white"
                    : "text-white/50 hover:text-white"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {/* Phone OTP Tab */}
            {tab === "phone" && (
              <motion.div
                key="phone"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                {!otpSent ? (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-white/60 mb-2 block">Phone Number</label>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 text-white/40">
                          <Phone className="w-4 h-4" />
                          <span className="text-sm">+91</span>
                        </div>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                          placeholder="Enter 10-digit number"
                          className="w-full pl-20 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-violet-500 transition-colors"
                        />
                      </div>
                    </div>
                    <button
                      onClick={handleSendOTP}
                      disabled={loading}
                      className="w-full py-3 rounded-xl gradient-primary text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Phone className="w-4 h-4" />}
                      Send OTP
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="text-center">
                      <p className="text-white/60 text-sm">
                        OTP sent to <span className="text-violet-400">+91 {phone}</span>
                      </p>
                      <button
                        onClick={() => { setOtpSent(false); setOtp(["", "", "", "", "", ""]); }}
                        className="text-sm text-white/40 hover:text-white/70 flex items-center gap-1 mx-auto mt-2"
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
                          className="w-12 h-12 text-center text-xl font-bold bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-violet-500 transition-colors"
                        />
                      ))}
                    </div>
                    <button
                      onClick={handleVerifyOTP}
                      disabled={loading}
                      className="w-full py-3 rounded-xl gradient-primary text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      Verify & Login
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {/* Email Tab */}
            {tab === "email" && (
              <motion.div
                key="email"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <form onSubmit={handleEmailLogin} className="space-y-4">
                  <div>
                    <label className="text-sm text-white/60 mb-2 block">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                        className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-violet-500 transition-colors"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-white/60 mb-2 block">Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="w-full pl-4 pr-10 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-violet-500 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl gradient-primary text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Sign In with Email
                  </button>
                </form>
              </motion.div>
            )}

            {/* Social Tab */}
            {tab === "social" && (
              <motion.div
                key="social"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-3"
              >
                <button
                  onClick={() => handleSocialLogin("google")}
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 text-white font-medium flex items-center gap-3 transition-all hover:bg-white/8"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Continue with Google
                </button>
                <button
                  onClick={() => handleSocialLogin("microsoft")}
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 text-white font-medium flex items-center gap-3 transition-all hover:bg-white/8"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                    <path d="M11 3H3v8h8V3z" fill="#F25022" />
                    <path d="M21 3h-8v8h8V3z" fill="#7FBA00" />
                    <path d="M11 13H3v8h8v-8z" fill="#00A4EF" />
                    <path d="M21 13h-8v8h8v-8z" fill="#FFB900" />
                  </svg>
                  Continue with Microsoft
                </button>
                <button
                  onClick={() => handleSocialLogin("apple")}
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 text-white font-medium flex items-center gap-3 transition-all hover:bg-white/8"
                >
                  <Monitor className="w-5 h-5 text-white/60" />
                  Continue with Apple
                </button>
                {loading && (
                  <div className="flex justify-center py-2">
                    <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-6 text-center text-sm text-white/40">
            Don&apos;t have an account?{" "}
            <Link href="/auth/register" className="text-violet-400 hover:text-violet-300 font-medium">
              Create one
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

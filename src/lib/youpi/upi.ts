/**
 * YouPI UPI URI and Deep-Link Intent Engine
 * Generates canonical UPI URIs and native app intent deep links for Indian UPI apps.
 */

export interface BuildUpiUriOptions {
  payeeVpa: string;
  payeeName: string;
  amount: number | string;
  transactionRef: string;
  transactionNote?: string;
  currency?: string;
}

/**
 * Validates syntax of UPI Virtual Payment Address (VPA).
 */
export function isValidVpa(vpa: string): boolean {
  if (!vpa || typeof vpa !== "string") return false;
  return /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z0-9.\-_]{2,64}$/.test(vpa.trim());
}

/**
 * Normalizes 12-digit UPI UTR / RRN.
 */
export function normalizeUtr(utr: string): string {
  if (!utr) return "";
  return utr.replace(/\D/g, "").slice(0, 12);
}

/**
 * Builds canonical standard upi://pay URI
 */
export function buildUpiUri(options: BuildUpiUriOptions): string {
  const amountStr = typeof options.amount === "number" ? options.amount.toFixed(2) : options.amount;
  const params = new URLSearchParams();
  params.set("pa", options.payeeVpa.trim());
  params.set("pn", options.payeeName.trim());
  params.set("am", amountStr);
  params.set("cu", options.currency || "INR");

  const txnId = (options.transactionRef || options.transactionNote || "").trim();
  if (txnId) {
    params.set("tr", txnId);
    params.set("tn", `Order ${txnId}`);
  }

  return `upi://pay?${params.toString()}`;
}

export interface UpiAppIntent {
  id: string;
  name: string;
  packageName: string;
  schemePrefix?: string;
  intentUri: string;
}

/**
 * Builds specific deep links for Indian UPI apps on mobile.
 */
export function buildAppIntents(options: BuildUpiUriOptions): Record<string, string> {
  const canonicalUri = buildUpiUri(options);
  const query = canonicalUri.split("?")[1] || "";

  return {
    upi: canonicalUri,
    gpay: `intent://pay?${query}#Intent;scheme=upi;package=com.google.android.apps.nbu.paisa.user;end`,
    phonepe: `intent://pay?${query}#Intent;scheme=upi;package=com.phonepe.app;end`,
    paytm: `intent://pay?${query}#Intent;scheme=upi;package=net.one97.paytm;end`,
    bhim: `intent://pay?${query}#Intent;scheme=upi;package=in.org.npci.upiapp;end`,
    cred: `intent://pay?${query}#Intent;scheme=upi;package=com.dreamplug.androidapp;end`,
  };
}

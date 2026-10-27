/**
 * YouPI UPI URI and Deep-Link Intent Engine (Strict NPCI Specification)
 * Generates canonical UPI URIs and native app intent deep links for Indian UPI apps.
 */

export interface BuildUpiUriOptions {
  payeeVpa: string;
  payeeName: string;
  amount: number | string;
  transactionRef?: string;
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
 * Sanitize text to remove strange characters that break UPI deep links.
 */
function sanitizeText(text: string, maxLen = 25): string {
  return (text || "").replace(/[^a-zA-Z0-9 ]/g, " ").trim().slice(0, maxLen);
}

/**
 * Builds canonical standard upi://pay URI
 * CRITICAL FOR NPCI COMPLIANCE:
 * 1. `pa` MUST NOT have '@' encoded as '%40' (Google Pay & PhonePe fail if '%40' is present).
 * 2. `tr` MUST NOT be passed for non-aggregator VPAs (causes 'Security Error' / risk block in GPay/PhonePe).
 * 3. `am` must have exactly 2 decimal places.
 * 4. `cu` must be INR.
 */
export function buildUpiUri(options: BuildUpiUriOptions): string {
  const vpa = (options.payeeVpa || "").trim();
  const rawAmount = typeof options.amount === "number" ? options.amount : parseFloat(String(options.amount) || "0");
  const amountStr = (isNaN(rawAmount) ? 0 : rawAmount).toFixed(2);
  const cleanName = encodeURIComponent(sanitizeText(options.payeeName || "PRINT DOCKER", 25));

  // Extract clean order digits for note (e.g. "Order 12345")
  const rawRef = options.transactionRef || options.transactionNote || "";
  const cleanRef = rawRef.replace(/[^a-zA-Z0-9]/g, "").slice(-8);
  const note = encodeURIComponent(`Order ${cleanRef}`.trim());

  return `upi://pay?pa=${vpa}&pn=${cleanName}&am=${amountStr}&cu=INR&tn=${note}`;
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
  const query = canonicalUri.replace("upi://pay?", "");

  return {
    upi: canonicalUri,
    // Native app URI schemes (work reliably on iOS & Android)
    gpay: canonicalUri,
    phonepe: `phonepe://pay?${query}`,
    paytm: `paytmmp://pay?${query}`,
    bhim: `bhim://pay?${query}`,
    cred: `cred://upi/pay?${query}`,
  };
}

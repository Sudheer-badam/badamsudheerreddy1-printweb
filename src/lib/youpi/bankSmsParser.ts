/**
 * YouPI Bank & UPI SMS Parser
 * Intelligently extracts amounts and 12-digit UTR/RRN numbers from Indian bank credit SMS alerts
 * Supports SBI, HDFC, ICICI, Axis, Kotak, PNB, Canara, Paytm Bank, PhonePe, GPay, etc.
 */

export interface ParsedBankAlert {
  amount: number;
  amountStr: string;
  bankReferenceNumber?: string;
  senderVpa?: string;
  observedAt: Date;
  rawText: string;
}

export function extractIntelligentAmount(text: string): { amountStr: string; amount: number } | null {
  if (!text || typeof text !== "string") return null;

  const normalizedText = text.replace(/\s+/g, " ");

  // Remove balance mentions so balance is not confused with credit amount
  const balancePattern =
    /(?:(?:avl\b|avail\b|available\b|tot\b|total\b|ledger\b|clear\b|curr\b|current\b)\s*(?:bal\b|balance\b|limit\b)?|bal\b|balance\b)[\s:=-]*(?:(?:rs\b\.?|inr\b)|₹)?[\s:=-]*[\d,]+(?:\.\d{1,2})?/gi;
  const sanitizedText = normalizedText.replace(balancePattern, " ").trim();

  // Pattern 0: Direct credit proximity phrases
  const directCreditMatch =
    sanitizedText.match(/(?:credited\s*(?:with|by|for)?|received|deposit(?:ed)?)\s*[:=-]?\s*(?:(?:rs\b\.?|inr\b)|₹)?[\s:=-]*([\d,]+(?:\.\d{1,2})?)/i) ||
    sanitizedText.match(/(?:(?:rs\b\.?|inr\b)|₹)[\s:=-]*([\d,]+(?:\.\d{1,2})?)\s*(?:(?:has\s+been|is)\s+)?(?:credited|received|deposited)/i);
  if (directCreditMatch && (directCreditMatch[1] || directCreditMatch[2])) {
    const clean = (directCreditMatch[1] || directCreditMatch[2]).replace(/,/g, "");
    const val = parseFloat(clean);
    if (!isNaN(val) && val > 0) return { amountStr: clean, amount: val };
  }

  // Pattern 1: Standard currency prefix (Rs. 500, ₹50, INR 120.50)
  const prefixMatch = sanitizedText.match(/(?:(?:rs\b\.?|inr\b)|₹)[\s:=-]*([\d,]+(?:\.\d{1,2})?)/i);
  if (prefixMatch && prefixMatch[1]) {
    const clean = prefixMatch[1].replace(/,/g, "");
    const val = parseFloat(clean);
    if (!isNaN(val) && val > 0) return { amountStr: clean, amount: val };
  }

  // Pattern 2: Standard currency suffix (500 Rs, 50.00 INR)
  const suffixMatch = sanitizedText.match(/(?:^|[^\w.])([\d,]+(?:\.\d{1,2})?)[\s:=-]*(?:(?:rs\b\.?|inr\b)|₹)/i);
  if (suffixMatch && suffixMatch[1]) {
    const clean = suffixMatch[1].replace(/,/g, "");
    const val = parseFloat(clean);
    if (!isNaN(val) && val > 0) return { amountStr: clean, amount: val };
  }

  // Pattern 3: Proximity match
  const creditProximityMatch = sanitizedText.match(
    /(?:credited|received|deposit|cr)[\s\w:]*?([\d,]+(?:\.\d{1,2})?)|([\d,]+(?:\.\d{1,2})?)[\s\w:]*?(?:credited|received|deposit|cr)/i
  );
  if (creditProximityMatch) {
    const rawVal = creditProximityMatch[1] || creditProximityMatch[2];
    if (rawVal) {
      const clean = rawVal.replace(/,/g, "");
      const val = parseFloat(clean);
      if (!isNaN(val) && val > 0 && val < 10000000) return { amountStr: clean, amount: val };
    }
  }

  return null;
}

export class BankSmsParser {
  static parse(sms: { text: string; sender?: string; timestamp?: Date | number | string }): ParsedBankAlert | null {
    const text = (sms.text || "").trim().slice(0, 4096);
    if (!text) return null;

    // Must have credit keywords
    const creditKeywords =
      /\b(?:credited|received|deposit(?:ed)?|payment\s+received|money\s+received|upi\/cr|transferred\s+to\s+(?:your\s+)?(?:a\/c|account|wallet)|added\s+to\s+(?:your\s+)?(?:account|wallet))\b/i;
    if (!creditKeywords.test(text)) {
      return null;
    }

    // Reject debit notifications
    const debitIdx = text.search(/\b(?:debited|withdrawn|deducted|spent|paid rs|sent rs)\b/i);
    const creditIdx = text.search(/\b(?:credited|received|deposit|deposited)\b/i);
    if (debitIdx !== -1 && (creditIdx === -1 || debitIdx < creditIdx)) {
      return null;
    }

    const extractedAmount = extractIntelligentAmount(text);
    if (!extractedAmount) return null;

    // Extract UTR/RRN
    let bankRef: string | undefined;
    const utrPatterns = [
      /(?:upi\s*ref(?:erence)?\s*(?:no\.?|num)?|utr(?:\s*no\.?)?|rrn(?:\s*no\.?)?|txn\s*(?:id|ref|#)?|transaction\s*id|ref\s*no\.?)[\s:=-]+([a-zA-Z0-9\-_]{6,35})/i,
      /(?:upi\/(?:[0-9]+\/|cr\/)([a-zA-Z0-9\-_]{6,35}))/i,
      /\b(?:ref(?:\s*(?:no\.?|id|#))?)[:\s#=-]+([a-zA-Z0-9\-_]{6,35})/i,
      /\b([0-9]{12})\b/,
    ];

    for (const pat of utrPatterns) {
      const match = text.match(pat);
      if (match && match[1]) {
        bankRef = match[1].trim();
        break;
      }
    }

    let senderVpa: string | undefined;
    const vpaMatch = text.match(/(?:from|by|vpa|upi\s*id)[\s:]+(?:[a-zA-Z\s]+[\(\[])?([a-zA-Z0-9.\-_]{2,64}@[a-zA-Z0-9.\-_]{2,32})/i);
    if (vpaMatch && vpaMatch[1]) {
      senderVpa = vpaMatch[1].trim().replace(/[.,;]+$/, "");
    }

    let observedAt = new Date();
    if (sms.timestamp) {
      const parsed = new Date(sms.timestamp);
      if (!isNaN(parsed.getTime())) observedAt = parsed;
    }

    return {
      amount: extractedAmount.amount,
      amountStr: extractedAmount.amountStr,
      bankReferenceNumber: bankRef,
      senderVpa,
      observedAt,
      rawText: text,
    };
  }
}

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Terms of Service",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#f5f7fa] py-16 px-4 font-sans text-[#1A1F2E]">
      <div className="max-w-4xl mx-auto bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-gray-100">
        <Link href="/" className="inline-flex items-center gap-2 text-[#4318FF] font-bold hover:text-[#3311DB] transition-colors mb-10">
          <ArrowLeft className="w-5 h-5" /> Back to Home
        </Link>
        <h1 className="text-4xl md:text-5xl font-extrabold text-[#0B1D3A] mb-8">Terms of Service</h1>
        
        <div className="prose prose-lg max-w-none text-[#444B54]">
          <p className="font-medium text-lg">Last updated: {new Date().toLocaleDateString()}</p>
          
          <h2 className="text-2xl font-bold text-[#0B1D3A] mt-10 mb-4">1. Acceptance of Terms</h2>
          <p>By accessing and using <strong>PRINT DOCKER | BADAM SUDHEER REDDY</strong>, you accept and agree to be bound by the terms and provision of this agreement. In addition, when using these particular services, you shall be subject to any posted guidelines or rules applicable to such services.</p>
          
          <h2 className="text-2xl font-bold text-[#0B1D3A] mt-10 mb-4">2. Description of Service</h2>
          <p>PRINT DOCKER provides users with access to a rich collection of resources for online document printing management. You understand and agree that the Service is provided "AS-IS" and that PRINT DOCKER assumes no responsibility for the timeliness, deletion, mis-delivery or failure to store any user communications or personalization settings.</p>

          <h2 className="text-2xl font-bold text-[#0B1D3A] mt-10 mb-4">3. User Conduct and Document Content</h2>
          <p>You understand that all information, data, text, software, music, sound, photographs, graphics, video, messages, tags, or other materials ("Content"), whether publicly posted or privately transmitted, are the sole responsibility of the person from whom such Content originated. You agree to not use the Service to upload or print Content that is illegal, harmful, threatening, abusive, harassing, defamatory, vulgar, obscene, or otherwise objectionable.</p>

          <h2 className="text-2xl font-bold text-[#0B1D3A] mt-10 mb-4">4. Payment and Refunds</h2>
          <p>All payments are processed securely. Due to the custom nature of printing services, refunds are generally not provided once a printing job has commenced. If there is a defect in the printing quality caused by our hardware, we will review the issue and may offer a reprint or refund at our sole discretion.</p>

          <h2 className="text-2xl font-bold text-[#0B1D3A] mt-10 mb-4">5. Modifications to Service</h2>
          <p>We reserve the right at any time and from time to time to modify or discontinue, temporarily or permanently, the Service (or any part thereof) with or without notice. You agree that PRINT DOCKER shall not be liable to you or to any third party for any modification, suspension or discontinuance of the Service.</p>

          <h2 className="text-2xl font-bold text-[#0B1D3A] mt-10 mb-4">6. Contact Information</h2>
          <p>If you have any questions regarding these Terms, please contact us at:</p>
          <p className="font-bold mt-2 text-[#0B1D3A]">Email: badamsudheerreddy1@gmail.com</p>
          <p className="font-bold text-[#0B1D3A]">Phone: +91 8688509699</p>
        </div>
      </div>
    </div>
  );
}

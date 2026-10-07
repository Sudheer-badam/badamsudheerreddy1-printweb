import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Privacy Policy",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#f5f7fa] py-16 px-4 font-sans text-[#1A1F2E]">
      <div className="max-w-4xl mx-auto bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-gray-100">
        <Link href="/" className="inline-flex items-center gap-2 text-[#4318FF] font-bold hover:text-[#3311DB] transition-colors mb-10">
          <ArrowLeft className="w-5 h-5" /> Back to Home
        </Link>
        <h1 className="text-4xl md:text-5xl font-extrabold text-[#0B1D3A] mb-8">Privacy Policy</h1>
        
        <div className="prose prose-lg max-w-none text-[#444B54]">
          <p className="font-medium text-lg">Last updated: {new Date().toLocaleDateString()}</p>
          
          <h2 className="text-2xl font-bold text-[#0B1D3A] mt-10 mb-4">1. Introduction</h2>
          <p>Welcome to <strong>PRINT DOCKER | BADAM SUDHEER REDDY</strong>. We respect your privacy and are committed to protecting your personal data. This privacy policy will inform you as to how we look after your personal data when you visit our website and tell you about your privacy rights.</p>
          
          <h2 className="text-2xl font-bold text-[#0B1D3A] mt-10 mb-4">2. The Data We Collect About You</h2>
          <p>We may collect, use, store and transfer different kinds of personal data about you which we have grouped together as follows:</p>
          <ul className="list-disc pl-6 space-y-2 mt-4">
            <li><strong>Identity Data</strong> includes first name, last name, username or similar identifier.</li>
            <li><strong>Contact Data</strong> includes email address and telephone numbers.</li>
            <li><strong>Transaction Data</strong> includes details about payments to and from you and other details of products and services you have purchased from us.</li>
            <li><strong>Document Data</strong> includes the files and PDFs you upload for printing purposes.</li>
          </ul>

          <h2 className="text-2xl font-bold text-[#0B1D3A] mt-10 mb-4">3. How We Use Your Data</h2>
          <p>We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:</p>
          <ul className="list-disc pl-6 space-y-2 mt-4">
            <li>Where we need to perform the contract we are about to enter into or have entered into with you (e.g., printing your documents).</li>
            <li>Where it is necessary for our legitimate interests and your interests and fundamental rights do not override those interests.</li>
            <li>Where we need to comply with a legal obligation.</li>
          </ul>

          <h2 className="text-2xl font-bold text-[#0B1D3A] mt-10 mb-4">4. Data Security</h2>
          <p>We have put in place appropriate security measures to prevent your personal data and uploaded documents from being accidentally lost, used, or accessed in an unauthorized way, altered, or disclosed. All printed documents are securely handled and deleted from our active servers after the printing process is fully completed and delivered.</p>

          <h2 className="text-2xl font-bold text-[#0B1D3A] mt-10 mb-4">5. Contact Us</h2>
          <p>If you have any questions about this privacy policy or our privacy practices, please contact us at:</p>
          <p className="font-bold mt-2 text-[#0B1D3A]">Email: badamsudheerreddy1@gmail.com</p>
          <p className="font-bold text-[#0B1D3A]">Phone: +91 8688509699</p>
        </div>
      </div>
    </div>
  );
}

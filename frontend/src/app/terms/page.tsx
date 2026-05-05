/* eslint-disable react/no-unescaped-entities */
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | Mirra AI",
  description: "Terms of service for Mirra AI - Your personal AI fashion and beauty assistant",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white shadow-sm rounded-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Terms of Service</h1>
        
        <p className="text-sm text-gray-600 mb-8">
          Last updated: {new Date().toLocaleDateString()}
        </p>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h2>
          <p className="text-gray-700 mb-4">
            By accessing or using Mirra AI ("Service"), you agree to be bound by these Terms of Service 
            ("Terms"). If you do not agree to these Terms, please do not use our Service.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Description of Service</h2>
          <p className="text-gray-700 mb-4">
            Mirra AI is an AI-powered personal fashion and beauty assistant that provides:
          </p>
          <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
            <li>Personalized style recommendations</li>
            <li>Virtual try-on for clothing, accessories, makeup, and hairstyles</li>
            <li>Skin analysis and beauty recommendations</li>
            <li>Digital closet management</li>
            <li>Outfit planning and tracking</li>
            <li>Agent-guided appearance recommendations</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. User Accounts</h2>
          
          <h3 className="text-xl font-semibold text-gray-800 mb-3">3.1 Account Creation</h3>
          <p className="text-gray-700 mb-4">
            To use our Service, you must create an account using Google OAuth. You agree to:
          </p>
          <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
            <li>Provide accurate and complete information</li>
            <li>Maintain the security of your account</li>
            <li>Notify us immediately of any unauthorized access</li>
            <li>Be responsible for all activities under your account</li>
          </ul>

          <h3 className="text-xl font-semibold text-gray-800 mb-3">3.2 Age Requirement</h3>
          <p className="text-gray-700 mb-4">
            You must be at least 13 years old to use our Service. If you are under 18, you must have 
            parental or guardian consent.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. User Content</h2>
          
          <h3 className="text-xl font-semibold text-gray-800 mb-3">4.1 Your Content</h3>
          <p className="text-gray-700 mb-4">
            You retain ownership of all content you upload to the Service, including:
          </p>
          <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
            <li>Selfies and photos</li>
            <li>Clothing item images</li>
            <li>Outfit photos</li>
            <li>Preferences and settings</li>
          </ul>

          <h3 className="text-xl font-semibold text-gray-800 mb-3">4.2 License to Use</h3>
          <p className="text-gray-700 mb-4">
            By uploading content, you grant us a limited, non-exclusive license to:
          </p>
          <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
            <li>Process your images for virtual try-on and analysis</li>
            <li>Store your content to provide personalized recommendations</li>
            <li>Use aggregated, anonymized data to improve our AI models</li>
          </ul>

          <h3 className="text-xl font-semibold text-gray-800 mb-3">4.3 Content Guidelines</h3>
          <p className="text-gray-700 mb-4">
            You agree not to upload content that:
          </p>
          <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
            <li>Violates any laws or regulations</li>
            <li>Infringes on intellectual property rights</li>
            <li>Contains explicit, offensive, or harmful material</li>
            <li>Impersonates others or misrepresents your identity</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Acceptable Use</h2>
          <p className="text-gray-700 mb-4">
            You agree to use the Service only for lawful purposes. You must not:
          </p>
          <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
            <li>Attempt to gain unauthorized access to our systems</li>
            <li>Interfere with or disrupt the Service</li>
            <li>Use automated tools to access the Service without permission</li>
            <li>Reverse engineer or attempt to extract source code</li>
            <li>Use the Service for commercial purposes without authorization</li>
            <li>Harass, abuse, or harm other users</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. AI-Generated Recommendations</h2>
          
          <h3 className="text-xl font-semibold text-gray-800 mb-3">6.1 No Guarantees</h3>
          <p className="text-gray-700 mb-4">
            Our AI provides recommendations based on your preferences and data. However:
          </p>
          <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
            <li>Recommendations are suggestions, not professional advice</li>
            <li>Virtual try-on results are simulations and may not be 100% accurate</li>
            <li>Skin analysis is for informational purposes only, not medical diagnosis</li>
            <li>We do not guarantee the availability or accuracy of third-party products</li>
          </ul>

          <h3 className="text-xl font-semibold text-gray-800 mb-3">6.2 Third-Party Products</h3>
          <p className="text-gray-700 mb-4">
            We may recommend products from third-party retailers. We are not responsible for:
          </p>
          <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
            <li>Product quality, availability, or pricing</li>
            <li>Shipping, returns, or customer service</li>
            <li>Transactions between you and third-party sellers</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Privacy and Data Protection</h2>
          <p className="text-gray-700 mb-4">
            Your privacy is important to us. Please review our{" "}
            <a href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</a> to 
            understand how we collect, use, and protect your personal information.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Intellectual Property</h2>
          
          <h3 className="text-xl font-semibold text-gray-800 mb-3">8.1 Our Rights</h3>
          <p className="text-gray-700 mb-4">
            The Service, including its design, features, and AI models, is owned by Mirra AI and 
            protected by copyright, trademark, and other intellectual property laws.
          </p>

          <h3 className="text-xl font-semibold text-gray-800 mb-3">8.2 Trademarks</h3>
          <p className="text-gray-700 mb-4">
            "Mirra AI" and our logo are trademarks. You may not use them without our written permission.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Disclaimers</h2>
          <p className="text-gray-700 mb-4 uppercase font-semibold">
            THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND.
          </p>
          <p className="text-gray-700 mb-4">
            We disclaim all warranties, express or implied, including:
          </p>
          <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
            <li>Merchantability and fitness for a particular purpose</li>
            <li>Accuracy, reliability, or completeness of content</li>
            <li>Uninterrupted or error-free operation</li>
            <li>Security or freedom from viruses</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Limitation of Liability</h2>
          <p className="text-gray-700 mb-4 uppercase font-semibold">
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, MIRRA AI SHALL NOT BE LIABLE FOR ANY INDIRECT, 
            INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES.
          </p>
          <p className="text-gray-700 mb-4">
            This includes damages for:
          </p>
          <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
            <li>Loss of profits, data, or use</li>
            <li>Business interruption</li>
            <li>Personal injury or property damage</li>
            <li>Reliance on recommendations or content</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Indemnification</h2>
          <p className="text-gray-700 mb-4">
            You agree to indemnify and hold harmless Mirra AI from any claims, damages, or expenses 
            arising from:
          </p>
          <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
            <li>Your use of the Service</li>
            <li>Your violation of these Terms</li>
            <li>Your violation of any rights of another party</li>
            <li>Content you upload to the Service</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Termination</h2>
          
          <h3 className="text-xl font-semibold text-gray-800 mb-3">12.1 By You</h3>
          <p className="text-gray-700 mb-4">
            You may delete your account at any time through the app settings.
          </p>

          <h3 className="text-xl font-semibold text-gray-800 mb-3">12.2 By Us</h3>
          <p className="text-gray-700 mb-4">
            We may suspend or terminate your account if you:
          </p>
          <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
            <li>Violate these Terms</li>
            <li>Engage in fraudulent or illegal activity</li>
            <li>Abuse or misuse the Service</li>
            <li>Fail to pay any applicable fees</li>
          </ul>

          <h3 className="text-xl font-semibold text-gray-800 mb-3">12.3 Effect of Termination</h3>
          <p className="text-gray-700 mb-4">
            Upon termination, your right to use the Service will cease immediately. We will delete 
            your data according to our data retention policy.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Changes to Terms</h2>
          <p className="text-gray-700 mb-4">
            We may modify these Terms at any time. We will notify you of material changes by:
          </p>
          <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
            <li>Posting the updated Terms on this page</li>
            <li>Updating the "Last updated" date</li>
            <li>Sending you an email notification (if applicable)</li>
          </ul>
          <p className="text-gray-700 mb-4">
            Your continued use of the Service after changes constitutes acceptance of the new Terms.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">14. Governing Law</h2>
          <p className="text-gray-700 mb-4">
            These Terms are governed by the laws of the State of California, United States, without 
            regard to conflict of law principles.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">15. Dispute Resolution</h2>
          
          <h3 className="text-xl font-semibold text-gray-800 mb-3">15.1 Informal Resolution</h3>
          <p className="text-gray-700 mb-4">
            Before filing a claim, you agree to contact us to attempt to resolve the dispute informally.
          </p>

          <h3 className="text-xl font-semibold text-gray-800 mb-3">15.2 Arbitration</h3>
          <p className="text-gray-700 mb-4">
            Any disputes that cannot be resolved informally will be resolved through binding arbitration 
            in accordance with the rules of the American Arbitration Association.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">16. Miscellaneous</h2>
          
          <h3 className="text-xl font-semibold text-gray-800 mb-3">16.1 Entire Agreement</h3>
          <p className="text-gray-700 mb-4">
            These Terms constitute the entire agreement between you and Mirra AI regarding the Service.
          </p>

          <h3 className="text-xl font-semibold text-gray-800 mb-3">16.2 Severability</h3>
          <p className="text-gray-700 mb-4">
            If any provision of these Terms is found to be unenforceable, the remaining provisions 
            will remain in full effect.
          </p>

          <h3 className="text-xl font-semibold text-gray-800 mb-3">16.3 Waiver</h3>
          <p className="text-gray-700 mb-4">
            Our failure to enforce any right or provision of these Terms will not be considered a waiver.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">17. Contact Information</h2>
          <p className="text-gray-700 mb-4">
            If you have questions about these Terms, please contact us:
          </p>
          <ul className="list-none text-gray-700 space-y-2">
            <li>Email: <a href="mailto:legal@mirra-ai.com" className="text-blue-600 hover:underline">legal@mirra-ai.com</a></li>
            <li>Website: <a href="https://mirra-ai-ten.vercel.app" className="text-blue-600 hover:underline">https://mirra-ai-ten.vercel.app</a></li>
          </ul>
        </section>

        <div className="mt-12 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-600 text-center">
            © {new Date().getFullYear()} Mirra AI. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

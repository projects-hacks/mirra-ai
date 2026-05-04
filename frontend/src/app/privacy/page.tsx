import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Mirra AI",
  description: "Privacy policy for Mirra AI - Your personal AI fashion and beauty assistant",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white shadow-sm rounded-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Privacy Policy</h1>
        
        <p className="text-sm text-gray-600 mb-8">
          Last updated: {new Date().toLocaleDateString()}
        </p>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
          <p className="text-gray-700 mb-4">
            Welcome to Mirra AI ("we," "our," or "us"). We are committed to protecting your personal 
            information and your right to privacy. This Privacy Policy explains how we collect, use, 
            disclose, and safeguard your information when you use our application.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Information We Collect</h2>
          
          <h3 className="text-xl font-semibold text-gray-800 mb-3">2.1 Personal Information</h3>
          <p className="text-gray-700 mb-4">
            We collect information that you provide directly to us, including:
          </p>
          <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
            <li>Email address (via Google OAuth)</li>
            <li>Profile information (name, avatar)</li>
            <li>Location and timezone preferences</li>
            <li>Style preferences and measurements</li>
          </ul>

          <h3 className="text-xl font-semibold text-gray-800 mb-3">2.2 Photos and Images</h3>
          <p className="text-gray-700 mb-4">
            With your explicit consent, we collect and process:
          </p>
          <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
            <li>Selfies for skin analysis and virtual try-on features</li>
            <li>Photos of clothing items for your digital closet</li>
            <li>Outfit photos for style tracking</li>
          </ul>
          <p className="text-gray-700 mb-4">
            You can control whether we store your selfies in your privacy settings. 
            By default, we store images for 365 days to provide personalized recommendations.
          </p>

          <h3 className="text-xl font-semibold text-gray-800 mb-3">2.3 Usage Data</h3>
          <p className="text-gray-700 mb-4">
            We automatically collect certain information when you use our service:
          </p>
          <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
            <li>Device information and browser type</li>
            <li>IP address and location data</li>
            <li>Usage patterns and feature interactions</li>
            <li>Conversation history with the AI assistant</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. How We Use Your Information</h2>
          <p className="text-gray-700 mb-4">
            We use the information we collect to:
          </p>
          <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
            <li>Provide personalized fashion and beauty recommendations</li>
            <li>Perform skin analysis and virtual try-on features</li>
            <li>Manage your digital closet and outfit tracking</li>
            <li>Improve our AI models and service quality</li>
            <li>Send you notifications about your account (if enabled)</li>
            <li>Comply with legal obligations</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Data Sharing and Disclosure</h2>
          
          <h3 className="text-xl font-semibold text-gray-800 mb-3">4.1 Third-Party Services</h3>
          <p className="text-gray-700 mb-4">
            We use the following third-party services that may process your data:
          </p>
          <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
            <li><strong>Supabase:</strong> Database and authentication</li>
            <li><strong>Perfect Corp:</strong> Virtual try-on and skin analysis</li>
            <li><strong>Google Calendar:</strong> Calendar integration (optional)</li>
            <li><strong>Deepgram:</strong> Voice processing</li>
            <li><strong>OpenAI/Anthropic:</strong> AI conversation and recommendations</li>
          </ul>

          <h3 className="text-xl font-semibold text-gray-800 mb-3">4.2 We Do Not Sell Your Data</h3>
          <p className="text-gray-700 mb-4">
            We do not sell, rent, or trade your personal information to third parties for marketing purposes.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Data Security</h2>
          <p className="text-gray-700 mb-4">
            We implement appropriate technical and organizational measures to protect your personal information:
          </p>
          <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
            <li>Encryption in transit (HTTPS/TLS)</li>
            <li>Encryption at rest for sensitive data</li>
            <li>Row-level security in our database</li>
            <li>Regular security audits and updates</li>
            <li>Access controls and authentication</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Your Privacy Rights</h2>
          <p className="text-gray-700 mb-4">
            You have the right to:
          </p>
          <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
            <li><strong>Access:</strong> Request a copy of your personal data</li>
            <li><strong>Correction:</strong> Update or correct your information</li>
            <li><strong>Deletion:</strong> Request deletion of your account and data</li>
            <li><strong>Portability:</strong> Export your data in a machine-readable format</li>
            <li><strong>Opt-out:</strong> Disable notifications or data collection features</li>
          </ul>
          <p className="text-gray-700 mb-4">
            To exercise these rights, contact us at: <a href="mailto:privacy@mirra-ai.com" className="text-blue-600 hover:underline">privacy@mirra-ai.com</a>
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Data Retention</h2>
          <p className="text-gray-700 mb-4">
            We retain your personal information for as long as necessary to provide our services:
          </p>
          <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
            <li>Account data: Until you delete your account</li>
            <li>Selfies: 365 days by default (configurable in settings)</li>
            <li>Voice recordings: Not stored (processed in real-time only)</li>
            <li>Conversation history: Until you delete your account</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Children's Privacy</h2>
          <p className="text-gray-700 mb-4">
            Our service is not intended for users under 13 years of age. We do not knowingly collect 
            personal information from children under 13. If you believe we have collected information 
            from a child under 13, please contact us immediately.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. International Data Transfers</h2>
          <p className="text-gray-700 mb-4">
            Your information may be transferred to and processed in countries other than your country 
            of residence. We ensure appropriate safeguards are in place to protect your data in 
            accordance with this Privacy Policy.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Changes to This Policy</h2>
          <p className="text-gray-700 mb-4">
            We may update this Privacy Policy from time to time. We will notify you of any changes by 
            posting the new Privacy Policy on this page and updating the "Last updated" date.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Contact Us</h2>
          <p className="text-gray-700 mb-4">
            If you have questions about this Privacy Policy, please contact us:
          </p>
          <ul className="list-none text-gray-700 space-y-2">
            <li>Email: <a href="mailto:privacy@mirra-ai.com" className="text-blue-600 hover:underline">privacy@mirra-ai.com</a></li>
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

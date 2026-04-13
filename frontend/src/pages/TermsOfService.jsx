import { Link } from 'react-router-dom';
import { DocumentTextIcon } from '@heroicons/react/24/outline';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
              <DocumentTextIcon className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-navy">GovProposal <span className="text-accent">AI</span></span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link to="/privacy-policy" className="text-gray-500 hover:text-navy transition-colors">Privacy Policy</Link>
            <Link to="/login" className="text-accent hover:text-accent-dark font-medium transition-colors">Sign In</Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 md:p-12">
          <h1 className="text-3xl font-bold text-navy mb-2">Terms and Conditions</h1>
          <p className="text-sm text-gray-400 mb-8">Last Updated: March 28, 2025</p>

          <div className="prose prose-gray max-w-none space-y-6 text-gray-700 text-[15px] leading-relaxed">
            <section>
              <h2 className="text-xl font-semibold text-navy mt-8 mb-3">Acceptance of Terms</h2>
              <p>By accessing, registering for, or using govproai.ai, you acknowledge that you have read, understood, and agree to be bound by these Terms.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-navy mt-8 mb-3">Definitions</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Content:</strong> Any data, text, files, information, software, graphics, or other materials that users submit, upload, or display while using the Service.</li>
                <li><strong>GovProAI:</strong> The RAG (Retrieval-Augmented Generation) software service provided through govproai.ai.</li>
                <li><strong>User:</strong> Any individual or entity that accesses or uses the Service.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-navy mt-8 mb-3">License Grant</h2>
              <p>Subject to your compliance with these Terms, we grant you a limited, non-exclusive, non-transferable, non-sublicensable license to access and use the Service for your internal business purposes.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-navy mt-8 mb-3">User Accounts</h2>
              <p>You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account or any other breach of security.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-navy mt-8 mb-3">User Content</h2>
              <p>You retain all rights to any Content you submit, upload, or display while using govproai.ai. By submitting Content, you grant us a worldwide, non-exclusive, royalty-free license to use, reproduce, modify, adapt, publish, and display such Content solely for the purpose of providing and improving the Service.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-navy mt-8 mb-3">Prohibited Uses</h2>
              <p>You agree not to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Disable, overburden, damage, or impair the Service</li>
                <li>Use any automated means to access the Service without our prior written consent</li>
                <li>Introduce any viruses, trojan horses, worms, or other malicious software</li>
                <li>Attempt to gain unauthorized access to any portion of the Service</li>
                <li>Use the Service for any illegal or unauthorized purpose</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-navy mt-8 mb-3">Intellectual Property Rights</h2>
              <p>The Service and its original content (excluding Content provided by users), features, and functionality are and will remain the exclusive property of Ever Diligent Consulting, LLC. The Service is protected by copyright, trademark, and other laws of both the United States and foreign countries.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-navy mt-8 mb-3">Disclaimer of Warranties</h2>
              <p className="uppercase font-medium text-sm">THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS, WITHOUT ANY WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-navy mt-8 mb-3">Limitation of Liability</h2>
              <p>In no event shall Ever Diligent Consulting, LLC, its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the Service.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-navy mt-8 mb-3">Indemnification</h2>
              <p>You agree to defend, indemnify, and hold harmless Ever Diligent Consulting, LLC and its licensees and licensors, and their employees, contractors, agents, officers, and directors, from and against any and all claims, damages, obligations, losses, liabilities, costs or debt, and expenses arising from your use of and access to the Service or your violation of these Terms.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-navy mt-8 mb-3">Termination</h2>
              <p>We may terminate or suspend your account and access to the Service immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever and without limitation, including but not limited to a breach of the Terms.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-navy mt-8 mb-3">Privacy and Security</h2>
              <p>Your use of the Service is also governed by our <Link to="/privacy-policy" className="text-accent hover:underline">Privacy Policy</Link>. While we implement reasonable security measures, no method of transmission over the Internet or method of electronic storage is 100% secure.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-navy mt-8 mb-3">Governing Law</h2>
              <p>These Terms shall be governed and construed in accordance with the laws of the United States, without regard to its conflict of law provisions. Any legal action or proceeding shall be brought exclusively in the federal or state courts located in the jurisdiction where Ever Diligent Consulting, LLC is headquartered.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-navy mt-8 mb-3">Changes to Terms</h2>
              <p>We reserve the right, at our sole discretion, to modify or replace these Terms at any time. We will provide notice of any changes by posting the new Terms on the Service. Your continued use of the Service after any such changes constitutes your acceptance of the new Terms.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-navy mt-8 mb-3">Severability</h2>
              <p>If any provision of these Terms is held to be invalid or unenforceable by a court, the remaining provisions of these Terms will remain in effect.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-navy mt-8 mb-3">Contact Information</h2>
              <p>If you have any questions about these Terms, please contact us at <a href="https://everdiligentconsulting.io" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">everdiligentconsulting.io</a>.</p>
            </section>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-400">
          <p>&copy; {new Date().getFullYear()} GovProposal AI. All rights reserved.</p>
          <div className="flex items-center justify-center gap-4 mt-2">
            <Link to="/terms-of-service" className="text-gray-400 hover:text-navy transition-colors">Terms of Service</Link>
            <span>&middot;</span>
            <Link to="/privacy-policy" className="text-gray-400 hover:text-navy transition-colors">Privacy Policy</Link>
          </div>
        </div>
      </main>
    </div>
  );
}

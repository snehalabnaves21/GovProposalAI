import { Link } from 'react-router-dom';
import { DocumentTextIcon } from '@heroicons/react/24/outline';

export default function PrivacyPolicy() {
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
            <Link to="/terms-of-service" className="text-gray-500 hover:text-navy transition-colors">Terms of Service</Link>
            <Link to="/login" className="text-accent hover:text-accent-dark font-medium transition-colors">Sign In</Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 md:p-12">
          <h1 className="text-3xl font-bold text-navy mb-2">Privacy Policy</h1>
          <p className="text-sm text-gray-400 mb-8">Last Updated: March 28, 2025</p>

          <div className="prose prose-gray max-w-none space-y-6 text-gray-700 text-[15px] leading-relaxed">
            <section>
              <h2 className="text-xl font-semibold text-navy mt-8 mb-3">Introduction</h2>
              <p>This Privacy Policy explains how Ever Diligent Consulting, LLC ("we," "us," or "our") collects, uses, stores, protects, and shares the personal information of users ("you" or "users") of our govproai.ai service ("Service").</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-navy mt-8 mb-3">Definitions</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Personal Information:</strong> Information that identifies or can be used to identify an individual.</li>
                <li><strong>Service:</strong> The govproai.ai application provided by Ever Diligent Consulting, LLC.</li>
                <li><strong>User:</strong> Any individual or entity that accesses or uses the Service.</li>
                <li><strong>Content:</strong> Any data, text, files, information, software, graphics, or other materials that users submit.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-navy mt-8 mb-3">Information We Collect</h2>

              <h3 className="text-lg font-medium text-navy mt-6 mb-2">Personal Information Provided by You</h3>
              <ul className="list-disc pl-6 space-y-1">
                <li>Account information (name, email address, username, password)</li>
                <li>Contact information (phone number, address, billing details)</li>
                <li>Payment information (credit card details, billing address)</li>
                <li>Profile information (profile picture, job title, company name)</li>
                <li>Content uploaded (documents, queries, feedback)</li>
              </ul>

              <h3 className="text-lg font-medium text-navy mt-6 mb-2">Information Collected Automatically</h3>
              <ul className="list-disc pl-6 space-y-1">
                <li>Usage data (interaction patterns with the Service)</li>
                <li>Device information (IP address, browser type, operating system)</li>
                <li>Location information (based on IP address)</li>
                <li>Log data (access times, pages viewed, session duration)</li>
                <li>Performance data (crash reports, system activity)</li>
              </ul>

              <h3 className="text-lg font-medium text-navy mt-6 mb-2">Information From Third Parties</h3>
              <ul className="list-disc pl-6 space-y-1">
                <li>Data from connected services you authorize</li>
                <li>Information from business partners and vendors</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-navy mt-8 mb-3">How We Collect Your Information</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>Directly from you when you register, submit content, or communicate with us</li>
                <li>Automatically as you navigate and interact with the Service</li>
                <li>From third-party services with your consent</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-navy mt-8 mb-3">How We Use Your Information</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>Providing, maintaining, and improving the Service</li>
                <li>Processing transactions and managing your account</li>
                <li>Responding to your inquiries and providing customer support</li>
                <li>Sending technical notices, updates, and security alerts</li>
                <li>Monitoring usage patterns and analyzing trends</li>
                <li>Developing new products, services, and features</li>
                <li>Preventing fraud and enhancing security</li>
                <li>Complying with legal obligations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-navy mt-8 mb-3">Legal Basis for Processing</h2>
              <p>For users in the European Economic Area (EEA), we process personal information under the following legal bases:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Performance of a contract with you</li>
                <li>Your consent</li>
                <li>Our legitimate business interests</li>
                <li>Compliance with legal obligations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-navy mt-8 mb-3">Data Sharing and Disclosure</h2>
              <p>We may share your information in the following situations:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Service Providers:</strong> Third-party vendors, service providers, and contractors who perform services on our behalf.</li>
                <li><strong>Business Transfers:</strong> Your information may be transferred during mergers, acquisitions, financing negotiations, or asset sales.</li>
                <li><strong>Legal Requirements:</strong> We may disclose your information if required to do so by law or in response to valid requests by public authorities.</li>
                <li><strong>With Your Consent:</strong> We may share your information when you provide explicit consent.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-navy mt-8 mb-3">Data Security</h2>
              <p>We implement appropriate technical and organizational measures to protect your personal information from unauthorized access, disclosure, alteration, or destruction. However, no method of transmission over the Internet or method of electronic storage is 100% secure, and we cannot guarantee absolute security.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-navy mt-8 mb-3">Data Retention</h2>
              <p>We will retain your personal information only for as long as necessary to fulfill the purposes for which it was collected, including to comply with legal obligations, resolve disputes, and enforce our agreements.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-navy mt-8 mb-3">Your Rights and Choices</h2>

              <h3 className="text-lg font-medium text-navy mt-6 mb-2">For EEA Users</h3>
              <ul className="list-disc pl-6 space-y-1">
                <li>Right to access your personal information</li>
                <li>Right to rectify inaccurate information</li>
                <li>Right to erasure ("right to be forgotten")</li>
                <li>Right to restrict processing</li>
                <li>Right to data portability</li>
                <li>Right to object to processing</li>
                <li>Right to withdraw consent</li>
                <li>Right to lodge a complaint with a supervisory authority</li>
              </ul>

              <h3 className="text-lg font-medium text-navy mt-6 mb-2">For California Residents (CCPA)</h3>
              <ul className="list-disc pl-6 space-y-1">
                <li>Know what personal information is collected, used, disclosed, or sold</li>
                <li>Request deletion of personal information</li>
                <li>Opt-out of the sale of personal information</li>
                <li>Non-discrimination for exercising your rights</li>
              </ul>
              <p className="mt-3">To exercise any of these rights, please contact us using the contact information provided at the end of this Privacy Policy.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-navy mt-8 mb-3">Cookies and Tracking Technologies</h2>
              <p>We use cookies and similar tracking technologies to collect information about your activities on our Service. Cookies are small data files stored on your device that help us improve our Service and your experience. You can control cookies through your browser settings, though blocking cookies may limit certain features.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-navy mt-8 mb-3">Children's Privacy</h2>
              <p>Our Service is not directed to children under the age of 13, and we do not knowingly collect personal information from children under 13. If we learn that we have collected personal information from a child under 13, we will promptly delete that information.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-navy mt-8 mb-3">International Data Transfers</h2>
              <p>We are based in the United States and process information on servers located in the United States and other countries. If you are located outside the United States, please be aware that your information may be transferred to, stored, and processed in a country where data protection laws may differ from those in your jurisdiction.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-navy mt-8 mb-3">Changes to This Privacy Policy</h2>
              <p>We may update this Privacy Policy from time to time to reflect changes in our practices or for other operational, legal, or regulatory reasons. We will notify you of any material changes by posting the new Privacy Policy on this page and updating the "Last Updated" date. Your continued use of the Service after such modifications will constitute your acknowledgment of the modified Privacy Policy and agreement to abide and be bound by it.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-navy mt-8 mb-3">Contact Us</h2>
              <p>If you have any questions, concerns, or requests regarding this Privacy Policy or our privacy practices, please contact Ever Diligent Consulting, LLC at <a href="https://everdiligentconsulting.io" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">everdiligentconsulting.io</a>.</p>
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

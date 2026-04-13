import { Link } from 'react-router-dom';
import {
  DocumentTextIcon,
  SparklesIcon,
  MagnifyingGlassIcon,
  CurrencyDollarIcon,
  ShieldCheckIcon,
  ClockIcon,
  ChartBarIcon,
  UserGroupIcon,
  ArrowRightIcon,
  CheckIcon,
  DocumentMagnifyingGlassIcon,
  BriefcaseIcon,
  PaintBrushIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';

const features = [
  {
    icon: DocumentMagnifyingGlassIcon,
    title: 'RFP Deconstructor',
    description:
      'Upload any solicitation PDF — AI extracts requirements, evaluation criteria, FAR clauses, compliance items, and key dates instantly.',
    badge: 'NEW',
  },
  {
    icon: SparklesIcon,
    title: 'AI Proposal Writing',
    description:
      'Generate professional proposal sections in seconds using AI trained on FAR-compliant government proposals. Rewrite any section with one click.',
  },
  {
    icon: MagnifyingGlassIcon,
    title: 'Opportunity Scanner',
    description:
      'Search SAM.gov for active federal contract opportunities by keyword, NAICS code, or agency. Market research with competitor analysis.',
  },
  {
    icon: CurrencyDollarIcon,
    title: 'Pricing & Cost Analysis',
    description:
      'Interactive pricing builder with labor categories, ODCs, and auto-totals. Import rates from market research with one click.',
  },
  {
    icon: ShieldCheckIcon,
    title: 'Compliance Matrix',
    description:
      'Maps requirements to FAR/DFARS clauses automatically. Every section follows FAR Part 15, NIST 800-171, and CMMC standards.',
  },
  {
    icon: BriefcaseIcon,
    title: 'Contract Management',
    description:
      'Track awarded contracts post-award — deliverables, deadlines, status, and progress all in one Kanban-style dashboard.',
    badge: 'NEW',
  },
  {
    icon: PaintBrushIcon,
    title: 'Canva-Like Editor',
    description:
      'Drag-drop section reordering, per-section styling, chart insertion, templates, and duplicate sections — design proposals your way.',
  },
  {
    icon: ChartBarIcon,
    title: 'Export & Share',
    description:
      'One-click PDF & DOCX export with page breaks. Share proposals via secure links with clients or team members.',
  },
];

const steps = [
  {
    number: '01',
    title: 'Upload Your RFP',
    description: 'Upload the solicitation PDF. AI instantly deconstructs it into requirements, compliance items, evaluation criteria, and key dates.',
  },
  {
    number: '02',
    title: 'Set Up & Search',
    description: 'Enter your vendor profile once. Search SAM.gov for opportunities or use the extracted RFP data to auto-fill proposal details.',
  },
  {
    number: '03',
    title: 'Generate & Customize',
    description: 'AI writes all 18 sections. Drag-drop reorder, per-section styling, insert charts, apply templates — make it yours.',
  },
  {
    number: '04',
    title: 'Export & Win',
    description: 'Export as PDF or DOCX with page breaks. Share via secure links. Track awarded contracts in the Contract Manager.',
  },
];

const pricingPlans = [
  {
    name: 'Starter',
    price: '$999',
    period: '/month',
    cancelNote: 'Cancel anytime',
    description: 'Single user, perfect for getting started',
    features: [
      '1 user account',
      '2 proposals per month',
      'SAM.gov & USASpending.gov search',
      'All 18 proposal sections',
      'PDF export',
      'Image uploads in proposals',
      'Email support',
    ],
    cta: 'Get Started',
    highlighted: false,
  },
  {
    name: 'Professional',
    price: '$2,999',
    period: '/month',
    cancelNote: 'Cancel anytime',
    description: 'For growing teams and contractors',
    features: [
      '2 user accounts',
      '5 proposals per user/month',
      'All 18 proposal sections',
      'Interactive pricing builder',
      'PDF & DOCX export',
      'Template library (8+ templates)',
      'Priority AI generation',
      'Multi-source opportunity search',
      'Market Research & Pricing Intelligence',
      'Dedicated account manager',
    ],
    cta: 'Get Started',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For large teams and agencies',
    features: [
      'Everything in Professional',
      'Unlimited users & proposals',
      'Custom templates & branding',
      'API access',
      'Dedicated support & onboarding',
      'SSO / SAML integration',
      'Custom integrations',
    ],
    cta: 'Contact Sales',
    highlighted: false,
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 bg-white/90 backdrop-blur-md border-b border-gray-100 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-accent rounded-lg p-1.5">
              <DocumentTextIcon className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-navy">
              GovProposal <span className="text-accent">AI</span>
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-gray-600 hover:text-navy transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="text-sm font-medium text-gray-600 hover:text-navy transition-colors">
              How It Works
            </a>
            <a href="#pricing" className="text-sm font-medium text-gray-600 hover:text-navy transition-colors">
              Pricing
            </a>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm font-medium text-navy hover:text-navy-light transition-colors no-underline"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="bg-accent hover:bg-accent-dark text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm hover:shadow-md no-underline"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-accent/10 text-accent px-4 py-1.5 rounded-full text-sm font-medium mb-6">
            <SparklesIcon className="w-4 h-4" />
            AI-Powered Government Proposals
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold text-navy leading-tight mb-6">
            Win Federal Contracts
            <br />
            <span className="text-accent">10x Faster</span>
          </h1>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            Generate FAR-compliant government proposals in minutes, not weeks.
            AI writes professional content while you focus on winning the contract.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="flex items-center gap-2 bg-accent hover:bg-accent-dark text-white px-8 py-4 rounded-xl text-base font-semibold transition-all shadow-lg hover:shadow-xl no-underline"
            >
              Start Writing Proposals
              <ArrowRightIcon className="w-5 h-5" />
            </Link>
            <a
              href="#how-it-works"
              className="flex items-center gap-2 text-navy hover:text-navy-light px-8 py-4 rounded-xl text-base font-semibold border-2 border-gray-200 hover:border-gray-300 transition-all no-underline"
            >
              See How It Works
            </a>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto">
            {[
              { value: '18', label: 'Proposal Sections' },
              { value: '8+', label: 'Templates' },
              { value: '<2min', label: 'Generation Time' },
              { value: '100%', label: 'FAR Compliant' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl font-extrabold text-navy">{stat.value}</p>
                <p className="text-sm text-gray-400 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-6 bg-bg">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-navy mb-4">
              Everything You Need to Win
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              From opportunity discovery to proposal submission — one platform to handle it all.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md hover:border-accent/20 transition-all relative"
                >
                  {feature.badge && (
                    <span className="absolute top-4 right-4 bg-accent text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {feature.badge}
                    </span>
                  )}
                  <div className="w-11 h-11 bg-accent/10 rounded-xl flex items-center justify-center mb-4">
                    <Icon className="w-5.5 h-5.5 text-accent" />
                  </div>
                  <h3 className="text-base font-bold text-navy mb-2">{feature.title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-navy mb-4">
              Four Steps to Your Proposal
            </h2>
            <p className="text-lg text-gray-500">
              From zero to a professional government proposal in minutes.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {steps.map((step) => (
              <div
                key={step.number}
                className="flex gap-5 p-6 rounded-2xl border border-gray-100 bg-white hover:border-accent/30 transition-all"
              >
                <div className="flex-shrink-0 w-14 h-14 bg-navy rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-lg">{step.number}</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-navy mb-1">{step.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust / Security Bar */}
      <section className="py-12 px-6 bg-navy">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { icon: LockClosedIcon, label: 'AES-256 Encryption', sub: 'Data at rest & in transit' },
              { icon: ShieldCheckIcon, label: 'FAR Compliant', sub: 'Parts 12, 15, 52 & DFARS' },
              { icon: DocumentTextIcon, label: 'Secure AI', sub: 'Your data stays private' },
              { icon: UserGroupIcon, label: 'Multi-Tenant', sub: 'Isolated user accounts' },
            ].map((item) => (
              <div key={item.label} className="flex flex-col items-center">
                <item.icon className="w-8 h-8 text-accent mb-2" />
                <p className="text-sm font-semibold text-white">{item.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{item.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-6 bg-bg">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-navy mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-lg text-gray-500">
              Start free. Upgrade when you are ready to scale.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricingPlans.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl p-8 border-2 transition-all ${
                  plan.highlighted
                    ? 'border-accent bg-white shadow-xl scale-105'
                    : 'border-gray-100 bg-white shadow-sm'
                }`}
              >
                {plan.highlighted && (
                  <div className="text-center mb-4">
                    <span className="bg-accent text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                      Most Popular
                    </span>
                  </div>
                )}
                <h3 className="text-xl font-bold text-navy">{plan.name}</h3>
                <p className="text-sm text-gray-400 mt-1 mb-4">{plan.description}</p>
                <div className="mb-2">
                  <span className="text-4xl font-extrabold text-navy">{plan.price}</span>
                  {plan.period && (
                    <span className="text-gray-400 text-base">{plan.period}</span>
                  )}
                </div>
                {plan.cancelNote ? (
                  <p className="text-xs text-accent font-medium mb-5">{plan.cancelNote}</p>
                ) : (
                  <div className="mb-5" />
                )}
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-gray-600">
                      <CheckIcon className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/register"
                  className={`block text-center py-3 rounded-xl font-semibold text-sm transition-all no-underline ${
                    plan.highlighted
                      ? 'bg-accent hover:bg-accent-dark text-white shadow-md'
                      : 'bg-navy/5 hover:bg-navy/10 text-navy'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-navy rounded-3xl p-12 md:p-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to Win More Contracts?
            </h2>
            <p className="text-lg text-gray-300 mb-8 max-w-xl mx-auto">
              Join government contractors who use AI to write better proposals faster.
              Start for free — no credit card required.
            </p>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 bg-accent hover:bg-accent-dark text-white px-8 py-4 rounded-xl text-base font-semibold transition-all shadow-lg no-underline"
            >
              Get Started Free
              <ArrowRightIcon className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-navy-dark py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="bg-accent rounded-lg p-1.5">
                <DocumentTextIcon className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-white">
                GovProposal <span className="text-accent">AI</span>
              </span>
            </div>
            <div className="flex items-center gap-6">
              <a href="#features" className="text-sm text-gray-400 hover:text-white transition-colors no-underline">
                Features
              </a>
              <a href="#how-it-works" className="text-sm text-gray-400 hover:text-white transition-colors no-underline">
                How It Works
              </a>
              <a href="#pricing" className="text-sm text-gray-400 hover:text-white transition-colors no-underline">
                Pricing
              </a>
              <Link to="/login" className="text-sm text-gray-400 hover:text-white transition-colors no-underline">
                Sign In
              </Link>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-8 pt-8 text-center">
            <div className="flex items-center justify-center gap-4 mb-3">
              <Link to="/terms-of-service" className="text-sm text-gray-500 hover:text-white transition-colors no-underline">Terms of Service</Link>
              <span className="text-gray-600">&middot;</span>
              <Link to="/privacy-policy" className="text-sm text-gray-500 hover:text-white transition-colors no-underline">Privacy Policy</Link>
            </div>
            <p className="text-sm text-gray-500">
              &copy; {new Date().getFullYear()} GovProposal AI. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

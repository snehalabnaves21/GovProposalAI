import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  UserCircleIcon,
  DocumentTextIcon,
  ListBulletIcon,
  CheckIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  SparklesIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import api from '../services/api';
import NaicsCodeSelector from '../components/NaicsCodeSelector';

const setAsideOptions = [
  'Full & Open Competition',
  'Total Small Business Set-Aside',
  '8(a) Competitive',
  '8(a) Sole Source',
  'HUBZone Set-Aside',
  'SDVOSB Set-Aside',
  'WOSB Set-Aside',
  'EDWOSB Set-Aside',
];

const contractTypeOptions = [
  'Firm-Fixed-Price (FFP)',
  'Time-and-Materials (T&M)',
  'Labor-Hour (LH)',
  'Cost-Plus-Fixed-Fee (CPFF)',
  'Cost-Plus-Incentive-Fee (CPIF)',
  'IDIQ',
];

const proposalSections = [
  { key: 'cover_page', label: 'Cover Page' },
  { key: 'executive_summary', label: 'Executive Summary' },
  { key: 'vendor_profile', label: 'Vendor Profile' },
  { key: 'socioeconomic_status', label: 'Socioeconomic Status' },
  { key: 'capability_statement', label: 'Capability Statement' },
  { key: 'past_performance', label: 'Past Performance' },
  { key: 'technical_approach', label: 'Technical Approach' },
  { key: 'management_approach', label: 'Management Approach' },
  { key: 'staffing_plan', label: 'Staffing Plan' },
  { key: 'key_personnel', label: 'Key Personnel / Resumes' },
  { key: 'cost_price_proposal', label: 'Cost / Price Proposal' },
  { key: 'quality_assurance', label: 'Quality Assurance Plan' },
  { key: 'risk_mitigation', label: 'Risk Mitigation Plan' },
  { key: 'transition_plan', label: 'Transition / Phase-In Plan' },
  { key: 'subcontracting_plan', label: 'Small Business Subcontracting Plan' },
  { key: 'compliance_matrix', label: 'Compliance Matrix' },
  { key: 'implementation_timeline', label: 'Implementation Timeline' },
  { key: 'compliance_checklist', label: 'Compliance Checklist' },
];

const steps = [
  { number: 1, label: 'Vendor Profile', icon: UserCircleIcon },
  { number: 2, label: 'Opportunity Details', icon: DocumentTextIcon },
  { number: 3, label: 'Sections & Generate', icon: ListBulletIcon },
];

export default function ProposalGenerator() {
  const location = useLocation();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [error, setError] = useState('');

  // Step 1 — Vendor profile
  const [useExisting, setUseExisting] = useState(true);
  const [vendorLoading, setVendorLoading] = useState(false);
  const [vendor, setVendor] = useState({
    company_name: '',
    cage_code: '',
    duns_number: '',
    naics_codes: [],
    capabilities: '',
    past_performance: '',
    socioeconomic_status: 'Small Business',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    contact_address: '',
    // Extended fields from Vendor Profile page
    ein_tin: '',
    about_company: '',
    capability_statement: '',
    organizational_type: '',
    years_in_business: '',
    number_of_employees: '',
    annual_revenue: '',
    security_clearance_level: '',
    business_classifications: [],
    certifications: [],
    contract_vehicles: [],
    management_team: [],
    executive_team: [],
    past_performances: [],
    capability_examples: [],
  });

  // Step 2 — Opportunity
  const [opportunity, setOpportunity] = useState({
    title: '',
    solicitation_number: '',
    agency: '',
    contracting_office: '',
    set_aside_type: 'Full & Open Competition',
    contract_type: 'Firm-Fixed-Price (FFP)',
    naics_code: '',
    place_of_performance: '',
    period_of_performance: '',
    estimated_value: '',
    description: '',
    requirements: '',
    evaluation_criteria: '',
    // New fields from flow docs
    proposal_type: 'Technical & Management Proposal',
    submission_date: '',
    poc_name: '',
    poc_title: '',
    poc_email: '',
    poc_phone: '',
    poc_division: '',
  });

  const proposalTypeOptions = [
    'Technical & Management Proposal',
    'Technical Proposal',
    'Management Proposal',
    'Volume I: Technical Proposal',
    'Volume II: Management Proposal',
    'Volume III: Price Proposal',
  ];

  // Step 3 — Selected sections
  const [selectedSections, setSelectedSections] = useState(
    proposalSections.map((s) => s.key)
  );

  // Load saved vendor profile — try backend API first, fallback to localStorage
  useEffect(() => {
    if (!useExisting) return;

    const loadProfile = async () => {
      setVendorLoading(true);
      try {
        // Try fetching from backend API first
        const res = await api.get('/api/vendor-profiles');
        if (res.data?.profiles?.length > 0) {
          const p = res.data.profiles[0]; // most recent profile
          const mapped = {
            company_name: p.company_name || '',
            cage_code: p.cage_code || '',
            duns_number: p.duns_number || '',
            naics_codes: Array.isArray(p.naics_codes) ? p.naics_codes : [],
            capabilities: p.capabilities || '',
            past_performance: p.past_performance || '',
            socioeconomic_status: p.socioeconomic_status || 'Small Business',
            contact_name: p.contact_info?.name || '',
            contact_email: p.contact_info?.email || '',
            contact_phone: p.contact_info?.phone || '',
            contact_address: p.contact_info?.address || '',
          };
          setVendor((prev) => ({ ...prev, ...mapped }));
          setVendorLoading(false);

          // Also try loading extended fields from localStorage (richer data)
          const saved = localStorage.getItem('vendorProfile');
          if (saved) {
            try {
              const parsed = JSON.parse(saved);
              if (typeof parsed.naics_codes === 'string') {
                parsed.naics_codes = parsed.naics_codes.split(',').map((c) => c.trim()).filter(Boolean);
              }
              // Merge extended fields that backend doesn't store
              setVendor((prev) => ({
                ...prev,
                ein_tin: parsed.ein_tin || prev.ein_tin,
                about_company: parsed.about_company || prev.about_company,
                capability_statement: parsed.capability_statement || prev.capability_statement,
                organizational_type: parsed.organizational_type || prev.organizational_type,
                years_in_business: parsed.years_in_business || prev.years_in_business,
                number_of_employees: parsed.number_of_employees || prev.number_of_employees,
                annual_revenue: parsed.annual_revenue || prev.annual_revenue,
                security_clearance_level: parsed.security_clearance_level || prev.security_clearance_level,
                business_classifications: parsed.business_classifications || prev.business_classifications,
                certifications: parsed.certifications || prev.certifications,
                contract_vehicles: parsed.contract_vehicles || prev.contract_vehicles,
                management_team: parsed.management_team || prev.management_team,
                executive_team: parsed.executive_team || prev.executive_team,
                past_performances: parsed.past_performances || prev.past_performances,
                capability_examples: parsed.capability_examples || prev.capability_examples,
              }));
            } catch { /* ignore */ }
          }
          return;
        }
      } catch {
        // API not available, fall through to localStorage
      }

      // Fallback: load from localStorage
      const saved = localStorage.getItem('vendorProfile');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (typeof parsed.naics_codes === 'string') {
            parsed.naics_codes = parsed.naics_codes.split(',').map((c) => c.trim()).filter(Boolean);
          }
          setVendor((prev) => ({ ...prev, ...parsed }));
        } catch { /* ignore */ }
      }
      setVendorLoading(false);
    };

    loadProfile();
  }, [useExisting]);

  // Auto-fill opportunity from navigation state (from opportunity search)
  useEffect(() => {
    if (location.state?.opportunity) {
      const opp = location.state.opportunity;
      setOpportunity((prev) => ({
        ...prev,
        title: opp.title || '',
        solicitation_number: opp.notice_id || opp.solicitation_number || '',
        agency: opp.agency || '',
        description: opp.description || '',
        requirements: opp.requirements || '',
        naics_code: opp.naics_code || '',
        period_of_performance: opp.due_date || '',
        contract_type: opp.type || prev.contract_type,
      }));
      setCurrentStep(2);
    }
  }, [location.state]);

  // Auto-fill from RFP Deconstructor data (stored in localStorage)
  useEffect(() => {
    try {
      const rfpData = localStorage.getItem('rfp_deconstruct_data');
      if (!rfpData) return;
      const parsed = JSON.parse(rfpData);
      localStorage.removeItem('rfp_deconstruct_data');

      // Build requirements text from extracted requirements
      const reqText = (parsed.requirements || [])
        .map((r) => `[${r.priority || 'N/A'}] ${r.requirement}`)
        .join('\n');

      // Build evaluation criteria text
      const evalText = (parsed.evaluation_criteria || [])
        .map((e) => `${e.factor}${e.weight ? ` (${e.weight})` : ''}: ${e.description}`)
        .join('\n');

      // Build description from summary + compliance items
      let desc = parsed.summary || '';
      if (parsed.compliance_items?.length > 0) {
        desc += '\n\nCompliance Requirements:\n' +
          parsed.compliance_items.map((c) => `- ${c.clause}: ${c.title} — ${c.action_required}`).join('\n');
      }
      if (parsed.key_dates?.length > 0) {
        desc += '\n\nKey Dates:\n' +
          parsed.key_dates.map((d) => `- ${d.event}: ${d.date}`).join('\n');
      }

      // Match contract type to our dropdown options
      const ctMap = {
        'FFP': 'Firm-Fixed-Price (FFP)',
        'T&M': 'Time-and-Materials (T&M)',
        'LH': 'Labor-Hour (LH)',
        'CPFF': 'Cost-Plus-Fixed-Fee (CPFF)',
        'CPIF': 'Cost-Plus-Incentive-Fee (CPIF)',
        'IDIQ': 'IDIQ',
      };
      const matchedCt = parsed.contract_type
        ? Object.entries(ctMap).find(([k]) => (parsed.contract_type || '').toUpperCase().includes(k))?.[1]
        : null;

      // Match set-aside type
      const saMap = {
        'small business': 'Total Small Business Set-Aside',
        '8(a)': '8(a) Competitive',
        'hubzone': 'HUBZone Set-Aside',
        'sdvosb': 'SDVOSB Set-Aside',
        'wosb': 'WOSB Set-Aside',
        'edwosb': 'EDWOSB Set-Aside',
      };
      const matchedSa = parsed.set_aside
        ? Object.entries(saMap).find(([k]) => (parsed.set_aside || '').toLowerCase().includes(k))?.[1]
        : null;

      setOpportunity((prev) => ({
        ...prev,
        title: parsed.title || prev.title,
        solicitation_number: parsed.solicitation_number || prev.solicitation_number,
        agency: parsed.agency || prev.agency,
        naics_code: parsed.naics_code || prev.naics_code,
        set_aside_type: matchedSa || prev.set_aside_type,
        contract_type: matchedCt || prev.contract_type,
        estimated_value: parsed.estimated_value || prev.estimated_value,
        period_of_performance: parsed.period_of_performance || prev.period_of_performance,
        place_of_performance: parsed.place_of_performance || prev.place_of_performance,
        description: desc || prev.description,
        requirements: reqText || prev.requirements,
        evaluation_criteria: evalText || prev.evaluation_criteria,
      }));

      // Skip to step 2 since we have the data
      setCurrentStep(2);
    } catch {
      // ignore parse errors
    }
  }, []);

  const handleVendorChange = (field, value) => {
    setVendor((prev) => ({ ...prev, [field]: value }));
  };

  const handleOpportunityChange = (field, value) => {
    setOpportunity((prev) => ({ ...prev, [field]: value }));
  };

  const toggleSection = (key) => {
    setSelectedSections((prev) =>
      prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]
    );
  };

  const selectAllSections = () => {
    setSelectedSections(proposalSections.map((s) => s.key));
  };

  const deselectAllSections = () => {
    setSelectedSections([]);
  };

  const canProceed = () => {
    if (currentStep === 1) return vendor.company_name.trim() !== '';
    if (currentStep === 2) return opportunity.title.trim() !== '';
    if (currentStep === 3) return selectedSections.length > 0;
    return false;
  };

  const handleGenerate = async () => {
    if (selectedSections.length === 0) return;

    setGenerating(true);
    setError('');

    try {
      const payload = {
        vendor: vendor,
        opportunity,
        sections: selectedSections,
      };

      const response = await api.post('/api/generate-proposal', payload);

      // Navigate to the editor with the generated proposal
      navigate('/proposal-editor', {
        state: {
          proposal: response.data,
          opportunity,
          vendor,
        },
      });
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          err.message ||
          'Failed to generate proposal. Please try again.'
      );
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-navy">Proposal Builder</h1>
        <p className="text-gray-500 mt-1">
          Generate an AI-powered government proposal in three easy steps
        </p>
      </div>

      {/* Generating Overlay */}
      {generating && (
        <div className="fixed inset-0 bg-navy/80 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-10 text-center max-w-md mx-4 shadow-2xl">
            <div className="relative mx-auto w-20 h-20 mb-6">
              <div className="absolute inset-0 rounded-full border-4 border-gray-200"></div>
              <div className="absolute inset-0 rounded-full border-4 border-accent border-t-transparent animate-spin"></div>
              <SparklesIcon className="absolute inset-0 m-auto w-8 h-8 text-accent" />
            </div>
            <h3 className="text-xl font-bold text-navy mb-2">
              AI is writing your proposal...
            </h3>
            <p className="text-gray-500 text-sm">
              This may take a minute. We are generating professional content tailored to
              your vendor profile and the opportunity requirements.
            </p>
          </div>
        </div>
      )}

      {/* Step Indicator */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-center justify-between">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isActive = currentStep === step.number;
            const isComplete = currentStep > step.number;
            return (
              <div key={step.number} className="flex items-center flex-1">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      isComplete
                        ? 'bg-accent text-white'
                        : isActive
                        ? 'bg-navy text-white'
                        : 'bg-gray-200 text-gray-400'
                    }`}
                  >
                    {isComplete ? (
                      <CheckIcon className="w-5 h-5" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                  </div>
                  <div className="hidden sm:block">
                    <p
                      className={`text-xs font-medium ${
                        isActive ? 'text-navy' : 'text-gray-400'
                      }`}
                    >
                      Step {step.number}
                    </p>
                    <p
                      className={`text-sm font-semibold ${
                        isActive ? 'text-navy' : 'text-gray-500'
                      }`}
                    >
                      {step.label}
                    </p>
                  </div>
                </div>
                {idx < steps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-4 rounded ${
                      currentStep > step.number ? 'bg-accent' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <ExclamationTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Step 1: Vendor Profile */}
      {currentStep === 1 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-navy mb-5">Vendor Profile</h2>

          <div className="flex gap-4 mb-6">
            <button
              type="button"
              onClick={() => setUseExisting(true)}
              className={`flex-1 py-3 rounded-lg text-sm font-medium border-2 transition-all cursor-pointer ${
                useExisting
                  ? 'border-navy bg-navy text-white'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              Use Saved Profile
            </button>
            <button
              type="button"
              onClick={() => setUseExisting(false)}
              className={`flex-1 py-3 rounded-lg text-sm font-medium border-2 transition-all cursor-pointer ${
                !useExisting
                  ? 'border-navy bg-navy text-white'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              Enter Manually
            </button>
          </div>

          {useExisting && vendorLoading ? (
            <div className="bg-gray-50 rounded-lg p-8 border border-gray-200 text-center">
              <svg className="animate-spin w-8 h-8 text-navy mx-auto mb-3" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-sm text-gray-500">Loading your vendor profile...</p>
            </div>
          ) : useExisting && vendor.company_name ? (
            <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-navy text-base">{vendor.company_name}</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Profile Loaded</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm text-gray-600">
                {vendor.cage_code && (
                  <p>
                    <span className="font-medium text-gray-700">CAGE:</span>{' '}
                    {vendor.cage_code}
                  </p>
                )}
                {vendor.duns_number && (
                  <p>
                    <span className="font-medium text-gray-700">DUNS:</span>{' '}
                    {vendor.duns_number}
                  </p>
                )}
                {vendor.naics_codes?.length > 0 && (
                  <p>
                    <span className="font-medium text-gray-700">NAICS:</span>{' '}
                    {Array.isArray(vendor.naics_codes)
                      ? vendor.naics_codes.join(', ')
                      : vendor.naics_codes}
                  </p>
                )}
                <p>
                  <span className="font-medium text-gray-700">Status:</span>{' '}
                  {vendor.socioeconomic_status}
                </p>
                {vendor.organizational_type && (
                  <p>
                    <span className="font-medium text-gray-700">Type:</span>{' '}
                    {vendor.organizational_type}
                  </p>
                )}
                {vendor.years_in_business && (
                  <p>
                    <span className="font-medium text-gray-700">Experience:</span>{' '}
                    {vendor.years_in_business} years
                  </p>
                )}
                {vendor.security_clearance_level && vendor.security_clearance_level !== 'None' && (
                  <p>
                    <span className="font-medium text-gray-700">Clearance:</span>{' '}
                    {vendor.security_clearance_level}
                  </p>
                )}
                {vendor.certifications?.length > 0 && (
                  <p className="col-span-2">
                    <span className="font-medium text-gray-700">Certifications:</span>{' '}
                    {vendor.certifications.join(', ')}
                  </p>
                )}
                {vendor.contract_vehicles?.length > 0 && (
                  <p className="col-span-2">
                    <span className="font-medium text-gray-700">Contract Vehicles:</span>{' '}
                    {vendor.contract_vehicles.join(', ')}
                  </p>
                )}
              </div>
              {vendor.capabilities && (
                <p className="text-sm text-gray-500 mt-3 line-clamp-2">
                  {vendor.capabilities}
                </p>
              )}
              {/* Data completeness indicator */}
              {(() => {
                const filled = [
                  vendor.company_name, vendor.cage_code, vendor.duns_number,
                  vendor.naics_codes?.length > 0, vendor.capabilities, vendor.past_performance,
                  vendor.about_company, vendor.capability_statement,
                  vendor.certifications?.length > 0, vendor.contract_vehicles?.length > 0,
                  vendor.past_performances?.length > 0, vendor.management_team?.length > 0,
                ].filter(Boolean).length;
                const total = 12;
                const pct = Math.round((filled / total) * 100);
                return (
                  <div className="mt-4 pt-3 border-t border-gray-200">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-gray-500 font-medium">Profile completeness</span>
                      <span className={`font-semibold ${pct >= 75 ? 'text-green-600' : pct >= 50 ? 'text-amber-600' : 'text-red-500'}`}>{pct}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${pct >= 75 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-400'}`} style={{ width: `${pct}%` }} />
                    </div>
                    {pct < 75 && (
                      <p className="text-[11px] text-gray-400 mt-1.5">
                        Complete your <a href="/vendor-profile" className="text-blue hover:underline">Business Profile</a> for better proposal quality
                      </p>
                    )}
                  </div>
                );
              })()}
            </div>
          ) : useExisting && !vendor.company_name ? (
            <div className="bg-amber-50 rounded-lg p-5 border border-amber-200 text-center">
              <p className="text-sm text-amber-700 mb-2">
                No saved profile found. Please create one in the Business Profile page or
                enter details manually.
              </p>
              <button
                type="button"
                onClick={() => setUseExisting(false)}
                className="text-sm font-medium text-navy hover:underline cursor-pointer"
              >
                Enter manually instead
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Company Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={vendor.company_name}
                  onChange={(e) => handleVendorChange('company_name', e.target.value)}
                  placeholder="Company name"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue transition-all"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    CAGE Code
                  </label>
                  <input
                    type="text"
                    value={vendor.cage_code}
                    onChange={(e) => handleVendorChange('cage_code', e.target.value)}
                    placeholder="CAGE Code"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    DUNS Number
                  </label>
                  <input
                    type="text"
                    value={vendor.duns_number}
                    onChange={(e) => handleVendorChange('duns_number', e.target.value)}
                    placeholder="DUNS Number"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  NAICS Codes
                </label>
                <NaicsCodeSelector
                  selectedCodes={vendor.naics_codes || []}
                  onChange={(codes) => handleVendorChange('naics_codes', codes)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Capabilities
                </label>
                <textarea
                  value={vendor.capabilities}
                  onChange={(e) => handleVendorChange('capabilities', e.target.value)}
                  placeholder="Describe company capabilities..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue transition-all resize-y"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Past Performance
                </label>
                <textarea
                  value={vendor.past_performance}
                  onChange={(e) => handleVendorChange('past_performance', e.target.value)}
                  placeholder="List relevant past contracts..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue transition-all resize-y"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Opportunity Details */}
      {currentStep === 2 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-navy mb-5">Opportunity Details</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Opportunity Title <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={opportunity.title}
                onChange={(e) => handleOpportunityChange('title', e.target.value)}
                placeholder="e.g., IT Infrastructure Modernization"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue transition-all"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Solicitation Number
                </label>
                <input
                  type="text"
                  value={opportunity.solicitation_number}
                  onChange={(e) => handleOpportunityChange('solicitation_number', e.target.value)}
                  placeholder="e.g., FA251825RP002"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Agency
                </label>
                <input
                  type="text"
                  value={opportunity.agency}
                  onChange={(e) => handleOpportunityChange('agency', e.target.value)}
                  placeholder="e.g., Department of Defense"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Contracting Office
                </label>
                <input
                  type="text"
                  value={opportunity.contracting_office}
                  onChange={(e) => handleOpportunityChange('contracting_office', e.target.value)}
                  placeholder="e.g., Defense Information Systems Agency"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  NAICS Code
                </label>
                <input
                  type="text"
                  value={opportunity.naics_code}
                  onChange={(e) => handleOpportunityChange('naics_code', e.target.value)}
                  placeholder="e.g., 541512"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Set-Aside Type
                </label>
                <select
                  value={opportunity.set_aside_type}
                  onChange={(e) => handleOpportunityChange('set_aside_type', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue transition-all bg-white"
                >
                  {setAsideOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Contract Type
                </label>
                <select
                  value={opportunity.contract_type}
                  onChange={(e) => handleOpportunityChange('contract_type', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue transition-all bg-white"
                >
                  {contractTypeOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Place of Performance
                </label>
                <input
                  type="text"
                  value={opportunity.place_of_performance}
                  onChange={(e) => handleOpportunityChange('place_of_performance', e.target.value)}
                  placeholder="e.g., Washington, DC or Contractor Site"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Period of Performance
                </label>
                <input
                  type="text"
                  value={opportunity.period_of_performance}
                  onChange={(e) => handleOpportunityChange('period_of_performance', e.target.value)}
                  placeholder="e.g., 1 Base Year + 4 Option Years"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Estimated Value
                </label>
                <input
                  type="text"
                  value={opportunity.estimated_value}
                  onChange={(e) => handleOpportunityChange('estimated_value', e.target.value)}
                  placeholder="e.g., $5M - $10M"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Description / Scope of Work
              </label>
              <textarea
                value={opportunity.description}
                onChange={(e) => handleOpportunityChange('description', e.target.value)}
                placeholder="Describe the opportunity scope, objectives, and deliverables..."
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue transition-all resize-y"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Requirements / SOW
              </label>
              <textarea
                value={opportunity.requirements}
                onChange={(e) => handleOpportunityChange('requirements', e.target.value)}
                placeholder="List specific technical requirements, compliance needs, mandatory qualifications..."
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue transition-all resize-y"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Evaluation Criteria{' '}
                <span className="text-gray-400 font-normal">(from Section M)</span>
              </label>
              <textarea
                value={opportunity.evaluation_criteria}
                onChange={(e) => handleOpportunityChange('evaluation_criteria', e.target.value)}
                placeholder="e.g., Best Value Tradeoff: Technical Approach (40%), Past Performance (30%), Price (30%)..."
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue transition-all resize-y"
              />
            </div>

            {/* Proposal Type & Submission Date */}
            <div className="border-t border-gray-100 pt-4 mt-4">
              <h3 className="text-sm font-semibold text-navy mb-3">Proposal Format</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Proposal Type</label>
                  <select
                    value={opportunity.proposal_type}
                    onChange={(e) => handleOpportunityChange('proposal_type', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue transition-all bg-white"
                  >
                    {proposalTypeOptions.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Submission Date</label>
                  <input
                    type="date"
                    value={opportunity.submission_date}
                    onChange={(e) => handleOpportunityChange('submission_date', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Point of Contact */}
            <div className="border-t border-gray-100 pt-4 mt-4">
              <h3 className="text-sm font-semibold text-navy mb-3">Point of Contact</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                  <input
                    type="text"
                    value={opportunity.poc_name}
                    onChange={(e) => handleOpportunityChange('poc_name', e.target.value)}
                    placeholder="e.g., John Smith"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Title / Division</label>
                  <input
                    type="text"
                    value={opportunity.poc_title}
                    onChange={(e) => handleOpportunityChange('poc_title', e.target.value)}
                    placeholder="e.g., Federal Contracting Division"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={opportunity.poc_email}
                    onChange={(e) => handleOpportunityChange('poc_email', e.target.value)}
                    placeholder="e.g., john.smith@company.com"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
                  <input
                    type="tel"
                    value={opportunity.poc_phone}
                    onChange={(e) => handleOpportunityChange('poc_phone', e.target.value)}
                    placeholder="e.g., (555) 123-4567"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue transition-all"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Section Selection & Generate */}
      {currentStep === 3 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-navy">
              Select Proposal Sections
            </h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={selectAllSections}
                className="text-xs font-medium text-blue hover:underline cursor-pointer"
              >
                Select All
              </button>
              <span className="text-gray-300">|</span>
              <button
                type="button"
                onClick={deselectAllSections}
                className="text-xs font-medium text-gray-500 hover:underline cursor-pointer"
              >
                Deselect All
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            {proposalSections.map((section) => {
              const isSelected = selectedSections.includes(section.key);
              return (
                <label
                  key={section.key}
                  className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-navy bg-navy/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSection(section.key)}
                    className="sr-only"
                  />
                  <div
                    className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-all ${
                      isSelected ? 'bg-navy' : 'border-2 border-gray-300'
                    }`}
                  >
                    {isSelected && <CheckIcon className="w-3.5 h-3.5 text-white" />}
                  </div>
                  <span
                    className={`text-sm font-medium ${
                      isSelected ? 'text-navy' : 'text-gray-600'
                    }`}
                  >
                    {section.label}
                  </span>
                </label>
              );
            })}
          </div>

          {/* Summary */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200">
            <h3 className="text-sm font-semibold text-navy mb-2">Generation Summary</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <p className="text-gray-600">
                <span className="font-medium">Vendor:</span> {vendor.company_name || 'Not set'}
              </p>
              <p className="text-gray-600">
                <span className="font-medium">Opportunity:</span>{' '}
                {opportunity.title || 'Not set'}
              </p>
              <p className="text-gray-600">
                <span className="font-medium">Agency:</span>{' '}
                {opportunity.agency || 'Not specified'}
              </p>
              <p className="text-gray-600">
                <span className="font-medium">Contract:</span>{' '}
                {opportunity.contract_type || 'Not specified'}
              </p>
              <p className="text-gray-600">
                <span className="font-medium">Set-Aside:</span>{' '}
                {opportunity.set_aside_type || 'Not specified'}
              </p>
              <p className="text-gray-600">
                <span className="font-medium">Sections:</span> {selectedSections.length} of{' '}
                {proposalSections.length}
              </p>
            </div>
            {/* Data sources indicator */}
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-400 font-medium mb-1.5">Auto-fill data sources:</p>
              <div className="flex flex-wrap gap-1.5">
                {vendor.company_name && <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700">Company Info</span>}
                {vendor.certifications?.length > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700">Certifications</span>}
                {vendor.contract_vehicles?.length > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700">Contract Vehicles</span>}
                {vendor.past_performances?.length > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700">Past Performance</span>}
                {vendor.management_team?.length > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700">Key Personnel</span>}
                {vendor.capability_statement && <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700">Capability Statement</span>}
                {!vendor.certifications?.length && !vendor.past_performances?.length && !vendor.management_team?.length && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Complete your profile for richer proposals</span>
                )}
              </div>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="bg-amber-50/50 border border-amber-200/60 rounded-xl p-4 mb-4">
            <p className="text-xs text-gray-500 leading-relaxed mb-3">
              <span className="font-semibold text-gray-600">Disclaimer:</span> This application generates proposal documents based on user inputs and available data sources. All outputs are automated and may not reflect complete or fully verified information. By generating this proposal, you acknowledge that you are solely responsible for reviewing, verifying, and ensuring the accuracy and suitability of all content prior to submission. The application and its providers shall not be liable for any damages, errors, omissions, or outcomes arising from use of the generated content. All use is at your sole risk and discretion.
            </p>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={disclaimerAccepted}
                onChange={(e) => setDisclaimerAccepted(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-gray-300 text-accent focus:ring-accent cursor-pointer"
              />
              <span className="text-xs text-gray-600 font-medium">
                I have read and agree to the above disclaimer. I accept full responsibility for any decisions, submissions, or actions taken based on the generated output.
              </span>
            </label>
          </div>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating || selectedSections.length === 0 || !disclaimerAccepted}
            className="w-full bg-accent hover:bg-accent-dark text-white py-4 rounded-xl font-semibold text-base transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md hover:shadow-lg cursor-pointer"
          >
            <SparklesIcon className="w-5 h-5" />
            Generate Proposal
          </button>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-6">
        <button
          type="button"
          onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
          disabled={currentStep === 1}
          className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Previous
        </button>
        {currentStep < 3 && (
          <button
            type="button"
            onClick={() => setCurrentStep((prev) => Math.min(3, prev + 1))}
            disabled={!canProceed()}
            className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium text-white bg-navy hover:bg-navy-light disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            Next
            <ArrowRightIcon className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

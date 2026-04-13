import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  DocumentTextIcon,
  ExclamationTriangleIcon,
  ShareIcon,
} from '@heroicons/react/24/outline';
import api from '../services/api';

const sectionLabels = {
  cover_page: 'Cover Page',
  executive_summary: 'Executive Summary',
  vendor_profile: 'Vendor Profile',
  socioeconomic_status: 'Socioeconomic Status',
  capability_statement: 'Capability Statement',
  past_performance: 'Past Performance',
  technical_approach: 'Technical Approach',
  management_approach: 'Management Approach',
  staffing_plan: 'Staffing Plan',
  key_personnel: 'Key Personnel / Resumes',
  cost_price_proposal: 'Cost / Price Proposal',
  quality_assurance: 'Quality Assurance Plan',
  risk_mitigation: 'Risk Mitigation Plan',
  transition_plan: 'Transition / Phase-In Plan',
  subcontracting_plan: 'Small Business Subcontracting Plan',
  compliance_matrix: 'Compliance Matrix',
  implementation_timeline: 'Implementation Timeline',
  compliance_checklist: 'Compliance Checklist',
};

export default function SharedProposal() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchShared = async () => {
      try {
        const res = await api.get(`/api/shared/${token}`);
        setData(res.data);
      } catch (err) {
        const status = err.response?.status;
        if (status === 404) {
          setError('This share link is invalid or has been deactivated.');
        } else if (status === 410) {
          setError('This share link has expired.');
        } else {
          setError(err.response?.data?.detail || 'Failed to load shared proposal.');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchShared();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <svg
            className="animate-spin w-10 h-10 text-[#1e3a5f] mx-auto mb-4"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-gray-500 text-sm">Loading shared proposal...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center max-w-md">
          <ExclamationTriangleIcon className="w-16 h-16 text-amber-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Unable to Load Proposal</h2>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const proposal = data.proposal;
  const sections = proposal.sections || {};
  const sectionKeys = Object.keys(sections).filter((k) => sectionLabels[k]);
  const proposalTitle = proposal.opportunity_title || proposal.title || 'Untitled Proposal';
  const vendorName = proposal.vendor_name || '';
  const companyLogo = proposal.company_logo || '';
  const opp = proposal.opportunity || data.opportunity || {};

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      {/* Shared by banner */}
      <div className="max-w-4xl mx-auto mb-4">
        <div className="bg-purple-50 border border-purple-200 rounded-xl px-5 py-3 flex items-center gap-3">
          <ShareIcon className="w-5 h-5 text-purple-500 flex-shrink-0" />
          <p className="text-sm text-purple-700">
            <span className="font-semibold">Shared by {data.shared_by}</span>
            {data.shared_on && (
              <span className="text-purple-500 ml-2">
                on {new Date(data.shared_on).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Document Preview */}
      <div className="max-w-4xl mx-auto">
        <div
          className="bg-white shadow-xl border border-gray-200 relative"
          style={{ fontFamily: 'Georgia, serif', minHeight: '800px' }}
        >
          {/* DRAFT Watermark */}
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
            style={{ overflow: 'hidden' }}
          >
            <span
              className="text-gray-200 font-extrabold uppercase select-none"
              style={{
                fontSize: '120px',
                transform: 'rotate(-35deg)',
                letterSpacing: '20px',
                opacity: 0.15,
              }}
            >
              DRAFT
            </span>
          </div>

          {/* Document Content */}
          <div className="relative z-20">
            {/* Cover / Header */}
            <div className="px-12 py-10 text-white" style={{ backgroundColor: '#1e3a5f' }}>
              {companyLogo && (
                <div className="mb-5">
                  <div className="inline-block bg-white rounded-lg p-2">
                    <img
                      src={companyLogo}
                      alt="Company Logo"
                      className="max-h-16 max-w-48 object-contain"
                    />
                  </div>
                </div>
              )}
              <p className="text-sm uppercase tracking-widest opacity-80 mb-2">Government Proposal</p>
              <h1 className="text-3xl font-bold mb-3">{proposalTitle}</h1>
              {vendorName && (
                <p className="text-lg opacity-90">Prepared by: {vendorName}</p>
              )}

              {/* Opportunity Details */}
              {(opp.agency || opp.solicitation_number || opp.contact_name) && (
                <div className="mt-5 pt-4 border-t border-white/20 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                  {opp.agency && (
                    <div>
                      <span className="opacity-60 text-xs uppercase tracking-wide">Agency</span>
                      <p className="font-semibold">{opp.agency}</p>
                    </div>
                  )}
                  {opp.solicitation_number && (
                    <div>
                      <span className="opacity-60 text-xs uppercase tracking-wide">Solicitation / RFP Number</span>
                      <p className="font-semibold">{opp.solicitation_number}</p>
                    </div>
                  )}
                  {opp.contact_name && (
                    <div>
                      <span className="opacity-60 text-xs uppercase tracking-wide">Contracting Officer</span>
                      <p className="font-semibold">{opp.contact_name}</p>
                    </div>
                  )}
                  {opp.contact_email && (
                    <div>
                      <span className="opacity-60 text-xs uppercase tracking-wide">Contact Email</span>
                      <p className="font-semibold">{opp.contact_email}</p>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-4 flex items-center gap-4 text-sm opacity-70">
                <span>Sections: {sectionKeys.length}</span>
                <span>|</span>
                <span>
                  Date: {new Date(proposal.created_at || Date.now()).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>
            </div>

            {/* Table of Contents */}
            <div className="px-12 py-8 border-b border-gray-200">
              <h2 className="text-lg font-bold mb-4" style={{ color: '#1e3a5f' }}>
                Table of Contents
              </h2>
              <ol className="space-y-1.5">
                {sectionKeys.map((key, idx) => {
                  const section = sections[key];
                  const title = typeof section === 'string' ? (sectionLabels[key] || key) : section?.title || sectionLabels[key] || key;
                  return (
                    <li key={key} className="flex items-center text-sm text-gray-600">
                      <span className="font-semibold text-gray-800 w-8">{idx + 1}.</span>
                      <span>{title}</span>
                      <span className="flex-1 mx-3 border-b border-dotted border-gray-300" />
                      <span className="text-gray-400 text-xs">Section {idx + 1}</span>
                    </li>
                  );
                })}
              </ol>
            </div>

            {/* Sections */}
            {sectionKeys.map((key, idx) => {
              const section = sections[key];
              const title = typeof section === 'string' ? (sectionLabels[key] || key) : section?.title || sectionLabels[key] || key;
              const content = typeof section === 'string' ? section : section?.content || '';
              return (
                <div key={key} className="px-12 py-8 border-b border-gray-100">
                  <div className="flex items-center gap-3 mb-4">
                    <span
                      className="text-xs font-bold text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: '#1e3a5f' }}
                    >
                      {idx + 1}
                    </span>
                    <h2 className="text-xl font-bold" style={{ color: '#1e3a5f' }}>
                      {title}
                    </h2>
                  </div>
                  <div
                    className="prose prose-sm max-w-none text-gray-700 leading-relaxed"
                    style={{ fontFamily: 'Georgia, serif' }}
                    dangerouslySetInnerHTML={{
                      __html: content || '<p class="text-gray-400 italic">No content generated for this section.</p>',
                    }}
                  />
                </div>
              );
            })}

            {/* Footer */}
            <div className="px-12 py-6 bg-gray-50 text-center">
              <p className="text-xs text-gray-400">
                This document is a DRAFT preview. Content may change before final submission.
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Generated by GovProposal AI | Shared view
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

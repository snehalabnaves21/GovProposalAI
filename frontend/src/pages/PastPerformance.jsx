import { useState, useEffect, useRef } from 'react';
import {
  StarIcon,
  PlusIcon,
  TrashIcon,
  PhotoIcon,
  DocumentTextIcon,
  SparklesIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import api from '../services/api';

const INPUT_CLASS = 'w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue transition-all';
const SELECT_CLASS = 'w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue transition-all bg-white appearance-none';

const EMPTY_PERFORMANCE = {
  contract_name: '',
  agency: '',
  contract_number: '',
  contract_value: '',
  start_year: '',
  end_year: '',
  staffing_count: '',
  description: '',
  relevance_tags: '',
  logo: '',
};

export default function PastPerformance() {
  const [pastPerformances, setPastPerformances] = useState([]);
  const [capabilityStatement, setCapabilityStatement] = useState('');
  const [capabilityExamples, setCapabilityExamples] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const fileInputRef = useRef(null);
  const [pendingImageCallback, setPendingImageCallback] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await api.get('/api/vendor-profiles');
        if (res.data?.profiles?.length > 0) {
          const p = res.data.profiles[0];
          if (p.past_performances?.length) setPastPerformances(p.past_performances);
          if (p.capability_statement) setCapabilityStatement(p.capability_statement);
          if (p.capability_examples?.length) setCapabilityExamples(p.capability_examples);
          return;
        }
      } catch {}
      try {
        const stored = JSON.parse(localStorage.getItem('vendorProfile') || '{}');
        if (stored.past_performances?.length) setPastPerformances(stored.past_performances);
        if (stored.capability_statement) setCapabilityStatement(stored.capability_statement);
        if (stored.capability_examples?.length) setCapabilityExamples(stored.capability_examples);
      } catch {}
    };
    loadData();
  }, []);

  const addPerformance = () => {
    setPastPerformances(prev => [...prev, { ...EMPTY_PERFORMANCE }]);
  };

  const updatePerformance = (index, field, value) => {
    setPastPerformances(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
  };

  const removePerformance = (index) => {
    setPastPerformances(prev => prev.filter((_, i) => i !== index));
  };

  const addExample = () => {
    setCapabilityExamples(prev => [...prev, { title: '', description: '' }]);
  };

  const updateExample = (index, field, value) => {
    setCapabilityExamples(prev => prev.map((e, i) => i === index ? { ...e, [field]: value } : e));
  };

  const removeExample = (index) => {
    setCapabilityExamples(prev => prev.filter((_, i) => i !== index));
  };

  const handleImageUpload = (callback) => {
    setPendingImageCallback(() => callback);
    fileInputRef.current?.click();
  };

  const onFileSelected = (e) => {
    const file = e.target.files?.[0];
    if (!file || !pendingImageCallback) return;
    if (file.size > 5 * 1024 * 1024) { alert('Image must be under 5MB'); return; }
    const reader = new FileReader();
    reader.onloadend = () => { pendingImageCallback(reader.result); setPendingImageCallback(null); };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleAiAssist = async () => {
    setAiLoading(true);
    try {
      const stored = JSON.parse(localStorage.getItem('vendorProfile') || '{}');
      const companyName = stored.company_name || 'our company';
      const res = await api.post('/api/ai/assist', {
        field: 'capability_statement',
        prompt: `Write a capability statement for "${companyName}", a government contractor. Include core competencies, differentiators, and value propositions. Keep it concise and suitable for a federal proposal. 2-3 paragraphs.`,
        context: { company_name: companyName },
      });
      if (res.data?.content) setCapabilityStatement(res.data.content);
    } catch {} finally { setAiLoading(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const stored = JSON.parse(localStorage.getItem('vendorProfile') || '{}');
      stored.past_performances = pastPerformances;
      stored.capability_statement = capabilityStatement;
      stored.capability_examples = capabilityExamples;
      localStorage.setItem('vendorProfile', JSON.stringify(stored));

      try {
        await api.post('/api/vendor-profile', {
          ...stored,
          past_performances: pastPerformances,
          capability_statement: capabilityStatement,
          capability_examples: capabilityExamples,
        });
      } catch {}

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {} finally { setSaving(false); }
  };

  const yearOptions = Array.from({ length: 30 }, (_, k) => new Date().getFullYear() - k);
  const endYearOptions = Array.from({ length: 30 }, (_, k) => new Date().getFullYear() + 1 - k);

  return (
    <div className="max-w-5xl mx-auto">
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileSelected} />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy">Past Performance Repository</h1>
          <p className="text-gray-500 text-sm mt-1">Showcase your track record and capabilities for government proposals</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-dark transition-colors disabled:opacity-50 cursor-pointer"
        >
          {saved ? <><CheckCircleIcon className="w-4 h-4" /> Saved</> : saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Past Performance Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-navy flex items-center gap-2">
            <StarIcon className="w-5 h-5" /> Past Performance
          </h2>
          <button
            onClick={addPerformance}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-navy hover:bg-navy-light rounded-lg transition-colors cursor-pointer"
          >
            <PlusIcon className="w-3.5 h-3.5" /> Add Performance
          </button>
        </div>

        {pastPerformances.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
            <StarIcon className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400 mb-1">No past performance records yet</p>
            <p className="text-xs text-gray-400 mb-3">Add contracts you've completed for government agencies.</p>
            <button onClick={addPerformance} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white rounded-lg text-xs font-medium hover:bg-accent-dark transition-colors cursor-pointer">
              <PlusIcon className="w-3.5 h-3.5" /> Add First Entry
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {pastPerformances.map((perf, i) => (
              <div key={i} className="border border-gray-200 rounded-xl p-5 bg-gray-50/50 relative">
                <button onClick={() => removePerformance(i)} className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer">
                  <TrashIcon className="w-4 h-4" />
                </button>
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    {perf.logo ? (
                      <div className="relative group">
                        <img src={perf.logo} alt={perf.contract_name || 'Client'} className="w-20 h-20 object-contain rounded-lg border border-gray-200 bg-white p-1" />
                        <button onClick={() => updatePerformance(i, 'logo', '')} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                          <TrashIcon className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleImageUpload((img) => updatePerformance(i, 'logo', img))}
                        className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center bg-white hover:border-gray-400 transition-colors cursor-pointer"
                      >
                        <PhotoIcon className="w-6 h-6 text-gray-300" />
                        <span className="text-[10px] text-gray-400 mt-1">Logo</span>
                      </button>
                    )}
                  </div>
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 pr-8">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Contract / Project Name *</label>
                      <input type="text" value={perf.contract_name || ''} onChange={(e) => updatePerformance(i, 'contract_name', e.target.value)} placeholder="e.g., Cloud Migration Support Services" className={INPUT_CLASS} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Agency / Client</label>
                      <input type="text" value={perf.agency || ''} onChange={(e) => updatePerformance(i, 'agency', e.target.value)} placeholder="e.g., Department of Defense" className={INPUT_CLASS} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Contract Number</label>
                      <input type="text" value={perf.contract_number || ''} onChange={(e) => updatePerformance(i, 'contract_number', e.target.value)} placeholder="e.g., W91278-20-C-0045" className={INPUT_CLASS} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Contract Value ($)</label>
                      <input type="text" value={perf.contract_value || ''} onChange={(e) => updatePerformance(i, 'contract_value', e.target.value)} placeholder="e.g., $2,500,000" className={INPUT_CLASS} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Staffing Numbers</label>
                      <input type="text" value={perf.staffing_count || ''} onChange={(e) => updatePerformance(i, 'staffing_count', e.target.value)} placeholder="e.g., 15 FTEs" className={INPUT_CLASS} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Period of Performance - Start Year</label>
                      <select value={perf.start_year || ''} onChange={(e) => updatePerformance(i, 'start_year', e.target.value)} className={SELECT_CLASS}>
                        <option value="">Select year...</option>
                        {yearOptions.map(y => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Period of Performance - End Year</label>
                      <select value={perf.end_year || ''} onChange={(e) => updatePerformance(i, 'end_year', e.target.value)} className={SELECT_CLASS}>
                        <option value="">Select year...</option>
                        <option value="Present">Present (Ongoing)</option>
                        {endYearOptions.map(y => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Description / Key Accomplishments</label>
                      <textarea value={perf.description || ''} onChange={(e) => updatePerformance(i, 'description', e.target.value)} placeholder="Brief description of work performed, key outcomes, metrics..." rows={3} className={`${INPUT_CLASS} resize-y`} />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Relevance Tags (comma-separated)</label>
                      <input type="text" value={perf.relevance_tags || ''} onChange={(e) => updatePerformance(i, 'relevance_tags', e.target.value)} placeholder="e.g., cloud migration, cybersecurity, managed services, IT modernization" className={INPUT_CLASS} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Capability Statement Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-navy flex items-center gap-2">
            <DocumentTextIcon className="w-5 h-5" /> Capability Statement
          </h2>
          <button
            onClick={handleAiAssist}
            disabled={aiLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            <SparklesIcon className="w-3.5 h-3.5" />
            {aiLoading ? 'Generating...' : 'AI Assist'}
          </button>
        </div>
        <textarea
          value={capabilityStatement}
          onChange={(e) => setCapabilityStatement(e.target.value)}
          placeholder="Describe your core competencies, differentiators, and value proposition..."
          rows={5}
          className={`${INPUT_CLASS} resize-y`}
        />
      </div>

      {/* Capability Examples Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-navy flex items-center gap-2">
            <SparklesIcon className="w-5 h-5" /> Capability Examples
          </h2>
          <button
            onClick={addExample}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-navy bg-navy/5 hover:bg-navy/10 rounded-lg transition-colors cursor-pointer"
          >
            <PlusIcon className="w-3.5 h-3.5" /> Add Example
          </button>
        </div>

        {capabilityExamples.length === 0 ? (
          <div className="text-center py-8">
            <SparklesIcon className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400 mb-3">No capability examples yet</p>
            <button onClick={addExample} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white rounded-lg text-xs font-medium hover:bg-accent-dark transition-colors cursor-pointer">
              <PlusIcon className="w-3.5 h-3.5" /> Add First Example
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {capabilityExamples.map((ex, i) => (
              <div key={i} className="flex gap-2">
                <input
                  type="text"
                  value={ex.title || ''}
                  onChange={(e) => updateExample(i, 'title', e.target.value)}
                  placeholder="Example title"
                  className={`${INPUT_CLASS} flex-1`}
                />
                <input
                  type="text"
                  value={ex.description || ''}
                  onChange={(e) => updateExample(i, 'description', e.target.value)}
                  placeholder="Brief description"
                  className={`${INPUT_CLASS} flex-[2]`}
                />
                <button onClick={() => removeExample(i)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors cursor-pointer">
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

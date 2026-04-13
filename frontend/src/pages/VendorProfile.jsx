import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  UserCircleIcon,
  BuildingOffice2Icon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  DocumentCheckIcon,
  BriefcaseIcon,
  PlusIcon,
  TrashIcon,
  PhotoIcon,
  SparklesIcon,
  UserGroupIcon,
  DocumentTextIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline';
import api from '../services/api';
import NaicsCodeSelector from '../components/NaicsCodeSelector';

const socioeconomicOptions = ['Small Business','8(a)','HUBZone','SDVOSB','WOSB','EDWOSB','Large Business'];
const classificationOptions = ['Small Disadvantaged Business (SDB)','Women-Owned Small Business (WOSB)','Economically Disadvantaged WOSB (EDWOSB)','Veteran-Owned Small Business (VOSB)','Service-Disabled Veteran-Owned (SDVOSB)','HUBZone Certified','8(a) Business Development','Minority-Owned Business','Disadvantaged Business Enterprise (DBE)'];
const orgTypeOptions = ['LLC','Corporation','S-Corporation','Sole Proprietorship','Partnership','Joint Venture','Nonprofit'];
const clearanceLevelOptions = ['None','Confidential','Secret','Top Secret','Top Secret/SCI'];
const samStatusOptions = ['Active','Inactive','Expired','Not Registered'];
const certificationOptions = ['ISO 9001','ISO 27001','ISO 20000','CMMI Level 3','CMMI Level 5','FedRAMP','SOC 2 Type II','PMP','ITIL','CMMC Level 1','CMMC Level 2','CMMC Level 3'];
const contractVehicleOptions = ['GSA MAS/Schedule','SEWP V','STARS III','CIO-SP4','OASIS+','Alliant 3','VETS 2','8(a) STARS III','ITES-SW2'];

const INPUT_CLASS = 'w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue transition-all';
const SELECT_CLASS = `${INPUT_CLASS} bg-white`;
const LABEL_CLASS = 'block text-sm font-medium text-gray-700 mb-1.5';

function Section({ icon: Icon, title, children, id }) {
  return (
    <div id={id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6 scroll-mt-20">
      <h2 className="text-lg font-semibold text-navy mb-5 flex items-center gap-2">
        <Icon className="w-5 h-5" />
        {title}
      </h2>
      {children}
    </div>
  );
}

function TeamMemberCard({ member, field, index, onUpdate, onRemove, onImageUpload }) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50/50 relative">
      <button type="button" onClick={() => onRemove(field, index)} className="absolute top-3 right-3 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors cursor-pointer">
        <TrashIcon className="w-4 h-4" />
      </button>
      <div className="flex gap-4">
        <div className="flex-shrink-0">
          {member.photo ? (
            <div className="relative group">
              <img src={member.photo} alt={member.name || 'Team member'} className="w-20 h-24 object-cover rounded-lg border border-gray-200" />
              <button type="button" onClick={() => onUpdate(field, index, 'photo', '')} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <TrashIcon className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => onImageUpload((img) => onUpdate(field, index, 'photo', img))} className="w-20 h-24 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center bg-white hover:border-gray-400 transition-colors cursor-pointer">
              <PhotoIcon className="w-6 h-6 text-gray-300" />
              <span className="text-[10px] text-gray-400 mt-1">Photo</span>
            </button>
          )}
        </div>
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
            <input type="text" value={member.name || ''} onChange={(e) => onUpdate(field, index, 'name', e.target.value)} placeholder="Full Name" className={INPUT_CLASS} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Designation</label>
            <input type="text" value={member.designation || ''} onChange={(e) => onUpdate(field, index, 'designation', e.target.value)} placeholder="e.g., CEO, CTO, VP Operations" className={INPUT_CLASS} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">Experience & About</label>
            <textarea value={member.about || ''} onChange={(e) => onUpdate(field, index, 'about', e.target.value)} placeholder="Brief description of experience, expertise, and background..." rows={2} className={`${INPUT_CLASS} resize-y`} />
          </div>
        </div>
      </div>
    </div>
  );
}

const initialProfile = {
  company_logo: '', company_name: '', cage_code: '', duns_number: '', ein_tin: '',
  business_registration_date: '', naics_codes: [], business_classifications: [],
  about_company: '', management_team: [], executive_team: [], past_performances: [],
  capability_statement: '', capability_examples: [], socioeconomic_status: 'Small Business',
  organizational_type: 'LLC', state_of_incorporation: '', years_in_business: '',
  number_of_employees: '', annual_revenue: '', sam_registration_status: 'Not Registered',
  sam_expiration_date: '', security_clearance_level: 'None', certifications: [],
  contract_vehicles: [], registered_address_line1: '', registered_address_line2: '',
  registered_address_city: '', registered_address_state: '', registered_address_zip: '',
  registered_address_country: '', branches: [], government_portals: [],
  sam_login_user: '', sam_login_password: '', contact_name: '', contact_email: '',
  contact_phone: '', contact_address: '',
};

export default function VendorProfile() {
  const [customCert, setCustomCert] = useState('');
  const [showCertInput, setShowCertInput] = useState(false);
  const [profile, setProfile] = useState(initialProfile);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const logoInputRef = useRef(null);
  const [searchParams] = useSearchParams();
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [websiteLoading, setWebsiteLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [manualMode, setManualMode] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const sectionMap = {
    classification: 'section-business-classifications',
    certifications: 'section-certifications',
    contracts: 'section-contract-vehicles',
    registrations: 'section-government-registrations',
    contact: 'section-contact-details',
    about: 'section-company-overview',
  };

  useEffect(() => {
    if (!loading) {
      const sectionParam = searchParams.get('section');
      if (sectionParam && sectionMap[sectionParam]) {
        setTimeout(() => {
          const el = document.getElementById(sectionMap[sectionParam]);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 200);
      }
    }
  }, [loading, searchParams]);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await api.get('/api/vendor-profiles');
        const profiles = res.data?.profiles || res.data || [];
        if (profiles.length > 0) {
          const dbProfile = profiles[0];
          const mapped = {
            ...initialProfile,
            company_name: dbProfile.company_name || '',
            cage_code: dbProfile.cage_code || '',
            duns_number: dbProfile.duns_number || '',
            naics_codes: Array.isArray(dbProfile.naics_codes) ? dbProfile.naics_codes : (dbProfile.naics_codes || '').split(',').map(c => c.trim()).filter(Boolean),
            //about_company: '',
            capability_statement: dbProfile.past_performance || '',
            socioeconomic_status: (dbProfile.socioeconomic_status || 'Small Business').split(',')[0].trim(),
            contact_name: dbProfile.contact_info?.name || '',
            contact_email: dbProfile.contact_info?.email || '',
            contact_phone: dbProfile.contact_info?.phone || '',
            contact_address: dbProfile.contact_info?.address || '',
          };
          const saved = localStorage.getItem('vendorProfile');
          if (saved) {
            try {
              const local = JSON.parse(saved);
              for (const key of ['company_logo','management_team','executive_team','past_performances','capability_examples','ein_tin','business_registration_date','organizational_type','state_of_incorporation','years_in_business','number_of_employees','annual_revenue','sam_registration_status','sam_expiration_date','security_clearance_level','certifications','contract_vehicles','registered_address_line1','registered_address_line2','registered_address_city','registered_address_state','registered_address_zip','registered_address_country','branches','government_portals','sam_login_user','sam_login_password','business_classifications']) {
                if (local[key] !== undefined && local[key] !== '' && (Array.isArray(local[key]) ? local[key].length > 0 : true)) {
                  mapped[key] = local[key];
                }
              }
            } catch { /* ignore */ }
          }
          setProfile({
  ...mapped,
  about_company: ""   // 🔥 THIS LINE FIXES YOUR ISSUE
});
setEditMode(false);
setLoading(false);
return;
        }
      } catch { /* fall back to localStorage */ }
      const saved = localStorage.getItem('vendorProfile');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (typeof parsed.naics_codes === 'string') {
            parsed.naics_codes = parsed.naics_codes.split(',').map((c) => c.trim()).filter(Boolean);
          }
          setProfile({ ...initialProfile, ...parsed });
          
          setEditMode(false);
        } catch { /* ignore */ }
      }
      setLoading(false);
    };
    loadProfile();
  }, []);

  const handleChange = (field, value) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
    setSuccess('');
    setError('');
  };

  const addCustomCertification = () => {
    const trimmed = customCert.trim();
    if (!trimmed) return;
    const existing = profile.certifications || [];
    if (!existing.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      handleChange('certifications', [...existing, trimmed]);
    }
    setCustomCert('');
    setShowCertInput(false);
  };

  const addArrayItem = (field, template) => {
    setProfile((prev) => ({ ...prev, [field]: [...(prev[field] || []), template] }));
    setSuccess('');
  };

  const updateArrayItem = (field, index, key, value) => {
    setProfile((prev) => {
      const arr = [...(prev[field] || [])];
      arr[index] = { ...arr[index], [key]: value };
      return { ...prev, [field]: arr };
    });
    setSuccess('');
  };

  const removeArrayItem = (field, index) => {
    setProfile((prev) => ({ ...prev, [field]: (prev[field] || []).filter((_, i) => i !== index) }));
    setSuccess('');
  };

  const toggleArrayItem = (field, item) => {
    setProfile((prev) => {
      const arr = prev[field] || [];
      return { ...prev, [field]: arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item] };
    });
    setSuccess('');
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const validTypes = ['image/jpeg','image/png','image/gif','image/webp','image/svg+xml'];
    if (!validTypes.includes(file.type)) { setError('Please upload a valid image file (JPG, PNG, GIF, WebP, or SVG).'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('Logo file must be under 5MB.'); return; }
    const reader = new FileReader();
    reader.onload = (event) => { handleChange('company_logo', event.target.result); setError(''); };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    handleChange('company_logo', '');
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  const handleImageUpload = (callback) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/gif,image/webp';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) { setError('Image must be under 5MB.'); return; }
      const reader = new FileReader();
      reader.onload = (ev) => callback(ev.target.result);
      reader.readAsDataURL(file);
    };
    input.click();
  };
   
  const cleanText = (text) => {
  return text
    .replace(/<[^>]*>/g, '')          // remove HTML
    .replace(/\s+/g, ' ')             // fix spacing
    .replace(/About .*?–/gi, '')      // remove repeated headings
    .trim();
};
  // ─── FIX: AI Assist now has prompts for all supported fields ───
const handleAiAssist = async (field) => {
  if (!profile.company_name) {
    setError('Please enter your company name first.');
    return;
  }

  if (!profile.about_company || profile.about_company.trim().length < 20) {
    setError('Please paste or write company content first.');
    return;
  }

  setAiLoading(true);
  setError('');

  try {
    const prompts = {
      about_company:`Rewrite the following company "About Us" content into a professional format.

IMPORTANT:
- Use ONLY the given content
- DO NOT add new facts
- DO NOT guess

Content:
${profile.about_company}

Make it:
- 4-5 lines
- Clear
- Professional
`
    };

    const prompt = prompts[field];

    if (!prompt) {
      console.error("Invalid field:", field);
      setError('AI Assist is not available for this field.');
      return;
    }

    const response = await api.post('/api/proposals/generate-section', {
      section_key: field === 'capability_statement' ? 'capability' : 'about',
      prompt,
      opportunity_title: profile.company_name,
      vendor_profile: profile,
    });

    console.log("AI RESPONSE:", response.data); // ✅ debug

    const content = response.data.content || response.data.text || '';

    if (content && content.trim().length > 20) {
      handleChange(field, content.replace(/<[^>]+>/g, ''));
    } else {
      setError('AI returned empty response. Try again.');
    }

  } catch (err) {
    console.error("AI ERROR:", err);
    setError('AI generation failed. Please try again.');
  } finally {
    setAiLoading(false);
  }
};
const handleWebsiteAssist = async () => {
  const trimmedUrl = websiteUrl.trim();

  if (!trimmedUrl) {
    setError('Please enter your company website URL.');
    return;
  }

  if (
    trimmedUrl.includes('youtube.com') ||
    trimmedUrl.includes('instagram.com') ||
    trimmedUrl.includes('facebook.com')
  ) {
    setError('Please enter a proper company website.');
    return;
  }

  setWebsiteLoading(true);
  setError('');
  setSuccess('');

  try {
    const response = await api.post('/api/vendor-profile/fetch-company-about', {
      url: trimmedUrl,
      company_name: profile.company_name || 'the company',
      vendor_profile: profile,
    });

    const content = response.data.about_company || '';
  
    const cleaned = content
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!cleaned) {
  setError('Could not fetch website. Please paste content or use AI Assist.');
  return;
}
    const isFake = cleaned.includes("This company provides professional services");

if (cleaned.length > 100 && !isFake) {
  const formatted = cleaned
    .split('. ')
    .slice(0, 5)
    .join('.\n\n');

  handleChange('about_company', formatted);
  setManualMode(false);
} else {
  handleChange('about_company', '');
  setManualMode(true);
}
  } catch (err) {
    setError(err?.response?.data?.detail || 'Something went wrong');
  } finally {
    setWebsiteLoading(false);
  }
};
  const handleImproveWithAI = async () => {
  if (!manualInput) {
    setError('Please write something first.');
    return;
  }

  setAiLoading(true);
  setError('');

  try {
    const response = await api.post('/api/proposals/generate-section', {
      section_key: 'about',
      prompt: `
Improve and rewrite this into a professional company "About Us":

${manualInput}

Make it:
- Professional
- 5-6 lines
- Government contracting style
`,
      opportunity_title: profile.company_name,
      vendor_profile: profile,
    });

    handleChange('about_company', response.data.content || '');
    setSuccess('AI improved your content ✅');
    setShowManualInput(false);
    setManualInput('');
  } catch {
    setError('AI failed. Try again.');
  } finally {
    setAiLoading(false);
  }
};
const handleImproveAbout = async () => {
  if (!profile.about_company) {
    setError("Nothing to improve");
    return;
  }

  setAiLoading(true);
  setError('');

  try {
    const res = await api.post('/api/vendor-profile/improve-about', {
      text: profile.about_company,
      company_name: profile.company_name
    });

    handleChange('about_company', res.data.content);
    setSuccess("Improved with AI ✨");

  } catch {
    setError("AI improve failed");
  } finally {
    setAiLoading(false);
  }
};
  const handleSaveAndLock = async () => {
    setSaving(true);
    setSuccess('');
    setError('');
    try {
      localStorage.setItem('vendorProfile', JSON.stringify(profile));
      await api.post('/api/vendor-profile', profile);
      setSuccess('Vendor profile saved successfully. Data will auto-fill in proposals.');
      setEditMode(false);
    } catch {
      setSuccess('Profile saved locally. Data will auto-fill in proposals.');
      setEditMode(false);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccess('');
    setError('');
    try {
      localStorage.setItem('vendorProfile', JSON.stringify(profile));
      await api.post('/api/vendor-profile', profile);
      setSuccess('Vendor profile saved successfully.');
    } catch {
      setSuccess('Profile saved locally.');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = INPUT_CLASS;
  const selectClass = SELECT_CLASS;
  const labelClass = LABEL_CLASS;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-navy">Company Profile</h1>
          <p className="text-gray-500 mt-1">Manage your company information for proposal generation</p>
        </div>
        <div className="flex items-center gap-3">
          {!editMode ? (
            <button type="button" onClick={() => setEditMode(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-navy hover:bg-navy-light text-white transition-all cursor-pointer shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 3.487a2.1 2.1 0 113.001 2.948L8.122 18.177l-4.122.914.914-4.122L16.862 3.487z" /></svg>
              Edit Profile
            </button>
          ) : (
            <button type="button" onClick={handleSaveAndLock} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-accent hover:bg-accent-dark text-white transition-all disabled:opacity-50 cursor-pointer shadow-md">
              {saving ? (
                <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Saving...</>
              ) : (
                <><CheckCircleIcon className="w-4 h-4" />Save Profile</>
              )}
            </button>
          )}
        </div>
      </div>
       

      {!editMode && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircleIcon className="w-5 h-5 text-blue-600" />
            <p className="text-sm text-blue-700 font-medium">Profile saved. This data will auto-fill in your proposals.</p>
          </div>
          <button type="button" onClick={() => setEditMode(true)} className="text-xs font-semibold text-blue-700 hover:text-blue-900 bg-blue-100 hover:bg-blue-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer">Edit</button>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-center gap-3">
          <CheckCircleIcon className="w-5 h-5 text-accent flex-shrink-0" />
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center gap-3">
          <ExclamationTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <fieldset disabled={!editMode} className={!editMode ? 'opacity-80' : ''}>

          {/* ─── 1. COMPANY INFORMATION ──────────────────────────── */}
          <Section icon={BuildingOffice2Icon} title="Company Information" id="section-company-overview">
            {/* Logo Upload */}
            <div className="mb-6 pb-6 border-b border-gray-100">
              <label className={labelClass}>
                <span className="flex items-center gap-2"><PhotoIcon className="w-4 h-4" /> Company Logo</span>
                <span className="text-xs text-gray-400 font-normal mt-0.5 block">JPG, PNG, GIF, WebP, or SVG — max 5MB. Appears on proposal cover pages.</span>
              </label>
              <div className="flex items-center gap-5 mt-3">
                {profile.company_logo ? (
                  <div className="relative group">
                    <img src={profile.company_logo} alt="Company logo" className="w-24 h-24 object-contain rounded-lg border border-gray-200 bg-white p-1" />
                    <button type="button" onClick={removeLogo} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"><TrashIcon className="w-3.5 h-3.5" /></button>
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50"><PhotoIcon className="w-8 h-8 text-gray-300" /></div>
                )}
                <div>
                  <input ref={logoInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml" onChange={handleLogoUpload} className="hidden" />
                  <button type="button" onClick={() => logoInputRef.current?.click()} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-navy bg-navy/5 hover:bg-navy/10 rounded-lg transition-colors cursor-pointer">
                    <PhotoIcon className="w-4 h-4" />{profile.company_logo ? 'Change Logo' : 'Upload Logo'}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label className={labelClass}>Company Name <span className="text-red-400">*</span></label>
                <input type="text" required value={profile.company_name} onChange={(e) => handleChange('company_name', e.target.value)} placeholder="e.g., Acme Federal Solutions, LLC" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>CAGE Code</label>
                <input type="text" value={profile.cage_code} onChange={(e) => handleChange('cage_code', e.target.value)} placeholder="e.g., 5ABC1" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>DUNS/UEI Number</label>
                <input type="text" value={profile.duns_number} onChange={(e) => handleChange('duns_number', e.target.value)} placeholder="e.g., 123456789" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>EIN/TIN</label>
                <input type="text" value={profile.ein_tin} onChange={(e) => handleChange('ein_tin', e.target.value)} placeholder="e.g., 12-3456789" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Business Registration / Incorporation Date</label>
                <input type="date" value={profile.business_registration_date} onChange={(e) => handleChange('business_registration_date', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Organizational Type</label>
                <select value={profile.organizational_type} onChange={(e) => handleChange('organizational_type', e.target.value)} className={selectClass}>
                  {orgTypeOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>State of Incorporation</label>
                <input type="text" value={profile.state_of_incorporation} onChange={(e) => handleChange('state_of_incorporation', e.target.value)} placeholder="e.g., Virginia" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Socioeconomic Status</label>
                <select value={profile.socioeconomic_status} onChange={(e) => handleChange('socioeconomic_status', e.target.value)} className={selectClass}>
                  {socioeconomicOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Years in Business</label>
                <input type="number" min="0" value={profile.years_in_business} onChange={(e) => handleChange('years_in_business', e.target.value)} placeholder="e.g., 10" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Number of Employees</label>
                <input type="text" value={profile.number_of_employees} onChange={(e) => handleChange('number_of_employees', e.target.value)} placeholder="e.g., 150" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Annual Revenue</label>
                <input type="text" value={profile.annual_revenue} onChange={(e) => handleChange('annual_revenue', e.target.value)} placeholder="e.g., $25M" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Facility Security Clearance Level</label>
                <select value={profile.security_clearance_level} onChange={(e) => handleChange('security_clearance_level', e.target.value)} className={selectClass}>
                  {clearanceLevelOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>NAICS / SIC Code <span className="text-gray-400 font-normal">(select from official 2022 NAICS list)</span></label>
                <NaicsCodeSelector selectedCodes={profile.naics_codes || []} onChange={(codes) => handleChange('naics_codes', codes)} />
              </div>
            </div>

            {/* About Company */}
            <div className="mt-6 pt-6 border-t border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <label className={labelClass + ' mb-0'}>About Company</label>
                <button type="button" onClick={() => handleAiAssist('about_company')} disabled={aiLoading || websiteLoading} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50">
                  <SparklesIcon className="w-3.5 h-3.5" />
                  {aiLoading ? 'Generating...' : 'AI Assist'}
                </button>
              </div>

              {/* Website URL fetch row */}
              <div className="flex gap-2 mb-3">
                <div className="relative flex-1">
                  <GlobeAltIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    inputMode="url"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleWebsiteAssist();
                      }
                    }}
                    placeholder="Paste your company website URL to auto-fill (e.g. yourcompany.com)"
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-200 bg-purple-50/30 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400 transition-all placeholder:text-gray-400"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleWebsiteAssist}
                  disabled={websiteLoading || aiLoading || !websiteUrl}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {websiteLoading ? (
                    <><svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Fetching...</>
                  ) : (
                    <><SparklesIcon className="w-3.5 h-3.5" />Fetch & Fill</>
                  )}
                </button>
              </div>

              <textarea
  value={profile.about_company || ''}
  onChange={(e) => handleChange('about_company', e.target.value)}
  placeholder={
    manualMode
      ? "Paste company details here and click AI Assist..."
      : "Write about your company — history, mission, vision..."
  }
  rows={5}
  className={`${inputClass} resize-y`}
/>
{manualMode && (
  <p className="text-xs text-orange-600 mt-2">
    Website fetch failed. Paste company info and click AI Assist.
  </p>
)}
            </div>
          </Section>

          {/* ─── 2. ADDRESS ──────────────────────────────────────── */}
          <Section icon={MapPinIcon} title="Address" id="section-contact-information">
            <div className="space-y-5">
              <div>
                <label className={labelClass}>Registered / Headquarters Address</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="md:col-span-2"><input type="text" value={profile.registered_address_line1} onChange={(e) => handleChange('registered_address_line1', e.target.value)} placeholder="Address Line 1" className={inputClass} /></div>
                  <div className="md:col-span-2"><input type="text" value={profile.registered_address_line2} onChange={(e) => handleChange('registered_address_line2', e.target.value)} placeholder="Address Line 2 (optional)" className={inputClass} /></div>
                  <div><input type="text" value={profile.registered_address_city} onChange={(e) => handleChange('registered_address_city', e.target.value)} placeholder="City" className={inputClass} /></div>
                  <div><input type="text" value={profile.registered_address_state} onChange={(e) => handleChange('registered_address_state', e.target.value)} placeholder="State" className={inputClass} /></div>
                  <div><input type="text" value={profile.registered_address_zip} onChange={(e) => handleChange('registered_address_zip', e.target.value)} placeholder="Zip Code" className={inputClass} /></div>
                  <div><input type="text" value={profile.registered_address_country} onChange={(e) => handleChange('registered_address_country', e.target.value)} placeholder="Country" className={inputClass} /></div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className={labelClass + ' mb-0'}>Branch Offices <span className="text-gray-400 font-normal">(optional)</span></label>
                  <button type="button" onClick={() => addArrayItem('branches', { name: '', line1: '', line2: '', city: '', state: '', zip: '', country: '' })} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-navy bg-navy/5 hover:bg-navy/10 rounded-lg transition-colors cursor-pointer">
                    <PlusIcon className="w-3.5 h-3.5" /> Add Branch
                  </button>
                </div>
                {(profile.branches || []).length === 0 ? (
                  <p className="text-sm text-gray-400 italic">No branch offices added.</p>
                ) : (
                  <div className="space-y-3">
                    {(profile.branches || []).map((branch, i) => (
                      <div key={i} className="border border-gray-200 rounded-lg p-4 bg-gray-50/50 relative">
                        <button type="button" onClick={() => removeArrayItem('branches', i)} className="absolute top-3 right-3 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors cursor-pointer"><TrashIcon className="w-4 h-4" /></button>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pr-8">
                          <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Branch Name</label>
                            <input type="text" value={branch.name} onChange={(e) => updateArrayItem('branches', i, 'name', e.target.value)} placeholder="e.g., West Coast Office" className={inputClass} />
                          </div>
                          <div className="md:col-span-2"><input type="text" value={branch.line1 || ''} onChange={(e) => updateArrayItem('branches', i, 'line1', e.target.value)} placeholder="Address Line 1" className={inputClass} /></div>
                          <div className="md:col-span-2"><input type="text" value={branch.line2 || ''} onChange={(e) => updateArrayItem('branches', i, 'line2', e.target.value)} placeholder="Address Line 2 (optional)" className={inputClass} /></div>
                          <div><input type="text" value={branch.city || ''} onChange={(e) => updateArrayItem('branches', i, 'city', e.target.value)} placeholder="City" className={inputClass} /></div>
                          <div><input type="text" value={branch.state || ''} onChange={(e) => updateArrayItem('branches', i, 'state', e.target.value)} placeholder="State" className={inputClass} /></div>
                          <div><input type="text" value={branch.zip || ''} onChange={(e) => updateArrayItem('branches', i, 'zip', e.target.value)} placeholder="Zip Code" className={inputClass} /></div>
                          <div><input type="text" value={branch.country || ''} onChange={(e) => updateArrayItem('branches', i, 'country', e.target.value)} placeholder="Country" className={inputClass} /></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Section>

          {/* ─── 3. BUSINESS CLASSIFICATION ──────────────────────── */}
          <Section icon={ShieldCheckIcon} title="Business Classification" id="section-business-classifications">
            <label className={labelClass}>Select all classifications that apply to your business</label>
            <div className="flex flex-wrap gap-2">
              {classificationOptions.map((cls) => {
                const isSelected = (profile.business_classifications || []).includes(cls);
                return (
                  <button key={cls} type="button" onClick={() => toggleArrayItem('business_classifications', cls)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${isSelected ? 'bg-navy text-white border-navy' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>
                    {isSelected && '✓ '}{cls}
                  </button>
                );
              })}
            </div>
          </Section>

          {/* ─── 4. CERTIFICATIONS ───────────────────────────────── */}
          <Section icon={DocumentCheckIcon} title="Certifications" id="section-certifications">
            <label className={labelClass}>
              Select certifications <span className="text-gray-400 font-normal">(select all that apply, or add custom)</span>
            </label>

            <div className="flex flex-wrap gap-2">
              {/* ── FIX: Predefined certification pills ── */}
              {certificationOptions.map((cert) => {
                const isSelected = (profile.certifications || []).includes(cert);
                return (
                  <button
                    key={cert}
                    type="button"
                    onClick={() => toggleArrayItem('certifications', cert)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-accent text-white border-accent'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    {isSelected && '✓ '}{cert}
                  </button>
                );
              })}

              {/* Custom certifications (not in predefined list) */}
              {(profile.certifications || [])
                .filter((cert) => !certificationOptions.includes(cert))
                .map((cert, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-accent text-white border border-accent"
                  >
                    ✓ {cert}
                    <button
                      type="button"
                      onClick={() =>
                        handleChange(
                          'certifications',
                          profile.certifications.filter((c) => c !== cert)
                        )
                      }
                      className="ml-1 text-white/80 hover:text-white cursor-pointer leading-none"
                    >
                      ✕
                    </button>
                  </div>
                ))}

              {/* Add Custom button */}
              <button
                type="button"
                onClick={() => setShowCertInput((v) => !v)}
                className="px-3 py-1.5 rounded-full text-xs font-medium border border-dashed border-blue-400 text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
              >
                + Add Custom
              </button>
            </div>

            {/* Custom cert input */}
            {showCertInput && (
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={customCert}
                  onChange={(e) => setCustomCert(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); addCustomCertification(); }
                    if (e.key === 'Escape') { setShowCertInput(false); setCustomCert(''); }
                  }}
                  placeholder="Enter certification (e.g., AWS Certified, Azure, PCI DSS...)"
                  className={`${inputClass} flex-1`}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={addCustomCertification}
                  className="bg-navy text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-navy-light transition-colors cursor-pointer whitespace-nowrap"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => { setShowCertInput(false); setCustomCert(''); }}
                  className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}
          </Section>

          {/* ─── 5. CONTRACT VEHICLES ────────────────────────────── */}
          <Section icon={BriefcaseIcon} title="Contract Vehicles" id="section-contract-vehicles">
            <label className={labelClass}>Select all contract vehicles <span className="text-gray-400 font-normal">(select all that apply)</span></label>
            <div className="flex flex-wrap gap-2">
              {contractVehicleOptions.map((cv) => {
                const isSelected = (profile.contract_vehicles || []).includes(cv);
                return (
                  <button key={cv} type="button" onClick={() => toggleArrayItem('contract_vehicles', cv)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${isSelected ? 'bg-accent text-white border-accent' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>
                    {isSelected && '✓ '}{cv}
                  </button>
                );
              })}
            </div>
          </Section>

          {/* ─── 6. GOVERNMENT REGISTRATION ──────────────────────── */}
          <Section icon={ShieldCheckIcon} title="Government Registration" id="section-government-registrations">
            <div className="mb-6 pb-6 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-navy mb-4">SAM.gov Registration</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className={labelClass}>Registration Status</label>
                  <select value={profile.sam_registration_status} onChange={(e) => handleChange('sam_registration_status', e.target.value)} className={selectClass}>
                    {samStatusOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Expiration Date</label>
                  <input type="date" value={profile.sam_expiration_date} onChange={(e) => handleChange('sam_expiration_date', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>SAM.gov User ID</label>
                  <input type="text" value={profile.sam_login_user} onChange={(e) => handleChange('sam_login_user', e.target.value)} placeholder="Your SAM.gov login username" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>SAM.gov Password</label>
                  <input type="password" value={profile.sam_login_password} onChange={(e) => handleChange('sam_login_password', e.target.value)} placeholder="Your SAM.gov login password" className={inputClass} />
                </div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-navy">Other Government Registrations</h3>
                <button type="button" onClick={() => addArrayItem('government_portals', { portal: '', registration_id: '', status: 'Registered' })} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-navy bg-navy/5 hover:bg-navy/10 rounded-lg transition-colors cursor-pointer">
                  <PlusIcon className="w-3.5 h-3.5" /> Add Portal
                </button>
              </div>
              {(profile.government_portals || []).length === 0 ? (
                <p className="text-sm text-gray-400 italic">No other government portals added.</p>
              ) : (
                <div className="space-y-3">
                  {(profile.government_portals || []).map((portal, i) => (
                    <div key={i} className="border border-gray-200 rounded-lg p-4 bg-gray-50/50 relative">
                      <button type="button" onClick={() => removeArrayItem('government_portals', i)} className="absolute top-3 right-3 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors cursor-pointer"><TrashIcon className="w-4 h-4" /></button>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pr-8">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Portal Name</label>
                          <select value={portal.portal} onChange={(e) => updateArrayItem('government_portals', i, 'portal', e.target.value)} className={selectClass}>
                            <option value="">Select portal...</option>
                            <option value="SBA.gov">SBA.gov</option>
                            <option value="USASpending.gov">USASpending.gov</option>
                            <option value="FPDS.gov">FPDS.gov</option>
                            <option value="Grants.gov">Grants.gov</option>
                            <option value="Acquisition.gov">Acquisition.gov</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Registration / Entity ID</label>
                          <input type="text" value={portal.registration_id} onChange={(e) => updateArrayItem('government_portals', i, 'registration_id', e.target.value)} placeholder="Your registration ID" className={inputClass} />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                          <select value={portal.status} onChange={(e) => updateArrayItem('government_portals', i, 'status', e.target.value)} className={selectClass}>
                            <option value="Registered">Registered</option>
                            <option value="Pending">Pending</option>
                            <option value="Expired">Expired</option>
                            <option value="Not Registered">Not Registered</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Section>

          {/* ─── 7. CONTACT INFORMATION ──────────────────────────── */}
          <Section icon={PhoneIcon} title="Contact Information" id="section-contact-details">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={labelClass}>Contact Name</label>
                <div className="relative">
                  <UserCircleIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input type="text" value={profile.contact_name} onChange={(e) => handleChange('contact_name', e.target.value)} placeholder="Full name" className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue transition-all" />
                </div>
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <div className="relative">
                  <EnvelopeIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input type="email" value={profile.contact_email} onChange={(e) => handleChange('contact_email', e.target.value)} placeholder="email@company.com" className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue transition-all" />
                </div>
              </div>
              <div>
                <label className={labelClass}>Phone</label>
                <div className="relative">
                  <PhoneIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input type="tel" value={profile.contact_phone} onChange={(e) => handleChange('contact_phone', e.target.value)} placeholder="(555) 123-4567" className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue transition-all" />
                </div>
              </div>
              <div>
                <label className={labelClass}>Address</label>
                <div className="relative">
                  <MapPinIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input type="text" value={profile.contact_address} onChange={(e) => handleChange('contact_address', e.target.value)} placeholder="123 Main St, City, State ZIP" className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue transition-all" />
                </div>
              </div>
            </div>
          </Section>

          {/* Save Button */}
          {editMode && (
            <div className="flex justify-end gap-3">
              <button type="button" onClick={handleSaveAndLock} disabled={saving} className="bg-accent hover:bg-accent-dark text-white px-8 py-3 rounded-lg font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm hover:shadow-md cursor-pointer">
                {saving ? (
                  <><svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Saving...</>
                ) : (
                  <><CheckCircleIcon className="w-5 h-5" />Save Profile</>
                )}
              </button>
            </div>
          )}
        </fieldset>
      </form>
    </div>
  );
}
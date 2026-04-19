import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  HeartIcon,
  EyeIcon,
  SparklesIcon,
  XMarkIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolid } from '@heroicons/react/24/solid';

const TEMPLATES = [
  { id:'fed-const', name:'Federal Construction Services', sub:'Infrastructure & Civil Works', cat:'Construction', tags:['Davis-Bacon','FAR 36','Bonding','OSHA'], desc:'Construction-focused proposal for federal building projects covering Davis-Bacon compliance, bonding requirements, and safety plans.', uses:42, rating:4.8, cover:{ bg:'#9a3412', bg2:'#c2410c', accent:'#fed7aa', pat:'grid', icon:'🏗️' }, sections:['cover_page','executive_summary','technical_approach','management_approach','staffing_plan','cost_price_proposal','quality_assurance','risk_mitigation','compliance_matrix'] },
  { id:'mgmt-cons', name:'Management Consulting', sub:'Advisory & Strategy', cat:'Consulting', tags:['Strategy','Change Mgmt','Process Improvement'], desc:'Strategic management consulting proposal for federal agencies covering organizational transformation and process optimization.', uses:87, rating:4.9, cover:{ bg:'#4c1d95', bg2:'#6d28d9', accent:'#ddd6fe', pat:'dots', icon:'📊' }, sections:['cover_page','executive_summary','vendor_profile','past_performance','technical_approach','management_approach','staffing_plan','key_personnel','cost_price_proposal','risk_mitigation','transition_plan'] },
  { id:'cyber', name:'Cybersecurity Operations', sub:'SOC & Threat Intelligence', cat:'Cybersecurity', tags:['CMMC','NIST','Zero Trust','SOC'], desc:'Comprehensive cybersecurity proposal covering SOC operations, threat intelligence, CMMC compliance, and zero-trust architecture.', uses:134, rating:4.9, cover:{ bg:'#052e16', bg2:'#166534', accent:'#86efac', pat:'circuit', icon:'🛡️' }, sections:['cover_page','executive_summary','technical_approach','management_approach','staffing_plan','key_personnel','cost_price_proposal','quality_assurance','risk_mitigation','compliance_matrix'] },
  { id:'defense', name:'Defense Systems Support', sub:'C4ISR & Military Tech', cat:'Defense & Military', tags:['C4ISR','ITAR','Clearance','DoD'], desc:'Defense-focused proposal for military systems support including C4ISR, secure communications, and logistics modernization.', uses:59, rating:4.7, cover:{ bg:'#1e3a5f', bg2:'#1d4ed8', accent:'#bfdbfe', pat:'lines', icon:'⚙️' }, sections:['cover_page','executive_summary','vendor_profile','socioeconomic_status','capability_statement','past_performance','technical_approach','management_approach','staffing_plan','key_personnel','cost_price_proposal','quality_assurance','risk_mitigation','transition_plan','compliance_matrix'] },
  { id:'health-it', name:'Healthcare IT Services', sub:'EHR & Clinical Systems', cat:'Healthcare', tags:['HIPAA','EHR','HL7','HITECH'], desc:'Healthcare-focused IT proposal addressing EHR integration, HIPAA compliance, interoperability, and clinical workflow optimization.', uses:73, rating:4.8, cover:{ bg:'#0c4a6e', bg2:'#0d9488', accent:'#a5f3fc', pat:'dots', icon:'🏥' }, sections:['cover_page','executive_summary','vendor_profile','capability_statement','past_performance','technical_approach','staffing_plan','key_personnel','cost_price_proposal','quality_assurance','risk_mitigation','compliance_matrix'] },
  { id:'it-mod', name:'Enterprise IT Modernization', sub:'Cloud & DevSecOps', cat:'IT & Technology', tags:['Cloud','DevSecOps','Agile','FedRAMP'], desc:'Complete proposal for federal IT infrastructure modernization including cloud migration, DevSecOps, and FedRAMP authorization.', uses:201, rating:5.0, cover:{ bg:'#0f172a', bg2:'#1e293b', accent:'#38bdf8', pat:'circuit', icon:'💻' }, sections:['cover_page','executive_summary','vendor_profile','socioeconomic_status','capability_statement','past_performance','technical_approach','management_approach','staffing_plan','key_personnel','cost_price_proposal','quality_assurance','risk_mitigation','implementation_timeline','compliance_matrix','compliance_checklist'] },
  { id:'mkt', name:'Federal Marketing Services', sub:'Public Affairs & Outreach', cat:'Marketing & Comms', tags:['Public Affairs','Digital Media','Outreach'], desc:'Marketing and communications proposal for federal outreach campaigns, public affairs, and digital media production.', uses:28, rating:4.6, cover:{ bg:'#1e1b4b', bg2:'#4338ca', accent:'#c7d2fe', pat:'diagonal', icon:'📣' }, sections:['cover_page','executive_summary','vendor_profile','past_performance','technical_approach','management_approach','staffing_plan','cost_price_proposal','quality_assurance'] },
  { id:'rd', name:'R&D Innovation Program', sub:'SBIR / STTR & Research', cat:'Research & Dev', tags:['SBIR','STTR','Basic Research','DARPA'], desc:'Research and development proposal for federal innovation programs covering SBIR/STTR, technology readiness levels, and IP protection.', uses:45, rating:4.8, cover:{ bg:'#064e3b', bg2:'#059669', accent:'#d1fae5', pat:'grid', icon:'🔬' }, sections:['cover_page','executive_summary','vendor_profile','capability_statement','past_performance','technical_approach','staffing_plan','key_personnel','cost_price_proposal','risk_mitigation','implementation_timeline','compliance_checklist'] },
  { id:'logistics', name:'Logistics & Supply Chain', sub:'Warehousing & Distribution', cat:'Construction', tags:['DLA','Supply Chain','Warehousing','DFAR'], desc:'Logistics support proposal covering warehousing, distribution, inventory management, and supply chain resilience.', uses:31, rating:4.7, cover:{ bg:'#431407', bg2:'#9a3412', accent:'#fed7aa', pat:'lines', icon:'🚚' }, sections:['cover_page','executive_summary','vendor_profile','technical_approach','management_approach','staffing_plan','cost_price_proposal','quality_assurance','risk_mitigation','transition_plan'] },
  { id:'training', name:'Training & Education Services', sub:'eLearning & Workforce Dev', cat:'Consulting', tags:['Training','eLearning','SCORM','Section 508'], desc:'Training and workforce development covering instructor-led training, eLearning, and Section 508 accessibility compliance.', uses:52, rating:4.8, cover:{ bg:'#1e3a5f', bg2:'#7c3aed', accent:'#e0e7ff', pat:'dots', icon:'🎓' }, sections:['cover_page','executive_summary','vendor_profile','past_performance','technical_approach','staffing_plan','key_personnel','cost_price_proposal','quality_assurance','implementation_timeline'] },
  { id:'env', name:'Environmental Services', sub:'Remediation & Compliance', cat:'Research & Dev', tags:['NEPA','EPA','Remediation','CERCLA'], desc:'Environmental services proposal covering NEPA compliance, site remediation, hazardous waste management, and sustainability.', uses:19, rating:4.6, cover:{ bg:'#052e16', bg2:'#15803d', accent:'#bbf7d0', pat:'grid', icon:'🌿' }, sections:['cover_page','executive_summary','vendor_profile','past_performance','technical_approach','management_approach','staffing_plan','cost_price_proposal','quality_assurance','risk_mitigation','compliance_matrix'] },
  { id:'finance', name:'Financial Management Services', sub:'Audit & Accounting Support', cat:'Consulting', tags:['GAAP','OMB A-123','Audit','CFO Act'], desc:'Financial management proposal covering federal accounting standards, improper payment review, internal controls, and CFO Act compliance.', uses:38, rating:4.7, cover:{ bg:'#1c1917', bg2:'#44403c', accent:'#fcd34d', pat:'diagonal', icon:'💰' }, sections:['cover_page','executive_summary','vendor_profile','capability_statement','past_performance','technical_approach','staffing_plan','key_personnel','cost_price_proposal','quality_assurance','risk_mitigation','compliance_matrix'] },
];

const CATS = ['All','Construction','Consulting','Cybersecurity','Defense & Military','Healthcare','IT & Technology','Marketing & Comms','Research & Dev'];

const SECTION_LABELS = {
  cover_page:'Cover Page', executive_summary:'Executive Summary', vendor_profile:'Vendor Profile',
  socioeconomic_status:'Socioeconomic Status', capability_statement:'Capability Statement',
  past_performance:'Past Performance', technical_approach:'Technical Approach',
  management_approach:'Management Approach', staffing_plan:'Staffing Plan',
  key_personnel:'Key Personnel / Resumes', cost_price_proposal:'Cost / Price Proposal',
  quality_assurance:'Quality Assurance Plan', risk_mitigation:'Risk Mitigation Plan',
  transition_plan:'Transition / Phase-In Plan', subcontracting_plan:'Small Business Subcontracting Plan',
  compliance_matrix:'Compliance Matrix', implementation_timeline:'Implementation Timeline',
  compliance_checklist:'Compliance Checklist',
};

function patternDefs(type, accent, uid) {
  const c = accent + '55';
  if (type === 'grid') return <pattern id={`p${uid}`} width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0L0 0 0 20" fill="none" stroke={c} strokeWidth="0.6"/></pattern>;
  if (type === 'dots') return <pattern id={`p${uid}`} width="16" height="16" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.5" fill={c}/></pattern>;
  if (type === 'circuit') return <pattern id={`p${uid}`} width="40" height="40" patternUnits="userSpaceOnUse"><path d="M10 10h20M30 10v20M10 30h20M10 10v20" fill="none" stroke={c} strokeWidth="0.7"/><circle cx="10" cy="10" r="2" fill={c}/><circle cx="30" cy="10" r="2" fill={c}/><circle cx="30" cy="30" r="2" fill={c}/><circle cx="10" cy="30" r="2" fill={c}/></pattern>;
  if (type === 'diagonal') return <pattern id={`p${uid}`} width="18" height="18" patternUnits="userSpaceOnUse"><path d="M0 18L18 0" stroke={c} strokeWidth="0.8"/></pattern>;
  return <pattern id={`p${uid}`} width="12" height="12" patternUnits="userSpaceOnUse"><path d="M0 6L12 6" stroke={c} strokeWidth="0.5"/></pattern>;
}

function CoverThumb({ cover, name, sub, full = false }) {
  const uid = name.replace(/\s/g, '') + (full ? 'f' : 't');
  return (
    <div style={{ background: `linear-gradient(145deg,${cover.bg} 0%,${cover.bg2} 100%)`, position: 'relative', overflow: 'hidden', width: '100%', height: full ? '100%' : 180 }}>
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} xmlns="http://www.w3.org/2000/svg">
        <defs>{patternDefs(cover.pat, cover.accent, uid)}</defs>
        <rect width="100%" height="100%" fill={`url(#p${uid})`} opacity="0.35" />
      </svg>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: cover.accent, opacity: 0.9 }} />
      <div style={{ position: 'absolute', top: -28, right: -28, width: 80, height: 80, background: cover.accent + '22', borderRadius: '50%' }} />
      <div style={{ position: 'absolute', bottom: -18, left: -18, width: 65, height: 65, background: cover.accent + '18', borderRadius: '50%' }} />
      <div style={{ position: 'absolute', top: full ? '26%' : 18, left: '50%', transform: 'translateX(-50%)', fontSize: full ? 42 : 32, filter: 'drop-shadow(0 2px 8px rgba(0,0,0,.35))' }}>{cover.icon}</div>
      {full && <div style={{ position: 'absolute', top: 14, left: 14, background: 'rgba(255,255,255,0.2)', borderRadius: 3, width: 32, height: 12 }} />}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top,rgba(0,0,0,.78) 0%,rgba(0,0,0,.25) 65%,transparent 100%)', padding: full ? '52px 16px 16px' : '38px 12px 10px' }}>
        <p style={{ color: '#fff', fontWeight: 800, fontSize: full ? 14 : 11, lineHeight: 1.3, margin: 0, textShadow: '0 1px 4px rgba(0,0,0,.5)' }}>{name}</p>
        <p style={{ color: cover.accent, fontSize: full ? 12 : 9, margin: '2px 0 0', fontWeight: 600 }}>{sub}</p>
      </div>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: cover.accent }} />
    </div>
  );
}

function Stars({ rating }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{ fontSize: 10, color: i <= Math.round(rating) ? '#f59e0b' : '#d1d5db' }}>★</span>
      ))}
      <span style={{ fontSize: 11, color: '#6b7280', marginLeft: 3 }}>{rating.toFixed(1)}</span>
    </div>
  );
}

function PreviewModal({ template, onClose, onUse, isFav, onToggleFav }) {
  if (!template) return null;
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,15,25,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(6px)' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 20, overflow: 'hidden', maxWidth: 860, width: '100%', display: 'flex', maxHeight: '92vh', boxShadow: '0 40px 100px rgba(0,0,0,.5)', border: '1px solid #e5e7eb' }}>
        {/* Cover side */}
        <div style={{ width: 300, flexShrink: 0, position: 'relative', minHeight: 480 }}>
          <div style={{ position: 'absolute', inset: 0 }}>
            <CoverThumb cover={template.cover} name={template.name} sub={template.sub} full />
          </div>
        </div>
        {/* Detail side */}
        <div style={{ flex: 1, padding: '28px 28px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <span style={{ display: 'inline-block', background: '#f1f5f9', color: '#64748b', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 10px', borderRadius: 20, marginBottom: 8 }}>{template.cat}</span>
              <h2 style={{ margin: '0 0 4px', fontSize: 21, fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>{template.name}</h2>
              <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>{template.sub}</p>
            </div>
            <div style={{ display: 'flex', gap: 8, marginLeft: 12 }}>
              <button onClick={() => onToggleFav(template.id)} style={{ background: isFav ? '#fef2f2' : '#f8fafc', border: `1px solid ${isFav ? '#fecaca' : '#e2e8f0'}`, borderRadius: 10, padding: '7px 12px', cursor: 'pointer', color: isFav ? '#ef4444' : '#94a3b8', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600 }}>
                {isFav ? <HeartSolid style={{ width: 13, height: 13 }} /> : <HeartIcon style={{ width: 13, height: 13 }} />}
                {isFav ? 'Saved' : 'Save'}
              </button>
              <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: 10, padding: '7px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <XMarkIcon style={{ width: 15, height: 15, color: '#64748b' }} />
              </button>
            </div>
          </div>

          <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.7, marginBottom: 14 }}>{template.desc}</p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 18 }}>
            {template.tags.map(tag => (
              <span key={tag} style={{ background: '#f0fdf4', color: '#16a34a', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, border: '1px solid #bbf7d0' }}>{tag}</span>
            ))}
          </div>

          <div style={{ background: '#f8fafc', borderRadius: 12, padding: '14px 16px', marginBottom: 18 }}>
            <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Included sections ({template.sections.length})</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px 14px' }}>
              {template.sections.map(s => (
                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#475569' }}>
                  <CheckIcon style={{ width: 11, height: 11, color: '#22c55e', flexShrink: 0 }} />
                  {SECTION_LABELS[s] || s.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
            <Stars rating={template.rating} />
            <span style={{ fontSize: 12, color: '#94a3b8' }}>{template.uses} uses</span>
            <span style={{ background: '#dcfce7', color: '#16a34a', fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 20, letterSpacing: '0.06em' }}>FREE</span>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 'auto' }}>
            <button onClick={onClose} style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: '1.5px solid #e2e8f0', background: '#fff', color: '#374151', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              Cancel
            </button>
            <button onClick={() => onUse(template)} style={{ flex: 2, padding: '12px 0', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#059669 0%,#10b981 100%)', color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 14px rgba(16,185,129,.35)' }}>
              <SparklesIcon style={{ width: 15, height: 15 }} /> Use This Template
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProposalTemplates({ onSelectTemplate }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [activeCat, setActiveCat] = useState('All');
  const [favorites, setFavorites] = useState(new Set());
  const [favOnly, setFavOnly] = useState(false);
  const [previewTpl, setPreviewTpl] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);

  const filtered = useMemo(() => TEMPLATES.filter(t => {
    const mc = activeCat === 'All' || t.cat === activeCat;
    const ms = !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.cat.toLowerCase().includes(search.toLowerCase()) || t.tags.some(tg => tg.toLowerCase().includes(search.toLowerCase()));
    const mf = !favOnly || favorites.has(t.id);
    return mc && ms && mf;
  }), [search, activeCat, favOnly, favorites]);

  const toggleFav = (id) => setFavorites(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const handleUse = (template) => {
    setPreviewTpl(null);
    if (onSelectTemplate) onSelectTemplate(template);
    else navigate('/new-proposal', { state: { template } });
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'Segoe UI',system-ui,sans-serif" }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '28px 36px 0' }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 26, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>Proposal Templates</h1>
        <p style={{ margin: '0 0 20px', color: '#64748b', fontSize: 14 }}>Choose from industry-specific templates to jumpstart your proposal</p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          {/* Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f1f5f9', borderRadius: 10, padding: '9px 14px', width: 280, border: '1.5px solid transparent' }}>
            <MagnifyingGlassIcon style={{ width: 14, height: 14, color: '#94a3b8', flexShrink: 0 }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search templates..." style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: 13, color: '#0f172a', flex: 1 }} />
            {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0, display: 'flex' }}><XMarkIcon style={{ width: 13, height: 13 }} /></button>}
          </div>
          <div style={{ flex: 1 }} />
          {/* Favorites toggle */}
          <button onClick={() => setFavOnly(!favOnly)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, cursor: 'pointer', background: favOnly ? '#fef2f2' : '#fff', border: `1.5px solid ${favOnly ? '#fecaca' : '#e2e8f0'}`, color: favOnly ? '#ef4444' : '#64748b', fontSize: 13, fontWeight: 600 }}>
            {favOnly ? <HeartSolid style={{ width: 13, height: 13 }} /> : <HeartIcon style={{ width: 13, height: 13 }} />}
            My Favorites{favorites.size > 0 ? ` (${favorites.size})` : ''}
          </button>
        </div>

        {/* Category tabs */}
        <div style={{ display: 'flex', gap: 2, overflowX: 'auto', paddingBottom: 0 }}>
          {CATS.map(cat => (
            <button key={cat} onClick={() => setActiveCat(cat)} style={{ padding: '8px 15px', border: 'none', background: 'transparent', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: 13, fontWeight: activeCat === cat ? 700 : 500, color: activeCat === cat ? '#0f172a' : '#64748b', borderBottom: `2px solid ${activeCat === cat ? '#10b981' : 'transparent'}`, transition: 'all .15s', marginBottom: -1 }}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div style={{ padding: '28px 36px' }}>
        <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 18, fontWeight: 500 }}>{filtered.length} template{filtered.length !== 1 ? 's' : ''} found</p>

        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: '#94a3b8' }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🔍</div>
            <p style={{ fontSize: 15, fontWeight: 600, color: '#475569', marginBottom: 4 }}>No templates found</p>
            <p style={{ fontSize: 13 }}>Try a different search or category</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(210px,1fr))', gap: 20 }}>
            {filtered.map(t => (
              <div key={t.id} onMouseEnter={() => setHoveredId(t.id)} onMouseLeave={() => setHoveredId(null)}
                style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', border: '1px solid #e5e7eb', cursor: 'pointer', transition: 'transform .2s,box-shadow .2s', transform: hoveredId === t.id ? 'translateY(-4px)' : 'none', boxShadow: hoveredId === t.id ? '0 16px 48px rgba(0,0,0,.13)' : '0 2px 10px rgba(0,0,0,.05)' }}>

                {/* Thumbnail */}
                <div style={{ position: 'relative' }}>
                  <CoverThumb cover={t.cover} name={t.name} sub={t.sub} />
                  <div style={{ position: 'absolute', top: 9, left: 9, background: '#10b981', color: '#fff', fontSize: 9, fontWeight: 900, letterSpacing: '.06em', padding: '2px 7px', borderRadius: 5 }}>FREE</div>
                  <button onClick={e => { e.stopPropagation(); toggleFav(t.id); }} style={{ position: 'absolute', top: 7, right: 7, background: favorites.has(t.id) ? 'rgba(239,68,68,.85)' : 'rgba(0,0,0,.28)', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12 }}>
                    {favorites.has(t.id) ? '♥' : '♡'}
                  </button>
                  {hoveredId === t.id && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                      <button onClick={e => { e.stopPropagation(); setPreviewTpl(t); }} style={{ padding: '7px 13px', borderRadius: 9, background: 'rgba(255,255,255,.15)', border: '1.5px solid rgba(255,255,255,.65)', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <EyeIcon style={{ width: 12, height: 12 }} /> Preview
                      </button>
                      <button onClick={e => { e.stopPropagation(); handleUse(t); }} style={{ padding: '7px 13px', borderRadius: 9, background: 'linear-gradient(135deg,#059669,#10b981)', border: 'none', color: '#fff', fontSize: 11, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, boxShadow: '0 3px 10px rgba(16,185,129,.4)' }}>
                        <SparklesIcon style={{ width: 12, height: 12 }} /> Use
                      </button>
                    </div>
                  )}
                </div>

                {/* Card body */}
                <div style={{ padding: '12px 14px 14px' }}>
                  <p style={{ margin: '0 0 3px', fontSize: 9, fontWeight: 700, color: '#94a3b8', letterSpacing: '.08em', textTransform: 'uppercase' }}>{t.cat}</p>
                  <p style={{ margin: '0 0 5px', fontSize: 13, fontWeight: 800, color: '#0f172a', lineHeight: 1.3 }}>{t.name}</p>
                  <p style={{ margin: '0 0 9px', fontSize: 11, color: '#64748b', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{t.desc}</p>
                  <div style={{ marginBottom: 10 }}><Stars rating={t.rating} /></div>
                  <div style={{ display: 'flex', gap: 7 }}>
                    <button onClick={() => setPreviewTpl(t)} style={{ flex: 1, padding: '7px 0', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#374151', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                      <EyeIcon style={{ width: 11, height: 11 }} /> Preview
                    </button>
                    <button onClick={() => handleUse(t)} style={{ flex: 2, padding: '7px 0', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#059669,#10b981)', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, boxShadow: '0 2px 7px rgba(16,185,129,.3)' }}>
                      <SparklesIcon style={{ width: 11, height: 11 }} /> Use Template
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {previewTpl && <PreviewModal template={previewTpl} onClose={() => setPreviewTpl(null)} onUse={handleUse} isFav={favorites.has(previewTpl.id)} onToggleFav={toggleFav} />}
    </div>
  );
}
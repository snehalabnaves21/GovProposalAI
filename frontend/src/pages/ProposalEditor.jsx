import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import html2pdf from "html2pdf.js";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  DocumentArrowDownIcon,
  DocumentTextIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  ListBulletIcon,
  PlusIcon,
  TrashIcon,
  CurrencyDollarIcon,
  PhotoIcon,
  XCircleIcon,
  EyeIcon,
  PencilSquareIcon,
  SwatchIcon,
  ArrowPathIcon,
  ShareIcon,
  ClipboardDocumentIcon,
  XMarkIcon,
  Bars3Icon,
  DocumentDuplicateIcon,
  RectangleStackIcon,
  SparklesIcon,
  ChartBarIcon,
  PaintBrushIcon,
  LockClosedIcon,
  LockOpenIcon,
  TrophyIcon,
  ArrowTrendingUpIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement } from 'chart.js';
import { Pie, Bar, Line } from 'react-chartjs-2';
import api from '../services/api';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement);

const CHART_TEMPLATES = {
  budget_pie: {
    label: 'Budget Breakdown (Pie)',
    type: 'pie',
    data: {
      labels: ['Labor', 'Materials', 'Travel', 'ODCs', 'Overhead'],
      datasets: [{
        data: [45, 20, 10, 15, 10],
        backgroundColor: ['#1e3a5f', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'],
      }],
    },
  },
  timeline_bar: {
    label: 'Project Timeline (Bar)',
    type: 'bar',
    data: {
      labels: ['Phase 1', 'Phase 2', 'Phase 3', 'Phase 4', 'Phase 5'],
      datasets: [{
        label: 'Duration (Months)',
        data: [3, 4, 6, 3, 2],
        backgroundColor: '#1e3a5f',
        borderRadius: 4,
      }],
    },
  },
  staffing_bar: {
    label: 'Staffing Plan (Bar)',
    type: 'bar',
    data: {
      labels: ['Project Manager', 'Sr. Developer', 'Jr. Developer', 'QA Engineer', 'BA'],
      datasets: [{
        label: 'FTEs',
        data: [1, 3, 4, 2, 1],
        backgroundColor: '#3b82f6',
        borderRadius: 4,
      }],
    },
  },
  performance_line: {
    label: 'Performance Metrics (Line)',
    type: 'line',
    data: {
      labels: ['Month 1', 'Month 2', 'Month 3', 'Month 4', 'Month 5', 'Month 6'],
      datasets: [{
        label: 'KPI Score',
        data: [70, 75, 82, 88, 92, 95],
        borderColor: '#10b981',
        backgroundColor: 'rgba(16,185,129,0.1)',
        fill: true,
        tension: 0.3,
      }],
    },
  },
};

const GRAPHICS_TEMPLATES = {
  org_chart: {
    label: 'Organization Chart',
    icon: '🏢',
    generate: () => `
<div style="text-align:center;padding:20px;margin:16px 0;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0">
  <h4 style="color:#1e3a5f;margin:0 0 16px">Project Organization Structure</h4>
  <div style="display:flex;flex-direction:column;align-items:center;gap:8px">
    <div style="background:#1e3a5f;color:white;padding:10px 24px;border-radius:8px;font-weight:600;font-size:13px">Program Manager</div>
    <div style="width:2px;height:20px;background:#cbd5e1"></div>
    <div style="display:flex;gap:16px;flex-wrap:wrap;justify-content:center">
      <div style="display:flex;flex-direction:column;align-items:center;gap:4px">
        <div style="background:#3b82f6;color:white;padding:8px 16px;border-radius:8px;font-size:12px;font-weight:500">Technical Lead</div>
        <div style="width:1px;height:12px;background:#cbd5e1"></div>
        <div style="display:flex;gap:8px">
          <div style="background:#e0e7ff;color:#3b82f6;padding:6px 12px;border-radius:6px;font-size:11px">Sr. Developer</div>
          <div style="background:#e0e7ff;color:#3b82f6;padding:6px 12px;border-radius:6px;font-size:11px">Jr. Developer</div>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:center;gap:4px">
        <div style="background:#10b981;color:white;padding:8px 16px;border-radius:8px;font-size:12px;font-weight:500">QA Manager</div>
        <div style="width:1px;height:12px;background:#cbd5e1"></div>
        <div style="background:#d1fae5;color:#10b981;padding:6px 12px;border-radius:6px;font-size:11px">QA Engineers (2)</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:center;gap:4px">
        <div style="background:#f59e0b;color:white;padding:8px 16px;border-radius:8px;font-size:12px;font-weight:500">Admin Lead</div>
        <div style="width:1px;height:12px;background:#cbd5e1"></div>
        <div style="background:#fef3c7;color:#f59e0b;padding:6px 12px;border-radius:6px;font-size:11px">Business Analyst</div>
      </div>
    </div>
  </div>
</div>`,
  },
  workflow_diagram: {
    label: 'Workflow Diagram',
    icon: '🔄',
    generate: () => `
<div style="padding:20px;margin:16px 0;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0">
  <h4 style="color:#1e3a5f;margin:0 0 16px;text-align:center">Project Delivery Workflow</h4>
  <div style="display:flex;align-items:center;justify-content:center;gap:4px;flex-wrap:wrap">
    <div style="background:#1e3a5f;color:white;padding:10px 16px;border-radius:8px;text-align:center;font-size:12px;font-weight:500;min-width:100px"><div>📋</div>Requirements<br/>Analysis</div>
    <div style="color:#cbd5e1;font-size:20px">→</div>
    <div style="background:#3b82f6;color:white;padding:10px 16px;border-radius:8px;text-align:center;font-size:12px;font-weight:500;min-width:100px"><div>🎨</div>Design &<br/>Planning</div>
    <div style="color:#cbd5e1;font-size:20px">→</div>
    <div style="background:#8b5cf6;color:white;padding:10px 16px;border-radius:8px;text-align:center;font-size:12px;font-weight:500;min-width:100px"><div>⚙️</div>Development &<br/>Implementation</div>
    <div style="color:#cbd5e1;font-size:20px">→</div>
    <div style="background:#10b981;color:white;padding:10px 16px;border-radius:8px;text-align:center;font-size:12px;font-weight:500;min-width:100px"><div>🧪</div>Testing &<br/>QA</div>
    <div style="color:#cbd5e1;font-size:20px">→</div>
    <div style="background:#f59e0b;color:white;padding:10px 16px;border-radius:8px;text-align:center;font-size:12px;font-weight:500;min-width:100px"><div>🚀</div>Deployment &<br/>Go-Live</div>
  </div>
</div>`,
  },
  staffing_pyramid: {
    label: 'Staffing Pyramid',
    icon: '👥',
    generate: () => `
<div style="padding:20px;margin:16px 0;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;text-align:center">
  <h4 style="color:#1e3a5f;margin:0 0 16px">Staffing Pyramid</h4>
  <div style="display:flex;flex-direction:column;align-items:center;gap:4px">
    <div style="background:#1e3a5f;color:white;padding:10px 20px;border-radius:6px;font-size:12px;font-weight:600;width:140px">Program Director<br/><span style="font-weight:400;font-size:11px">1 FTE</span></div>
    <div style="background:#3b5998;color:white;padding:10px 20px;border-radius:6px;font-size:12px;font-weight:600;width:220px">Senior Management<br/><span style="font-weight:400;font-size:11px">2 FTEs</span></div>
    <div style="background:#3b82f6;color:white;padding:10px 20px;border-radius:6px;font-size:12px;font-weight:600;width:320px">Mid-Level Staff<br/><span style="font-weight:400;font-size:11px">5 FTEs</span></div>
    <div style="background:#60a5fa;color:white;padding:10px 20px;border-radius:6px;font-size:12px;font-weight:600;width:420px">Junior Staff &amp; Support<br/><span style="font-weight:400;font-size:11px">8 FTEs</span></div>
  </div>
  <p style="font-size:11px;color:#64748b;margin:12px 0 0">Total: 16 FTEs | Surge capacity available</p>
</div>`,
  },
  gantt_chart: {
    label: 'Gantt Chart (Timeline)',
    icon: '📅',
    generate: () => {
      const phases = [
        { name: 'Phase 1: Planning', start: 0, duration: 3, color: '#1e3a5f' },
        { name: 'Phase 2: Design', start: 2, duration: 4, color: '#3b82f6' },
        { name: 'Phase 3: Development', start: 5, duration: 8, color: '#8b5cf6' },
        { name: 'Phase 4: Testing', start: 10, duration: 4, color: '#10b981' },
        { name: 'Phase 5: Deployment', start: 13, duration: 2, color: '#f59e0b' },
        { name: 'Phase 6: Transition', start: 14, duration: 2, color: '#ef4444' },
      ];
      const totalMonths = 16;
      const rows = phases.map(p => {
        const leftPct = (p.start / totalMonths) * 100;
        const widthPct = (p.duration / totalMonths) * 100;
        return `<div style="display:flex;align-items:center;gap:8px;margin:4px 0">
          <div style="width:160px;font-size:11px;color:#374151;text-align:right;flex-shrink:0">${p.name}</div>
          <div style="flex:1;background:#f1f5f9;border-radius:4px;height:24px;position:relative">
            <div style="position:absolute;left:${leftPct}%;width:${widthPct}%;background:${p.color};height:100%;border-radius:4px;display:flex;align-items:center;justify-content:center">
              <span style="color:white;font-size:10px;font-weight:500">${p.duration}mo</span>
            </div>
          </div>
        </div>`;
      }).join('');
      const months = Array.from({ length: totalMonths + 1 }, (_, i) => i).filter(i => i % 2 === 0);
      const monthLabels = months.map(m => `<span style="position:absolute;left:${(m / totalMonths) * 100}%;font-size:9px;color:#94a3b8;transform:translateX(-50%)">M${m}</span>`).join('');
      return `<div style="padding:20px;margin:16px 0;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0">
        <h4 style="color:#1e3a5f;margin:0 0 16px;text-align:center">Project Timeline (Gantt Chart)</h4>
        ${rows}
        <div style="display:flex;gap:8px;margin-top:8px">
          <div style="width:160px;flex-shrink:0"></div>
          <div style="flex:1;position:relative;height:16px">${monthLabels}</div>
        </div>
      </div>`;
    },
  },
};

function generateChartPlaceholder(chartType) {
  const tpl = CHART_TEMPLATES[chartType];
  if (!tpl) return '';
  return `<div data-chart-type="${chartType}" class="proposal-chart-placeholder" style="text-align:center;padding:12px;margin:16px 0;border:2px dashed #cbd5e1;border-radius:8px;background:#f8fafc"><p style="font-weight:600;color:#1e3a5f;margin:0">📊 ${tpl.label}</p><p style="font-size:12px;color:#64748b;margin:4px 0 0">Chart will render in preview &amp; export</p></div>`;
}

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

const PROPOSAL_TEMPLATES = [
  {
    id: 'full',
    name: 'Full Proposal',
    description: 'All 18 sections — comprehensive government proposal',
    icon: '📋',
    sections: Object.keys(sectionLabels),
  },
  {
    id: 'it-services',
    name: 'IT Services',
    description: 'Focused on technical approach, staffing, and pricing',
    icon: '💻',
    sections: [
      'cover_page', 'executive_summary', 'vendor_profile', 'capability_statement',
      'past_performance', 'technical_approach', 'staffing_plan', 'key_personnel',
      'cost_price_proposal', 'quality_assurance', 'compliance_matrix',
    ],
  },
  {
    id: 'small-business',
    name: 'Small Business',
    description: 'Emphasizes socioeconomic status and subcontracting',
    icon: '🏢',
    sections: [
      'cover_page', 'executive_summary', 'vendor_profile', 'socioeconomic_status',
      'capability_statement', 'past_performance', 'technical_approach',
      'cost_price_proposal', 'subcontracting_plan', 'compliance_checklist',
    ],
  },
  {
    id: 'consulting',
    name: 'Consulting & Advisory',
    description: 'Management-focused with risk mitigation and transition',
    icon: '📊',
    sections: [
      'cover_page', 'executive_summary', 'vendor_profile', 'past_performance',
      'technical_approach', 'management_approach', 'staffing_plan', 'key_personnel',
      'cost_price_proposal', 'risk_mitigation', 'transition_plan',
    ],
  },
  {
    id: 'quick',
    name: 'Quick Response',
    description: 'Minimal sections for simple RFQs and task orders',
    icon: '⚡',
    sections: [
      'cover_page', 'executive_summary', 'technical_approach',
      'cost_price_proposal', 'compliance_checklist',
    ],
  },
];

// ─── Sortable Sidebar Item ───────────────────────────────────────────────────
function SortableSidebarItem({
  id, isSkipped, isActive, isCostSection, label,
  onToggleInclude, onScrollTo, onDuplicate,
  isFrozen, onToggleFreeze,
}) {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 'auto',
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-0.5 group">
      <button
        {...attributes}
        {...listeners}
        className="p-1 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing flex-shrink-0 touch-none"
        title="Drag to reorder"
      >
        <Bars3Icon className="w-3.5 h-3.5" />
      </button>
      <input
        type="checkbox"
        checked={!isSkipped}
        onChange={onToggleInclude}
        className="w-3.5 h-3.5 rounded cursor-pointer accent-navy flex-shrink-0"
        title={isSkipped ? 'Click to include section' : 'Click to skip section'}
      />
      <button
        onClick={onScrollTo}
        className={`flex-1 text-left px-2 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
          isSkipped
            ? 'text-gray-300 line-through'
            : isFrozen
              ? 'bg-green-50 text-green-700 border border-green-200'
              : isActive
                ? 'bg-navy text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100 hover:text-navy'
        }`}
      >
        <div className="flex items-center gap-1.5">
          {isFrozen ? (
            <LockClosedIcon className="w-3.5 h-3.5 flex-shrink-0 text-green-500" />
          ) : isCostSection ? (
            <CurrencyDollarIcon
              className={`w-3.5 h-3.5 flex-shrink-0 ${
                isSkipped ? 'text-gray-300' : isActive ? 'text-accent' : 'text-green-400'
              }`}
            />
          ) : (
            <CheckCircleIcon
              className={`w-3.5 h-3.5 flex-shrink-0 ${
                isSkipped ? 'text-gray-300' : isActive ? 'text-accent' : 'text-gray-300'
              }`}
            />
          )}
          <span className="truncate text-xs">{label}</span>
        </div>
      </button>
      <button
        onClick={onToggleFreeze}
        className={`p-1 flex-shrink-0 rounded transition-all cursor-pointer ${
          isFrozen
            ? 'text-green-500 hover:text-orange-500 hover:bg-orange-50 opacity-100'
            : 'text-gray-300 hover:text-green-600 hover:bg-green-50 opacity-0 group-hover:opacity-100'
        }`}
        title={isFrozen ? 'Click to edit (unfreeze)' : 'Save & freeze this section'}
      >
        {isFrozen ? <LockClosedIcon className="w-3.5 h-3.5" /> : <LockOpenIcon className="w-3.5 h-3.5" />}
      </button>
      <button
        onClick={onDuplicate}
        className="p-1 text-gray-300 hover:text-accent opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer flex-shrink-0"
        title="Duplicate section"
      >
        <DocumentDuplicateIcon className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

const quillModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ indent: '-1' }, { indent: '+1' }],
    [{ align: [] }],
    ['blockquote', 'image'],
    ['clean'],
  ],
};

const quillFormats = [
  'header', 'bold', 'italic', 'underline', 'strike',
  'list', 'indent', 'align', 'blockquote', 'image',
];

const resolveAssetUrl = (url) => {
  if (!url || typeof url !== 'string') return url;
  if (/^(data:|blob:|https?:\/\/)/i.test(url)) return url;
  const baseURL = api.defaults?.baseURL || window.location.origin;
  try {
    return new URL(url, baseURL).toString();
  } catch {
    return url;
  }
};

const hasSectionContent = (sections) => {
  if (!sections || typeof sections !== 'object') return false;
  return Object.values(sections).some((content) =>
    (content || '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim().length > 0
  );
};

const sectionImageHints = {
  cover_page: 'Add company logo or proposal cover image',
  executive_summary: 'Add company owner photo or key visual',
  vendor_profile: 'Add company logo or organizational chart',
  key_personnel: 'Add team member photos or headshots',
  technical_approach: 'Add architecture diagrams or process flows',
  implementation_timeline: 'Add Gantt chart or timeline graphic',
};

function SectionImageUpload({ sectionKey, onImageInsert, onAddFloatingImage }) {
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    setUploading(true);
    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await api.post('/api/upload-image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        const imageUrl = resolveAssetUrl(res.data.url);
        const newImage = { url: imageUrl, filename: res.data.filename, name: file.name };
        setImages((prev) => [...prev, newImage]);
        onImageInsert(imageUrl);
        onAddFloatingImage?.(imageUrl);
      } catch (err) {
        alert(`Upload failed: ${err.response?.data?.detail || err.message}`);
      }
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = async (img) => {
    try {
      await api.delete(`/api/upload-image/${img.filename}`);
    } catch { /* ignore */ }
    setImages((prev) => prev.filter((i) => i.filename !== img.filename));
  };

  const hint = sectionImageHints[sectionKey];

  return (
    <div className="border-t border-gray-100 px-4 py-3 bg-gray-50/50">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-gray-500 flex items-center gap-1.5">
          <PhotoIcon className="w-4 h-4" />
          Section Images
          {hint && <span className="font-normal text-gray-400 ml-1">— {hint}</span>}
        </p>
        <label className="flex items-center gap-1 text-xs font-medium text-accent hover:text-accent-dark transition-colors cursor-pointer">
          <PlusIcon className="w-4 h-4" />
          {uploading ? 'Uploading...' : 'Upload Image'}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleUpload}
            className="hidden"
            disabled={uploading}
          />
        </label>
      </div>
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {images.map((img) => (
            <div key={img.filename} className="relative group">
              <img
                src={img.url}
                alt={img.name}
                className="w-20 h-20 object-cover rounded-lg border border-gray-200 shadow-sm"
              />
              <button
                onClick={() => removeImage(img)}
                className="absolute -top-1.5 -right-1.5 bg-white rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                <XCircleIcon className="w-5 h-5 text-red-400 hover:text-red-600" />
              </button>
              <p className="text-[10px] text-gray-400 mt-0.5 truncate max-w-[80px]">{img.name}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const defaultLineItem = () => ({
  id: Date.now() + Math.random(),
  clin: '',
  description: '',
  laborCategory: '',
  quantity: 1,
  unit: 'Hours',
  unitRate: 0,
  total: 0,
});

function extractApiError(content) {
  if (!content) return null;
  const plain = content.replace(/<[^>]+>/g, '').trim();
  if (
    plain.startsWith('[Error') ||
    /AI generation failed/i.test(plain) ||
    /generativelanguage\.googleapis/i.test(plain) ||
    /quota_metric/i.test(plain) ||
    (/429/.test(plain) && /quota/i.test(plain))
  ) {
    const quotaMatch = plain.match(/429[^.]*exceeded[^.]*quota[^.]*/i);
    const rateLimitMatch = plain.match(/rate.limit[^.]*/i);
    if (quotaMatch || rateLimitMatch) {
      return 'AI quota exceeded — please check your API plan or retry after a moment.';
    }
    const msgMatch = plain.match(/\[Error generating this section:\s*([^\]]{0,120})/i);
    if (msgMatch) return msgMatch[1].trim();
    return 'AI generation failed for this section. Please retry or enter content manually.';
  }
  return null;
}

function buildStarterSectionContent(key, { proposalTitle, vendorName, opportunityDetails, vendorData }) {
  const title = sectionLabels[key] || key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const company = vendorName || vendorData?.company_name || 'our company';
  const agency = opportunityDetails?.agency || 'the Government';
  const opportunity = proposalTitle || opportunityDetails?.title || 'this opportunity';
  const solicitation = opportunityDetails?.solicitation_number || 'the referenced solicitation';

  if (key === 'cover_page') {
    return `
      <h2>${opportunity}</h2>
      <p><strong>Submitted To:</strong> ${agency}</p>
      <p><strong>Solicitation Number:</strong> ${solicitation}</p>
      <p><strong>Submitted By:</strong> ${company}</p>
      <p><strong>Submission Date:</strong> ${opportunityDetails?.submission_date || new Date().toLocaleDateString()}</p>
    `;
  }

  if (key === 'cost_price_proposal') {
    return `
      <h3>Cost / Price Proposal</h3>
      <p>${company} will provide a complete, compliant, and traceable price proposal aligned to the solicitation instructions.</p>
      <ul>
        <li>Pricing will be organized by labor categories, direct costs, and applicable assumptions.</li>
        <li>Rates and quantities will be reviewed for realism, reasonableness, and consistency with the technical approach.</li>
        <li>Final pricing should be validated against the solicitation requirements before submission.</li>
      </ul>
    `;
  }

  return `
    <h3>${title}</h3>
    <p>${company} will support ${agency} for ${opportunity} with a compliant, performance-focused approach tailored to the solicitation requirements.</p>
    <ul>
      <li>Align the response to the evaluation criteria and statement of work.</li>
      <li>Describe specific capabilities, staffing, methods, tools, and controls relevant to this section.</li>
      <li>Replace this starter text with verified company-specific details before export or submission.</li>
    </ul>
  `;
}

function PreviewSectionContent({ content }) {
  if (!content) return <p className="text-gray-400 italic">No content generated for this section.</p>;

  const apiError = extractApiError(content);
  if (apiError) {
    return (
      <div style={{
        background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '8px',
        padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: '10px',
      }}>
        <span style={{ fontSize: '18px', flexShrink: 0 }}>⚠️</span>
        <div>
          <p style={{ margin: '0 0 4px', fontWeight: 600, color: '#9a3412', fontSize: '13px' }}>
            Section could not be generated
          </p>
          <p style={{ margin: 0, color: '#c2410c', fontSize: '12px' }}>{apiError}</p>
          <p style={{ margin: '6px 0 0', color: '#78716c', fontSize: '11px' }}>
            Switch to Edit Mode and use <strong>AI Rewrite</strong> to regenerate this section.
          </p>
        </div>
      </div>
    );
  }

  const chartRegex = /(<div data-chart-type="([^"]+)"[^>]*>[\s\S]*?<\/div>)/gi;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = chartRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'html', value: content.slice(lastIndex, match.index) });
    }
    parts.push({ type: 'chart', chartType: match[2] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < content.length) {
    parts.push({ type: 'html', value: content.slice(lastIndex) });
  }

  if (parts.length === 0) {
    return <div dangerouslySetInnerHTML={{ __html: content }} />;
  }

  return (
    <>
      {parts.map((part, i) => {
        if (part.type === 'html') {
          return <div key={i} dangerouslySetInnerHTML={{ __html: part.value }} />;
        }
        const tpl = CHART_TEMPLATES[part.chartType];
        if (!tpl) return null;
        const ChartComponent = tpl.type === 'pie' ? Pie : tpl.type === 'line' ? Line : Bar;
        return (
          <div key={i} className="my-6 max-w-md mx-auto">
            <ChartComponent
              data={tpl.data}
              options={{
                responsive: true,
                plugins: { legend: { position: tpl.type === 'pie' ? 'bottom' : 'top' } },
                ...(tpl.type !== 'pie' ? { scales: { y: { beginAtZero: true } } } : {}),
              }}
            />
          </div>
        );
      })}
    </>
  );
}

function PricingTable({ onContentUpdate, contractType = '' }) {
  const [lineItems, setLineItems] = useState([defaultLineItem()]);
  const [odcs, setOdcs] = useState([{ id: Date.now(), description: '', amount: 0 }]);
  const [notes, setNotes] = useState('');
  const [importCount, setImportCount] = useState(0);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [yearPeriods, setYearPeriods] = useState(['Base Year']);
  const [materials, setMaterials] = useState([{ id: Date.now(), description: '', actualCost: 0, markupPercent: 0 }]);

  const isFFP = /fixed.price|ffp/i.test(contractType);
  const isTM = /time.*material|t\s*&\s*m|t&m/i.test(contractType);

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === lineItems.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(lineItems.map((item) => item.id)));
  };

  const removeSelected = () => {
    if (selectedIds.size === 0) return;
    setLineItems((prev) => {
      const remaining = prev.filter((item) => !selectedIds.has(item.id));
      return remaining.length > 0 ? remaining : [defaultLineItem()];
    });
    setSelectedIds(new Set());
  };

  const unitOptions = ['Hours', 'Months', 'Each', 'Lot', 'Days', 'FTE Years'];

  const handleImportFromResearch = () => {
    const imports = JSON.parse(localStorage.getItem('pricing_labor_imports') || '[]');
    if (imports.length === 0) return;
    const newItems = imports.map((imp, idx) => ({
      id: Date.now() + idx,
      clin: String(lineItems.length + idx + 1).padStart(4, '0'),
      description: `${imp.category} (Market Research)`,
      laborCategory: imp.category,
      quantity: 1,
      unit: 'Hours',
      unitRate: imp.rate || 0,
      total: imp.rate || 0,
    }));
    setLineItems((prev) => [...prev, ...newItems]);
    setImportCount(imports.length);
    localStorage.removeItem('pricing_labor_imports');
    setTimeout(() => setImportCount(0), 4000);
  };

  const updateLineItem = (id, field, value) => {
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unitRate') {
          updated.total = (parseFloat(updated.quantity) || 0) * (parseFloat(updated.unitRate) || 0);
        }
        return updated;
      })
    );
  };

  const addLineItem = () => setLineItems((prev) => [...prev, defaultLineItem()]);
  const removeLineItem = (id) => setLineItems((prev) => prev.filter((item) => item.id !== id));
  const addOdc = () => setOdcs((prev) => [...prev, { id: Date.now(), description: '', amount: 0 }]);
  const updateOdc = (id, field, value) => setOdcs((prev) => prev.map((o) => (o.id === id ? { ...o, [field]: value } : o)));
  const removeOdc = (id) => setOdcs((prev) => prev.filter((o) => o.id !== id));

  const addYearPeriod = () => {
    const optionNum = yearPeriods.length;
    setYearPeriods((prev) => [...prev, `Option Year ${optionNum}`]);
  };
  const removeYearPeriod = (idx) => {
    if (yearPeriods.length <= 1) return;
    setYearPeriods((prev) => prev.filter((_, i) => i !== idx));
  };

  const addMaterial = () => setMaterials((prev) => [...prev, { id: Date.now(), description: '', actualCost: 0, markupPercent: 0 }]);
  const updateMaterial = (id, field, value) => setMaterials((prev) => prev.map((m) => (m.id === id ? { ...m, [field]: value } : m)));
  const removeMaterial = (id) => setMaterials((prev) => prev.filter((m) => m.id !== id));

  const laborTotal = lineItems.reduce((sum, item) => sum + (item.total || 0), 0);
  const odcTotal = odcs.reduce((sum, o) => sum + (parseFloat(o.amount) || 0), 0);
  const materialsTotal = materials.reduce((sum, m) => {
    const cost = parseFloat(m.actualCost) || 0;
    const markup = parseFloat(m.markupPercent) || 0;
    return sum + cost + (cost * markup / 100);
  }, 0);
  const grandTotal = laborTotal + odcTotal + (isTM ? materialsTotal : 0);

  useEffect(() => {
    const html = buildPricingHtml();
    onContentUpdate(html);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lineItems, odcs, notes, yearPeriods, materials, contractType]);

  const fmtNum = (n) => (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const th = (text, align = 'left') => `<th style="padding:8px;border:1px solid #ddd;text-align:${align}">${text}</th>`;
  const td = (text, align = 'left') => `<td style="padding:8px;border:1px solid #ddd;text-align:${align}">${text}</td>`;

  const buildPricingHtml = () => {
    let html = '<h2>Cost / Price Proposal</h2>';

    if (isFFP) {
      yearPeriods.forEach((yearLabel) => {
        html += `<h3>${yearLabel}</h3>`;
        html += '<table style="width:100%;border-collapse:collapse;margin-bottom:16px">';
        html += `<tr style="background:#1e293b;color:white">${th('CLIN')}${th('Description')}${th('Labor Category')}${th('Qty', 'right')}${th('Unit')}${th('Unit Rate ($)', 'right')}${th('Total ($)', 'right')}</tr>`;
        lineItems.forEach((item) => {
          html += `<tr>${td(item.clin)}${td(item.description)}${td(item.laborCategory)}${td(item.quantity, 'right')}${td(item.unit)}${td(fmtNum(item.unitRate), 'right')}${td(fmtNum(item.total), 'right')}</tr>`;
        });
        const yearTotal = lineItems.reduce((s, i) => s + (i.total || 0), 0);
        html += `<tr style="background:#f1f5f9;font-weight:bold"><td colspan="6" style="padding:8px;border:1px solid #ddd;text-align:right">${yearLabel} Total</td><td style="padding:8px;border:1px solid #ddd;text-align:right">$${fmtNum(yearTotal)}</td></tr>`;
        html += '</table>';
      });
      const allYearsTotal = laborTotal * yearPeriods.length;
      html += `<h3>Total Fixed Price (All Periods): $${fmtNum(allYearsTotal + odcTotal)}</h3>`;
    } else if (isTM) {
      html += '<h3>Labor Categories &amp; Rates</h3>';
      html += '<table style="width:100%;border-collapse:collapse;margin-bottom:16px">';
      html += `<tr style="background:#1e293b;color:white">${th('CLIN')}${th('Description (SOW)')}${th('LCAT')}${th('Hourly Rate ($)', 'right')}${th('Expected Hours', 'right')}${th('Total Amount ($)', 'right')}</tr>`;
      lineItems.forEach((item) => {
        html += `<tr>${td(item.clin)}${td(item.description)}${td(item.laborCategory)}${td(fmtNum(item.unitRate), 'right')}${td(item.quantity, 'right')}${td(fmtNum(item.total), 'right')}</tr>`;
      });
      html += `<tr style="background:#f1f5f9;font-weight:bold"><td colspan="5" style="padding:8px;border:1px solid #ddd;text-align:right">Labor Subtotal</td><td style="padding:8px;border:1px solid #ddd;text-align:right">$${fmtNum(laborTotal)}</td></tr>`;
      html += '</table>';
      if (materials.some((m) => m.description || m.actualCost)) {
        html += '<h3>Materials (Actual Cost + Markup)</h3>';
        html += '<table style="width:100%;border-collapse:collapse;margin-bottom:16px">';
        html += `<tr style="background:#1e293b;color:white">${th('Description')}${th('Actual Cost ($)', 'right')}${th('Markup (%)', 'right')}${th('Total ($)', 'right')}</tr>`;
        materials.forEach((m) => {
          const cost = parseFloat(m.actualCost) || 0;
          const markup = parseFloat(m.markupPercent) || 0;
          const total = cost + (cost * markup / 100);
          html += `<tr>${td(m.description)}${td(fmtNum(cost), 'right')}${td(markup + '%', 'right')}${td(fmtNum(total), 'right')}</tr>`;
        });
        html += `<tr style="background:#f1f5f9;font-weight:bold"><td colspan="3" style="padding:8px;border:1px solid #ddd;text-align:right">Materials Subtotal</td><td style="padding:8px;border:1px solid #ddd;text-align:right">$${fmtNum(materialsTotal)}</td></tr>`;
        html += '</table>';
      }
      html += `<h3>Total Proposed Price: $${fmtNum(grandTotal)}</h3>`;
    } else {
      html += '<h3>Labor Categories &amp; Pricing</h3>';
      html += '<table style="width:100%;border-collapse:collapse;margin-bottom:16px">';
      html += `<tr style="background:#1e293b;color:white">${th('CLIN')}${th('Description')}${th('Labor Category')}${th('Qty', 'right')}${th('Unit')}${th('Unit Rate ($)', 'right')}${th('Total ($)', 'right')}</tr>`;
      lineItems.forEach((item) => {
        html += `<tr>${td(item.clin)}${td(item.description)}${td(item.laborCategory)}${td(item.quantity, 'right')}${td(item.unit)}${td(fmtNum(item.unitRate), 'right')}${td(fmtNum(item.total), 'right')}</tr>`;
      });
      html += `<tr style="background:#f1f5f9;font-weight:bold"><td colspan="6" style="padding:8px;border:1px solid #ddd;text-align:right">Labor Subtotal</td><td style="padding:8px;border:1px solid #ddd;text-align:right">$${fmtNum(laborTotal)}</td></tr>`;
      html += '</table>';
    }

    if (!isTM && odcs.some((o) => o.description || o.amount)) {
      html += '<h3>Other Direct Costs (ODCs)</h3>';
      html += '<table style="width:100%;border-collapse:collapse;margin-bottom:16px">';
      html += `<tr style="background:#1e293b;color:white">${th('Description')}${th('Amount ($)', 'right')}</tr>`;
      odcs.forEach((o) => {
        html += `<tr>${td(o.description)}${td(fmtNum(parseFloat(o.amount || 0)), 'right')}</tr>`;
      });
      html += `<tr style="background:#f1f5f9;font-weight:bold"><td style="padding:8px;border:1px solid #ddd;text-align:right">ODC Subtotal</td><td style="padding:8px;border:1px solid #ddd;text-align:right">$${fmtNum(odcTotal)}</td></tr>`;
      html += '</table>';
    }

    if (!isFFP && !isTM) {
      html += `<h3>Total Proposed Price: $${fmtNum(grandTotal)}</h3>`;
    }
    if (notes) html += `<h3>Pricing Notes &amp; Assumptions</h3><p>${notes}</p>`;
    return html;
  };

  const fmt = (n) => '$' + (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-navy flex items-center gap-2">
            <CurrencyDollarIcon className="w-4 h-4" />
            Labor Categories &amp; Line Items
            {importCount > 0 && (
              <span className="text-xs font-medium text-accent bg-accent/10 px-2 py-0.5 rounded-full animate-pulse">
                {importCount} imported from Market Research
              </span>
            )}
          </h3>
          <div className="flex items-center gap-3">
            {selectedIds.size > 0 && (
              <button onClick={removeSelected} className="flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-700 transition-colors cursor-pointer">
                <TrashIcon className="w-3.5 h-3.5" />Remove Selected ({selectedIds.size})
              </button>
            )}
            <button onClick={handleImportFromResearch} className="flex items-center gap-1 text-xs font-medium text-blue hover:text-blue-dark transition-colors cursor-pointer">
              <ArrowPathIcon className="w-3.5 h-3.5" />Import from Market Research
            </button>
            <button onClick={addLineItem} className="flex items-center gap-1 text-xs font-medium text-accent hover:text-accent-dark transition-colors cursor-pointer">
              <PlusIcon className="w-4 h-4" />Add Line Item
            </button>
          </div>
        </div>

        {isFFP && (
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {yearPeriods.map((yr, idx) => (
              <span key={idx} className="inline-flex items-center gap-1 px-3 py-1.5 bg-navy/10 text-navy text-xs font-medium rounded-full">
                {yr}
                {yearPeriods.length > 1 && (
                  <button onClick={() => removeYearPeriod(idx)} className="ml-1 text-red-400 hover:text-red-600 cursor-pointer">
                    <TrashIcon className="w-3 h-3" />
                  </button>
                )}
              </span>
            ))}
            <button onClick={addYearPeriod} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-accent hover:text-accent-dark bg-accent/5 hover:bg-accent/10 rounded-full transition-colors cursor-pointer">
              <PlusIcon className="w-3 h-3" /> Add Year
            </button>
          </div>
        )}

        {isTM ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-navy text-white">
                  <th className="px-2 py-2.5 rounded-tl-lg w-8 text-center">
                    <input type="checkbox" checked={lineItems.length > 0 && selectedIds.size === lineItems.length} onChange={toggleSelectAll} className="w-3.5 h-3.5 rounded cursor-pointer accent-white" />
                  </th>
                  <th className="px-3 py-2.5 text-left font-medium">CLIN</th>
                  <th className="px-3 py-2.5 text-left font-medium">Description (SOW)</th>
                  <th className="px-3 py-2.5 text-left font-medium">LCAT</th>
                  <th className="px-3 py-2.5 text-right font-medium">Hourly Rate ($)</th>
                  <th className="px-3 py-2.5 text-right font-medium">Expected Hours</th>
                  <th className="px-3 py-2.5 text-right font-medium">Total Amount</th>
                  <th className="px-3 py-2.5 rounded-tr-lg w-10"></th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item, idx) => (
                  <tr key={item.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${selectedIds.has(item.id) ? 'bg-blue-50/60' : ''}`}>
                    <td className="px-2 py-1.5 border-b border-gray-100 text-center">
                      <input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => toggleSelect(item.id)} className="w-3.5 h-3.5 rounded cursor-pointer accent-navy" />
                    </td>
                    <td className="px-2 py-1.5 border-b border-gray-100">
                      <input type="text" value={item.clin} onChange={(e) => updateLineItem(item.id, 'clin', e.target.value)} placeholder="0001" className="w-16 px-2 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue/30" />
                    </td>
                    <td className="px-2 py-1.5 border-b border-gray-100">
                      <input type="text" value={item.description} onChange={(e) => updateLineItem(item.id, 'description', e.target.value)} placeholder="e.g., IT Support Services" className="w-full min-w-[140px] px-2 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue/30" />
                    </td>
                    <td className="px-2 py-1.5 border-b border-gray-100">
                      <input type="text" value={item.laborCategory} onChange={(e) => updateLineItem(item.id, 'laborCategory', e.target.value)} placeholder="e.g., Sr. Developer" className="w-full min-w-[120px] px-2 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue/30" />
                    </td>
                    <td className="px-2 py-1.5 border-b border-gray-100">
                      <input type="number" value={item.unitRate} onChange={(e) => updateLineItem(item.id, 'unitRate', e.target.value)} min="0" step="0.01" className="w-24 px-2 py-1.5 border border-gray-200 rounded text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue/30" />
                    </td>
                    <td className="px-2 py-1.5 border-b border-gray-100">
                      <input type="number" value={item.quantity} onChange={(e) => updateLineItem(item.id, 'quantity', e.target.value)} min="0" className="w-20 px-2 py-1.5 border border-gray-200 rounded text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue/30" />
                    </td>
                    <td className="px-2 py-1.5 border-b border-gray-100 text-right text-xs font-semibold text-navy">{fmt(item.total)}</td>
                    <td className="px-2 py-1.5 border-b border-gray-100">
                      {lineItems.length > 1 && (
                        <button onClick={() => removeLineItem(item.id)} className="p-1 text-red-400 hover:text-red-600 transition-colors cursor-pointer">
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-navy/5 font-semibold">
                  <td colSpan="6" className="px-3 py-2.5 text-right text-sm text-navy">Labor Subtotal</td>
                  <td className="px-3 py-2.5 text-right text-sm text-navy">{fmt(laborTotal)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-navy text-white">
                  <th className="px-2 py-2.5 rounded-tl-lg w-8 text-center">
                    <input type="checkbox" checked={lineItems.length > 0 && selectedIds.size === lineItems.length} onChange={toggleSelectAll} className="w-3.5 h-3.5 rounded cursor-pointer accent-white" />
                  </th>
                  <th className="px-3 py-2.5 text-left font-medium">CLIN</th>
                  <th className="px-3 py-2.5 text-left font-medium">Description</th>
                  <th className="px-3 py-2.5 text-left font-medium">Labor Category</th>
                  <th className="px-3 py-2.5 text-right font-medium">Qty</th>
                  <th className="px-3 py-2.5 text-left font-medium">Unit</th>
                  <th className="px-3 py-2.5 text-right font-medium">Rate ($)</th>
                  <th className="px-3 py-2.5 text-right font-medium">Total</th>
                  <th className="px-3 py-2.5 rounded-tr-lg w-10"></th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item, idx) => (
                  <tr key={item.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${selectedIds.has(item.id) ? 'bg-blue-50/60' : ''}`}>
                    <td className="px-2 py-1.5 border-b border-gray-100 text-center">
                      <input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => toggleSelect(item.id)} className="w-3.5 h-3.5 rounded cursor-pointer accent-navy" />
                    </td>
                    <td className="px-2 py-1.5 border-b border-gray-100">
                      <input type="text" value={item.clin} onChange={(e) => updateLineItem(item.id, 'clin', e.target.value)} placeholder="0001" className="w-16 px-2 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue/30" />
                    </td>
                    <td className="px-2 py-1.5 border-b border-gray-100">
                      <input type="text" value={item.description} onChange={(e) => updateLineItem(item.id, 'description', e.target.value)} placeholder="e.g., IT Support Services" className="w-full min-w-[140px] px-2 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue/30" />
                    </td>
                    <td className="px-2 py-1.5 border-b border-gray-100">
                      <input type="text" value={item.laborCategory} onChange={(e) => updateLineItem(item.id, 'laborCategory', e.target.value)} placeholder="e.g., Sr. Developer" className="w-full min-w-[120px] px-2 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue/30" />
                    </td>
                    <td className="px-2 py-1.5 border-b border-gray-100">
                      <input type="number" value={item.quantity} onChange={(e) => updateLineItem(item.id, 'quantity', e.target.value)} min="0" className="w-16 px-2 py-1.5 border border-gray-200 rounded text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue/30" />
                    </td>
                    <td className="px-2 py-1.5 border-b border-gray-100">
                      <select value={item.unit} onChange={(e) => updateLineItem(item.id, 'unit', e.target.value)} className="px-2 py-1.5 border border-gray-200 rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue/30">
                        {unitOptions.map((u) => (<option key={u} value={u}>{u}</option>))}
                      </select>
                    </td>
                    <td className="px-2 py-1.5 border-b border-gray-100">
                      <input type="number" value={item.unitRate} onChange={(e) => updateLineItem(item.id, 'unitRate', e.target.value)} min="0" step="0.01" className="w-24 px-2 py-1.5 border border-gray-200 rounded text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue/30" />
                    </td>
                    <td className="px-2 py-1.5 border-b border-gray-100 text-right text-xs font-semibold text-navy">{fmt(item.total)}</td>
                    <td className="px-2 py-1.5 border-b border-gray-100">
                      {lineItems.length > 1 && (
                        <button onClick={() => removeLineItem(item.id)} className="p-1 text-red-400 hover:text-red-600 transition-colors cursor-pointer">
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-navy/5 font-semibold">
                  <td colSpan="7" className="px-3 py-2.5 text-right text-sm text-navy">Labor Subtotal</td>
                  <td className="px-3 py-2.5 text-right text-sm text-navy">{fmt(laborTotal)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {isTM && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-navy">Materials (Actual Cost + Markup)</h3>
            <button onClick={addMaterial} className="flex items-center gap-1 text-xs font-medium text-accent hover:text-accent-dark transition-colors cursor-pointer">
              <PlusIcon className="w-4 h-4" />Add Material
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-navy text-white">
                  <th className="px-3 py-2.5 rounded-tl-lg text-left font-medium">Description</th>
                  <th className="px-3 py-2.5 text-right font-medium">Actual Cost ($)</th>
                  <th className="px-3 py-2.5 text-right font-medium">Markup (%)</th>
                  <th className="px-3 py-2.5 text-right font-medium">Total ($)</th>
                  <th className="px-3 py-2.5 rounded-tr-lg w-10"></th>
                </tr>
              </thead>
              <tbody>
                {materials.map((mat, idx) => {
                  const cost = parseFloat(mat.actualCost) || 0;
                  const markup = parseFloat(mat.markupPercent) || 0;
                  const matTotal = cost + (cost * markup / 100);
                  return (
                    <tr key={mat.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-2 py-1.5 border-b border-gray-100">
                        <input type="text" value={mat.description} onChange={(e) => updateMaterial(mat.id, 'description', e.target.value)} placeholder="e.g., Software licenses, Hardware" className="w-full min-w-[180px] px-2 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue/30" />
                      </td>
                      <td className="px-2 py-1.5 border-b border-gray-100">
                        <input type="number" value={mat.actualCost} onChange={(e) => updateMaterial(mat.id, 'actualCost', e.target.value)} min="0" step="0.01" className="w-28 px-2 py-1.5 border border-gray-200 rounded text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue/30" />
                      </td>
                      <td className="px-2 py-1.5 border-b border-gray-100">
                        <input type="number" value={mat.markupPercent} onChange={(e) => updateMaterial(mat.id, 'markupPercent', e.target.value)} min="0" step="0.1" className="w-20 px-2 py-1.5 border border-gray-200 rounded text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue/30" />
                      </td>
                      <td className="px-2 py-1.5 border-b border-gray-100 text-right text-xs font-semibold text-navy">{fmt(matTotal)}</td>
                      <td className="px-2 py-1.5 border-b border-gray-100">
                        {materials.length > 1 && (
                          <button onClick={() => removeMaterial(mat.id)} className="p-1 text-red-400 hover:text-red-600 transition-colors cursor-pointer">
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-navy/5 font-semibold">
                  <td colSpan="3" className="px-3 py-2.5 text-right text-sm text-navy">Materials Subtotal</td>
                  <td className="px-3 py-2.5 text-right text-sm text-navy">{fmt(materialsTotal)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {!isTM && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-navy">Other Direct Costs (ODCs)</h3>
            <button onClick={addOdc} className="flex items-center gap-1 text-xs font-medium text-accent hover:text-accent-dark transition-colors cursor-pointer">
              <PlusIcon className="w-4 h-4" />Add ODC
            </button>
          </div>
          <div className="space-y-2">
            {odcs.map((odc) => (
              <div key={odc.id} className="flex items-center gap-3">
                <input
                  type="text"
                  value={odc.description}
                  onChange={(e) => updateOdc(odc.id, 'description', e.target.value)}
                  placeholder="e.g., Travel, Software Licenses, Equipment"
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue/30"
                />
                <div className="flex items-center gap-1">
                  <span className="text-sm text-gray-400">$</span>
                  <input
                    type="number"
                    value={odc.amount}
                    onChange={(e) => updateOdc(odc.id, 'amount', e.target.value)}
                    min="0"
                    step="0.01"
                    className="w-28 px-3 py-2 border border-gray-200 rounded-lg text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue/30"
                  />
                </div>
                {odcs.length > 1 && (
                  <button onClick={() => removeOdc(odc.id)} className="p-1.5 text-red-400 hover:text-red-600 transition-colors cursor-pointer">
                    <TrashIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-end mt-2 text-sm font-semibold text-navy">ODC Subtotal: {fmt(odcTotal)}</div>
        </div>
      )}

      <div className="bg-accent/10 border border-accent/20 rounded-xl p-5 flex items-center justify-between">
        <span className="text-lg font-bold text-navy">
          {isFFP ? `Total Fixed Price (${yearPeriods.length} Period${yearPeriods.length > 1 ? 's' : ''})` : 'Total Proposed Price'}
        </span>
        <span className="text-2xl font-bold text-accent">
          {fmt(isFFP ? (laborTotal * yearPeriods.length + odcTotal) : grandTotal)}
        </span>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-navy mb-2">Pricing Notes &amp; Assumptions</h3>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Enter cost assumptions, exclusions, basis of estimate, rate reasonableness justification..."
          rows={4}
          className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 resize-y"
        />
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function ProposalEditor() {
  const location = useLocation();
  const navigate = useNavigate();
  const sectionRefs = useRef({});
  const quillRefs = useRef({});
  const previewRef = useRef(null);
  const imageInteractionRef = useRef(null);
  const exportDisclaimerRef = useRef(null);

  const [sections, setSections] = useState({});
  const [sectionTitles, setSectionTitles] = useState({});
  const [sectionOrder, setSectionOrder] = useState([]);
  const [proposalTitle, setProposalTitle] = useState('Government Proposal');
  const [vendorName, setVendorName] = useState('');
  const [companyLogo, setCompanyLogo] = useState('');
  const [activeSection, setActiveSection] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);
  const [exporting, setExporting] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [previewMode, setPreviewMode] = useState(false);
  const [previewFont, setPreviewFont] = useState('Georgia, serif');
  const [showCustomize, setShowCustomize] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [shareLinks, setShareLinks] = useState([]);
  const [sharingLoading, setSharingLoading] = useState(false);
  const [copiedToken, setCopiedToken] = useState(null);
  const [proposalId, setProposalId] = useState(null);
  const [opportunityDetails, setOpportunityDetails] = useState({});
  const [vendorData, setVendorData] = useState({});
  const [skippedSections, setSkippedSections] = useState(new Set());
  const [regeneratingSection, setRegeneratingSection] = useState(null);
  const [sectionNotices, setSectionNotices] = useState({});
  const [writingTone, setWritingTone] = useState('professional');
  const [reviewStage, setReviewStage] = useState('draft');
  const [sectionStyles, setSectionStyles] = useState({});
  const [showSectionStyle, setShowSectionStyle] = useState(null);
  const [showChartPicker, setShowChartPicker] = useState(null);
  const [showGraphicsPicker, setShowGraphicsPicker] = useState(null);
  const [volumeAssignments, setVolumeAssignments] = useState({
    'Volume I — Administrative': [],
    'Volume II — Technical': [],
    'Volume III — Management & Compliance': [],
  });
  const [showVolumeEditor, setShowVolumeEditor] = useState(false);
  const [frozenSections, setFrozenSections] = useState(new Set());
  const [winProbOpen, setWinProbOpen] = useState(false);
  const [winProbLoading, setWinProbLoading] = useState(false);
  const [winProbResult, setWinProbResult] = useState(null);
  const [canvaTemplate, setCanvaTemplate] = useState('classic');
  const [showCanvaTemplates, setShowCanvaTemplates] = useState(false);
  const [floatingImages, setFloatingImages] = useState([]);
  const [selectedImageId, setSelectedImageId] = useState(null);
  const [pdfDisclaimerAccepted, setPdfDisclaimerAccepted] = useState(false);

  // ─── Canva templates ────────────────────────────────────────────────────────
  const CANVA_TEMPLATES = {
    classic:   { name: 'Classic Navy',    style: 'solid',    coverBg: 'linear-gradient(160deg,#1e3a5f 0%,#2d5282 100%)',            accent: '#38b2ac', headingColor: '#1e3a5f' },
    executive: { name: 'Executive Dark',  style: 'diagonal', coverBg: 'linear-gradient(160deg,#0f172a 0%,#1e293b 60%,#0f172a 100%)',accent: '#f59e0b', headingColor: '#0f172a' },
    federal:   { name: 'Federal Stripe',  style: 'diagonal', coverBg: 'linear-gradient(175deg,#1a365d 0%,#2a4a7f 55%,#c53030 100%)',accent: '#e53e3e', headingColor: '#1a365d' },
    modern:    { name: 'Modern Teal',     style: 'solid',    coverBg: 'linear-gradient(135deg,#0d9488 0%,#0f766e 100%)',             accent: '#fbbf24', headingColor: '#0d9488' },
    slate:     { name: 'Slate Pro',       style: 'solid',    coverBg: 'linear-gradient(150deg,#334155 0%,#475569 100%)',             accent: '#94a3b8', headingColor: '#334155' },
    crimson:   { name: 'Crimson Bold',    style: 'diagonal', coverBg: 'linear-gradient(135deg,#7f1d1d 0%,#991b1b 50%,#b91c1c 100%)',accent: '#fca5a5', headingColor: '#991b1b' },
    forest:    { name: 'Forest Green',    style: 'solid',    coverBg: 'linear-gradient(150deg,#14532d 0%,#166534 100%)',             accent: '#86efac', headingColor: '#14532d' },
    purple:    { name: 'Royal Purple',    style: 'diagonal', coverBg: 'linear-gradient(135deg,#3b0764 0%,#4c1d95 50%,#6d28d9 100%)',accent: '#c4b5fd', headingColor: '#4c1d95' },
    midnight:  { name: 'Midnight Gold',   style: 'solid',    coverBg: 'linear-gradient(160deg,#1c1917 0%,#292524 100%)',             accent: '#d97706', headingColor: '#1c1917' },
    ocean:     { name: 'Ocean Blue',      style: 'diagonal', coverBg: 'linear-gradient(135deg,#0c4a6e 0%,#075985 60%,#0369a1 100%)',accent: '#38bdf8', headingColor: '#0c4a6e' },
    rose:      { name: 'Corporate Rose',  style: 'solid',    coverBg: 'linear-gradient(150deg,#881337 0%,#9f1239 100%)',             accent: '#fda4af', headingColor: '#881337' },
    graphite:  { name: 'Graphite Clean',  style: 'solid',    coverBg: 'linear-gradient(160deg,#18181b 0%,#27272a 100%)',             accent: '#a1a1aa', headingColor: '#18181b' },
  };
  const activeTpl = CANVA_TEMPLATES[canvaTemplate] || CANVA_TEMPLATES.classic;

  const requirePdfDisclaimer = () => {
    if (pdfDisclaimerAccepted) return true;
    exportDisclaimerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    alert('Please review and accept the disclaimer at the bottom of the Proposal Editor before exporting PDF.');
    return false;
  };

  // ─── FIX 1: downloadPDF defined at component scope ──────────────────────────
  const downloadPDF = () => {
    if (!requirePdfDisclaimer()) return;

    // ✅ Must be in preview mode so floating images and charts are rendered
    if (!previewMode) {
      setPreviewMode(true);
      setTimeout(() => {
        const element = document.getElementById('proposal-preview');
        if (!element) { alert('Preview failed to load. Please switch to Preview mode first.'); return; }
        html2pdf()
          .from(element)
          .set({
            margin: 10,
            filename: `${proposalTitle || 'proposal'}.pdf`,
            html2canvas: { scale: 2, useCORS: true, allowTaint: true },
            jsPDF: { unit: 'mm', format: 'a4' },
          })
          .save();
      }, 600); // wait for preview to render
      return;
    }
    const element = document.getElementById('proposal-preview');
    if (!element) {
      alert('Please switch to Preview mode first, then export PDF.');
      return;
    }
    html2pdf()
      .from(element)
      .set({
        margin: 10,
        filename: `${proposalTitle || 'proposal'}.pdf`,
        html2canvas: { scale: 2, useCORS: true, allowTaint: true },
        jsPDF: { unit: 'mm', format: 'a4' },
      })
      .save();
  };

  // ─── Floating image helpers ──────────────────────────────────────────────────
  const addFloatingImage = async (url) => {
  try {
    const res = await fetch(resolveAssetUrl(url));
    const blob = await res.blob();

    const reader = new FileReader();
    reader.onloadend = () => {
      setFloatingImages(prev => [
        ...prev,
        {
          id: Date.now(),
          url: reader.result, // ✅ BASE64 IMAGE
          x: 60,
          y: 60,
          width: 200,
          height: 150,
        }
      ]);
    };

    reader.readAsDataURL(blob);
  } catch (err) {
    console.log("Image fetch failed:", err);
  }
};
  const updateFloatingImage = (id, updates) => {
    setFloatingImages(prev => prev.map(img => img.id === id ? { ...img, ...updates } : img));
  };
  const removeFloatingImage = (id) => {
    setFloatingImages(prev => prev.filter(img => img.id !== id));
    if (selectedImageId === id) setSelectedImageId(null);
  };

  // ─── Global mouse handlers for floating images ───────────────────────────────
  useEffect(() => {
    const handleMove = (e) => {
      const interaction = imageInteractionRef.current;
      if (!interaction) return;
      if (interaction.type === 'drag') {
  const dx = e.clientX - interaction.startX;
  const dy = e.clientY - interaction.startY;

  updateFloatingImage(interaction.id, {
    x: interaction.origX + dx,
    y: interaction.origY + dy,
  });
}
else if (interaction.type === 'resize') {
        updateFloatingImage(interaction.id, {
          width: Math.max(60, interaction.origW + e.clientX - interaction.startX),
          height: Math.max(40, interaction.origH + e.clientY - interaction.startY),
        });
      }
    };
    const handleUp = () => {
      imageInteractionRef.current = null;
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, []);

  const toggleFreezeSection = (key) => {
    setFrozenSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const toggleSectionInclude = (key) => {
    setSkippedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const toggleAllSections = () => {
    if (skippedSections.size === 0) setSkippedSections(new Set(sectionOrder));
    else setSkippedSections(new Set());
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setSectionOrder((prev) => {
        const oldIndex = prev.indexOf(active.id);
        const newIndex = prev.indexOf(over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  };

  const handleDuplicateSection = (key) => {
    const newKey = `${key}_copy_${Date.now()}`;
    setSections((prev) => ({ ...prev, [newKey]: prev[key] || '' }));
    setSectionTitles((prev) => ({
      ...prev,
      [newKey]: `${prev[key] || sectionLabels[key] || key} (Copy)`,
    }));
    setSectionOrder((prev) => {
      const idx = prev.indexOf(key);
      const next = [...prev];
      next.splice(idx + 1, 0, newKey);
      return next;
    });
  };

  const handleApplyTemplate = (template) => {
    const newSkipped = new Set();
    for (const key of sectionOrder) {
      if (!template.sections.includes(key)) newSkipped.add(key);
    }
    setSkippedSections(newSkipped);
    setSectionOrder((prev) => {
      const inTemplate = template.sections.filter((k) => prev.includes(k));
      const notInTemplate = prev.filter((k) => !template.sections.includes(k));
      return [...inTemplate, ...notInTemplate];
    });
    setShowTemplates(false);
  };

  const handleRegenerateSection = async (key) => {
    if (regeneratingSection) return;
    setRegeneratingSection(key);
    try {
      const sectionKeys = sectionOrder.length > 0 ? sectionOrder : Object.keys(sections);
      const contextParts = sectionKeys
        .filter((k) => k !== key && !skippedSections.has(k) && sections[k])
        .slice(0, 5)
        .map((k) => `${sectionLabels[k] || k}: ${(sections[k] || '').replace(/<[^>]+>/g, '').slice(0, 300)}`);

      const toneInstructions = {
        professional: 'Use formal, professional government contracting language.',
        technical: 'Use highly technical language with specific methodologies and standards.',
        executive: 'Write for senior executives. Focus on outcomes, ROI, and strategic value.',
        persuasive: 'Write persuasively to win the evaluation. Emphasize differentiators.',
        human: 'Write naturally, avoiding generic AI language. Use varied sentence structure.',
      };

      const prompt = `You are writing a FAR-compliant US government contract proposal.
Regenerate the "${sectionLabels[key] || key}" section with improved content.
Proposal title: "${proposalTitle}"
${vendorName ? `Vendor: ${vendorName}` : ''}
${opportunityDetails?.agency ? `Agency: ${opportunityDetails.agency}` : ''}
${opportunityDetails?.solicitation_number ? `Solicitation: ${opportunityDetails.solicitation_number}` : ''}
WRITING TONE: ${writingTone.toUpperCase()} — ${toneInstructions[writingTone] || toneInstructions.professional}
${contextParts.length > 0 ? `Context from other sections:\n${contextParts.join('\n\n')}` : ''}

Write ONLY the HTML content for this section. Use proper headings (<h3>, <h4>), paragraphs (<p>), and bullet lists (<ul><li>). Do not include any preamble, explanation, or markdown — output raw HTML only.`;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1500,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error?.message || `API error ${response.status}`);
      }

      const data = await response.json();
      const generated = data.content
        ?.filter((b) => b.type === 'text')
        .map((b) => b.text)
        .join('') || '';

      const plainGenerated = generated.replace(/<[^>]+>/g, '').trim();
      if (
        plainGenerated &&
        !/You are writing a FAR-compliant US government contract proposal/i.test(plainGenerated) &&
        !/Regenerate the ".+?" section with improved content/i.test(plainGenerated)
      ) {
        handleContentChange(key, generated);
        setSectionNotices((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      } else {
        throw new Error('AI returned unexpected content. Please try again.');
      }
    } catch (err) {
      const currentPlain = (sections[key] || '').replace(/<[^>]+>/g, '').trim();
      if (!currentPlain) {
        handleContentChange(key, buildStarterSectionContent(key, {
          proposalTitle,
          vendorName,
          opportunityDetails,
          vendorData,
        }));
        setSectionNotices((prev) => ({
          ...prev,
          [key]: `AI Rewrite is unavailable, so editable starter content was inserted for ${sectionLabels[key] || key}. Please customize it before export.`,
        }));
      } else {
        setSectionNotices((prev) => ({
          ...prev,
          [key]: `AI Rewrite failed: ${err.message}`,
        }));
      }
    } finally {
      setRegeneratingSection(null);
    }
  };

  const updateSectionStyle = (key, prop, value) => {
    setSectionStyles((prev) => ({ ...prev, [key]: { ...(prev[key] || {}), [prop]: value } }));
  };

  const insertChartToSection = (key, chartType) => {
    const chartHtml = generateChartPlaceholder(chartType);
    const current = sections[key] || '';
    handleContentChange(key, current + chartHtml);
    setShowChartPicker(null);
  };

  // ─── Load vendor profile ─────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem('vendorProfile');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.company_logo) setCompanyLogo(parsed.company_logo);
      }
    } catch { /* ignore */ }
  }, []);

  // ─── Load proposal from navigation state, or restore after browser refresh ──
  useEffect(() => {
    let editorState = location.state;
    if (!editorState?.proposal) {
      try {
        editorState = JSON.parse(localStorage.getItem('lastGeneratedProposal') || 'null');
      } catch {
        editorState = null;
      }
    }

    if (editorState?.proposal) {
      const proposalData = editorState.proposal;
      const sectionContent = proposalData.sections || proposalData;

      if (proposalData.id || proposalData.proposal_id) setProposalId(proposalData.id || proposalData.proposal_id);
      if (proposalData.opportunity_title) setProposalTitle(proposalData.opportunity_title);
      if (proposalData.vendor_name) setVendorName(proposalData.vendor_name);

      if (editorState?.opportunity) setOpportunityDetails(editorState.opportunity);
      if (editorState?.vendor) setVendorData(editorState.vendor);

      const meta = proposalData.metadata || {};
      if (meta.agency || meta.solicitation_number || meta.poc_name) {
        setOpportunityDetails((prev) => ({
          ...prev,
          proposal_type: meta.proposal_type || prev.proposal_type || '',
          agency: meta.agency || prev.agency || '',
          contracting_office: meta.contracting_office || prev.contracting_office || '',
          solicitation_number: meta.solicitation_number || prev.solicitation_number || '',
          submission_date: meta.submission_date || prev.submission_date || '',
          poc_name: meta.poc_name || prev.poc_name || '',
          poc_title: meta.poc_title || prev.poc_title || '',
          poc_email: meta.poc_email || prev.poc_email || '',
          poc_phone: meta.poc_phone || prev.poc_phone || '',
        }));
      }
      if (meta.cage_code || meta.duns_number || meta.vendor_name) {
        setVendorData((prev) => ({
          ...prev,
          company_name: meta.vendor_name || prev.company_name || '',
          cage_code: meta.cage_code || prev.cage_code || '',
          duns_number: meta.duns_number || prev.duns_number || '',
          naics_codes: meta.naics_codes || prev.naics_codes || [],
        }));
        if (!vendorName && meta.vendor_name) setVendorName(meta.vendor_name);
      }

      const parsed = {};
      const titles = {};
      for (const [key, value] of Object.entries(sectionContent)) {
        // ✅ Accept ALL keys the backend returns, not just ones in sectionLabels
        // (previously unknown keys were silently dropped, causing blank sections)
        parsed[key] = typeof value === 'string' ? value : value?.content || '';
        titles[key] = typeof value === 'string'
          ? (sectionLabels[key] || key)
          : (value?.title || sectionLabels[key] || key);
      }

      if (!hasSectionContent(parsed)) {
        localStorage.removeItem('lastGeneratedProposal');
        setSections({});
        setSectionTitles({});
        setSectionOrder([]);
        return;
      }

      setSections(parsed);
      setSectionTitles(titles);
      setSectionOrder(Object.keys(parsed));
      const firstKey = Object.keys(parsed)[0];
      if (firstKey) setActiveSection(firstKey);
    } else {
      setSections({});
      setSectionTitles({});
      setSectionOrder([]);
    }
  }, [location.state]);

  // ─── Auto-load vendor profile from API ──────────────────────────────────────
  useEffect(() => {
    const loadVendorProfile = async () => {
      try {
        const res = await api.get('/api/vendor-profiles');
        if (res.data?.profiles?.length > 0) {
          const p = res.data.profiles[0];
          const mapped = {
            company_name: p.company_name || '',
            cage_code: p.cage_code || '',
            duns_number: p.duns_number || '',
            naics_codes: Array.isArray(p.naics_codes) ? p.naics_codes : [],
            capabilities: p.capabilities || '',
            past_performance: p.past_performance || '',
            socioeconomic_status: p.socioeconomic_status || '',
            contact_name: p.contact_info?.name || '',
            contact_email: p.contact_info?.email || '',
            contact_phone: p.contact_info?.phone || '',
            contact_address: p.contact_info?.address || '',
          };
          setVendorData((prev) => (prev && prev.company_name ? prev : { ...prev, ...mapped }));
          if (!vendorName && mapped.company_name) setVendorName(mapped.company_name);
        }
      } catch {
        try {
          const saved = localStorage.getItem('vendorProfile');
          if (saved) {
            const parsed = JSON.parse(saved);
            setVendorData((prev) => (prev && prev.company_name ? prev : { ...prev, ...parsed }));
            if (!vendorName && parsed.company_name) setVendorName(parsed.company_name);
          }
        } catch { /* ignore */ }
      }
    };
    loadVendorProfile();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleContentChange = (key, content) => {
    setSections((prev) => ({ ...prev, [key]: content }));
  };

  const scrollToSection = (key) => {
    setActiveSection(key);
    const el = sectionRefs.current[key];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const analyzeWinProbability = async () => {
    setWinProbLoading(true);
    setWinProbOpen(true);
    const sectionKeys = sectionOrder.length > 0 ? sectionOrder : Object.keys(sections);
    try {
      const includedSections = sectionKeys
        .filter((k) => !skippedSections.has(k))
        .map((k) => `${sectionLabels[k] || k}: ${(sections[k] || '').replace(/<[^>]+>/g, '').slice(0, 300)}`)
        .join('\n\n');

      const prompt = `You are a government proposal evaluator. Analyze this proposal and return a JSON object with these exact keys:
- "score": integer 0-100
- "level": one of "Highly Competitive", "Competitive", "Moderate", "Low", "Needs Work"
- "strengths": array of 2-3 short strings
- "weaknesses": array of 2-3 short strings
- "recommendation": one sentence

Proposal: ${proposalTitle}
Agency: ${opportunityDetails?.agency || 'Not specified'}
Sections: ${sectionKeys.filter((k) => !skippedSections.has(k)).length}

${includedSections}

Return ONLY valid JSON, no markdown.`;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) {
        throw new Error(`API error ${response.status}`);
      }

      const data = await response.json();
      const text = data.content?.filter((b) => b.type === 'text').map((b) => b.text).join('') || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        setWinProbResult({
          score: Math.min(100, Math.max(0, parsed.score || 0)),
          level: parsed.level || 'Unknown',
          strengths: parsed.strengths || [],
          weaknesses: parsed.weaknesses || [],
          recommendation: parsed.recommendation || '',
        });
      } else {
        setWinProbResult({ score: 50, level: 'Moderate', strengths: ['Analysis completed'], weaknesses: ['Could not parse results'], recommendation: 'Review proposal sections for completeness.' });
      }
    } catch {
      setWinProbResult({ score: 0, level: 'Error', strengths: [], weaknesses: ['AI analysis failed'], recommendation: 'Check your connection and try again.' });
    } finally {
      setWinProbLoading(false);
    }
  };

  const fetchShareLinks = async () => {
    if (!proposalId) return;
    try {
      const res = await api.get(`/api/proposals/${proposalId}/shares`);
      setShareLinks(res.data.shares || []);
    } catch { /* ignore */ }
  };

  const handleCreateShareLink = async () => {
    if (!proposalId) { alert('Proposal must be saved first to create a share link.'); return; }
    setSharingLoading(true);
    try {
      const res = await api.post(`/api/proposals/${proposalId}/share`);
      setShareLinks((prev) => [res.data.share, ...prev]);
    } catch (err) {
      alert(`Failed to create share link: ${err.response?.data?.detail || err.message}`);
    } finally {
      setSharingLoading(false);
    }
  };

  const handleDeleteShareLink = async (shareId) => {
    if (!proposalId) return;
    try {
      await api.delete(`/api/proposals/${proposalId}/share/${shareId}`);
      setShareLinks((prev) => prev.filter((s) => s.id !== shareId));
    } catch (err) {
      alert(`Failed to delete share link: ${err.response?.data?.detail || err.message}`);
    }
  };

  const copyShareUrl = (token) => {
    const url = `${window.location.origin}/shared/${token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
    });
  };

  // ─── FIX 2: handleExport uses the API correctly ──────────────────────────────
  const handleExport = async (format) => {
    if (format === 'pdf' && !requirePdfDisclaimer()) return;

    setExporting(format);
    try {
      const sectionKeys = sectionOrder.length > 0 ? sectionOrder : Object.keys(sections);
      const exportSections = {};
      for (const key of sectionKeys) {
        if (skippedSections.has(key)) continue;
        exportSections[key] = {
          title: sectionTitles[key] || sectionLabels[key] || key,
          content: sections[key] || '',
        };
      }
      const payload = {
        proposal_title: proposalTitle,
        vendor_name: vendorName,
        sections: exportSections,
        company_logo: companyLogo || '',
        template: {
          id: canvaTemplate,
          name: activeTpl.name,
          accent: activeTpl.accent,
          headingColor: activeTpl.headingColor,
        },
        floating_images: floatingImages.map((img) => ({
          ...img,
          url: resolveAssetUrl(img.url),
        })),
        metadata: {
          proposal_type: opportunityDetails?.proposal_type || 'Government Contract Proposal',
          agency: opportunityDetails?.agency || '',
          contracting_office: opportunityDetails?.contracting_office || '',
          solicitation_number: opportunityDetails?.solicitation_number || '',
          submission_date: opportunityDetails?.submission_date || '',
          cage_code: vendorData?.cage_code || '',
          duns_number: vendorData?.duns_number || '',
          naics_codes: vendorData?.naics_codes || [],
          poc_name: opportunityDetails?.poc_name || '',
          poc_title: opportunityDetails?.poc_title || '',
          poc_email: opportunityDetails?.poc_email || '',
          poc_phone: opportunityDetails?.poc_phone || '',
        },
        volume_assignments: Object.values(volumeAssignments).some(v => v.length > 0) ? volumeAssignments : null,
      };

      const response = await api.post(`/api/export/${format}`, payload, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${proposalTitle || 'proposal'}.${format === 'pdf' ? 'pdf' : 'docx'}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
      alert(`Export failed: ${err.response?.data?.detail || err.message || 'Unknown error'}`);
    } finally {
      setExporting('');
    }
  };

  const sectionKeys = sectionOrder.length > 0 ? sectionOrder : Object.keys(sections);

  // Show empty state only if no section keys AND no nav state
  if (sectionKeys.length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <DocumentTextIcon className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-navy mb-2">No Proposal to Edit</h2>
          <p className="text-gray-500 text-sm mb-6">Generate a proposal first to start editing.</p>
          <button
            onClick={() => navigate('/new-proposal')}
            className="bg-accent hover:bg-accent-dark text-white px-6 py-3 rounded-lg font-medium text-sm transition-all cursor-pointer"
          >
            Generate New Proposal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-full mx-auto -m-6 lg:-m-8">
      {/* ─── Top Toolbar ──────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-16 z-30 flex-wrap gap-2">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/new-proposal')}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-navy transition-colors cursor-pointer"
          >
            <ArrowLeftIcon className="w-4 h-4" />Back
          </button>
          <div className="h-5 w-px bg-gray-200" />
          <h1 className="text-lg font-semibold text-navy">
            {previewMode ? 'Proposal Preview' : 'Proposal Editor'}
          </h1>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-1.5 rounded-md hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <ListBulletIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Preview / Edit toggle */}
          <button
            onClick={() => { setPreviewMode(!previewMode); setShowCustomize(false); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              previewMode ? 'bg-accent text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {previewMode ? <><PencilSquareIcon className="w-4 h-4" /> Edit Mode</> : <><EyeIcon className="w-4 h-4" /> Preview</>}
          </button>

          {/* ✅ Add Image always visible — works in both edit and preview mode */}
          <label className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-all cursor-pointer">
            <PhotoIcon className="w-4 h-4" />Add Image
            <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              // Convert to base64 immediately so it shows in preview + exports
              const reader = new FileReader();
              reader.onloadend = () => {
                setFloatingImages(prev => [...prev, {
                  id: Date.now(),
                  url: reader.result,
                  x: 60, y: 60,
                  width: 200, height: 150,
                }]);
                // Switch to preview so the image is visible and draggable
                if (!previewMode) setPreviewMode(true);
              };
              reader.readAsDataURL(file);
              e.target.value = '';
            }} />
          </label>

          {previewMode && (
            <>
              <button
                onClick={() => setShowCustomize(!showCustomize)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${showCustomize ? 'bg-navy text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                <SwatchIcon className="w-4 h-4" />Customize
              </button>
              <button
                onClick={() => setShowCanvaTemplates(!showCanvaTemplates)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${showCanvaTemplates ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                <PaintBrushIcon className="w-4 h-4" />Templates
              </button>
            </>
          )}

          {/* Share */}
          <div className="relative">
            <button
              onClick={() => { setShowShareMenu(!showShareMenu); if (!showShareMenu) fetchShareLinks(); }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-purple-600 hover:bg-purple-700 text-white transition-all cursor-pointer"
            >
              <ShareIcon className="w-4 h-4" />Share
            </button>
            {showShareMenu && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-navy">Share Proposal</h3>
                  <button onClick={() => setShowShareMenu(false)} className="p-1 hover:bg-gray-100 rounded cursor-pointer">
                    <XMarkIcon className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
                <button
                  onClick={handleCreateShareLink}
                  disabled={sharingLoading || !proposalId}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-accent hover:bg-accent-dark text-white transition-all disabled:opacity-50 cursor-pointer mb-3"
                >
                  {sharingLoading ? <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> : <PlusIcon className="w-4 h-4" />}
                  Generate Share Link
                </button>
                {!proposalId && <p className="text-xs text-amber-600 mb-3">Proposal must be saved to create share links.</p>}
                {shareLinks.length > 0 && (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Active Links</p>
                    {shareLinks.map((link) => (
                      <div key={link.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-600 truncate font-mono">/shared/{link.share_token.slice(0, 8)}...</p>
                          <p className="text-[10px] text-gray-400">{new Date(link.created_at).toLocaleDateString()}</p>
                        </div>
                        <button onClick={() => copyShareUrl(link.share_token)} className="p-1.5 hover:bg-white rounded transition-colors cursor-pointer" title="Copy link">
                          <ClipboardDocumentIcon className={`w-4 h-4 ${copiedToken === link.share_token ? 'text-green-500' : 'text-gray-400'}`} />
                        </button>
                        <button onClick={() => handleDeleteShareLink(link.id)} className="p-1.5 hover:bg-white rounded transition-colors cursor-pointer" title="Delete link">
                          <TrashIcon className="w-4 h-4 text-red-400 hover:text-red-600" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Export PDF — FIX: calls downloadPDF (component scope) */}
          <button
            onClick={downloadPDF}
            disabled={!!exporting}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-navy hover:bg-navy-light text-white transition-all disabled:opacity-50 cursor-pointer"
          >
            {exporting === 'pdf' ? <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> : <DocumentArrowDownIcon className="w-4 h-4" />}
            Export PDF
          </button>

          <button
            onClick={() => handleExport('docx')}
            disabled={!!exporting}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue hover:bg-blue-light text-white transition-all disabled:opacity-50 cursor-pointer"
          >
            {exporting === 'docx' ? <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> : <DocumentArrowDownIcon className="w-4 h-4" />}
            Export DOCX
          </button>

          <button
            onClick={() => setShowVolumeEditor(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 transition-all cursor-pointer"
          >
            <RectangleStackIcon className="w-4 h-4" />Volume Setup
          </button>
        </div>
      </div>

      {/* ─── Volume Assignment Modal ───────────────────────────────────────────── */}
      {showVolumeEditor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Volume Assignment</h3>
              <button onClick={() => setShowVolumeEditor(false)} className="p-1 hover:bg-gray-100 rounded-lg cursor-pointer">
                <XMarkIcon className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">Assign sections to volumes for multi-volume export.</p>
            {Object.entries(volumeAssignments).map(([volName, volSections]) => (
              <div key={volName} className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <input
                    className="text-sm font-semibold text-navy bg-transparent border-b border-dashed border-gray-300 focus:border-navy outline-none flex-1 py-1"
                    value={volName}
                    onChange={(e) => {
                      const newAssignments = { ...volumeAssignments };
                      const secs = newAssignments[volName];
                      delete newAssignments[volName];
                      newAssignments[e.target.value] = secs;
                      setVolumeAssignments(newAssignments);
                    }}
                  />
                  <span className="text-xs text-gray-400">{volSections.length} sections</span>
                </div>
                <div className="min-h-[40px] bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 p-2 space-y-1">
                  {volSections.map((sKey) => (
                    <div key={sKey} className="flex items-center justify-between bg-white px-3 py-1.5 rounded border text-sm">
                      <span>{sectionTitles[sKey] || sectionLabels[sKey] || sKey}</span>
                      <button
                        onClick={() => setVolumeAssignments(prev => ({ ...prev, [volName]: prev[volName].filter(k => k !== sKey) }))}
                        className="text-red-400 hover:text-red-600 cursor-pointer"
                      >
                        <XCircleIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {volSections.length === 0 && <p className="text-xs text-gray-400 text-center py-1">No sections assigned</p>}
                </div>
              </div>
            ))}
            <button
              onClick={() => {
                const num = Object.keys(volumeAssignments).length + 1;
                setVolumeAssignments(prev => ({ ...prev, [`Volume ${num}`]: [] }));
              }}
              className="text-sm text-accent hover:text-accent-light flex items-center gap-1 mb-4 cursor-pointer"
            >
              <PlusIcon className="w-4 h-4" /> Add Volume
            </button>
            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold text-gray-600 mb-2">Available Sections</h4>
              <div className="flex flex-wrap gap-2">
                {sectionKeys.filter(k => !skippedSections.has(k) && !Object.values(volumeAssignments).flat().includes(k)).map((sKey) => (
                  <div key={sKey} className="group relative">
                    <div className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-sm border border-blue-200">
                      {sectionTitles[sKey] || sectionLabels[sKey] || sKey}
                    </div>
                    <div className="absolute top-full left-0 mt-1 hidden group-hover:flex flex-col bg-white shadow-lg rounded-lg border z-10 min-w-[160px]">
                      {Object.keys(volumeAssignments).map((vn) => (
                        <button
                          key={vn}
                          onClick={() => setVolumeAssignments(prev => ({ ...prev, [vn]: [...prev[vn], sKey] }))}
                          className="text-left px-3 py-1.5 text-sm hover:bg-gray-50 cursor-pointer"
                        >
                          Add to {vn}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setVolumeAssignments({ 'Volume I — Administrative': [], 'Volume II — Technical': [], 'Volume III — Management & Compliance': [] })}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer"
              >
                Reset to Default
              </button>
              <button onClick={() => setShowVolumeEditor(false)} className="px-4 py-2 text-sm bg-navy text-white rounded-lg hover:bg-navy-light cursor-pointer">Done</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex">
        {/* ─── Section Sidebar ────────────────────────────────────────────────── */}
        <aside className={`w-64 bg-white border-r border-gray-200 sticky top-[7.5rem] h-[calc(100vh-7.5rem)] overflow-y-auto flex-shrink-0 transition-all ${sidebarOpen ? 'block' : 'hidden lg:block'}`}>
          <div className="p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Sections</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowTemplates(!showTemplates)}
                  className="text-xs font-medium text-accent hover:text-accent-dark transition-colors cursor-pointer flex items-center gap-1"
                >
                  <RectangleStackIcon className="w-3.5 h-3.5" />Templates
                </button>
                <button onClick={toggleAllSections} className="text-xs font-medium text-blue hover:text-blue-dark transition-colors cursor-pointer">
                  {skippedSections.size === 0 ? 'Deselect All' : 'Select All'}
                </button>
              </div>
            </div>

            {showTemplates && (
              <div className="mb-3 bg-gray-50 rounded-lg p-2.5 border border-gray-200">
                <p className="text-xs font-semibold text-navy mb-2">Choose a Template</p>
                <div className="space-y-1.5">
                  {PROPOSAL_TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.id}
                      onClick={() => handleApplyTemplate(tpl)}
                      className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200 transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">{tpl.icon}</span>
                        <div>
                          <p className="text-xs font-semibold text-navy">{tpl.name}</p>
                          <p className="text-[10px] text-gray-400">{tpl.description}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={sectionKeys} strategy={verticalListSortingStrategy}>
                <nav className="space-y-0.5">
                  {sectionKeys.map((key) => (
                    <SortableSidebarItem
                      key={key}
                      id={key}
                      isSkipped={skippedSections.has(key)}
                      isActive={activeSection === key}
                      isCostSection={key === 'cost_price_proposal'}
                      label={sectionTitles[key] || sectionLabels[key] || key}
                      onToggleInclude={() => toggleSectionInclude(key)}
                      onScrollTo={() => scrollToSection(key)}
                      onDuplicate={() => handleDuplicateSection(key)}
                      isFrozen={frozenSections.has(key)}
                      onToggleFreeze={() => toggleFreezeSection(key)}
                    />
                  ))}
                </nav>
              </SortableContext>
            </DndContext>

            {/* Win Probability */}
            <div className="mt-4 border-t border-gray-200 pt-3">
              <button
                onClick={() => { if (!winProbResult && !winProbLoading) analyzeWinProbability(); else setWinProbOpen(!winProbOpen); }}
                className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm font-semibold text-navy hover:bg-navy/5 transition-colors cursor-pointer"
              >
                <TrophyIcon className="w-4 h-4 text-amber-500" />
                <span className="flex-1 text-left text-xs">Win Probability</span>
                {winProbResult && (
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${winProbResult.score >= 75 ? 'bg-emerald-100 text-emerald-700' : winProbResult.score >= 50 ? 'bg-green-100 text-green-700' : winProbResult.score >= 35 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                    {winProbResult.score}%
                  </span>
                )}
                {winProbLoading && <svg className="animate-spin w-3.5 h-3.5 text-navy" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>}
              </button>

              {winProbOpen && (
                <div className="mt-2 px-1">
                  {winProbLoading && !winProbResult && (
                    <div className="text-center py-4">
                      <svg className="animate-spin w-6 h-6 text-navy mx-auto mb-2" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                      <p className="text-xs text-gray-400">AI analyzing proposal...</p>
                    </div>
                  )}
                  {winProbResult && (
                    <div className="space-y-3">
                      <div className="flex flex-col items-center py-2">
                        <div className="relative w-20 h-20">
                          <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
                            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none"
                              stroke={winProbResult.score >= 75 ? '#10b981' : winProbResult.score >= 50 ? '#22c55e' : winProbResult.score >= 35 ? '#f59e0b' : '#ef4444'}
                              strokeWidth="3" strokeDasharray={`${winProbResult.score}, 100`} strokeLinecap="round" />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-lg font-bold text-navy">{winProbResult.score}%</span>
                          </div>
                        </div>
                        <span className={`text-xs font-semibold mt-1 ${winProbResult.score >= 75 ? 'text-emerald-600' : winProbResult.score >= 50 ? 'text-green-600' : winProbResult.score >= 35 ? 'text-amber-600' : 'text-red-600'}`}>
                          {winProbResult.level}
                        </span>
                      </div>
                      {winProbResult.strengths.length > 0 && (
                        <div>
                          <p className="text-[10px] font-semibold text-green-600 uppercase tracking-wider mb-1">Strengths</p>
                          <ul className="space-y-0.5">
                            {winProbResult.strengths.map((s, i) => (
                              <li key={i} className="text-[11px] text-gray-600 flex items-start gap-1">
                                <ArrowTrendingUpIcon className="w-3 h-3 text-green-500 flex-shrink-0 mt-0.5" /><span>{s}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {winProbResult.weaknesses.length > 0 && (
                        <div>
                          <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider mb-1">Improve</p>
                          <ul className="space-y-0.5">
                            {winProbResult.weaknesses.map((w, i) => (
                              <li key={i} className="text-[11px] text-gray-600 flex items-start gap-1">
                                <ExclamationTriangleIcon className="w-3 h-3 text-amber-500 flex-shrink-0 mt-0.5" /><span>{w}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {winProbResult.recommendation && (
                        <div className="bg-blue-50 rounded-lg p-2">
                          <p className="text-[11px] text-blue-700 leading-relaxed">{winProbResult.recommendation}</p>
                        </div>
                      )}
                      <button
                        onClick={analyzeWinProbability}
                        disabled={winProbLoading}
                        className="w-full flex items-center justify-center gap-1.5 text-xs font-medium text-navy bg-navy/5 hover:bg-navy/10 py-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {winProbLoading ? <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> : <SparklesIcon className="w-3 h-3" />}
                        {winProbLoading ? 'Analyzing...' : 'Re-analyze'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* ─── Main Content Area ────────────────────────────────────────────────── */}
        <div className="flex-1 p-6 lg:p-8 overflow-y-auto max-h-[calc(100vh-7.5rem)]">
          {previewMode ? (
            /* ─── PREVIEW MODE ──────────────────────────────────────────────── */
            <div className="max-w-4xl mx-auto">
              {showCanvaTemplates && (
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-base font-bold text-navy flex items-center gap-2">
                        <PaintBrushIcon className="w-5 h-5" /> Cover Page Templates
                      </h3>
                      <p className="text-xs text-gray-400 mt-0.5">Choose a design for your proposal cover</p>
                    </div>
                    <button onClick={() => setShowCanvaTemplates(false)} className="p-1.5 hover:bg-gray-100 rounded-lg cursor-pointer">
                      <XMarkIcon className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {Object.entries(CANVA_TEMPLATES).map(([key, tpl]) => (
                      <button
                        key={key}
                        onClick={() => { setCanvaTemplate(key); setShowCanvaTemplates(false); }}
                        className={`group relative rounded-xl overflow-hidden transition-all cursor-pointer hover:scale-105 hover:shadow-xl ${canvaTemplate === key ? 'ring-3 ring-accent shadow-xl scale-105' : 'ring-1 ring-gray-200 shadow-sm hover:ring-gray-400'}`}
                        style={{ aspectRatio: '3/4' }}
                      >
                        <div style={{ background: tpl.coverBg, position: 'absolute', inset: 0 }}>
                          <div style={{ height: '5px', background: tpl.accent, position: 'absolute', top: 0, left: 0, right: 0 }} />
                          <div style={{ position: 'absolute', top: 18, left: 14, width: 28, height: 14, background: 'rgba(255,255,255,0.25)', borderRadius: 3 }} />
                          <div style={{ position: 'absolute', top: 44, left: 14, right: 14 }}>
                            <div style={{ height: 9, background: 'rgba(255,255,255,0.95)', borderRadius: 2, marginBottom: 5, width: '80%' }} />
                            <div style={{ height: 6, background: tpl.accent, borderRadius: 2, marginBottom: 4, width: '55%' }} />
                            <div style={{ height: 5, background: 'rgba(255,255,255,0.5)', borderRadius: 2, width: '65%' }} />
                          </div>
                          {tpl.style === 'diagonal' && <div style={{ position: 'absolute', top: 90, right: -20, width: 80, height: 80, background: 'rgba(255,255,255,0.08)', transform: 'rotate(35deg)', borderRadius: 4 }} />}
                          <div style={{ position: 'absolute', bottom: 28, left: 10, right: 10 }}>
                            {[70, 55, 40].map((w, i) => (
                              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                                <div style={{ width: 28, height: 4, background: 'rgba(255,255,255,0.35)', borderRadius: 2, flexShrink: 0 }} />
                                <div style={{ width: `${w}%`, height: 4, background: 'rgba(255,255,255,0.65)', borderRadius: 2 }} />
                              </div>
                            ))}
                          </div>
                          <div style={{ height: '5px', background: tpl.accent, position: 'absolute', bottom: 0, left: 0, right: 0 }} />
                        </div>
                        <div className="absolute inset-0 flex flex-col items-center justify-end pb-2 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 50%)' }}>
                          <span className="text-white text-[11px] font-bold text-center px-2 drop-shadow">{tpl.name}</span>
                        </div>
                        {canvaTemplate === key && (
                          <div className="absolute top-2 right-2 bg-accent rounded-full w-5 h-5 flex items-center justify-center shadow-md z-10">
                            <CheckCircleIcon className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {showCustomize && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-4">
                  <h3 className="text-sm font-semibold text-navy mb-4 flex items-center gap-2">
                    <SwatchIcon className="w-4 h-4" /> Customize Preview
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-2">Font Family</label>
                      <select value={previewFont} onChange={(e) => setPreviewFont(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 cursor-pointer">
                        <option value="Georgia, serif">Georgia (Classic)</option>
                        <option value="'Times New Roman', serif">Times New Roman</option>
                        <option value="Arial, sans-serif">Arial (Modern)</option>
                        <option value="Calibri, sans-serif">Calibri</option>
                        <option value="'Segoe UI', sans-serif">Segoe UI</option>
                        <option value="Garamond, serif">Garamond</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-2">Actions</label>
                      <div className="flex gap-2">
                        <button onClick={() => setPreviewMode(false)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 transition-all cursor-pointer">
                          <PencilSquareIcon className="w-3.5 h-3.5" /> Edit Content
                        </button>
                        <button onClick={() => navigate('/new-proposal')} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-amber-50 hover:bg-amber-100 text-amber-700 transition-all cursor-pointer">
                          <ArrowPathIcon className="w-3.5 h-3.5" /> Regenerate
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ─── FIX: id="proposal-preview" on the actual document div ── */}
              <div
                id="proposal-preview"
                ref={previewRef}
                className="bg-white shadow-xl border border-gray-200 relative select-none"
                style={{ fontFamily: previewFont, minHeight: '900px' }}
                onClick={() => setSelectedImageId(null)}
              >
                {/* DRAFT watermark */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10" style={{ overflow: 'hidden' }}>
                  <span className="text-gray-200 font-extrabold uppercase select-none" style={{ fontSize: '120px', transform: 'rotate(-35deg)', letterSpacing: '20px', opacity: 0.12 }}>
                    DRAFT
                  </span>
                </div>

                {/* Floating images */}
                {floatingImages.map((img) => (
                  <div
                    key={img.id}
                    style={{
        position: 'absolute',
        top: 0,
        left: 0,
        transform: `translate(${Math.max(0, img.x)}px, ${Math.max(0, img.y)}px)`, // FIX: prevent going outside
        width: img.width || 200, // FIX: default size
        height: img.height || 150,
        zIndex: selectedImageId === img.id ? 200 : 150, // FIX: above watermark
        cursor: 'move'
      }}
                    onMouseDown={(e) => {
        e.stopPropagation();
        setSelectedImageId(img.id);

        imageInteractionRef.current = {
          type: 'drag',
          id: img.id,
          startX: e.clientX,
          startY: e.clientY,
          origX: img.x,
          origY: img.y,
        };


                      document.body.style.userSelect = 'none';
                    }}
                    onClick={(e) => { e.stopPropagation(); setSelectedImageId(img.id); }}
                  >
                    <img
  src={img.url}  // ✅ Always use direct URL (already base64 from addFloatingImage)
  alt="floating"
  style={{
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    display: 'block',
    pointerEvents: 'none',
    borderRadius: '3px',
    border: selectedImageId === img.id ? '2px dashed #3b82f6' : 'none',
  }}
/>

{selectedImageId === img.id && (
  <>
    <button
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        removeFloatingImage(img.id);
      }}
      style={{
        position: 'absolute',
        top: -12,
        right: -12,
        background: '#ef4444',
        color: '#fff',
        border: 'none',
        borderRadius: '50%',
        width: 22,
        height: 22,
        cursor: 'pointer',
        fontSize: 13,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200
      }}
    >
      ✕
    </button>

    <div
      onMouseDown={(e) => {
        e.stopPropagation();
        imageInteractionRef.current = {
          type: 'resize',
          id: img.id,
          startX: e.clientX,
          startY: e.clientY,
          origW: img.width,
          origH: img.height
        };
        document.body.style.userSelect = 'none';
      }}
      style={{
        position: 'absolute',
        bottom: -6,
        right: -6,
        width: 14,
        height: 14,
        background: '#3b82f6',
        borderRadius: '50%',
        cursor: 'se-resize',
        zIndex: 200
      }}
    />
  </>
)}
</div>
                ))}

                <div className="relative z-20">
                  {/* Cover */}
                  <div style={{ background: activeTpl.coverBg }}>
                    <div style={{ height: 6, background: activeTpl.accent }} />
                    <div className="px-12 py-10 text-white">
                      {companyLogo && (
                        <div className="mb-6 flex justify-center">
                          <div className="bg-white rounded-xl p-3 inline-block shadow-lg">
                            <img src={companyLogo} alt="Logo" className="max-h-16 max-w-48 object-contain" />
                          </div>
                        </div>
                      )}
                      <p className="text-xs uppercase tracking-widest mb-2" style={{ opacity: 0.75 }}>
                        {opportunityDetails?.proposal_type || 'Government Proposal'}
                      </p>
                      <h1 className="text-4xl font-extrabold mb-2 leading-tight">{proposalTitle || 'Untitled Proposal'}</h1>
                      <div style={{ width: 60, height: 4, background: activeTpl.accent, borderRadius: 2, marginBottom: 16 }} />
                    </div>
                    <div style={{ height: 4, background: activeTpl.accent }} />
                  </div>

                  {/* Metadata */}
                  <div className="px-12 py-8">
                    {companyLogo && (
                      <div className="flex justify-center mb-6">
                        <img src={companyLogo} alt="Logo" className="max-h-14 max-w-44 object-contain" />
                      </div>
                    )}
                    <table className="w-full border-collapse text-sm mb-4" style={{ borderRadius: 8, overflow: 'hidden' }}>
                      <tbody>
                        {[
                          ['Submitted To', `${opportunityDetails?.agency || ''}${opportunityDetails?.title ? '\n' + opportunityDetails.title : ''}`.trim()],
                          opportunityDetails?.solicitation_number && ['Solicitation No', opportunityDetails.solicitation_number],
                          vendorName && ['Submitted By', vendorName],
                          vendorData?.cage_code && ['CAGE Code', vendorData.cage_code],
                          vendorData?.duns_number && ['UEI / DUNS', vendorData.duns_number],
                          vendorData?.naics_codes?.length > 0 && ['NAICS Codes', Array.isArray(vendorData.naics_codes) ? vendorData.naics_codes.join(', ') : vendorData.naics_codes],
                          opportunityDetails?.submission_date && ['Submission Date', opportunityDetails.submission_date],
                          (opportunityDetails?.poc_name || opportunityDetails?.contact_name) && ['Point of Contact', [opportunityDetails.poc_name || opportunityDetails.contact_name, opportunityDetails.poc_email || opportunityDetails.contact_email].filter(Boolean).join('\n')],
                        ].filter(Boolean).map(([label, value], i) => (
                          <tr key={label} style={{ background: i % 2 === 0 ? '#f8fafc' : '#fff' }}>
                            <td style={{ padding: '10px 14px', color: '#64748b', fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap', width: '36%', borderBottom: '1px solid #e2e8f0' }}>{label}</td>
                            <td style={{ padding: '10px 14px', color: '#1e293b', borderBottom: '1px solid #e2e8f0', whiteSpace: 'pre-line' }}>{value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div style={{ height: 3, background: activeTpl.accent, borderRadius: 2, marginTop: 16 }} />
                    <p className="text-xs text-gray-400 text-center mt-3">
                      Confidential | {vendorName || 'Company'} | Prepared {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  </div>

                  {/* Table of Contents */}
                  <div className="px-12 py-8 border-t border-gray-100">
                    <h2 className="text-lg font-bold mb-5" style={{ color: activeTpl.headingColor }}>Table of Contents</h2>
                    <ol className="space-y-1.5">
                      {sectionKeys.filter((key) => !skippedSections.has(key)).map((key, idx) => (
                        <li key={key} className="flex items-center text-sm text-gray-600">
                          <span className="font-semibold text-gray-800 w-8">{idx + 1}.</span>
                          <span>{sectionTitles[key] || sectionLabels[key] || key}</span>
                          <span className="flex-1 mx-3 border-b border-dotted border-gray-300" />
                          <span className="text-gray-400 text-xs">Section {idx + 1}</span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  {/* Section content */}
                  {sectionKeys.filter((key) => !skippedSections.has(key)).map((key, idx) => (
                    <div key={key} ref={(el) => (sectionRefs.current[key] = el)} className="px-12 py-8 border-t border-gray-100">
                      <div className="flex items-center gap-3 mb-5 pb-3" style={{ borderBottom: `2px solid ${activeTpl.accent}` }}>
                        <span className="text-xs font-bold text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0" style={{ background: activeTpl.headingColor }}>
                          {idx + 1}
                        </span>
                        <h2 className="text-xl font-bold" style={{ color: sectionStyles[key]?.headingColor || activeTpl.headingColor }}>
                          {sectionTitles[key] || sectionLabels[key] || key}
                        </h2>
                      </div>
                      <div className="prose prose-sm max-w-none leading-relaxed" style={{
                        fontFamily: sectionStyles[key]?.fontFamily || previewFont,
                        fontSize: sectionStyles[key]?.fontSize || '14px',
                        color: sectionStyles[key]?.color || '#374151',
                        overflowWrap: 'anywhere',
                        wordBreak: 'normal',
                      }}>
                        <PreviewSectionContent content={sections[key] || ''} />
                      </div>
                    </div>
                  ))}

                  {/* Footer */}
                  <div className="px-12 py-5 text-center" style={{ background: activeTpl.headingColor }}>
                    <p className="text-xs text-white opacity-70">
                      Confidential &nbsp;|&nbsp; {vendorName || 'Company Name'} &nbsp;|&nbsp; {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ─── EDIT MODE ─────────────────────────────────────────────────── */
            <div className="max-w-4xl mx-auto space-y-8">
              {/* Tone & Review Stage bar */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-500">AI Writing Tone:</span>
                  <div className="flex gap-1">
                    {[
                      { value: 'professional', label: 'Professional', emoji: '📋' },
                      { value: 'technical', label: 'Technical', emoji: '🔧' },
                      { value: 'executive', label: 'Executive', emoji: '💼' },
                      { value: 'persuasive', label: 'Persuasive', emoji: '🎯' },
                      { value: 'human', label: 'Human', emoji: '🤝' },
                    ].map(t => (
                      <button
                        key={t.value}
                        onClick={() => setWritingTone(t.value)}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${writingTone === t.value ? 'bg-purple-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        title={t.label}
                      >
                        {t.emoji} {t.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="h-6 w-px bg-gray-200 hidden md:block" />
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-500">Review Stage:</span>
                  <div className="flex gap-1">
                    {[
                      { value: 'draft', label: 'Draft (AI)', color: 'bg-gray-500' },
                      { value: 'yellow', label: 'Yellow Team', color: 'bg-yellow-500' },
                      { value: 'green', label: 'Green Team', color: 'bg-green-500' },
                      { value: 'gold', label: 'Gold Team', color: 'bg-amber-500' },
                    ].map(s => (
                      <button
                        key={s.value}
                        onClick={() => setReviewStage(s.value)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${reviewStage === s.value ? `${s.color} text-white shadow-sm` : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                      >
                        <span className={`w-2 h-2 rounded-full ${reviewStage === s.value ? 'bg-white' : s.color}`} />
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {sectionKeys.filter((key) => !skippedSections.has(key)).map((key) => (
                <div
                  key={key}
                  ref={(el) => (sectionRefs.current[key] = el)}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
                >
                  {/* Section header */}
                  <div className={`border-b border-gray-100 px-6 py-4 flex items-center gap-2 flex-wrap ${key === 'cost_price_proposal' ? 'bg-green-50' : 'bg-navy/5'}`}>
                    {key === 'cost_price_proposal' ? (
                      <CurrencyDollarIcon className="w-5 h-5 text-green-600" />
                    ) : (
                      <DocumentTextIcon className="w-5 h-5 text-navy" />
                    )}
                    <h2 className="text-base font-semibold text-navy">{sectionTitles[key] || sectionLabels[key] || key}</h2>
                    <div className="ml-auto flex items-center gap-1.5 flex-wrap">
                      {/* Freeze toggle */}
                      <button
                        onClick={() => toggleFreezeSection(key)}
                        className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md transition-all cursor-pointer ${frozenSections.has(key) ? 'text-orange-600 hover:text-orange-800 bg-orange-50 hover:bg-orange-100 border border-orange-200' : 'text-green-600 hover:text-green-800 bg-green-50 hover:bg-green-100 border border-green-200'}`}
                      >
                        {frozenSections.has(key) ? <><PencilSquareIcon className="w-3.5 h-3.5" /> Edit</> : <><LockOpenIcon className="w-3.5 h-3.5" /> Save &amp; Freeze</>}
                      </button>
                      {frozenSections.has(key) && (
                        <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                          <LockClosedIcon className="w-3 h-3" /> Frozen
                        </span>
                      )}
                      {key === 'cost_price_proposal' && (
                        <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-0.5 rounded-full">Interactive Pricing</span>
                      )}
                      {key !== 'cost_price_proposal' && !frozenSections.has(key) && (
                        <button
                          onClick={() => handleRegenerateSection(key)}
                          disabled={!!regeneratingSection}
                          className="flex items-center gap-1 text-xs font-medium text-purple-600 hover:text-purple-800 bg-purple-50 hover:bg-purple-100 px-2 py-1 rounded-md transition-all cursor-pointer disabled:opacity-50"
                        >
                          {regeneratingSection === key ? <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> : <SparklesIcon className="w-3 h-3" />}
                          {regeneratingSection === key ? 'Generating...' : 'AI Rewrite'}
                        </button>
                      )}
                      {key !== 'cost_price_proposal' && !frozenSections.has(key) && (
                        <div className="relative">
                          <button
                            onClick={() => setShowChartPicker(showChartPicker === key ? null : key)}
                            className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-md transition-all cursor-pointer"
                          >
                            <ChartBarIcon className="w-3 h-3" />Chart
                          </button>
                          {showChartPicker === key && (
                            <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-lg shadow-xl border border-gray-200 z-50 p-2">
                              <p className="text-xs font-semibold text-navy px-2 py-1 mb-1">Insert Chart</p>
                              {Object.entries(CHART_TEMPLATES).map(([cKey, cTpl]) => (
                                <button key={cKey} onClick={() => insertChartToSection(key, cKey)} className="w-full text-left px-2 py-1.5 rounded text-xs hover:bg-blue-50 transition-colors cursor-pointer">
                                  {cTpl.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      {key !== 'cost_price_proposal' && !frozenSections.has(key) && (
                        <div className="relative">
                          <button
                            onClick={() => setShowGraphicsPicker(showGraphicsPicker === key ? null : key)}
                            className="flex items-center gap-1 text-xs font-medium text-green-600 hover:text-green-800 bg-green-50 hover:bg-green-100 px-2 py-1 rounded-md transition-all cursor-pointer"
                          >
                            <PhotoIcon className="w-3 h-3" />Graphics
                          </button>
                          {showGraphicsPicker === key && (
                            <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-lg shadow-xl border border-gray-200 z-50 p-2">
                              <p className="text-xs font-semibold text-navy px-2 py-1 mb-1">Insert Graphic</p>
                              {Object.entries(GRAPHICS_TEMPLATES).map(([gKey, gTpl]) => (
                                <button
                                  key={gKey}
                                  onClick={() => {
                                    const html = gTpl.generate();
                                    handleContentChange(key, (sections[key] || '') + html);
                                    setShowGraphicsPicker(null);
                                  }}
                                  className="w-full text-left px-2 py-1.5 rounded text-xs hover:bg-green-50 transition-colors cursor-pointer"
                                >
                                  {gTpl.icon} {gTpl.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      {!frozenSections.has(key) && (
                        <button
                          onClick={() => setShowSectionStyle(showSectionStyle === key ? null : key)}
                          className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md transition-all cursor-pointer ${showSectionStyle === key ? 'text-white bg-navy' : 'text-gray-500 hover:text-navy bg-gray-50 hover:bg-gray-100'}`}
                        >
                          <PaintBrushIcon className="w-3 h-3" />Style
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Section style panel */}
                  {showSectionStyle === key && (
                    <div className="border-b border-gray-100 px-6 py-3 bg-gray-50/80 flex flex-wrap items-center gap-4">
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-medium text-gray-500">Font:</label>
                        <select value={sectionStyles[key]?.fontFamily || ''} onChange={(e) => updateSectionStyle(key, 'fontFamily', e.target.value)} className="text-xs border border-gray-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue/30">
                          <option value="">Default</option>
                          <option value="Georgia, serif">Georgia</option>
                          <option value="'Times New Roman', serif">Times New Roman</option>
                          <option value="Arial, sans-serif">Arial</option>
                          <option value="Calibri, sans-serif">Calibri</option>
                          <option value="'Courier New', monospace">Courier New</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-medium text-gray-500">Size:</label>
                        <select value={sectionStyles[key]?.fontSize || ''} onChange={(e) => updateSectionStyle(key, 'fontSize', e.target.value)} className="text-xs border border-gray-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue/30">
                          <option value="">Default</option>
                          <option value="12px">Small (12px)</option>
                          <option value="14px">Medium (14px)</option>
                          <option value="16px">Large (16px)</option>
                          <option value="18px">X-Large (18px)</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-medium text-gray-500">Color:</label>
                        <input type="color" value={sectionStyles[key]?.color || '#374151'} onChange={(e) => updateSectionStyle(key, 'color', e.target.value)} className="w-6 h-6 rounded border border-gray-200 cursor-pointer" />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-medium text-gray-500">Heading:</label>
                        <input type="color" value={sectionStyles[key]?.headingColor || '#1e3a5f'} onChange={(e) => updateSectionStyle(key, 'headingColor', e.target.value)} className="w-6 h-6 rounded border border-gray-200 cursor-pointer" />
                      </div>
                      {sectionStyles[key] && Object.keys(sectionStyles[key]).length > 0 && (
                        <button onClick={() => setSectionStyles((prev) => { const n = { ...prev }; delete n[key]; return n; })} className="text-xs text-red-500 hover:text-red-700 cursor-pointer">Reset</button>
                      )}
                    </div>
                  )}

                  {sectionNotices[key] && (
                    <div className="mx-4 mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2">
                        <ExclamationTriangleIcon className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
                        <span>{sectionNotices[key]}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSectionNotices((prev) => {
                          const next = { ...prev };
                          delete next[key];
                          return next;
                        })}
                        className="text-amber-700 hover:text-amber-900 font-semibold cursor-pointer"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}

                  {/* Section body */}
                  <div className="p-4">
                    {frozenSections.has(key) ? (
                      <div className="relative">
                        <div className="absolute top-2 right-2 flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-md border border-green-200">
                          <LockClosedIcon className="w-3 h-3" /> Saved &amp; Frozen
                        </div>
                        {extractApiError(sections[key] || '') ? (
                          <div className="pt-2"><PreviewSectionContent content={sections[key] || ''} /></div>
                        ) : (
                          <div
                            className="prose prose-sm max-w-none text-gray-700 leading-relaxed pt-2"
                            style={{ overflowWrap: 'anywhere', wordBreak: 'normal' }}
                            dangerouslySetInnerHTML={{ __html: sections[key] || '<p class="text-gray-400 italic">No content yet</p>' }}
                          />
                        )}
                      </div>
                    ) : key === 'cost_price_proposal' ? (
                      <PricingTable
                        onContentUpdate={(html) => handleContentChange(key, html)}
                        contractType={opportunityDetails?.contract_type || ''}
                      />
                    ) : extractApiError(sections[key] || '') ? (
                      <div>
                        <div className="mb-3 p-3 bg-orange-50 border border-orange-200 rounded-lg flex items-start gap-2.5">
                          <ExclamationTriangleIcon className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-semibold text-orange-700 mb-0.5">AI quota exceeded for this section</p>
                            <p className="text-xs text-orange-600">Click <strong>AI Rewrite</strong> above to regenerate, or type your content below.</p>
                          </div>
                        </div>
                        <ReactQuill
                          ref={(el) => { quillRefs.current[key] = el; }}
                          theme="snow"
                          value={''}
                          onChange={(content) => handleContentChange(key, content)}
                          modules={quillModules}
                          formats={quillFormats}
                        />
                      </div>
                    ) : (
                      <ReactQuill
                        ref={(el) => { quillRefs.current[key] = el; }}
                        theme="snow"
                        value={sections[key] || ''}
                        onChange={(content) => handleContentChange(key, content)}
                        modules={quillModules}
                        formats={quillFormats}
                        placeholder="No content was generated for this section. Use AI Rewrite or type content here."
                      />
                    )}
                  </div>

                  {!frozenSections.has(key) && (
                    <SectionImageUpload
                      sectionKey={key}
                      onAddFloatingImage={addFloatingImage}
                      onImageInsert={(imageUrl) => {
                        if (key === 'cost_price_proposal') return;
                        const quill = quillRefs.current[key]?.getEditor?.();
                        if (quill) {
                          const range = quill.getSelection(true);
                          const pos = range ? range.index : quill.getLength();
                          quill.insertEmbed(pos, 'image', imageUrl);
                          quill.setSelection(pos + 1);
                        }
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Disclaimer before PDF export */}
          <div
            ref={exportDisclaimerRef}
            className="max-w-4xl mx-auto bg-white border border-amber-200 rounded-xl p-5 mt-8 mb-20 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                <ExclamationTriangleIcon className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-navy mb-1">Disclaimer</h3>
                <p className="text-xs text-gray-500 leading-relaxed mb-4">
                  This application generates proposal documents based on user inputs and available data sources. All outputs are automated and may not reflect complete or fully verified information. By exporting this proposal to PDF, you acknowledge that you are solely responsible for reviewing, verifying, and ensuring the accuracy and suitability of all content prior to submission. The application and its providers shall not be liable for any damages, errors, omissions, or outcomes arising from use of the generated content. All use is at your sole risk and discretion.
                </p>
                <label className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-all ${
                  pdfDisclaimerAccepted
                    ? 'bg-green-50 border-green-200 text-green-800'
                    : 'bg-amber-50 border-amber-200 text-gray-700'
                }`}>
                  <input
                    type="checkbox"
                    checked={pdfDisclaimerAccepted}
                    onChange={(e) => setPdfDisclaimerAccepted(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-gray-300 text-accent focus:ring-accent cursor-pointer"
                  />
                  <span className="text-xs font-medium leading-relaxed">
                    I have read and agree to the disclaimer. I accept full responsibility for reviewing the exported PDF before submission.
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
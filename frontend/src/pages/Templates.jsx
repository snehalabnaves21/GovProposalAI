import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HeartIcon as HeartOutline,
  MagnifyingGlassIcon,
  SparklesIcon,
  EyeIcon,
  XMarkIcon,
  DocumentTextIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolid } from '@heroicons/react/24/solid';
import api from '../services/api';

export default function Templates() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Preview modal
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/templates');
      setTemplates(response.data.templates || []);
      setCategories(response.data.categories || []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async (e, templateId) => {
    e.stopPropagation();
    try {
      const response = await api.post(`/api/templates/${templateId}/favorite`);
      setTemplates((prev) =>
        prev.map((t) =>
          t.id === templateId ? { ...t, is_favorite: response.data.favorited } : t
        )
      );
    } catch {
      // silently fail
    }
  };

  const handlePreview = async (templateId) => {
    setPreviewLoading(true);
    try {
      const response = await api.get(`/api/templates/${templateId}`);
      setPreviewTemplate(response.data.template);
    } catch {
      // silently fail
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleUseTemplate = async (templateId) => {
    try {
      const response = await api.post(`/api/templates/${templateId}/use`);
      const tpl = response.data.template;

      // Navigate to proposal editor with template data pre-filled
      navigate('/proposal-editor', {
        state: {
          proposal: {
            proposal_id: 'template-' + tpl.id,
            opportunity_title: tpl.opportunity_defaults?.title || tpl.name,
            vendor_name: tpl.vendor_defaults?.company_name || '',
            sections: Object.fromEntries(
              Object.entries(tpl.sections || {}).map(([key, val]) => [
                key,
                { title: val.title, content: val.content },
              ])
            ),
          },
          opportunity: tpl.opportunity_defaults || {},
          vendor: tpl.vendor_defaults || {},
          fromTemplate: true,
        },
      });
    } catch {
      // silently fail
    }
  };

  // Filtering
  const filtered = templates.filter((t) => {
    if (activeCategory !== 'All' && t.category !== activeCategory) return false;
    if (showFavoritesOnly && !t.is_favorite) return false;
    if (search.trim()) {
      const s = search.toLowerCase();
      return (
        t.name.toLowerCase().includes(s) ||
        t.description.toLowerCase().includes(s) ||
        t.category.toLowerCase().includes(s)
      );
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-navy">Proposal Templates</h1>
        <p className="text-gray-500 mt-1">
          Choose from industry-specific templates to jumpstart your proposal
        </p>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search templates..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue transition-all"
            />
          </div>

          {/* Favorites toggle */}
          <button
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border-2 transition-all cursor-pointer ${
              showFavoritesOnly
                ? 'border-red-300 bg-red-50 text-red-600'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
            }`}
          >
            {showFavoritesOnly ? (
              <HeartSolid className="w-4 h-4 text-red-500" />
            ) : (
              <HeartOutline className="w-4 h-4" />
            )}
            My Favorites
          </button>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2 mt-4">
          <button
            onClick={() => setActiveCategory('All')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all cursor-pointer ${
              activeCategory === 'All'
                ? 'bg-navy text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all cursor-pointer ${
                activeCategory === cat
                  ? 'bg-navy text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          {filtered.length} template{filtered.length !== 1 ? 's' : ''} found
        </p>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-16">
          <svg
            className="animate-spin w-10 h-10 text-navy mx-auto mb-4"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-gray-500 text-sm">Loading templates...</p>
        </div>
      )}

      {/* Template Grid */}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((tpl) => (
            <div
              key={tpl.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all group"
            >
              {/* Color header / thumbnail */}
              <div
                className="h-36 relative flex items-center justify-center"
                style={{ backgroundColor: tpl.thumbnail_color || '#1e3a5f' }}
              >
                <div className="text-center px-4">
                  <DocumentTextIcon className="w-10 h-10 text-white/40 mx-auto mb-2" />
                  <p className="text-white font-bold text-sm leading-snug">{tpl.name}</p>
                </div>

                {/* FREE badge */}
                {tpl.is_free && (
                  <span className="absolute top-3 left-3 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                    Free
                  </span>
                )}

                {/* Favorite button */}
                <button
                  onClick={(e) => handleToggleFavorite(e, tpl.id)}
                  className="absolute top-3 right-3 p-1.5 rounded-full bg-white/20 hover:bg-white/40 transition-all cursor-pointer"
                >
                  {tpl.is_favorite ? (
                    <HeartSolid className="w-5 h-5 text-red-400" />
                  ) : (
                    <HeartOutline className="w-5 h-5 text-white/70" />
                  )}
                </button>
              </div>

              {/* Info */}
              <div className="p-4">
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                  {tpl.category}
                </span>
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                  {tpl.description}
                </p>

                {tpl.use_count > 0 && (
                  <p className="text-[11px] text-gray-400 mt-2">
                    Used {tpl.use_count} time{tpl.use_count !== 1 ? 's' : ''}
                  </p>
                )}

                {/* Actions */}
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handlePreview(tpl.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all cursor-pointer"
                  >
                    <EyeIcon className="w-3.5 h-3.5" />
                    Preview
                  </button>
                  <button
                    onClick={() => handleUseTemplate(tpl.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium bg-accent text-white hover:bg-accent-dark transition-all cursor-pointer"
                  >
                    <SparklesIcon className="w-3.5 h-3.5" />
                    Use Template
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-16 text-center">
          <DocumentTextIcon className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            {showFavoritesOnly ? 'No Favorite Templates' : 'No Templates Found'}
          </h3>
          <p className="text-gray-400 text-sm">
            {showFavoritesOnly
              ? 'Save templates you like by clicking the heart icon.'
              : 'Try adjusting your search or category filter.'}
          </p>
        </div>
      )}

      {/* Preview Modal */}
      {(previewTemplate || previewLoading) && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewTemplate(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {previewLoading && !previewTemplate ? (
              <div className="p-16 text-center">
                <svg
                  className="animate-spin w-10 h-10 text-navy mx-auto mb-4"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <p className="text-gray-500 text-sm">Loading preview...</p>
              </div>
            ) : previewTemplate ? (
              <>
                {/* Modal header */}
                <div
                  className="px-6 py-4 flex items-center justify-between"
                  style={{ backgroundColor: previewTemplate.thumbnail_color || '#1e3a5f' }}
                >
                  <div>
                    <h2 className="text-lg font-bold text-white">{previewTemplate.name}</h2>
                    <p className="text-white/70 text-sm">{previewTemplate.category}</p>
                  </div>
                  <button
                    onClick={() => setPreviewTemplate(null)}
                    className="p-2 rounded-full bg-white/20 hover:bg-white/40 transition-all cursor-pointer"
                  >
                    <XMarkIcon className="w-5 h-5 text-white" />
                  </button>
                </div>

                {/* Modal body - sections preview */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  <p className="text-sm text-gray-500">{previewTemplate.description}</p>

                  {previewTemplate.sections &&
                    Object.entries(previewTemplate.sections).map(([key, section]) => (
                      <div key={key} className="border border-gray-100 rounded-lg p-4">
                        <h3 className="font-semibold text-navy text-sm mb-2">
                          {section.title || key.replace(/_/g, ' ')}
                        </h3>
                        <p className="text-xs text-gray-600 whitespace-pre-line line-clamp-6">
                          {section.content}
                        </p>
                      </div>
                    ))}
                </div>

                {/* Modal footer */}
                <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
                  <button
                    onClick={() => setPreviewTemplate(null)}
                    className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      setPreviewTemplate(null);
                      handleUseTemplate(previewTemplate.id);
                    }}
                    className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-accent text-white hover:bg-accent-dark transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <SparklesIcon className="w-4 h-4" />
                    Use This Template
                    <ArrowRightIcon className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

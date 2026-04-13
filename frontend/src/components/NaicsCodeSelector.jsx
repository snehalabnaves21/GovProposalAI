import { useState, useEffect, useMemo, useRef } from 'react';
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';

/**
 * NAICS Code Selector — searchable, categorized, checkbox-based selector
 * using official 2022 NAICS codes from the U.S. Census Bureau.
 *
 * Props:
 *   selectedCodes: string[]         — currently selected 6-digit codes
 *   onChange: (codes: string[]) => void
 *   maxSelections?: number          — optional limit (default 20)
 */
export default function NaicsCodeSelector({ selectedCodes = [], onChange, maxSelections = 20 }) {
  const [naicsData, setNaicsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedSectors, setExpandedSectors] = useState({});
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Load NAICS data
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}naics_codes.json`)
      .then((r) => r.json())
      .then((data) => {
        setNaicsData(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Filter codes by search
  const filteredCodes = useMemo(() => {
    if (!naicsData) return [];
    const s = search.trim().toLowerCase();
    if (!s) return naicsData.codes;
    return naicsData.codes.filter(
      (c) =>
        c.code.includes(s) ||
        c.title.toLowerCase().includes(s) ||
        c.sector.toLowerCase().includes(s) ||
        c.subsector.toLowerCase().includes(s)
    );
  }, [naicsData, search]);

  // Group filtered codes by sector
  const groupedBySector = useMemo(() => {
    const groups = {};
    for (const code of filteredCodes) {
      if (!groups[code.sector]) {
        groups[code.sector] = [];
      }
      groups[code.sector].push(code);
    }
    return groups;
  }, [filteredCodes]);

  // Auto-expand sectors when searching
  useEffect(() => {
    if (search.trim()) {
      const expanded = {};
      Object.keys(groupedBySector).forEach((sector) => {
        expanded[sector] = true;
      });
      setExpandedSectors(expanded);
    }
  }, [search, groupedBySector]);

  const toggleSector = (sector) => {
    setExpandedSectors((prev) => ({ ...prev, [sector]: !prev[sector] }));
  };

  const toggleCode = (code) => {
    const isSelected = selectedCodes.includes(code);
    if (isSelected) {
      onChange(selectedCodes.filter((c) => c !== code));
    } else {
      if (selectedCodes.length >= maxSelections) return;
      onChange([...selectedCodes, code]);
    }
  };

  const removeCode = (code) => {
    onChange(selectedCodes.filter((c) => c !== code));
  };

  // Get title for a selected code
  const getCodeTitle = (code) => {
    if (!naicsData) return code;
    const found = naicsData.codes.find((c) => c.code === code);
    return found ? `${found.code} — ${found.title}` : code;
  };

  const getCodeShortTitle = (code) => {
    if (!naicsData) return code;
    const found = naicsData.codes.find((c) => c.code === code);
    return found ? found.title : code;
  };

  // Smart suggestions based on partial code input
  const smartSuggestions = useMemo(() => {
    if (!naicsData || !search.trim()) return [];
    const s = search.trim();
    // If user types a number, show matching codes sorted by relevance
    if (/^\d+$/.test(s) && s.length >= 2) {
      return naicsData.codes
        .filter((c) => c.code.startsWith(s))
        .slice(0, 10);
    }
    return [];
  }, [naicsData, search]);

  if (loading) {
    return (
      <div className="border border-gray-300 rounded-lg p-3 text-sm text-gray-400">
        Loading NAICS codes...
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Selected codes as tags */}
      <div
        className="min-h-[44px] border border-gray-300 rounded-lg p-2 flex flex-wrap gap-1.5 cursor-pointer hover:border-blue transition-colors"
        onClick={() => setIsOpen(true)}
      >
        {selectedCodes.length === 0 && (
          <span className="text-gray-400 text-sm py-1 px-1">
            Click to select NAICS codes...
          </span>
        )}
        {selectedCodes.map((code) => (
          <span
            key={code}
            className="inline-flex items-center gap-1 bg-navy/10 text-navy text-xs font-medium px-2.5 py-1 rounded-full"
          >
            <span className="font-bold">{code}</span>
            <span className="hidden sm:inline text-navy/70">— {getCodeShortTitle(code)}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeCode(code);
              }}
              className="ml-0.5 hover:bg-navy/20 rounded-full p-0.5 transition-colors cursor-pointer"
            >
              <XMarkIcon className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>

      {/* Dropdown panel */}
      {isOpen && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-200 max-h-[420px] flex flex-col overflow-hidden">
          {/* Search bar */}
          <div className="p-3 border-b border-gray-100">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by code number, keyword, or category..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue transition-all"
                autoFocus
              />
            </div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-[11px] text-gray-400">
                {filteredCodes.length} codes
                {search.trim() ? ' matching' : ' total'} •{' '}
                {selectedCodes.length}/{maxSelections} selected
              </p>
              {selectedCodes.length > 0 && (
                <button
                  onClick={() => onChange([])}
                  className="text-[11px] text-red-500 hover:text-red-700 font-medium cursor-pointer"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>

          {/* Smart suggestions (when typing a number) */}
          {smartSuggestions.length > 0 && (
            <div className="px-3 py-2 border-b border-gray-100 bg-blue-50/50">
              <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wide mb-1.5">
                Auto-suggestions for "{search}"
              </p>
              <div className="flex flex-wrap gap-1">
                {smartSuggestions.map((c) => {
                  const isSelected = selectedCodes.includes(c.code);
                  return (
                    <button
                      key={c.code}
                      onClick={() => toggleCode(c.code)}
                      className={`inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-navy text-white border-navy'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-blue hover:bg-blue-50'
                      }`}
                    >
                      {isSelected && <CheckIcon className="w-3 h-3" />}
                      <span className="font-bold">{c.code}</span>
                      <span className="max-w-[120px] truncate">{c.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sector list with codes */}
          <div className="flex-1 overflow-y-auto">
            {Object.keys(groupedBySector).length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">
                No NAICS codes match your search.
              </div>
            ) : (
              Object.entries(groupedBySector).map(([sector, codes]) => {
                const isExpanded = expandedSectors[sector];
                const selectedInSector = codes.filter((c) =>
                  selectedCodes.includes(c.code)
                ).length;
                return (
                  <div key={sector} className="border-b border-gray-50 last:border-0">
                    {/* Sector header */}
                    <button
                      onClick={() => toggleSector(sector)}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      {isExpanded ? (
                        <ChevronDownIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      ) : (
                        <ChevronRightIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      )}
                      <span className="text-sm font-semibold text-navy flex-1">
                        {sector}
                      </span>
                      <span className="text-[10px] text-gray-400 mr-1">
                        {codes.length} code{codes.length !== 1 ? 's' : ''}
                      </span>
                      {selectedInSector > 0 && (
                        <span className="bg-accent text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                          {selectedInSector}
                        </span>
                      )}
                    </button>

                    {/* Codes in sector */}
                    {isExpanded && (
                      <div className="pb-1">
                        {codes.map((c) => {
                          const isSelected = selectedCodes.includes(c.code);
                          const disabled =
                            !isSelected && selectedCodes.length >= maxSelections;
                          return (
                            <label
                              key={c.code}
                              className={`flex items-start gap-2.5 px-4 pl-9 py-1.5 text-sm cursor-pointer transition-colors ${
                                disabled
                                  ? 'opacity-40 cursor-not-allowed'
                                  : 'hover:bg-blue-50/50'
                              } ${isSelected ? 'bg-blue-50/70' : ''}`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => !disabled && toggleCode(c.code)}
                                disabled={disabled}
                                className="mt-0.5 w-4 h-4 rounded border-gray-300 text-navy focus:ring-blue accent-navy cursor-pointer"
                              />
                              <span className="flex-1 min-w-0">
                                <span className="font-mono font-bold text-navy text-xs">
                                  {c.code}
                                </span>
                                <span className="text-gray-600 text-xs ml-1.5">
                                  — {c.title}
                                </span>
                                {c.subsector && c.subsector !== c.title && (
                                  <span className="block text-[10px] text-gray-400 truncate">
                                    {c.subsector}
                                  </span>
                                )}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-3 py-2 border-t border-gray-100 bg-gray-50/50 flex justify-end">
            <button
              onClick={() => setIsOpen(false)}
              className="px-4 py-1.5 text-sm font-medium bg-navy text-white rounded-lg hover:bg-navy-light transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

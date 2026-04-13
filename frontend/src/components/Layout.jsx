import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  MagnifyingGlassIcon,
  DocumentPlusIcon,
  UserCircleIcon,
  Bars3Icon,
  XMarkIcon,
  DocumentTextIcon,
  FolderOpenIcon,
  ShieldCheckIcon,
  ArrowRightStartOnRectangleIcon,
  RectangleStackIcon,
  CreditCardIcon,
  ChartBarIcon,
  ClockIcon,
  DocumentMagnifyingGlassIcon,
  BriefcaseIcon,
  TableCellsIcon,
  TrophyIcon,
  ChevronDownIcon,
  UserGroupIcon,
  BuildingOffice2Icon,
  AcademicCapIcon,
  GlobeAltIcon,
  SparklesIcon,
  PencilSquareIcon,
  Cog6ToothIcon,
  ClipboardDocumentCheckIcon,
  TruckIcon,
  TagIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';

// Top-level navigation tabs (shown in header)
const topNavTabs = [
  { label: 'Dashboard', path: '/dashboard', icon: HomeIcon },
  { label: 'Opportunities', path: '/opportunities', icon: MagnifyingGlassIcon },
  { label: 'Proposal Builder', path: '/new-proposal', icon: DocumentTextIcon },
  { label: 'Market Intelligence', path: '/market-research', icon: ChartBarIcon },
  { label: 'Knowledge Hub', path: '/knowledgebase', icon: FolderOpenIcon },
  { label: 'Past Performance', path: '/past-performance', icon: TrophyIcon },
  { label: 'Capabilities', path: '/expertise', icon: AcademicCapIcon },
  { label: 'Compliance', path: '/compliance', icon: ClipboardDocumentCheckIcon },
  { label: 'Workflow Automation', path: '/n8n', icon: Cog6ToothIcon },
  { label: 'Company Profile', path: '/vendor-profile', icon: BuildingOffice2Icon },
];

// Context-based sidebar items — changes based on active top tab
const sidebarContextMap = {
  '/dashboard': [
    { label: 'Overview', path: '/dashboard', icon: HomeIcon },
    { label: 'Audit Log', path: '/audit-log', icon: ClockIcon },
    { label: 'Billing', path: '/billing', icon: CreditCardIcon },
  ],
  '/vendor-profile': [
    { label: 'Company Overview', path: '/vendor-profile', icon: BuildingOffice2Icon },
    { label: 'Business Classifications', path: '/vendor-profile?section=classification', icon: BriefcaseIcon },
    { label: 'Certifications & Credentials', path: '/vendor-profile?section=certifications', icon: ShieldCheckIcon },
    { label: 'Contract Vehicles & GWACs', path: '/vendor-profile?section=contracts', icon: DocumentTextIcon },
    { label: 'Government Registrations', path: '/vendor-profile?section=registrations', icon: GlobeAltIcon },
    { label: 'Contact Information', path: '/vendor-profile?section=contact', icon: UserCircleIcon },
    { label: 'Company Description', path: '/vendor-profile?section=about', icon: SparklesIcon },
  ],
  '/expertise': [
    { label: 'Management Team', path: '/expertise', icon: UserGroupIcon },
    { label: 'Executive Team', path: '/expertise?section=executive', icon: UserCircleIcon },
    { label: 'Project Managers', path: '/expertise?section=pm', icon: BriefcaseIcon },
    { label: 'Specialists', path: '/expertise?section=specialists', icon: AcademicCapIcon },
    { label: 'Org Hierarchy', path: '/expertise?section=hierarchy', icon: ChartBarIcon },
  ],
  '/opportunities': [
    { label: 'Opportunity Search', path: '/opportunities', icon: MagnifyingGlassIcon },
    { label: 'RFP Deconstructor', path: '/rfp-deconstructor', icon: DocumentMagnifyingGlassIcon },
    { label: 'Saved Opportunities', path: '/opportunities?section=saved', icon: FolderOpenIcon },
  ],
  '/market-research': [
    { label: 'Labor Rate Intelligence', path: '/market-research', icon: CreditCardIcon },
    { label: 'Pricing Strategy', path: '/market-research?section=pricing', icon: TrophyIcon },
    { label: 'SCA Pricing', path: '/market-research?section=sca', icon: DocumentTextIcon },
  ],
  '/knowledgebase': [
    { label: 'Competitor Awards', path: '/knowledgebase', icon: ChartBarIcon },
    { label: 'Competitor Directory', path: '/knowledgebase?section=directory', icon: UserGroupIcon },
  ],
  '/past-performance': [
    { label: 'Past Performance Repository', path: '/past-performance', icon: TrophyIcon },
    { label: 'Capability Statement', path: '/past-performance?section=capability', icon: PencilSquareIcon },
    { label: 'Capability Examples', path: '/past-performance?section=examples', icon: SparklesIcon },
  ],
  '/compliance': [
    { label: 'Compliance Dashboard', path: '/compliance', icon: ClipboardDocumentCheckIcon },
    { label: 'Compliance Framework', path: '/compliance-matrix', icon: TableCellsIcon },
    { label: 'NAICS Explorer', path: '/compliance/naics', icon: TagIcon },
    { label: 'Regulatory Requirements', path: '/compliance/requirements', icon: ShieldCheckIcon },
    { label: 'Contract Vehicles & GWACs', path: '/compliance/vehicles', icon: TruckIcon },
    { label: 'Company Compliance', path: '/compliance/company', icon: BuildingOffice2Icon },
    { label: 'AI Recommendations', path: '/compliance/recommendations', icon: SparklesIcon },
  ],
  '/new-proposal': [
    { label: 'New Proposal', path: '/new-proposal', icon: DocumentPlusIcon },
    { label: 'My Proposals', path: '/proposals', icon: FolderOpenIcon },
    { label: 'Templates', path: '/templates', icon: RectangleStackIcon },
    { label: 'Proposal Editor', path: '/proposal-editor', icon: PencilSquareIcon },
    { label: 'Win Probability', path: '/win-probability', icon: TrophyIcon },
    { label: 'Contracts', path: '/contracts', icon: BriefcaseIcon },
  ],
  '/n8n': [
    { label: 'Workflow Automation', path: '/n8n', icon: Cog6ToothIcon },
  ],
};

const tierColors = {
  free: 'bg-gray-100 text-gray-600',
  paid: 'bg-accent/10 text-accent',
  pro: 'bg-blue/10 text-blue',
  enterprise: 'bg-blue/10 text-blue',
};

export default function Layout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const { user, logout } = useAuth();

  const tierLabel = user?.subscription_tier
    ? user.subscription_tier.charAt(0).toUpperCase() + user.subscription_tier.slice(1)
    : 'Free';
  const tierColor = tierColors[user?.subscription_tier?.toLowerCase()] || tierColors.free;

  // Determine which top tab is active based on current path
  const currentPath = location.pathname;
  const activeTopTab = topNavTabs.find(tab => {
    if (tab.path === '/dashboard') return currentPath === '/dashboard' || currentPath === '/audit-log' || currentPath === '/billing' || currentPath === '/admin';
    if (tab.path === '/vendor-profile') return currentPath === '/vendor-profile';
    if (tab.path === '/opportunities') return currentPath === '/opportunities' || currentPath === '/rfp-deconstructor';
    if (tab.path === '/new-proposal') return currentPath === '/new-proposal' || currentPath === '/proposals' || currentPath === '/proposal-editor' || currentPath === '/templates' || currentPath === '/win-probability' || currentPath === '/contracts';
    if (tab.path === '/compliance') return currentPath === '/compliance' || currentPath.startsWith('/compliance/') || currentPath === '/compliance-matrix';
    if (tab.path === '/knowledgebase') return currentPath === '/knowledgebase';
    if (tab.path === '/past-performance') return currentPath === '/past-performance';
    return currentPath === tab.path || currentPath.startsWith(tab.path);
  })?.path || '/dashboard';

  // Get sidebar items for current context
  let sidebarItems = sidebarContextMap[activeTopTab] || sidebarContextMap['/dashboard'];

  // Add admin panel if user is admin
  if (user?.is_admin && activeTopTab === '/dashboard') {
    sidebarItems = [...sidebarItems, { label: 'Admin Panel', path: '/admin', icon: ShieldCheckIcon }];
  }

  return (
    <div className="min-h-screen bg-[#f8f9fc]">
      {/* Header */}
      <header className="bg-navy text-white fixed top-0 left-0 right-0 z-50">
        {/* Top bar — logo + user */}
        <div className="flex items-center justify-between h-12 px-4 lg:px-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-1.5 rounded-md hover:bg-white/10 transition-colors cursor-pointer"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <XMarkIcon className="w-5 h-5" /> : <Bars3Icon className="w-5 h-5" />}
            </button>
            <Link to="/dashboard" className="flex items-center gap-2 no-underline text-white">
              <div className="bg-accent rounded-lg p-1">
                <DocumentTextIcon className="w-4 h-4 text-white" />
              </div>
              <span className="text-base font-bold tracking-tight">
                GovProposal <span className="text-accent">AI</span>
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            {user && (
              <>
                <span className={`hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${tierColor}`}>
                  {tierLabel}
                </span>
                <div className="relative">
                  <button
                    onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                    className="flex items-center gap-2 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-accent">
                        {(user.first_name || user.full_name || user.email || '?')[0].toUpperCase()}
                      </span>
                    </div>
                    <span className="hidden sm:block text-xs text-white/90 max-w-[120px] truncate">
                      {user.first_name || user.full_name || user.email}
                    </span>
                    <ChevronDownIcon className={`hidden sm:block w-3 h-3 text-white/50 transition-transform ${profileMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {profileMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setProfileMenuOpen(false)} />
                      <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
                        <div className="px-4 py-2.5 border-b border-gray-100">
                          <p className="text-sm font-semibold text-gray-900 truncate">{user.first_name || user.full_name || 'User'}</p>
                          <p className="text-xs text-gray-400 truncate">{user.email}</p>
                        </div>
                        <div className="py-1">
                          <Link to="/vendor-profile" onClick={() => setProfileMenuOpen(false)} className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 no-underline transition-colors">
                            <UserCircleIcon className="w-4 h-4 text-gray-400" />
                            My Profile
                          </Link>
                          <Link to="/billing" onClick={() => setProfileMenuOpen(false)} className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 no-underline transition-colors">
                            <CreditCardIcon className="w-4 h-4 text-gray-400" />
                            Billing
                          </Link>
                        </div>
                        <div className="border-t border-gray-100 pt-1">
                          <button onClick={() => { setProfileMenuOpen(false); logout(); }} className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer">
                            <ArrowRightStartOnRectangleIcon className="w-4 h-4 text-red-400" />
                            Sign Out
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Navigation tabs bar */}
        <div className="hidden lg:flex items-center gap-1 h-10 px-4 overflow-x-auto">
          {topNavTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTopTab === tab.path;
            return (
              <Link
                key={tab.path}
                to={tab.path}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium no-underline whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-white/15 text-white'
                    : 'text-white/60 hover:text-white/90 hover:bg-white/5'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </Link>
            );
          })}
        </div>
      </header>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Top offset: 48px top bar + 40px nav tabs = 88px (h-[5.5rem]) */}
      <div className="flex pt-[5.5rem]">
        {/* Context-based sidebar */}
        <aside
          className={`fixed lg:sticky top-[5.5rem] left-0 h-[calc(100vh-5.5rem)] bg-white border-r border-gray-100 z-40 transition-all duration-300 overflow-y-auto ${
            sidebarCollapsed ? 'w-14' : 'w-52'
          } ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        >
          <div className="py-3 px-2 flex flex-col h-full">
            {/* Collapse toggle */}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden lg:flex items-center justify-center w-full mb-2 p-1.5 rounded-md text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors cursor-pointer"
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <Bars3Icon className="w-4 h-4" />
            </button>

            {/* Context nav items */}
            <div className="flex-1 space-y-0.5">
              {sidebarItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPath === item.path || (item.path.includes('?') && currentPath === item.path.split('?')[0]);
                // For items without query params, exact match; for base paths, match exactly
                const exactActive = item.path === currentPath;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    title={sidebarCollapsed ? item.label : undefined}
                    className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-all no-underline ${
                      exactActive
                        ? 'bg-navy text-white shadow-sm'
                        : 'text-gray-500 hover:bg-gray-50 hover:text-navy'
                    } ${sidebarCollapsed ? 'justify-center' : ''}`}
                  >
                    <Icon className={`w-4 h-4 flex-shrink-0 ${exactActive ? 'text-white' : 'text-gray-400'}`} />
                    {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                );
              })}
            </div>

            {/* Sidebar footer */}
            {!sidebarCollapsed && (
              <div className="pt-3 border-t border-gray-100 mt-3">
                {user && (
                  <div className="flex items-center gap-2 px-2 py-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-accent to-blue flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] font-bold text-white">
                        {(user.first_name || user.full_name || user.email || '?')[0].toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-navy truncate">{user.first_name || user.full_name || 'User'}</p>
                      <p className="text-[10px] text-gray-400 truncate">{user.email}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>

        {/* Main Content */}
        <main className={`flex-1 min-h-[calc(100vh-5.5rem)] p-5 lg:p-6 transition-all`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

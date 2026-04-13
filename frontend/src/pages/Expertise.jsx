import { useState, useRef } from 'react';
import {
  UserGroupIcon,
  PlusIcon,
  TrashIcon,
  PhotoIcon,
  UserCircleIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

const TEAM_CATEGORIES = [
  { key: 'management', label: 'Management Team', description: 'Senior management and leadership team' },
  { key: 'executive', label: 'Executive Team', description: 'C-Suite and senior leadership' },
  { key: 'pm', label: 'Project Managers', description: 'Program and project management leads' },
  { key: 'specialists', label: 'Specialty Team Members', description: 'Subject matter experts and technical specialists' },
];

const EMPTY_MEMBER = {
  name: '',
  title: '',
  email: '',
  phone: '',
  bio: '',
  photo: '',
  yearsExp: '',
  certifications: '',
};

export default function Expertise() {
  const [teams, setTeams] = useState({
    management: [],
    executive: [],
    pm: [],
    specialists: [],
  });
  const [activeTab, setActiveTab] = useState('management');
  const [showHierarchy, setShowHierarchy] = useState(false);
  const fileInputRef = useRef(null);
  const [pendingPhotoCallback, setPendingPhotoCallback] = useState(null);

  const addMember = (category) => {
    setTeams(prev => ({
      ...prev,
      [category]: [...prev[category], { ...EMPTY_MEMBER, id: Date.now() }],
    }));
  };

  const updateMember = (category, index, field, value) => {
    setTeams(prev => ({
      ...prev,
      [category]: prev[category].map((m, i) => i === index ? { ...m, [field]: value } : m),
    }));
  };

  const removeMember = (category, index) => {
    setTeams(prev => ({
      ...prev,
      [category]: prev[category].filter((_, i) => i !== index),
    }));
  };

  const handlePhotoUpload = (category, index) => {
    setPendingPhotoCallback({ category, index });
    fileInputRef.current?.click();
  };

  const onFileSelected = (e) => {
    const file = e.target.files?.[0];
    if (!file || !pendingPhotoCallback) return;
    if (file.size > 5 * 1024 * 1024) { alert('Image must be under 5MB'); return; }
    const reader = new FileReader();
    reader.onloadend = () => {
      updateMember(pendingPhotoCallback.category, pendingPhotoCallback.index, 'photo', reader.result);
      setPendingPhotoCallback(null);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const totalMembers = Object.values(teams).flat().length;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Hidden file input for photo upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFileSelected}
      />
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-navy">Capabilities</h1>
        <p className="text-gray-500 text-sm mt-1">
          Manage your organization's key personnel and team structure
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {TEAM_CATEGORIES.map((cat) => (
          <div key={cat.key} className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-xs text-gray-400 font-medium">{cat.label}</p>
            <p className="text-2xl font-bold text-navy mt-1">{teams[cat.key].length}</p>
          </div>
        ))}
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-400 font-medium">Total Team</p>
          <p className="text-2xl font-bold text-navy mt-1">{totalMembers}</p>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex items-center gap-2 mb-6 border-b border-gray-200 pb-px">
        {TEAM_CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => { setActiveTab(cat.key); setShowHierarchy(false); }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === cat.key && !showHierarchy
                ? 'border-navy text-navy'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            {cat.label} ({teams[cat.key].length})
          </button>
        ))}
        <button
          onClick={() => setShowHierarchy(true)}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            showHierarchy
              ? 'border-navy text-navy'
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          <ChartBarIcon className="w-4 h-4" />
          Org Hierarchy
        </button>
      </div>

      {showHierarchy ? (
        /* Org Hierarchy Chart */
        <div className="bg-white rounded-xl border border-gray-100 p-8">
          <h2 className="text-lg font-semibold text-navy mb-6 text-center">Organization Hierarchy</h2>
          {totalMembers === 0 ? (
            <div className="text-center py-12">
              <UserGroupIcon className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-400">Add team members first to generate the hierarchy chart</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-6">
              {/* Management level */}
              {teams.management.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold text-center mb-2">Management Team</p>
                  <div className="flex flex-wrap justify-center gap-3">
                    {teams.management.map((m, i) => (
                      <div key={i} className="bg-gray-700 text-white rounded-lg px-4 py-2.5 text-center min-w-[140px]">
                        <p className="text-sm font-semibold">{m.name || 'Unnamed'}</p>
                        <p className="text-[10px] text-white/60">{m.title || 'Manager'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {teams.management.length > 0 && (teams.executive.length > 0 || teams.pm.length > 0 || teams.specialists.length > 0) && (
                <div className="w-px h-8 bg-gray-200" />
              )}
              {/* Executive level */}
              {teams.executive.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold text-center mb-2">Executive Team</p>
                  <div className="flex flex-wrap justify-center gap-3">
                    {teams.executive.map((m, i) => (
                      <div key={i} className="bg-navy text-white rounded-lg px-4 py-2.5 text-center min-w-[140px]">
                        <p className="text-sm font-semibold">{m.name || 'Unnamed'}</p>
                        <p className="text-[10px] text-white/60">{m.title || 'Executive'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {teams.executive.length > 0 && (teams.pm.length > 0 || teams.specialists.length > 0) && (
                <div className="w-px h-8 bg-gray-200" />
              )}
              {/* PM level */}
              {teams.pm.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold text-center mb-2">Project Managers</p>
                  <div className="flex flex-wrap justify-center gap-3">
                    {teams.pm.map((m, i) => (
                      <div key={i} className="bg-blue text-white rounded-lg px-4 py-2.5 text-center min-w-[140px]">
                        <p className="text-sm font-semibold">{m.name || 'Unnamed'}</p>
                        <p className="text-[10px] text-white/60">{m.title || 'Project Manager'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {teams.pm.length > 0 && teams.specialists.length > 0 && (
                <div className="w-px h-8 bg-gray-200" />
              )}
              {/* Specialist level */}
              {teams.specialists.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold text-center mb-2">Specialists</p>
                  <div className="flex flex-wrap justify-center gap-3">
                    {teams.specialists.map((m, i) => (
                      <div key={i} className="bg-accent text-white rounded-lg px-4 py-2.5 text-center min-w-[140px]">
                        <p className="text-sm font-semibold">{m.name || 'Unnamed'}</p>
                        <p className="text-[10px] text-white/60">{m.title || 'Specialist'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Team member forms */
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">
              {TEAM_CATEGORIES.find(c => c.key === activeTab)?.description}
            </p>
            <button
              onClick={() => addMember(activeTab)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-navy text-white rounded-lg text-xs font-medium hover:bg-navy-light transition-colors cursor-pointer"
            >
              <PlusIcon className="w-3.5 h-3.5" />
              Add Member
            </button>
          </div>

          {teams[activeTab].length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
              <UserGroupIcon className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-500 mb-1">No team members yet</p>
              <p className="text-xs text-gray-400 mb-4">Add your {TEAM_CATEGORIES.find(c => c.key === activeTab)?.label.toLowerCase()}</p>
              <button
                onClick={() => addMember(activeTab)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white rounded-lg text-xs font-medium hover:bg-accent-dark transition-colors cursor-pointer"
              >
                <PlusIcon className="w-3.5 h-3.5" />
                Add First Member
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {teams[activeTab].map((member, index) => (
                <div key={member.id || index} className="bg-white rounded-xl border border-gray-100 p-5 relative">
                  <button
                    onClick={() => removeMember(activeTab, index)}
                    className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>

                  <div className="flex gap-4">
                    {/* Photo upload */}
                    <div className="flex-shrink-0">
                      {member.photo ? (
                        <div className="relative group">
                          <img src={member.photo} alt={member.name || 'Team member'} className="w-20 h-24 object-cover rounded-lg border border-gray-200" />
                          <button
                            type="button"
                            onClick={() => updateMember(activeTab, index, 'photo', '')}
                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          >
                            <TrashIcon className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handlePhotoUpload(activeTab, index)}
                          className="w-20 h-24 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center bg-white hover:border-gray-400 transition-colors cursor-pointer"
                        >
                          <PhotoIcon className="w-6 h-6 text-gray-300" />
                          <span className="text-[10px] text-gray-400 mt-1">Photo</span>
                        </button>
                      )}
                    </div>

                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Full Name</label>
                        <input
                          type="text"
                          value={member.name}
                          onChange={(e) => updateMember(activeTab, index, 'name', e.target.value)}
                          placeholder="John Smith"
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Title / Role</label>
                        <input
                          type="text"
                          value={member.title}
                          onChange={(e) => updateMember(activeTab, index, 'title', e.target.value)}
                          placeholder="Chief Executive Officer"
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
                        <input
                          type="email"
                          value={member.email}
                          onChange={(e) => updateMember(activeTab, index, 'email', e.target.value)}
                          placeholder="john@company.com"
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Years of Experience</label>
                        <input
                          type="text"
                          value={member.yearsExp}
                          onChange={(e) => updateMember(activeTab, index, 'yearsExp', e.target.value)}
                          placeholder="15"
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Certifications</label>
                        <input
                          type="text"
                          value={member.certifications}
                          onChange={(e) => updateMember(activeTab, index, 'certifications', e.target.value)}
                          placeholder="PMP, ITIL, AWS Solutions Architect"
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Bio / Summary</label>
                        <textarea
                          value={member.bio}
                          onChange={(e) => updateMember(activeTab, index, 'bio', e.target.value)}
                          placeholder="Brief professional summary..."
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue resize-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

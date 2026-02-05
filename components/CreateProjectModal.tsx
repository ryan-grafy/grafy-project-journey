import React, { useState, useEffect } from 'react';
import { TeamMember, Project } from '../types';
import { X, ChevronDown } from 'lucide-react';

interface CreateProjectModalProps {
  teamMembers: TeamMember[];
  templates: Project[]; // Templates passed from App
  onClose: () => void;
  onCreate: (name: string, pm: TeamMember | null, designers: (TeamMember | null)[], startDate: string, customTasks?: any, templateName?: string, taskOrder?: any, templateProject?: Project | null) => Promise<void>;
}

const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ teamMembers, templates, onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [pm, setPm] = useState<TeamMember | null>(null);
  const [designerLead, setDesignerLead] = useState<TeamMember | null>(null);
  const [designer1, setDesigner1] = useState<TeamMember | null>(null);
  const [designer2, setDesigner2] = useState<TeamMember | null>(null);
  const [startDate, setStartDate] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<Project | null>(null); // Selected Template
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [dropdownOpen, setDropdownOpen] = useState<'pm' | 'lead' | 'd1' | 'd2' | 'template' | null>(null);

  const getTemplateLabel = (template: Project) =>
    template.template_name || template.task_states?.meta?.template_name || template.name;

  // No scroll lock to prevent scrollbar shifting/shaking
  useEffect(() => {
    // Esc key to close
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handleSubmit = async () => {
    if (!name.trim() || !startDate.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const templateLabel = selectedTemplate
        ? getTemplateLabel(selectedTemplate)
        : undefined;
      // Pass custom_tasks from selected template if exists
      await onCreate(
        name,
        pm,
        [designerLead, designer1, designer2],
        startDate,
        selectedTemplate?.custom_tasks,
        templateLabel,
        selectedTemplate?.task_order,
        selectedTemplate,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDateChange = (val: string) => {
    const cleaned = val.replace(/[^0-9]/g, '');
    if (cleaned.length === 6) {
      const formatted = `${cleaned.slice(0, 2)}-${cleaned.slice(2, 4)}-${cleaned.slice(4, 6)}`;
      setStartDate(formatted);
    } else {
      setStartDate(val);
    }
  };

  const renderDropdown = (label: string, value: TeamMember | null, field: 'pm' | 'lead' | 'd1' | 'd2') => (
    <div className="relative">
      <label className="block text-[11px] font-semibold text-black/40 mb-2 uppercase tracking-[0.1em] ml-1" style={{ fontFamily: "'Helvetica Now Display', sans-serif" }}>{label}</label>
      <div 
        onClick={() => setDropdownOpen(dropdownOpen === field ? null : field)} 
        className="w-full bg-white/30 hover:bg-white/45 border border-white/30 rounded-2xl p-4 text-[15px] font-bold cursor-pointer transition-all text-black/70 flex justify-between items-center shadow-sm"
        style={{ fontFamily: "'Helvetica Now Display', sans-serif" }}
      >
        <span>{value ? `${value.name} ${value.title}` : 'Select...'}</span>
        <ChevronDown size={14} className={`text-black/30 transition-transform duration-300 ${dropdownOpen === field ? 'rotate-180' : ''}`} />
      </div>
      {dropdownOpen === field && (
        <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-white border border-slate-200 rounded-2xl shadow-2xl z-[110] p-2 animate-in fade-in zoom-in-95 duration-200">
          <div className="max-h-64 overflow-y-auto custom-scrollbar flex flex-col gap-1">
            <div onClick={() => {
              if (field === 'pm') setPm(null);
              else if (field === 'lead') setDesignerLead(null);
              else if (field === 'd1') setDesigner1(null);
              else if (field === 'd2') setDesigner2(null);
              setDropdownOpen(null);
            }} className="px-5 py-3 text-[14px] font-medium hover:bg-white/40 rounded-xl cursor-pointer text-black/30 italic">None Selected</div>
            {teamMembers.map((member) => (
              <div key={member.id} onClick={() => {
                if (field === 'pm') setPm(member);
                else if (field === 'lead') setDesignerLead(member);
                else if (field === 'd1') setDesigner1(member);
                else if (field === 'd2') setDesigner2(member);
                setDropdownOpen(null);
              }} className="px-5 py-3 text-[14px] font-medium hover:bg-white/40 rounded-xl cursor-pointer text-black transition-colors">{member.name} {member.title}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center" onClick={() => setDropdownOpen(null)}>
      {/* 
         Backdrop: Pure glass per TeamManagementModal style.
      */}
      <div className="absolute inset-0" onClick={onClose} />
      
      {/* 
         Modal Container:
         - bg-white/20: Brighter
         - backdrop-blur-[35px]
         - shadow: Enhanced deep shadow
      */}
      <div 
        className="relative bg-white/20 backdrop-blur-[35px] rounded-[2.5rem] w-[600px] flex flex-col p-10 shadow-[0_30px_100px_-15px_rgba(0,0,0,0.25)] border border-white/50 ring-1 ring-white/20"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8 pl-1">
          <div className="flex flex-col">
            <h2 
              className="text-3xl font-bold tracking-tight text-black"
              style={{ fontFamily: "'Helvetica Now Display', 'Helvetica Neue', Helvetica, Arial, sans-serif" }}
            >
              New Project
            </h2>
            <p className="text-black/50 text-sm font-medium mt-1 ml-0.5">Initialize your project journey</p>
          </div>
          <button 
            onClick={onClose} 
            className="w-12 h-12 flex items-center justify-center rounded-full hover:bg-white/30 transition-all text-black/70 hover:text-black border border-transparent hover:border-white/20"
          >
            <X size={24} strokeWidth={2.5} />
          </button>
        </div>

        <div className="flex flex-col gap-6">
          {/* Template Selection */}
          <div className="relative">
            <label className="block text-[11px] font-semibold text-black/40 mb-2 uppercase tracking-[0.1em] ml-1" style={{ fontFamily: "'Helvetica Now Display', sans-serif" }}>Template (Optional)</label>
            <div 
              onClick={() => setDropdownOpen(dropdownOpen === 'template' ? null : 'template')} 
              className="w-full bg-white/30 hover:bg-white/45 border border-white/30 rounded-2xl p-4 text-[15px] font-bold cursor-pointer transition-all text-black/70 flex justify-between items-center shadow-sm"
              style={{ fontFamily: "'Helvetica Now Display', sans-serif" }}
            >
                <span>{selectedTemplate ? getTemplateLabel(selectedTemplate) : 'Default (Basic)'}</span>
                <ChevronDown size={14} className={`text-black/30 transition-transform duration-300 ${dropdownOpen === 'template' ? 'rotate-180' : ''}`} />
            </div>
            {dropdownOpen === 'template' && (
                <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-white border border-slate-200 rounded-2xl shadow-2xl z-[110] p-2 animate-in fade-in zoom-in-95 duration-200">
                    <div className="max-h-64 overflow-y-auto custom-scrollbar flex flex-col gap-1">
                        <div onClick={() => { setSelectedTemplate(null); setDropdownOpen(null); }} className="px-5 py-3 text-[14px] font-medium hover:bg-white/40 rounded-xl cursor-pointer text-black/30 italic">Default (Basic)</div>
                        {templates.map(t => (
                            <div key={t.id} onClick={() => { setSelectedTemplate(t); setDropdownOpen(null); }} className="px-5 py-3 text-[14px] font-medium hover:bg-white/40 rounded-xl cursor-pointer text-black transition-colors">
                                {getTemplateLabel(t)}
                            </div>
                        ))}
                    </div>
                </div>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-black/40 mb-2 uppercase tracking-[0.1em] ml-1" style={{ fontFamily: "'Helvetica Now Display', sans-serif" }}>Project Name</label>
            <input 
              type="text" 
              required 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              className="w-full bg-white/30 hover:bg-white/45 border border-white/30 rounded-2xl p-4 text-[15px] font-bold outline-none focus:border-black/20 focus:ring-1 focus:ring-black/10 transition-all text-black/70 placeholder-black/40 shadow-sm" 
              placeholder="Enter project name..."
              style={{ fontFamily: "'Helvetica Now Display', sans-serif" }}
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-black/40 mb-2 uppercase tracking-[0.1em] ml-1" style={{ fontFamily: "'Helvetica Now Display', sans-serif" }}>Start Date (YYMMDD)</label>
            <input 
              type="text" 
              required 
              maxLength={8}
              placeholder="e.g. 250131"
              value={startDate} 
              onChange={(e) => handleDateChange(e.target.value)} 
              className="w-full bg-white/30 hover:bg-white/45 border border-white/30 rounded-2xl p-4 text-[15px] font-bold outline-none focus:border-black/20 focus:ring-1 focus:ring-black/10 transition-all text-black/70 font-mono shadow-sm placeholder-black/40" 
              style={{ fontFamily: "'Helvetica Now Display', sans-serif" }}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-5">
            {renderDropdown('PM NAME', pm, 'pm')}
            {renderDropdown('DESIGNER A', designerLead, 'lead')}
            {renderDropdown('DESIGNER B', designer1, 'd1')}
            {renderDropdown('DESIGNER C', designer2, 'd2')}
          </div>

          <div className="flex justify-end gap-3 mt-4 pt-8 border-t border-white/20">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-8 py-4 text-[15px] font-medium text-black/70 bg-white/20 hover:bg-white/40 border border-white/30 rounded-[20px] transition-all backdrop-blur-md"
              style={{ fontFamily: "'Helvetica Now Display', 'Helvetica Neue', sans-serif" }}
            >
              Cancel
            </button>
            <button 
              type="button" 
              onClick={handleSubmit} 
              disabled={isSubmitting} 
              className="px-10 py-4 text-[15px] font-bold text-black bg-white hover:bg-white/90 rounded-[20px] shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
              style={{ fontFamily: "'Helvetica Now Display', 'Helvetica Neue', sans-serif" }}
            >
              {isSubmitting ? 'Initializing...' : 'Create Project'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateProjectModal;

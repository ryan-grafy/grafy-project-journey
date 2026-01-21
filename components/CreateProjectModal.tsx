
import React, { useState } from 'react';
import { TeamMember, Project } from '../types';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    // Pass custom_tasks from selected template if exists
    await onCreate(name, pm, [designerLead, designer1, designer2], startDate, selectedTemplate?.custom_tasks, selectedTemplate?.name, selectedTemplate?.task_order, selectedTemplate);
    setIsSubmitting(false);
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
      <label className="block text-[12px] font-black text-black mb-2 uppercase tracking-widest">{label}</label>
      <div onClick={() => setDropdownOpen(dropdownOpen === field ? null : field)} className="w-full bg-white border border-slate-200 rounded-xl p-4 text-base font-bold cursor-pointer hover:border-black transition-all text-black flex justify-between items-center">
        <span className={value ? 'text-black' : 'text-slate-400'}>{value ? `${value.name} ${value.title}` : '선택하세요'}</span>
        <i className={`fa-solid fa-chevron-down text-[10px] transition-transform ${dropdownOpen === field ? 'rotate-180' : ''}`}></i>
      </div>
      {dropdownOpen === field && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-black rounded-xl shadow-2xl z-[110] overflow-hidden">
          <div className="max-h-64 overflow-y-auto custom-scrollbar">
            <div onClick={() => {
              if (field === 'pm') setPm(null);
              else if (field === 'lead') setDesignerLead(null);
              else if (field === 'd1') setDesigner1(null);
              else if (field === 'd2') setDesigner2(null);
              setDropdownOpen(null);
            }} className="px-5 py-2 text-base font-bold hover:bg-slate-50 cursor-pointer text-slate-400 border-b border-slate-100 italic">선택 안 함</div>
            {teamMembers.map((member) => (
              <div key={member.id} onClick={() => {
                if (field === 'pm') setPm(member);
                else if (field === 'lead') setDesignerLead(member);
                else if (field === 'd1') setDesigner1(member);
                else if (field === 'd2') setDesigner2(member);
                setDropdownOpen(null);
              }} className="px-5 py-2 text-base font-bold hover:bg-slate-50 cursor-pointer text-black border-b border-slate-100 last:border-0">{member.name} {member.title}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in duration-200" onClick={() => setDropdownOpen(null)}>
      <div className="bg-white rounded-[1rem] w-[540px] p-10 shadow-2xl border border-slate-100" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-[25px] font-black tracking-tighter text-black uppercase">NEW PROJECT</h2>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 text-black">
            <i className="fa-solid fa-times text-xl"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Template Selection */}
          <div className="relative">
            <label className="block text-[12px] font-black text-black mb-2 uppercase tracking-widest">TEMPLATE (선택)</label>
            <div onClick={() => setDropdownOpen(dropdownOpen === 'template' ? null : 'template')} className="w-full bg-white border border-slate-200 rounded-xl p-4 text-base font-bold cursor-pointer hover:border-black transition-all text-black flex justify-between items-center">
                <span className={selectedTemplate ? 'text-black' : 'text-slate-400'}>{selectedTemplate ? selectedTemplate.name : '기본 (Default)'}</span>
                <i className={`fa-solid fa-chevron-down text-[10px] transition-transform ${dropdownOpen === 'template' ? 'rotate-180' : ''}`}></i>
            </div>
            {dropdownOpen === 'template' && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-black rounded-xl shadow-2xl z-[110] overflow-hidden">
                    <div className="max-h-64 overflow-y-auto custom-scrollbar">
                        <div onClick={() => { setSelectedTemplate(null); setDropdownOpen(null); }} className="px-5 py-2 text-base font-bold hover:bg-slate-50 cursor-pointer text-slate-400 border-b border-slate-100 italic">기본 (Default)</div>
                        {templates.map(t => (
                            <div key={t.id} onClick={() => { setSelectedTemplate(t); setDropdownOpen(null); }} className="px-5 py-2 text-base font-bold hover:bg-slate-50 cursor-pointer text-black border-b border-slate-100 last:border-0">
                                {t.name}
                            </div>
                        ))}
                    </div>
                </div>
            )}
          </div>

          <div>
            <label className="block text-[12px] font-black text-black mb-2 uppercase tracking-widest">Project Name</label>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl p-4 text-base font-bold outline-none focus:border-black transition-all text-black" placeholder="프로젝트명을 입력하세요" />
          </div>

          <div>
            <label className="block text-[12px] font-black text-black mb-2 uppercase tracking-widest">Project Start Date (YYMMDD 입력)</label>
            <input 
              type="text" 
              required 
              maxLength={8}
              placeholder="예: 250131"
              value={startDate} 
              onChange={(e) => handleDateChange(e.target.value)} 
              className="w-full bg-white border border-slate-200 rounded-xl p-4 text-base font-bold outline-none focus:border-black transition-all text-black font-mono" 
            />
          </div>
          
          <div className="grid grid-cols-2 gap-5">
            {renderDropdown('PM NAME', pm, 'pm')}
            {renderDropdown('DESIGNER A', designerLead, 'lead')}
            {renderDropdown('DESIGNER B', designer1, 'd1')}
            {renderDropdown('DESIGNER C', designer2, 'd2')}
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={onClose} className="px-8 py-4 text-base font-bold text-slate-500 bg-slate-100 rounded-xl">취소</button>
            <button type="submit" disabled={isSubmitting} className="px-10 py-4 text-base font-black text-white bg-black rounded-xl active:scale-95 transition-all">{isSubmitting ? '생성 중...' : '프로젝트 생성'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateProjectModal;

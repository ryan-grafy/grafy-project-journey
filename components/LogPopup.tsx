import React from 'react';
import { Log } from '../types';

interface LogPopupProps {
  logs: Log[];
  onClose: () => void;
}

const LogPopup: React.FC<LogPopupProps> = ({ logs, onClose }) => {
  const exportLogsToCSV = () => {
    const headers = ["Timestamp", "User", "Project", "Action", "Details"];
    const rows = logs.map(l => [
      new Date(l.timestamp).toLocaleString(),
      l.userName,
      l.projectName,
      l.action,
      l.details
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `grafy_activity_logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[150] flex justify-end">
      <div className="w-[500px] h-full bg-white shadow-2xl p-10 flex flex-col animate-in slide-in-from-right duration-300">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h2 className="text-3xl font-black italic text-black tracking-tighter uppercase">Activity Logs</h2>
            <p className="text-slate-400 text-sm font-bold mt-1">실시간 프로젝트 기록</p>
          </div>
          <button onClick={onClose} className="w-12 h-12 flex items-center justify-center rounded-full hover:bg-slate-100 transition-all">
            <i className="fa-solid fa-times text-2xl"></i>
          </button>
        </div>

        <button 
          onClick={exportLogsToCSV}
          className="w-full bg-emerald-50 text-emerald-700 border-2 border-emerald-100 py-4 rounded-2xl mb-8 font-black flex items-center justify-center gap-3 hover:bg-emerald-100 transition-all"
        >
          <i className="fa-solid fa-file-excel text-xl"></i> 로그 전체 엑셀 다운로드
        </button>

        <div className="flex-1 overflow-y-auto pr-4 flex flex-col gap-6 custom-scrollbar">
          {logs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4 opacity-50">
              <i className="fa-solid fa-list-check text-6xl"></i>
              <p className="font-bold">기록된 로그가 없습니다.</p>
            </div>
          ) : (
            [...logs].reverse().map((log) => (
              <div key={log.id} className="border-l-4 border-black pl-5 py-1">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-[10px] font-black text-slate-400 tracking-widest uppercase">{new Date(log.timestamp).toLocaleString()}</span>
                  <span className="bg-slate-100 text-[10px] font-black px-2 py-0.5 rounded text-black">{log.userName}</span>
                </div>
                <h4 className="font-black text-sm text-black mb-1">{log.projectName}</h4>
                <div className="text-xs font-bold text-slate-700">
                  <span className="text-blue-600">{log.action}: </span>
                  {log.details}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default LogPopup;
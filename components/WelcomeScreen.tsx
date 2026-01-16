import React from 'react';

interface WelcomeScreenProps {
    onLogin: () => void;
    isLoading?: boolean;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onLogin, isLoading }) => {
    return (
        <div className="min-h-screen bg-[#e3e7ed] flex items-center justify-center p-4">
            <div className="max-w-[1200px] w-full grid grid-cols-1 lg:grid-cols-2 bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200">

                {/* Left Side: Visuals */}
                <div className="hidden lg:flex flex-col justify-between p-12 bg-black text-white relative overflow-hidden">
                    <div className="relative z-10">
                        <h2 className="text-sm font-black tracking-[0.3em] uppercase opacity-50 mb-4">Grafy Design Studio</h2>
                        <h1 className="text-6xl font-black tracking-tighter leading-none mb-8">
                            PROJECT<br />JOURNEY
                        </h1>
                        <p className="text-xl text-slate-400 font-medium max-w-sm leading-relaxed">
                            프로젝트의 시작부터 비행기 이착륙까지,<br />
                            모든 여정을 한곳에서 관리하세요.
                        </p>
                    </div>

                    <div className="relative z-10">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="flex -space-x-4">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="w-12 h-12 rounded-full border-4 border-black bg-slate-800 overflow-hidden">
                                        <img src={`https://ui-avatars.com/api/?name=User+${i}&background=random`} alt="User" />
                                    </div>
                                ))}
                            </div>
                            <p className="text-sm font-bold text-slate-400">
                                120+ 팀원이 함께 비행 중
                            </p>
                        </div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                            © 2026 GRAFY PROJECT AIRPORT v1.0
                        </p>
                    </div>

                    {/* Background Decoration */}
                    <div className="absolute top-[-100px] right-[-100px] w-80 h-80 bg-slate-800/30 rounded-full blur-[100px]"></div>
                    <div className="absolute bottom-[-50px] left-[-50px] w-64 h-64 bg-slate-700/20 rounded-full blur-[80px]"></div>
                </div>

                {/* Right Side: Login */}
                <div className="flex flex-col items-center justify-center p-8 md:p-16 lg:p-24 bg-white">
                    <div className="text-center mb-12">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-[2rem] bg-slate-100 mb-8 border border-slate-200 shadow-inner">
                            <i className="fa-solid fa-plane-departure text-3xl text-black"></i>
                        </div>
                        <h3 className="text-3xl font-black text-black tracking-tighter mb-4">반갑습니다!</h3>
                        <p className="text-slate-500 font-bold">서비스 이용을 위해 로그인이 필요합니다.</p>
                    </div>

                    <div className="w-full max-w-sm space-y-4">
                        <button
                            onClick={onLogin}
                            disabled={isLoading}
                            className="w-full h-16 bg-white border-2 border-slate-200 rounded-2xl flex items-center justify-center gap-4 hover:border-black hover:bg-slate-50 transition-all active:scale-95 shadow-lg group disabled:opacity-50"
                        >
                            {isLoading ? (
                                <div className="flex items-center gap-3">
                                    <i className="fa-solid fa-circle-notch fa-spin text-xl text-black"></i>
                                    <span className="text-[17px] font-black text-black">로그인 창으로 이동 중...</span>
                                </div>
                            ) : (
                                <>
                                    <img src="https://www.gstatic.com/images/branding/product/1x/googleg_48dp.png" alt="Google" className="w-6 h-6" />
                                    <span className="text-[17px] font-black text-black">Google 계정으로 계속하기</span>
                                </>
                            )}
                        </button>

                        <p className="text-center text-[13px] text-slate-400 font-bold px-4">
                            로그인하면 <span className="text-black underline">이용약관</span> 및 <span className="text-black underline">개인정보처리방침</span>에 동의하게 됩니다.
                        </p>
                    </div>

                    <div className="mt-20 pt-8 border-t border-slate-100 w-full text-center">
                        <p className="text-[14px] font-bold text-slate-500 mb-2">이미 계정이 없으신가요?</p>
                        <button className="text-[14px] font-black text-black hover:underline">
                            팀 관리자에게 계정 요청하기
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WelcomeScreen;

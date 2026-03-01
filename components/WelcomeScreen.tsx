import React, { useState, useEffect, useRef } from 'react';
import GlassInput from './ui/GlassInput';
import { GoogleIcon, UserIcon, LockIcon, ArrowRightIcon } from './ui/Icons';

interface WelcomeScreenProps {
  onLogin: () => void;
  onAdminLogin: (userId: string, password: string) => void;
  isLoading?: boolean;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onLogin, onAdminLogin, isLoading }) => {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [autoLogin, setAutoLogin] = useState(false);
  const [error, setError] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (userId === 'admin' && password === 'rmfovlWkd!2026') {
      setError('');
      onAdminLogin(userId, password);
      return;
    }
    setError('아이디 또는 비밀번호가 일치하지 않습니다.');
  };

  const videoUrl = "https://pub-72641fd7f7434e30ad221762f61a610f.r2.dev/grafy/IMG_0688.webm";

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.7;
    }
    
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    
    return () => {
      document.body.style.overflow = originalStyle;
      document.documentElement.style.overflow = originalStyle;
    };
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden flex items-center justify-center bg-black">
      <div className="absolute inset-0 overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover opacity-100 transition-opacity duration-1000"
        >
          <source src={videoUrl} type="video/webm" />
        </video>
      </div>

      <div className="absolute inset-0 bg-gradient-to-r from-black/25 via-black/5 to-transparent backdrop-blur-[1px]" />

      <div 
        className="absolute inset-0 opacity-[0.12] pointer-events-none z-[11]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='2.0' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
        }}
      />

      <div className="relative z-20 w-full max-w-[1920px] mx-auto px-8 md:px-16 lg:px-24 grid grid-cols-1 lg:grid-cols-2 gap-12 items-stretch pt-16 lg:pt-24">
         <div className="flex flex-col justify-between order-2 lg:order-1">
           <div className="flex flex-col">
              <h1 
                className="text-7xl md:text-8xl lg:text-[8.8rem] text-white tracking-tighter drop-shadow-2xl font-medium"
                style={{ 
                  fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", 
                  fontWeight: 500,
                  lineHeight: '0.85' 
                }}
              >
                We<br />
                Make It<br />
                Valuable.
              </h1>
              <p className="mt-8 text-lg md:text-xl text-white max-w-lg font-light leading-[1.4]">
                Project Journey begins here.<br />
                Experience the seamless<br />
                workflow with GRAFY.
              </p>
           </div>
           
            <div className="flex items-center pb-2">
              <svg width="160" height="21" viewBox="0 0 200 26" fill="none" xmlns="http://www.w3.org/2000/svg" className="hover:opacity-80 transition-opacity drop-shadow-lg">
                 <title>Grafy</title>
                 <g clipPath="url(#clip0_1251_131)">
                  <path d="M14.3866 16.3675H22.7191C21.938 18.4818 19.1843 20.518 15.1678 20.518C10.2659 20.518 6.71158 17.3368 6.71158 12.9587C6.71158 8.5806 10.2659 5.49054 15.1678 5.49054C18.2079 5.49054 20.8378 6.6485 22.0421 8.50904L22.1202 8.63264H29.4242L29.3005 8.28135C27.5494 3.24618 21.9445 0 15.0376 0C6.321 0 0 5.45151 0 12.9522C0 20.4529 6.321 25.9044 15.0376 25.9044C23.7542 25.9044 29.9385 20.3358 29.9385 12.9522V11.2608H14.3931V16.361L14.3866 16.3675Z" fill="white"/>
                  <path d="M69.2973 9.15875C69.2973 3.88939 64.9357 0.617188 57.9182 0.617188H46.5391V25.3116H53.2507V17.6938H57.7424L63.0934 25.3116H70.9182L64.4084 16.4708C67.5722 15.0591 69.3038 12.47 69.3038 9.15875H69.2973ZM62.5857 9.15875C62.5857 11.9691 59.4935 12.3919 57.6448 12.3919H53.2507V5.93208H57.6448C59.487 5.93208 62.5857 6.35493 62.5857 9.16526V9.15875Z" fill="white"/>
                  <path d="M96.495 0.625L85.5586 25.3194H92.5241L94.451 20.6355H104.775L106.702 25.3194H114.176L103.259 0.625H96.5015H96.495ZM102.666 15.4182H96.5731L99.6197 7.98909L102.666 15.4182Z" fill="white"/>
                  <path d="M129.777 25.3194H136.489V16.0688H149.014V10.8515H136.489V5.90086H150.57V0.625H129.777V25.3194Z" fill="white"/>
                  <path d="M185.986 0.625L179.542 11.7622L173.071 0.625H165.383L175.916 17.539V25.3194H182.627V17.539L193.167 0.625H185.986Z" fill="white"/>
                  <path d="M196.582 25.3697C198.469 25.3697 199.999 23.8406 199.999 21.9544C199.999 20.0682 198.469 18.5391 196.582 18.5391C194.694 18.5391 193.164 20.0682 193.164 21.9544C193.164 23.8406 194.694 25.3697 196.582 25.3697Z" fill="white"/>
                </g>
                <defs>
                  <clipPath id="clip0_1251_131">
                    <rect width="200" height="25.9109" fill="white"/>
                  </clipPath>
                </defs>
             </svg>
           </div>
         </div>

         <div className="flex flex-col justify-start order-1 lg:order-2">
            <div className="bg-white/22 backdrop-blur-2xl border border-white/20 p-8 md:p-12 rounded-[2.5rem] shadow-2xl w-full max-w-md ml-auto">
               <div className="mb-8 text-center text-white">
                 <h2 className="text-3xl font-semibold mb-2 tracking-tight">
                   Log In
                 </h2>
                 <p className="text-white/60 text-[13px] font-medium">
                   로그인이 필요한 서비스입니다
                 </p>
               </div>

               <form onSubmit={handleAuth} className="space-y-6">
                 <GlassInput 
                   icon={<UserIcon />}
                   placeholder="사용자 ID"
                   value={userId}
                   onChange={(e) => setUserId(e.target.value)}
                 />

                 <GlassInput 
                   icon={<LockIcon />}
                   type="password"
                   placeholder="비밀번호"
                   value={password}
                   onChange={(e) => setPassword(e.target.value)}
                 />

                 <div className="flex items-center justify-between text-sm">
                   <label className="flex items-center text-white/70 cursor-pointer hover:text-white transition-colors font-medium">
                     <input 
                       type="checkbox" 
                       className="mr-2 rounded border-white/20 bg-transparent text-blue-500 focus:ring-offset-0 focus:ring-blue-500"
                       checked={autoLogin}
                       onChange={(e) => setAutoLogin(e.target.checked)}
                     />
                     로그인 상태 유지
                   </label>
                    <button type="button" className="text-white/50 hover:text-white transition-colors font-medium">비밀번호 찾기</button>
                 </div>

                 {error && <p className="text-red-400 text-sm text-center font-medium bg-red-500/10 py-2 rounded-lg">{error}</p>}

                  <button 
                    type="submit"
                    className="w-full bg-white/30 hover:bg-white/40 text-white font-semibold py-4 rounded-full transition-all duration-300 transform border border-white/20 flex items-center justify-center opacity-90 disabled:opacity-60"
                    disabled={isLoading}
                  >
                    Sign In
                   <span className="ml-2">
                     <ArrowRightIcon />
                   </span>
                 </button>
               </form>

               <div className="my-8 flex items-center">
                 <div className="flex-grow border-t border-white/10"></div>
                 <span className="mx-4 text-white/30 text-xs tracking-widest uppercase font-semibold">Quick Connect</span>
                 <div className="flex-grow border-t border-white/10"></div>
               </div>

               <div className="grid grid-cols-1 gap-4">
                  <button 
                    type="button"
                    onClick={onLogin}
                    disabled={isLoading}
                    className="flex items-center justify-center px-4 py-4 bg-white text-black rounded-2xl hover:bg-[#f1f1f1] transition-all duration-300 text-base font-semibold shadow-2xl transform active:scale-95 disabled:opacity-50"
                  >
                   {isLoading ? (
                     <div className="flex items-center gap-2">
                       <i className="fa-solid fa-circle-notch fa-spin"></i>
                       연결 중...
                     </div>
                   ) : (
                     <div className="flex items-center gap-2">
                       <GoogleIcon /> Google 계정으로 계속하기
                     </div>
                   )}
                 </button>
               </div>
               
                <div className="mt-10 text-center">
                  <p className="text-white/40 text-sm font-medium">
                    반갑습니다. <span className="text-white font-semibold">그래퍼</span>가 되신걸 환영합니다.
                  </p>
                </div>
            </div>
         </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;

import React, { useState } from 'react';
import { User } from '../types';

interface AuthScreenProps {
  onLogin: (user: User, autoLogin: boolean) => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [autoLogin, setAutoLogin] = useState(false);
  const [error, setError] = useState('');

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const usersStr = localStorage.getItem('grafy_users') || '[]';
    const users: User[] = JSON.parse(usersStr);

    if (isLogin) {
      const user = users.find(u => u.userId === userId && u.password === password);
      if (user) {
        onLogin(user, autoLogin);
      } else {
        setError('아이디 또는 비밀번호가 일치하지 않습니다.');
      }
    } else {
      if (!userId || !password || !name) {
        setError('모든 항목을 입력해주세요.');
        return;
      }
      if (users.find(u => u.userId === userId)) {
        setError('이미 존재하는 아이디입니다.');
        return;
      }
      const newUser: User = { id: Date.now().toString(), userId, password, name };
      localStorage.setItem('grafy_users', JSON.stringify([...users, newUser]));
      setIsLogin(true);
      setError('회원가입 성공! 로그인 해주세요.');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-50 flex items-center justify-center z-[200]">
      <div className="w-[480px] bg-white rounded-[3rem] p-12 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)] border border-slate-100 flex flex-col items-center">
        <div className="bg-black w-16 h-16 rounded-3xl flex items-center justify-center mb-8 shadow-2xl shadow-black/20">
          <span className="text-white text-3xl font-black">G</span>
        </div>
        
        <h2 className="text-3xl font-black text-black mb-2 tracking-tighter">
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </h2>
        <p className="text-slate-400 font-bold mb-10 text-center">
          {isLogin ? '서비스 이용을 위해 로그인해주세요.' : '새로운 계정을 생성하세요.'}
        </p>

        <form onSubmit={handleAuth} className="w-full space-y-6">
          {!isLogin && (
            <div>
              <label className="block text-[11px] font-black text-black mb-2 uppercase tracking-widest">Full Name</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold text-black outline-none focus:border-black transition-all"
                placeholder="이름"
              />
            </div>
          )}
          <div>
            <label className="block text-[11px] font-black text-black mb-2 uppercase tracking-widest">User ID</label>
            <input 
              type="text" 
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full bg-white border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold text-black outline-none focus:border-black transition-all"
              placeholder="아이디"
            />
          </div>
          <div>
            <label className="block text-[11px] font-black text-black mb-2 uppercase tracking-widest">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold text-black outline-none focus:border-black transition-all"
              placeholder="비밀번호"
            />
          </div>

          {isLogin && (
            <div className="flex items-center gap-2 mt-2">
              <input 
                type="checkbox" 
                id="autoLogin" 
                checked={autoLogin}
                onChange={(e) => setAutoLogin(e.target.checked)}
                className="w-5 h-5 rounded-lg border-2 border-slate-200 accent-black cursor-pointer"
              />
              <label htmlFor="autoLogin" className="text-sm font-bold text-slate-500 cursor-pointer">자동 로그인</label>
            </div>
          )}

          {error && <p className="text-center text-red-500 text-xs font-bold mt-2">{error}</p>}

          <button 
            type="submit"
            className="w-full bg-black text-white py-5 rounded-[1.5rem] text-base font-black mt-4 hover:bg-slate-800 transition-all shadow-2xl shadow-black/20 active:scale-95"
          >
            {isLogin ? 'SIGN IN' : 'CREATE ACCOUNT'}
          </button>
        </form>

        <div className="mt-8 pt-8 border-t border-slate-50 w-full text-center">
          <button 
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            className="text-[13px] font-black text-slate-400 hover:text-black transition-all"
          >
            {isLogin ? '아직 계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Card, Button, Input } from '../components/ui';
import { ShieldCheck, ArrowRight, AlertCircle, Eye, EyeOff } from 'lucide-react';

const isStrongPassword = (password) => {
  const value = String(password || '');
  return value.length >= 6 && /[A-Z]/.test(value) && value.includes('@');
};

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!isStrongPassword(password)) {
      setError('Password must be at least 6 characters, include one uppercase letter, and include @');
      return;
    }
    setLoading(true);
    
    const result = await login(email, password, role);
    
    if (result.success) {
      navigate(role === 'faculty' ? '/faculty' : '/');
    } else {
      setError(result.message);
    }
    setLoading(false);
  };

  return (
    <div className="relative h-screen w-full overflow-hidden bg-black">
      <div className="auth-grid-bg" />
      <div className="auth-grid-line-h" />
      <div className="auth-grid-line-v" />

      <div className="relative z-10 h-full flex items-center justify-center px-4 py-4">
      <Card className="w-full max-w-md p-6 md:p-8 border-zinc-800 shadow-2xl bg-black/95 backdrop-blur-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-4 bg-white rounded-2xl mb-6 shadow-[0_0_30px_rgba(255,255,255,0.1)]">
            <ShieldCheck className="h-8 w-8 text-black" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tighter uppercase leading-none">
            Sign <br/><span className="text-zinc-600">In</span>
          </h1>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl flex items-center text-[10px] font-black uppercase tracking-widest">
            <AlertCircle size={16} className="mr-3 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex p-1 bg-zinc-950 border border-zinc-900 rounded-xl">
            <button
              type="button"
              disabled={loading}
              onClick={() => setRole('student')}
              className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] rounded-lg transition-all duration-300 ${
                role === 'student' ? 'bg-zinc-800 text-white' : 'text-zinc-600 hover:text-zinc-400'
              }`}
            >
              Student
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => setRole('faculty')}
              className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] rounded-lg transition-all duration-300 ${
                role === 'faculty' ? 'bg-zinc-800 text-white' : 'text-zinc-600 hover:text-zinc-400'
              }`}
            >
              Faculty
            </button>
          </div>

          <div className="space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder={role === 'faculty' ? 'faculty@college.edu' : 'student@college.edu'}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              className="bg-black border-zinc-900"
            />

            <div className="space-y-1.5 w-full">
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 ml-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="w-full px-4 py-2.5 pr-11 bg-black/80 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-white focus:border-white transition-all duration-300"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 px-3 text-zinc-500 hover:text-white"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className="text-[10px] uppercase tracking-widest text-zinc-600 ml-1">Min 6 chars, one uppercase, must include @</p>
            </div>
          </div>

          <Button 
            type="submit" 
            disabled={loading}
            className="w-full h-14 text-xs font-black uppercase tracking-[0.2em] flex items-center justify-center group"
          >
            {loading ? 'Signing in...' : 'Sign In'}
            {!loading && <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />}
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t border-zinc-900 text-center">
          <p className="text-xs font-bold text-zinc-600 uppercase tracking-widest">
            New here?{' '}
            <Link to="/register" className="text-white hover:text-zinc-300 transition-colors">
              Create an account
            </Link>
          </p>
        </div>
      </Card>
      </div>
    </div>
  );
};

export default Login;

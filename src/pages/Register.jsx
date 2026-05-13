import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Card, Button, Input } from '../components/ui';
import { UserPlus, AlertCircle, ArrowRight } from 'lucide-react';

const Register = () => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (role === 'faculty' && !email.endsWith('@college.edu')) {
      setError('Faculty registration requires an institutional email (@college.edu)');
      setLoading(false);
      return;
    }

    const result = await register({ name, email, password, role });
    
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
            <UserPlus className="h-8 w-8 text-black" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tighter uppercase leading-none">
            Create <br/><span className="text-zinc-600">Profile</span>
          </h1>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl flex items-center text-[10px] font-black uppercase tracking-widest">
            <AlertCircle size={16} className="mr-3 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
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

          <div className="space-y-3.5">
            <Input
              label="Full Name"
              placeholder="e.g. John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={loading}
              className="bg-black border-zinc-900"
            />

            <Input
              label="Identifier"
              type="email"
              placeholder={role === 'faculty' ? 'faculty@college.edu' : 'student@college.edu'}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              className="bg-black border-zinc-900"
            />

            <Input
              label="Secret"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              className="bg-black border-zinc-900"
            />
          </div>

          <Button 
            type="submit" 
            disabled={loading}
            className="w-full h-14 text-xs font-black uppercase tracking-[0.2em] flex items-center justify-center group"
          >
            {loading ? 'Establishing...' : 'Establish Account'}
            {!loading && <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />}
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t border-zinc-900 text-center">
          <p className="text-xs font-bold text-zinc-600 uppercase tracking-widest">
            Already registered?{' '}
            <Link to="/login" className="text-white hover:text-zinc-300 transition-colors">
              Authorize Now
            </Link>
          </p>
        </div>
      </Card>
      </div>
    </div>
  );
};

export default Register;

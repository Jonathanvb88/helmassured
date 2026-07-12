'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError('Invalid email or password.');
    } else {
      router.push('/');
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen bg-panel flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5 justify-center mb-8">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-2 to-accent-1 shrink-0" />
          <span className="font-display font-semibold text-xl text-slate-900 tracking-tight">HelmAssured</span>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-line rounded-xl p-6">
          <h1 className="font-display text-lg font-semibold text-slate-900 mb-1">Sign in</h1>
          <p className="text-sm text-muted mb-5">Real authentication — every action is tied to your account.</p>

          <label className="block text-xs font-semibold text-muted mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full border border-line rounded-lg px-3 py-2 text-sm mb-3"
          />

          <label className="block text-xs font-semibold text-muted mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full border border-line rounded-lg px-3 py-2 text-sm mb-4"
          />

          {error && <p className="text-xs text-danger mb-3">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent-1 text-white text-sm font-medium py-2 rounded-lg"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}

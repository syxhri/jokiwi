// app/login/page.js

"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

/**
 * Login page provides a simple form for users to authenticate. It captures
 * a username and password and submits them to the `/api/auth/login`
 * endpoint. On successful authentication the user is redirected to
 * the home page. Any error response from the server is surfaced to
 * the user. A link to the registration page is also provided.
 */
export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        router.push('/');
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data?.error || 'Login gagal');
      }
    } catch (err) {
      setError('Login gagal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-sm mx-auto py-8">
      <h1 className="text-3xl font-bold mb-4">Login</h1>
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-4">
        {error && (
          <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}
        <div>
          <label className="label">Username</label>
          <input
            type="text"
            name="username"
            value={form.username}
            onChange={handleChange}
            className="input"
            required
          />
        </div>
        <div>
          <label className="label">Password</label>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            className="input"
            required
          />
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Logging in…' : 'Login'}
          </button>
        </div>
      </form>
      <p className="mt-4 text-sm text-center">
        Belum punya akun?{' '}
        <Link href="/register" className="text-primary-600 hover:text-primary-800">
          Register
        </Link>
      </p>
    </div>
  );
}

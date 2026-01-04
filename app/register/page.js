// app/register/page.js

"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

/**
 * Registration page allows new users to create an account. It sends the
 * chosen username, password and optional name to `/api/auth/register`.
 * On success the user is logged in automatically and redirected to
 * the home page. Any server error is displayed above the form. A
 * link back to login is provided for users who already have an account.
 */
export const metadata = {
  title: 'Jokiwi - Register',
  description: 'Buat akun Jokiwi mu',
};

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ username: '', password: '', name: '' });
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
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        router.push('/');
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data?.error || 'Registrasi gagal');
      }
    } catch (err) {
      setError('Registrasi gagal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-sm mx-auto py-8">
      <h1 className="text-3xl font-bold mb-4">Register</h1>
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
        <div>
          <label className="label">Nama</label>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            className="input"
            placeholder="Opsional"
          />
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Mendaftar…' : 'Register'}
          </button>
        </div>
      </form>
      <p className="mt-4 text-sm text-center">
        Sudah punya akun?{' '}
        <Link href="/login" className="text-primary-600 hover:text-primary-800">
          Login
        </Link>
      </p>
    </div>
  );
}

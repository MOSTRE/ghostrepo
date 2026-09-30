'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function SearchBox() {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = value
      .trim()
      .replace(/^https?:\/\/(www\.)?github\.com\//i, '')
      .replace(/\/+$/, '')
      .replace(/\.git$/, '');
    if (!/^[^/\s]+\/[^/\s]+$/.test(cleaned)) {
      setError('Enter a repository like owner/name.');
      return;
    }
    setError('');
    router.push(`/repo/${cleaned}`);
  }

  return (
    <form onSubmit={submit} className="mx-auto mt-8 max-w-2xl">
      <label htmlFor="repo" className="sr-only">
        GitHub repository
      </label>
      <input
        id="repo"
        value={value}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValue(e.currentTarget.value)}
        placeholder="owner/repository"
        spellCheck={false}
        className="w-full rounded-lg border border-edge bg-panel px-5 py-4 font-mono text-lg outline-none placeholder:text-slate-600 focus:border-ghost"
      />
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      <button
        type="submit"
        className="mt-4 w-full rounded-lg bg-ghost px-5 py-3 font-semibold text-ink hover:brightness-110 sm:w-auto"
      >
        Analyze
      </button>
    </form>
  );
}

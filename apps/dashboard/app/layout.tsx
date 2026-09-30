import type { Metadata } from 'next';
import './globals.css';
import ThemeToggle from '../components/ThemeToggle';

export const metadata: Metadata = {
  title: 'GhostRepo — Bring abandoned GitHub projects back to life',
  description: 'Scan a GitHub repository, understand its health, and get a practical revival plan.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-ink text-slate-200 antialiased dark:bg-ink dark:text-slate-200">
        <header className="border-b border-edge">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
            <a href="/" className="flex items-center gap-2 font-mono text-lg font-bold">
              <span aria-hidden="true">👻</span> GhostRepo
            </a>
            <nav className="flex items-center gap-4 text-sm text-slate-400">
              <a className="hover:text-slate-100" href="https://github.com">
                GitHub
              </a>
              <ThemeToggle />
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
        <footer className="mx-auto max-w-5xl px-6 pb-10 text-xs text-slate-500">
          Classifications are heuristic and evidence-backed — never absolute. See the scoring docs.
        </footer>
      </body>
    </html>
  );
}

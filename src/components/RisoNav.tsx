'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function RisoNav() {
  const pathname = usePathname();
  const isHome = pathname === '/';

  return (
    <nav className="flex items-center justify-between px-6 py-4 sm:px-10 border-b border-[var(--rule)]">
      <div className="flex items-center gap-3">
        {/* Riso overprint logo mark */}
        <div className="relative w-7 h-7 flex-shrink-0">
          <div
            className="absolute inset-0 rounded-sm"
            style={{ background: 'var(--riso-blue)', transform: 'translate(-1px, -1px)' }}
          />
          <div
            className="absolute inset-0 rounded-sm"
            style={{ background: 'var(--riso-orange)', transform: 'translate(1px, 1px)', mixBlendMode: 'multiply', opacity: 0.8 }}
          />
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ fontFamily: 'var(--font-display)', fontSize: '0.6rem', fontWeight: 900, color: 'var(--paper)', zIndex: 2 }}
          >
            RA
          </div>
        </div>
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '0.75rem',
            fontWeight: 700,
            letterSpacing: '0.05em',
            color: 'var(--paper)',
          }}
        >
          Review Analytics
        </span>
      </div>

      <div className="flex items-center gap-6">
        <span className="eyebrow hidden sm:block" style={{ color: 'var(--paper-muted)' }}>
          Portfolio Project #9
        </span>
        {isHome ? (
          <Link
            href="/how-it-works"
            className="eyebrow hover:text-[var(--paper)] transition-colors"
            style={{ color: 'var(--paper-dim)' }}
          >
            How it works →
          </Link>
        ) : (
          <Link
            href="/"
            className="eyebrow hover:text-[var(--paper)] transition-colors"
            style={{ color: 'var(--paper-dim)' }}
          >
            ← Demo
          </Link>
        )}
      </div>
    </nav>
  );
}

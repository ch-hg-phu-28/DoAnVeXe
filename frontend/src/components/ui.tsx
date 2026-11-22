function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts.length > 1 ? parts[0][0] : '';
  return (first + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({ name, size }: { name: string; size?: 'sm' | 'lg' }) {
  const cls = size ? `avatar avatar-${size}` : 'avatar';
  return (
    <span className={cls} aria-hidden="true">
      {initials(name)}
    </span>
  );
}

export function LogoMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="3" width="16" height="15" rx="3" />
        <path d="M4 11h16" />
        <circle cx="8.5" cy="15" r=".6" fill="currentColor" />
        <circle cx="15.5" cy="15" r=".6" fill="currentColor" />
        <path d="M6 18v2M18 18v2" />
      </svg>
    </span>
  );
}

export function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export function EyeIcon({ off }: { off?: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
      {off && <path d="m4 4 16 16" />}
    </svg>
  );
}

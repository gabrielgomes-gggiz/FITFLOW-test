/** Marca do FitFlow: uma onda contínua — o fluxo do dia. */
export function LogoMark({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className={className}>
      <rect width="32" height="32" rx="9" fill="#12303a" />
      <path d="M6.5 18.5c2.6 0 2.9-6 5.7-6s3 7 5.8 7 3-6 5.6-6" fill="none" stroke="#c8f169" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return <span className={`text-xl font-extrabold tracking-[-0.02em] text-ink ${className}`}>FitFlow</span>;
}

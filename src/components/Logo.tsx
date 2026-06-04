export default function Logo() {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-28 h-28">
        {/* Shield shape */}
        <svg viewBox="0 0 120 130" className="w-full h-full drop-shadow-lg">
          <defs>
            <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e3a5f" />
              <stop offset="100%" stopColor="#0f1e30" />
            </linearGradient>
          </defs>
          {/* Shield outline */}
          <path
            d="M60 5 L108 25 L108 75 Q108 110 60 125 Q12 110 12 75 L12 25 Z"
            fill="url(#shieldGrad)"
            stroke="#4a9eff"
            strokeWidth="2"
          />
          {/* Hockey puck */}
          <ellipse cx="60" cy="52" rx="28" ry="9" fill="#111" stroke="#4a9eff" strokeWidth="1.5" />
          <ellipse cx="60" cy="48" rx="28" ry="9" fill="#222" stroke="#4a9eff" strokeWidth="1.5" />
          {/* Banner */}
          <rect x="22" y="78" width="76" height="22" rx="3" fill="#c8102e" />
          <text x="60" y="93" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold" fontFamily="sans-serif">
            EST. 2025
          </text>
        </svg>
        {/* 82-0 text overlay */}
        <div className="absolute inset-0 flex items-center justify-center pb-6">
          <span className="text-white font-black text-2xl tracking-tight drop-shadow-md">82-0</span>
        </div>
      </div>
    </div>
  );
}

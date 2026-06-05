export default function Logo() {
  return (
    <div className="flex flex-col items-center gap-3">
      {/* Hockey puck */}
      <div
        className="relative w-32 h-32 rounded-full flex items-center justify-center select-none"
        style={{
          background: 'radial-gradient(circle at 38% 32%, #1e3550, #0c1826)',
          border: '3px solid rgba(100,160,255,0.35)',
          boxShadow: '0 0 40px rgba(59,130,246,0.25), 0 8px 32px rgba(0,0,0,0.5)',
        }}
      >
        {/* Puck edge lines */}
        <div className="absolute inset-x-6 top-[26%] h-px" style={{ background: 'rgba(150,200,255,0.15)' }} />
        <div className="absolute inset-x-6 bottom-[26%] h-px" style={{ background: 'rgba(150,200,255,0.15)' }} />

        <div className="flex flex-col items-center gap-1">
          <span className="text-[2rem] font-black text-white tracking-tighter leading-none">82-0</span>
          <div className="h-px w-10 rounded-full" style={{ background: 'rgba(100,160,255,0.4)' }} />
          <span className="text-[9px] font-semibold tracking-[0.22em] uppercase" style={{ color: 'rgba(140,190,255,0.6)' }}>
            EST. 2025
          </span>
        </div>
      </div>
    </div>
  );
}

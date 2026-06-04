import Logo from '@/components/Logo';
import DraftGame from '@/components/DraftGame';

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0d1117] text-white">
      <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col items-center gap-6">
        <Logo />
        <h1 className="text-2xl font-black tracking-tight">Can you go 82-0?</h1>
        <DraftGame />
      </div>
    </main>
  );
}

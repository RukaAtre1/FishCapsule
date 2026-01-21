import StarField from "@/components/StarField";

export default function Home() {
  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      {/* Background StarField */}
      <StarField />

      {/* Hero Content */}
      <div className="relative z-10 text-center p-8 rounded-2xl backdrop-blur-md bg-white/5 border border-white/10 shadow-2xl animate-fade-in fade-in-0 duration-1000">
        <h1 className="text-6xl md:text-8xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-200 via-purple-200 to-pink-200 mb-4 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
          FishCapsule
        </h1>
        <p className="text-lg md:text-xl text-blue-100/80 font-light tracking-widest uppercase">
          Explore the Digital Deep
        </p>

        {/* Optional Call to Action Button for future phases */}
        <div className="mt-8 relative z-20 flex items-center justify-center gap-4">
          <a
            href="/ingest"
            className="px-8 py-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-all duration-300 backdrop-blur-sm shadow-[0_0_20px_rgba(0,0,0,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.4)] cursor-pointer inline-block"
          >
            Launch
          </a>
          <a
            href="/notebooks"
            className="px-8 py-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all duration-300 backdrop-blur-sm hover:border-cyan-500/30 inline-block"
          >
            My Notebooks
          </a>
        </div>
      </div>

      {/* Footer / Copyright */}
      <div className="absolute bottom-8 text-white/30 text-xs tracking-widest z-10">
        © 2026 HARLEY STUDIO
      </div>
    </main>
  );
}

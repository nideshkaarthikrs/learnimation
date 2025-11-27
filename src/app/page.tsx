'use client';
import { useState, useEffect, type ChangeEvent } from 'react';

type Particle = {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
};

export default function Home() {
  const MAX_CHARS = 500;
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [charCount, setCharCount] = useState(0);

  useEffect(() => {
    const newParticles: Particle[] = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 12 + 4,
      duration: Math.random() * 20 + 10,
      delay: Math.random() * 5,
    }));
    setParticles(newParticles);
  }, []);

  const handleTextChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    setInputText(v);
    setCharCount(v.length);
  };

const handleGenerateVideo = async () => {
  if (!inputText.trim()) return;
  setIsLoading(true);
  try {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: inputText }),
    });
    const json = await res.json();
    if (!res.ok) {
      console.error("Generation failed:", json);
      alert("Generation failed: " + (json?.error ?? "unknown"));
      return;
    }
    if (json?.dsl) {
      console.log("DSL:", json.dsl);
      // TODO: send this DSL to your Manim-generation backend or save it
      // For now, show a quick preview to user (or open a modal with JSON)
      alert("DSL generated! Check console for details.");
    } else {
      console.error("Unexpected response:", json);
      alert("Unexpected response from server");
    }
  } catch (err) {
    console.error("Error:", err);
    alert("Network or server error");
  } finally {
    setIsLoading(false);
  }
};


  return (
    <div className="min-h-screen relative overflow-hidden bg-black text-slate-100">
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          50% { transform: translateY(-18px) translateX(8px); }
        }
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.95); opacity: 0.35; }
          50% { transform: scale(1.08); opacity: 0.7; }
          100% { transform: scale(0.95); opacity: 0.35; }
        }
        @keyframes shimmer {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }
        @keyframes bounce-in {
          0% { transform: scale(0.92); opacity: 0; }
          50% { transform: scale(1.04); }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-gradient {
          background-size: 400% 400%;
          animation: gradient 18s ease infinite;
        }
        .animate-float {
          animation: float 8s ease-in-out infinite;
        }
        .animate-pulse-ring {
          animation: pulse-ring 3.2s ease-in-out infinite;
        }
        .animate-shimmer {
          background: linear-gradient(90deg, rgba(255,255,255,0.02), rgba(255,255,255,0.06), rgba(255,255,255,0.02));
          background-size: 1000px 100%;
          animation: shimmer 2s infinite;
        }
        .animate-bounce-in {
          animation: bounce-in 0.6s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .glow-effect {
          box-shadow: 0 6px 30px rgba(5, 10, 25, 0.6), 0 2px 10px rgba(6, 12, 34, 0.5);
        }
        .text-glow {
          text-shadow: 0 2px 18px rgba(10, 60, 120, 0.45);
        }
        .particle {
          pointer-events: none;
        }
        .hover-lift {
          transition: transform 0.28s ease, box-shadow 0.28s ease;
        }
        .hover-lift:hover {
          transform: translateY(-6px) scale(1.02);
        }
      `}</style>

      {/* Dark animated gradient background */}
      <div className="absolute inset-0 animate-gradient bg-gradient-to-br from-sky-900 via-indigo-900 to-black opacity-95"></div>

      {/* Subtle overlay pattern */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.02) 1px, transparent 0)',
          backgroundSize: '48px 48px',
        }}
      ></div>

      {/* Floating particles (cool cyan/blue) */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="particle absolute rounded-full bg-sky-400/20 blur-sm animate-float"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            boxShadow: '0 0 24px rgba(56,189,248,0.06)',
          }}
        />
      ))}

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-2xl p-8 rounded-3xl bg-slate-900/80 backdrop-blur-md border border-slate-800/60 shadow-xl hover-lift animate-bounce-in">
          {/* Decorative corner rings */}
          <div className="absolute top-6 right-6 w-20 h-20 rounded-full opacity-20 blur-xl bg-gradient-to-br from-sky-700 to-indigo-700 animate-pulse-ring"></div>
          <div className="absolute bottom-6 left-6 w-16 h-16 rounded-full opacity-18 blur-xl bg-gradient-to-br from-indigo-700 to-black animate-pulse-ring" style={{ animationDelay: '1s' }}></div>

          <div className="text-center mb-8 relative">
            <div className="inline-block relative">
              <h1 className="text-5xl font-extrabold bg-gradient-to-r from-cyan-300 via-sky-300 to-indigo-200 bg-clip-text text-transparent mb-2 text-glow">
                ✨ Learnimation
              </h1>
              <div className="absolute -top-2 -right-2 w-3 h-3 bg-amber-400 rounded-full animate-ping opacity-80"></div>
            </div>
            <p className="text-slate-300 text-lg font-medium">
              Transform your text into cinematic educational videos — fast.
            </p>
          </div>

          <div className="space-y-5">
            <div className="relative">
              <label htmlFor="textInput" className="block text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <span className="inline-block w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></span>
                Enter your content
                <span className="ml-auto text-xs font-normal text-slate-400">
                  {charCount} characters
                </span>
              </label>

              <div className="relative group">
                <textarea
                  id="textInput"
                  value={inputText}
                  onChange={handleTextChange}
                  placeholder="✍️ Paste or type your educational content here..."
                  className="w-full h-48 p-4 border border-slate-800 bg-slate-900/60 rounded-xl focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 focus:outline-none resize-none transition-all duration-200 text-slate-100 placeholder-slate-500"
                  maxLength={MAX_CHARS}
                />
                <div className="absolute bottom-0 left-0 right-0 h-1 rounded-b-xl overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-400 transition-all duration-300"
                    style={{ width: `${Math.min((charCount / MAX_CHARS) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleGenerateVideo}
              disabled={isLoading || !inputText.trim()}
              className="relative w-full text-white font-semibold py-4 px-6 rounded-xl transition-transform duration-200 transform group shadow-lg disabled:opacity-60 disabled:cursor-not-allowed overflow-hidden"
              style={{
                background: 'linear-gradient(90deg,#06b6d4,#3b82f6,#6366f1)',
              }}
            >
              {!isLoading && inputText.trim() && <div className="absolute inset-0 animate-shimmer opacity-30"></div>}

              <span className="relative z-10 flex items-center justify-center gap-3">
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-lg">Rendering...</span>
                  </>
                ) : (
                  <>
                    <span className="text-2xl">🎬</span>
                    <span className="text-lg">Generate Video</span>
                    <span className="text-2xl">✨</span>
                  </>
                )}
              </span>
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-800/60">
            <div className="rounded-xl p-4 border border-slate-800/50 bg-slate-900/60">
              <div className="flex items-start gap-3">
                <span className="text-2xl">💡</span>
                <div>
                  <p className="font-semibold text-slate-200 mb-1">Pro Tips:</p>
                  <ul className="text-sm text-slate-300 space-y-1">
                    <li>• The more detailed your content, the better the video</li>
                    <li>• Include key concepts and examples for clarity</li>
                    <li>• Structure your text with clear sections</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2 justify-center">
            <span className="px-3 py-1 bg-slate-800 text-slate-200 rounded-full text-xs font-semibold">🚀 AI-Powered</span>
            <span className="px-3 py-1 bg-slate-800 text-slate-200 rounded-full text-xs font-semibold">⚡ Fast Generation</span>
            <span className="px-3 py-1 bg-slate-800 text-slate-200 rounded-full text-xs font-semibold">🎨 Cinematic Output</span>
          </div>
        </div>
      </div>
    </div>
  );
}
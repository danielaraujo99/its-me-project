import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Play, Pause, Volume2, VolumeX, Maximize2, PlayCircle, CheckCircle2, Rocket } from "lucide-react";
import { SectionHeader } from "./SectionHeader";
const TUTORIAL_COVER = "/assets/tutorial-cover.webp";
const VIDEO_SRC = "/assets/tutorial.mp4";

function fmt(t: number) {
  if (!isFinite(t)) return "0:00";
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function VideoTutorial() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onFs = () => setIsFullscreen(document.fullscreenElement === wrapRef.current);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => {
      setCurrent(v.currentTime);
      setProgress(v.duration ? (v.currentTime / v.duration) * 100 : 0);
      if (v.buffered.length > 0 && v.duration) {
        setBuffered((v.buffered.end(v.buffered.length - 1) / v.duration) * 100);
      }
    };
    const onMeta = () => setDuration(v.duration);
    const onEnd = () => setPlaying(false);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("loadedmetadata", onMeta);
    v.addEventListener("progress", onTime);
    v.addEventListener("ended", onEnd);
    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("loadedmetadata", onMeta);
      v.removeEventListener("progress", onTime);
      v.removeEventListener("ended", onEnd);
    };
  }, []);

  // Auto-hide controls when playing
  useEffect(() => {
    if (!playing) {
      setShowControls(true);
      return;
    }
    let t: ReturnType<typeof setTimeout>;
    const hide = () => {
      clearTimeout(t);
      setShowControls(true);
      t = setTimeout(() => setShowControls(false), 2200);
    };
    hide();
    const el = wrapRef.current;
    el?.addEventListener("mousemove", hide);
    return () => {
      clearTimeout(t);
      el?.removeEventListener("mousemove", hide);
    };
  }, [playing]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    setStarted(true);
    if (v.paused) {
      v.muted = false;
      setMuted(false);
      v.volume = 1;
      const p = v.play();
      if (p && typeof p.catch === "function") {
        p.catch(() => {
          v.muted = true;
          setMuted(true);
          v.play().catch(() => {});
        });
      }
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    const r = e.currentTarget.getBoundingClientRect();
    const p = (e.clientX - r.left) / r.width;
    v.currentTime = p * v.duration;
  };

  const goFullscreen = () => {
    const el = wrapRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen?.();
  };

  return (
    <section id="tutorial" className="relative py-16 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-5xl px-5 lg:px-8">
        <SectionHeader
          eyebrow="Guia prático • Só 2 minutos"
          title={
            <>
              Aprenda a instalar e usar em<br />
              <span className="text-gradient">dois minutos</span>
            </>
          }
          description="Aperte o play e veja passo a passo como colocar a Extensão pra rodar no seu navegador, sem enrolação e sem depender de tutorial escrito."
        />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="relative mt-12"
        >
          {/* Ambient glow */}
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-8 rounded-[2.5rem] blur-3xl -z-10"
            style={{
              background:
                "radial-gradient(50% 45% at 50% 55%, rgba(122,92,255,0.28), transparent 70%)",
            }}
          />

          <div
            ref={wrapRef}
            onContextMenu={(e) => e.preventDefault()}
            className="relative aspect-video rounded-3xl overflow-hidden glass-strong border border-white/10 shadow-[0_30px_80px_-30px_rgba(91,61,245,0.5)] select-none"
            style={{ WebkitUserSelect: "none", userSelect: "none" }}
          >
            <video
              ref={videoRef}
              src={VIDEO_SRC}
              poster={TUTORIAL_COVER}
              muted={muted}
              playsInline
              preload="metadata"
              disablePictureInPicture
              controlsList="nodownload noremoteplayback noplaybackrate"
              onContextMenu={(e) => e.preventDefault()}
              className={`absolute inset-0 h-full w-full bg-black cursor-pointer pointer-events-auto ${isFullscreen ? "object-contain" : "object-cover"}`}
              style={{ WebkitUserSelect: "none", userSelect: "none" }}
              onClick={togglePlay}
            />
            {/* Anti-capture transparent overlay (deters basic screen recorders on some platforms) */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{ mixBlendMode: "overlay", background: "transparent" }}
            />


            {/* Gradient overlay - only after playback starts, for controls legibility */}
            {started && (
              <>
                <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/50 to-transparent" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/70 to-transparent" />
              </>
            )}

            {/* Big play button (initial state) */}
            {!started && (
              <button
                onClick={togglePlay}
                aria-label="Reproduzir"
                className="absolute inset-0 grid place-items-center group"
              >
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-[#7A5CFF]/40 blur-2xl group-hover:bg-[#7A5CFF]/60 transition-colors" />
                  <div className="relative h-16 w-16 sm:h-20 sm:w-20 lg:h-24 lg:w-24 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 grid place-items-center group-hover:scale-105 transition-transform shadow-[0_20px_60px_-10px_rgba(91,61,245,0.9)]">
                    <Play className="h-6 w-6 sm:h-8 sm:w-8 lg:h-10 lg:w-10 text-white fill-white translate-x-0.5" />
                  </div>
                </div>
              </button>
            )}

            {/* Top-left label - only after playback starts, hidden on small screens */}
            {started && (
              <div className="hidden sm:inline-flex absolute top-4 left-4 items-center gap-2 rounded-full bg-black/50 backdrop-blur-md border border-white/10 px-3 py-1.5 text-[11px] font-bold text-white/90">
                <Rocket className="h-3.5 w-3.5 text-[#A78BFA]" />
                Extensão Love Hyro • Tutorial oficial
              </div>
            )}

            {/* Controls - only visible after playback starts */}
            {started && (
              <div
                className={`absolute inset-x-0 bottom-0 px-3 pb-3 sm:px-4 sm:pb-4 transition-opacity duration-300 ${
                  showControls || !playing ? "opacity-100" : "opacity-0"
                }`}
              >
                {/* Progress */}
                <div
                  onClick={seek}
                  className="group/track relative h-1.5 w-full rounded-full bg-white/15 cursor-pointer overflow-hidden"
                >
                  <div
                    className="absolute inset-y-0 left-0 bg-white/25"
                    style={{ width: `${buffered}%` }}
                  />
                  <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#7A5CFF] to-[#A78BFA] shadow-[0_0_12px_rgba(167,139,250,0.9)]"
                    style={{ width: `${progress}%` }}
                  />
                  <div
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-3 w-3 rounded-full bg-white opacity-0 group-hover/track:opacity-100 transition-opacity shadow-[0_0_10px_rgba(167,139,250,0.9)]"
                    style={{ left: `${progress}%` }}
                  />
                </div>

                <div className="mt-2.5 flex items-center gap-2 sm:gap-3">
                  <button
                    onClick={togglePlay}
                    aria-label={playing ? "Pausar" : "Reproduzir"}
                    className="h-8 w-8 sm:h-9 sm:w-9 rounded-full grid place-items-center bg-white/10 hover:bg-white/20 backdrop-blur border border-white/10 text-white transition-colors"
                  >
                    {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-white translate-x-[1px]" />}
                  </button>
                  <button
                    onClick={toggleMute}
                    aria-label={muted ? "Ativar som" : "Silenciar"}
                    className="h-8 w-8 sm:h-9 sm:w-9 rounded-full grid place-items-center bg-white/10 hover:bg-white/20 backdrop-blur border border-white/10 text-white transition-colors"
                  >
                    {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </button>
                  <div className="text-[11px] sm:text-[12px] font-mono text-white/80 tabular-nums">
                    {fmt(current)} <span className="text-white/40">/ {fmt(duration)}</span>
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/85">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#A78BFA] animate-pulse" />
                      HD
                    </span>
                    <button
                      onClick={goFullscreen}
                      aria-label="Tela cheia"
                      className="h-8 w-8 sm:h-9 sm:w-9 rounded-full grid place-items-center bg-white/10 hover:bg-white/20 backdrop-blur border border-white/10 text-white transition-colors"
                    >
                      <Maximize2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Feature pills below */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {[
              { icon: PlayCircle, label: "Instalação guiada" },
              { icon: CheckCircle2, label: "Sem erro de configuração" },
              { icon: Rocket, label: "Funciona em qualquer SO" },
            ].map((f) => (
              <div
                key={f.label}
                className="inline-flex items-center gap-2 rounded-full glass px-4 py-2 text-[13px] font-semibold text-white/85 border border-white/10"
              >
                <f.icon className="h-4 w-4 text-[#A78BFA]" />
                {f.label}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { haptic, playSfx } from "./audio";

export function Src({ k }: { k: "live" | "sim" | "native" }) {
  const map = { live: ["LIVE", "text-lime"], sim: ["SIM", "text-gold"], native: ["NATIVE", "text-crimson"] } as const;
  return <span className={cn("frontier-source-badge tnum rounded-[2px] border border-current/40 px-1 text-[8px] leading-[14px] tracking-widest", map[k][1])} title={k === "live" ? "Real device/browser data" : k === "sim" ? "Simulated: no web API exists" : "Requires FRONTIER Android native bridge"}>{map[k][0]}</span>;
}
export function Label({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return <div className="frontier-section-label mb-2 flex items-center gap-2"><span className="h-px w-3 bg-fx" /><span className="font-display text-[9px] uppercase tracking-[0.25em] text-muted-foreground">{children}</span><span className="h-px flex-1 bg-line" />{right}</div>;
}
export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button aria-label={label} aria-pressed={on} onClick={() => { playSfx(on ? "toggle-off" : "toggle-on"); haptic(); onChange(!on); }}
      className={cn("frontier-toggle relative h-5 w-10 shrink-0 chamfer-sm transition-colors", on ? "bg-fx/25" : "bg-foreground/10")}>
      <motion.span layout transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className={cn("absolute top-1 h-3 w-4 chamfer-sm", on ? "right-1 bg-fx shadow-[0_0_10px_var(--accent-fx)]" : "left-1 bg-muted-foreground")} />
    </button>
  );
}
export function Slider({ value, min, max, step = 1, onChange, label, unit = "" }: { value: number; min: number; max: number; step?: number; onChange: (v: number) => void; label: string; unit?: string }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <label className="frontier-slider block">
      <div className="mb-1 flex justify-between text-[11px] text-muted-foreground"><span>{label}</span><span className="tnum text-foreground">{value}{unit}</span></div>
      <div className="relative h-5">
        <div className="absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 bg-foreground/10" />
        <div className="absolute left-0 top-1/2 h-[2px] -translate-y-1/2 bg-fx shadow-[0_0_8px_var(--accent-fx)]" style={{ width: `${pct}%` }} />
        <div className="absolute top-1/2 h-3 w-2 -translate-y-1/2 bg-fx" style={{ left: `calc(${pct}% - 4px)` }} />
        <input type="range" aria-label={label} min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} className="absolute inset-0 w-full cursor-pointer opacity-0" />
      </div>
    </label>
  );
}
export function Seg<T extends string | number>({ options, value, onChange, label }: { options: { v: T; l: string }[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-1">
      {options.map((o) => (
        <button key={String(o.v)} role="radio" aria-checked={value === o.v} onClick={() => { playSfx("navigation"); haptic(5); onChange(o.v); }}
          className={cn("tnum flex-1 chamfer-sm py-1.5 text-[11px] transition-colors", value === o.v ? "bg-fx text-obsidian font-bold" : "bg-foreground/5 text-muted-foreground hover:text-foreground")}>{o.l}</button>
      ))}
    </div>
  );
}
export function Ring({ value, label, color, size = 64, unit = "%", max = 100, src }: { value: number; label: string; color: string; size?: number; unit?: string; max?: number; src: "live" | "sim" }) {
  const r = size / 2 - 5, c = 2 * Math.PI * r, arc = 0.75;
  const pct = Math.min(1, value / max);
  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="rotate-[135deg]">
          <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--line)" strokeWidth="3" fill="none" strokeDasharray={`${c * arc} ${c}`} />
          <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth="3" fill="none" strokeLinecap="butt"
            strokeDasharray={`${c * arc * pct} ${c}`} style={{ transition: "stroke-dasharray .4s ease", filter: `drop-shadow(0 0 3px ${color})` }} />
          {Array.from({ length: 10 }).map((_, i) => { const a = (i / 9) * arc * 2 * Math.PI; return <line key={i} x1={size / 2 + Math.cos(a) * (r - 6)} y1={size / 2 + Math.sin(a) * (r - 6)} x2={size / 2 + Math.cos(a) * (r - 8)} y2={size / 2 + Math.sin(a) * (r - 8)} stroke="var(--line)" />; })}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center"><span className="tnum text-[15px] font-bold">{value}<span className="text-[9px] text-muted-foreground">{unit}</span></span></div>
      </div>
      <div className="mt-[-6px] flex items-center gap-1"><span className="font-display text-[8px] tracking-widest text-muted-foreground">{label}</span><Src k={src} /></div>
    </div>
  );
}

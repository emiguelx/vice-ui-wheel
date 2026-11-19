import * as React from 'react';
import './game-wheel.css';

/** One slot on the wheel. `icon` is any image URL (or pass `render` for your own node). */
export type WheelItem = { id: string; label: string; icon?: string; render?: React.ReactNode; meta?: React.ReactNode; disabled?: boolean };

export type GameWheelProps = {
  items: WheelItem[];
  /** Controlled selection (item id). Omit to let the wheel manage it. */
  value?: string;
  defaultValue?: string;
  onChange?: (id: string) => void;
  /** Fires while aiming (hover / arrows), before a selection is confirmed. */
  onAim?: (id: string) => void;
  /** Diameter in px (the wheel never exceeds its container). */
  size?: number;
  /** Accessible name for the listbox. */
  label?: string;
  /** Visual theme tokens; see README. */
  theme?: Partial<Record<'bg' | 'slot' | 'slotAim' | 'slotActive' | 'stroke' | 'glow' | 'text' | 'muted', string>>;
  className?: string;
};

const polar = (r: number, deg: number) => [r * Math.cos((deg * Math.PI) / 180), r * Math.sin((deg * Math.PI) / 180)];
function sector(a0: number, a1: number, r1: number, r2: number) {
  const [x0, y0] = polar(r2, a0), [x1, y1] = polar(r2, a1), [x2, y2] = polar(r1, a1), [x3, y3] = polar(r1, a0);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M${x0} ${y0}A${r2} ${r2} 0 ${large} 1 ${x1} ${y1}L${x2} ${y2}A${r1} ${r1} 0 ${large} 0 ${x3} ${y3}Z`;
}

/**
 * A game-style radial selection wheel. Aim with the pointer (angle from the centre), arrow keys or a stick-like drag;
 * click / Enter confirms. Fully keyboard accessible (listbox + aria-activedescendant).
 */
export function GameWheel({ items, value, defaultValue, onChange, onAim, size = 440, label = 'Select an item', theme, className }: GameWheelProps) {
  const [inner, setInner] = React.useState(defaultValue ?? items[0]?.id);
  const selected = value ?? inner;
  const [aim, setAim] = React.useState(Math.max(0, items.findIndex((i) => i.id === selected)));
  const [pulse, setPulse] = React.useState(0);
  const id = React.useId(), ref = React.useRef<HTMLDivElement>(null);
  const n = items.length, span = 360 / n, gap = n > 1 ? 1.6 : 0;

  const aimAt = (i: number) => { if (i === aim || items[i]?.disabled) return; setAim(i); onAim?.(items[i].id); };
  const choose = (i: number) => {
    const it = items[i]; if (!it || it.disabled) return;
    setInner(it.id); onChange?.(it.id); setPulse((p) => p + 1);
  };
  const indexAt = (x: number, y: number) => {
    const r = ref.current!.getBoundingClientRect();
    const dx = x - (r.left + r.width / 2), dy = y - (r.top + r.height / 2);
    if (Math.hypot(dx, dy) < r.width * 0.2) return -1;                        // dead zone in the centre, like a stick
    const a = (Math.atan2(dy, dx) * 180) / Math.PI + 90 + span / 2;
    return Math.floor((((a % 360) + 360) % 360) / span);
  };
  const onKey = (e: React.KeyboardEvent) => {
    const next = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (next) aimAt((aim + next + n) % n);
    else if (e.key === 'Home') aimAt(0);
    else if (e.key === 'End') aimAt(n - 1);
    else if (e.key === 'Enter' || e.key === ' ') choose(aim);
    else return;
    e.preventDefault();
  };
  const t = theme || {};
  const vars = { '--gw-size': `${size}px`, ...(t.bg && { '--gw-bg': t.bg }), ...(t.slot && { '--gw-slot': t.slot }), ...(t.slotAim && { '--gw-slot-aim': t.slotAim }),
    ...(t.slotActive && { '--gw-slot-active': t.slotActive }), ...(t.stroke && { '--gw-stroke': t.stroke }), ...(t.glow && { '--gw-glow': t.glow }),
    ...(t.text && { '--gw-text': t.text }), ...(t.muted && { '--gw-muted': t.muted }) } as React.CSSProperties;
  const focus = items[aim];

  return (
    <div ref={ref} className={['gw', className].filter(Boolean).join(' ')} style={vars}
      onPointerMove={(e) => { const i = indexAt(e.clientX, e.clientY); if (i >= 0) aimAt(i); }}
      onClick={(e) => { const i = indexAt(e.clientX, e.clientY); if (i >= 0) choose(i); }}>
      <svg className="gw__ring" viewBox="-100 -100 200 200" aria-hidden="true">
        {items.map((it, i) => {
          const a = -90 + i * span - span / 2;
          return <path key={it.id} className="gw__slot" style={{ ['--i' as string]: i }} d={sector(a + gap / 2, a + span - gap / 2, 46, 98)}
            data-aim={i === aim || undefined} data-active={it.id === selected || undefined} data-disabled={it.disabled || undefined} />;
        })}
      </svg>
      <ul className="gw__list" role="listbox" aria-label={label} tabIndex={0} onKeyDown={onKey} aria-activedescendant={`${id}-${aim}`}>
        {items.map((it, i) => {
          const [x, y] = polar(72, -90 + i * span);
          return (
            <li key={it.id} id={`${id}-${i}`} role="option" aria-selected={it.id === selected} aria-disabled={it.disabled || undefined}
              className="gw__item" data-aim={i === aim || undefined} style={{ left: `${50 + x / 2}%`, top: `${50 + y / 2}%`, ['--i' as string]: i }}>
              {it.render ?? (it.icon ? <img src={it.icon} alt="" draggable={false} /> : null)}
              <span className="gw__sr">{it.label}</span>
            </li>
          );
        })}
      </ul>
      <div className="gw__center" aria-hidden="true">
        <span className="gw__label" key={`${focus?.id}-${pulse}`}>{focus?.label}</span>
        {focus?.meta != null && <span className="gw__meta">{focus.meta}</span>}
      </div>
    </div>
  );
}

export default GameWheel;

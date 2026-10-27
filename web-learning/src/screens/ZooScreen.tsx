import { useEffect, useMemo, useRef, useState } from 'react';
import { getProfile, useZoo } from '../state/store';
import { CATALOG, CATEGORIES, type Category } from '../zoo/catalog';
import { ZooController, type Tool } from '../zoo/controller';
import { createZooGame } from '../zoo/game/createGame';
import { zooTextures } from '../zoo/textures';
import { THUMBS } from '../zoo/thumbs';
import { BackButton, Coin, Toasts, Wallet, useToasts } from '../ui/bits';
import type { Route } from '../App';

export function ZooScreen({ hostId, go }: { hostId: string; go: (r: Route) => void }) {
  const visitorId = useZoo(s => s.activeId)!;
  const host = useZoo(s => s.profiles.find(p => p.id === hostId));
  const visitor = useZoo(s => s.profiles.find(p => p.id === visitorId));
  const ctl = useMemo(() => new ZooController(hostId, visitorId), [hostId, visitorId]);
  const stage = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState(ctl.mode);
  const [tool, setTool] = useState<Tool>(ctl.tool);
  const [category, setCategory] = useState<Category>('zvirata');
  const toasts = useToasts(3000);
  const push = toasts.push;
  const avatar = visitor?.avatar;

  useEffect(() => ctl.on('change', () => { setMode(ctl.mode); setTool(ctl.tool); }), [ctl]);
  useEffect(() => ctl.on('toast', text => push(text)), [ctl, push]);

  useEffect(() => {
    if (!avatar || !stage.current) return;
    let game: { destroy(): void } | null = null;
    let cancelled = false;
    const el = stage.current;
    zooTextures(avatar).then(canvases => {
      if (cancelled) return;
      game = createZooGame(el, ctl, canvases);
      setLoading(false);
    });
    return () => {
      cancelled = true;
      game?.destroy();
    };
  }, [ctl, avatar]);

  useEffect(() => {
    const name = getProfile(hostId)?.name;
    if (ctl.visiting && name) push(`Návštěva v zoo: ${name}. Tady se můžeš dívat a procházet.`);
  }, [ctl, hostId, push]);

  if (!host || !visitor) return null;
  const items = CATALOG.filter(c => c.category === category);
  const selected = tool && tool !== 'remove' ? CATALOG.find(c => c.id === tool) : null;
  const hint = tool === 'remove'
    ? 'Klepni na to, co chceš odstranit. Vrátí se ti polovina bodíků.'
    : selected
      ? selected.species ? `${selected.hint} Klepni na výběh.` : `${selected.hint}${selected.id === 'path' ? '' : ' Klepni na místo v zoo.'}`
      : 'Vyber si, co chceš postavit.';

  return (
    <div className="zoo-screen">
      <div className="zoo-stage" ref={stage} />
      {loading && <div className="zoo-loading">Otevírám zoo…</div>}

      <div className="zoo-top">
        <BackButton onClick={() => go({ name: 'home' })} />
        <span className="zoo-name">{ctl.visiting ? `Návštěva: ${host.name}` : 'Moje zoo'}</span>
        {!ctl.visiting && (
          <div className="seg" role="radiogroup" aria-label="Režim">
            <button type="button" role="radio" aria-checked={mode === 'walk'} onClick={() => ctl.setMode('walk')}>Procházka</button>
            <button type="button" role="radio" aria-checked={mode === 'build'} onClick={() => ctl.setMode('build')}>Stavění</button>
          </div>
        )}
        <Wallet coins={visitor.coins} />
      </div>

      {mode === 'walk' && !loading && (
        <p className="zoo-help">
          {ctl.visiting
            ? 'Klepni kamkoli a postavička tam dojde. Mapu posuneš tažením.'
            : 'Klepni kamkoli a postavička tam dojde. Klepni na zvířátko a nakrmí ho, na záhonek a zalije ho. Mapu posuneš tažením.'}
        </p>
      )}

      {mode === 'build' && (
        <div className="shop">
          <div className="shop-head">
            <div className="shop-tabs" role="tablist">
              {CATEGORIES.map(c => (
                <button key={c.id} type="button" role="tab" aria-selected={category === c.id} onClick={() => setCategory(c.id)}>
                  {c.name}
                </button>
              ))}
            </div>
            <p className="shop-hint">{hint}</p>
          </div>
          <div className="shop-items">
            {items.map(it => {
              const afford = host.coins >= it.price;
              return (
                <button
                  key={it.id}
                  type="button"
                  className="shop-item"
                  aria-pressed={tool === it.id}
                  data-poor={!afford || undefined}
                  onClick={() => ctl.setTool(tool === it.id ? null : it.id)}
                >
                  <img src={THUMBS[it.id]} alt="" />
                  <span className="shop-name">{it.name}</span>
                  <span className="shop-price">
                    <Coin size={18} /> {it.price}
                  </span>
                </button>
              );
            })}
            <button type="button" className="shop-item remove" aria-pressed={tool === 'remove'} onClick={() => ctl.setTool(tool === 'remove' ? null : 'remove')}>
              <svg viewBox="0 0 48 48" aria-hidden="true">
                <path d="M14 16h20l-2 24H16z" fill="#e5484d" opacity=".9" />
                <rect x="10" y="10" width="28" height="5" rx="2" fill="#c0392b" />
                <rect x="20" y="6" width="8" height="5" rx="2" fill="#c0392b" />
              </svg>
              <span className="shop-name">Odstranit</span>
              <span className="shop-price">vrací ½</span>
            </button>
          </div>
        </div>
      )}
      <Toasts items={toasts.items} />
    </div>
  );
}

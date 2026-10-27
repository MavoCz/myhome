import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Avatar } from '../state/types';
import { avatarRig } from '../zoo/art/avatar';
import { COIN_URL } from '../zoo/art/pictures';
import { dataUrl, rigPreview } from '../zoo/art/svg';

export function Coin({ size = 26 }: { size?: number }) {
  return <img className="coin" src={COIN_URL} width={size} height={size} alt="" />;
}

/** Coin balance that bumps when it changes. */
export function Wallet({ coins }: { coins: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const prev = useRef(coins);
  useEffect(() => {
    if (prev.current !== coins && ref.current) {
      ref.current.animate([{ transform: 'scale(1.3)' }, { transform: 'none' }], { duration: 350, easing: 'cubic-bezier(.3,.7,.2,1)' });
    }
    prev.current = coins;
  }, [coins]);
  return (
    <div className="wallet" ref={ref} title="Bodíky">
      <Coin />
      <span>{coins}</span>
    </div>
  );
}

export function AvatarImage({ avatar, size = 96 }: { avatar: Avatar; size?: number }) {
  return <img className="avatar-img" src={dataUrl(rigPreview(avatarRig(avatar)))} width={size} height={(size * 170) / 120} alt="" />;
}

export interface ToastItem {
  id: number;
  text: string;
  coins?: number;
}

/** A short stack of messages that fade out on their own. */
export function useToasts(ms = 2600) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const next = useRef(1);
  const push = useCallback(
    (text: string, coins?: number) => {
      const id = next.current++;
      setItems(list => [...list.slice(-2), { id, text, coins }]);
      setTimeout(() => setItems(list => list.filter(t => t.id !== id)), ms);
    },
    [ms],
  );
  return useMemo(() => ({ items, push }), [items, push]);
}

export function Toasts({ items }: { items: ToastItem[] }) {
  return (
    <div className="toasts" aria-live="polite">
      {items.map(t => (
        <div key={t.id} className="toast">
          {t.coins ? (
            <span className="toast-coins">
              +{t.coins} <Coin size={22} />
            </span>
          ) : null}
          <span>{t.text}</span>
        </div>
      ))}
    </div>
  );
}

export function BackButton({ onClick, label = 'Domů' }: { onClick: () => void; label?: string }) {
  return (
    <button type="button" className="back" onClick={onClick}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M15 6l-6 6 6 6" />
      </svg>
      {label}
    </button>
  );
}

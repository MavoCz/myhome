import { useEffect, useRef } from 'react';
import { useZoo } from '../state/store';
import { coinsWord, rewardFor } from '../state/economy';
import { EXERCISES, parseExerciseMessage, type ExerciseId } from '../exercises';
import { BackButton, Toasts, Wallet, useToasts } from '../ui/bits';
import type { Route } from '../App';

/** Runs an exercise page in a frame and pays out the coins it reports. */
export function ExerciseScreen({ id, go }: { id: ExerciseId; go: (r: Route) => void }) {
  const ex = EXERCISES.find(e => e.id === id)!;
  const activeId = useZoo(s => s.activeId);
  const coins = useZoo(s => s.profiles.find(p => p.id === s.activeId)?.coins ?? 0);
  const frame = useRef<HTMLIFrameElement>(null);
  const toasts = useToasts();
  const push = toasts.push;

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (!activeId || e.source !== frame.current?.contentWindow) return;
      const event = parseExerciseMessage(e.data);
      if (!event || event.exercise !== id) return;
      const r = rewardFor(event);
      const bonus = useZoo.getState().reward(activeId, r.coins, event);
      push(r.label, r.coins);
      if (bonus) push(`Denní bonus za první cvičení: ${bonus} ${coinsWord(bonus)}`, bonus);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [activeId, id, push]);

  return (
    <div className="exercise">
      <div className="bar">
        <BackButton onClick={() => go({ name: 'home' })} />
        <span className="bar-title">{ex.title}</span>
        <Wallet coins={coins} />
      </div>
      <iframe ref={frame} className="exercise-frame" src={ex.src} title={ex.title} />
      <Toasts items={toasts.items} />
    </div>
  );
}

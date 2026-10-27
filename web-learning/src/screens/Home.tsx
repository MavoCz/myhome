import { useEffect } from 'react';
import { useZoo } from '../state/store';
import { DAILY_BONUS, today } from '../state/economy';
import { EXERCISES } from '../exercises';
import { AvatarImage, Toasts, Wallet, useToasts } from '../ui/bits';
import { THUMBS } from '../zoo/thumbs';
import type { Route } from '../App';

function ExerciseCover({ id }: { id: string }) {
  if (id === 'scitani') {
    return (
      <div className="cover math" aria-hidden="true">
        <div className="sum">
          <span /><span className="c">1</span><span />
          <span /><span className="a">4</span><span className="a hl">7</span>
          <span>+</span><span className="b">3</span><span className="b hl">8</span>
          <span className="r" /><span className="r">8</span><span className="r hl">5</span>
        </div>
      </div>
    );
  }
  return (
    <div className="cover lang" aria-hidden="true">
      <div>
        <div className="gapword">b<span className="g">ý</span>t</div>
        <div className="pair"><span className="i">i</span><span className="y">y</span></div>
      </div>
    </div>
  );
}

export function Home({ go }: { go: (r: Route) => void }) {
  const profiles = useZoo(s => s.profiles);
  const activeId = useZoo(s => s.activeId);
  const me = profiles.find(p => p.id === activeId);
  const toasts = useToasts(5000);
  const push = toasts.push;

  // bonus coins a parent sent, announced once
  useEffect(() => {
    for (const n of useZoo.getState().takeNotices()) push(n.text, n.coins);
  }, [push, me?.coins]);

  if (!me) return null;
  const others = profiles.filter(p => p.id !== me.id);
  const bonusWaiting = me.lastExerciseDay !== today();

  return (
    <div className="page">
      <header className="home-head">
        <button type="button" className="avatar-btn" data-testid="home-avatar-btn" aria-label="Jak vypadám" onClick={() => go({ name: 'avatar' })}>
          <AvatarImage avatar={me.avatar} size={56} />
        </button>
        <h1>Ahoj, {me.name}!</h1>
        <span data-testid="home-wallet"><Wallet coins={me.coins} /></span>
        <button type="button" className="btn small" data-testid="home-switch-btn" onClick={() => go({ name: 'profiles' })}>
          Přepnout
        </button>
      </header>

      <section>
        <div className="section-head">
          <h2>Cvičení</h2>
          <p>
            Za každý příklad a každé kolo slov dostaneš bodíky.
            {bonusWaiting && <strong> Dnešní první cvičení přidá bonus {DAILY_BONUS}.</strong>}
          </p>
        </div>
        <div className="books">
          {EXERCISES.map(ex => (
            <button key={ex.id} type="button" className="book" data-testid={`home-exercise-btn-${ex.id}`} onClick={() => go({ name: 'exercise', id: ex.id })}>
              <ExerciseCover id={ex.id} />
              <span className="info">
                <span className="book-title">{ex.title}</span>
                <span className="book-desc">
                  {ex.subject} · {ex.desc}
                </span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <div className="section-head">
          <h2>Zoo</h2>
          <p>Za bodíky si kupuj výběhy, zvířátka a ozdoby. Zvířátka krm a kytičky zalévej.</p>
        </div>
        <div className="zoo-row">
          <button type="button" className="zoo-card mine" data-testid="home-my-zoo-btn" onClick={() => go({ name: 'zoo', hostId: me.id })}>
            <span className="zoo-animals">
              {me.animals.slice(0, 5).map(a => (
                <img key={a.id} src={THUMBS[`animal-${a.species}`]} alt="" />
              ))}
              {!me.animals.length && <img src={THUMBS['pen-savana']} alt="" />}
            </span>
            <span className="zoo-title">Moje zoo</span>
            <span className="zoo-desc">{me.animals.length ? `Zvířat: ${me.animals.length}` : 'Zatím tu nikdo nebydlí'}</span>
          </button>
          {others.map(o => (
            <button key={o.id} type="button" className="zoo-card visit" data-testid={`home-visit-btn-${o.id}`} onClick={() => go({ name: 'zoo', hostId: o.id })}>
              <AvatarImage avatar={o.avatar} size={52} />
              <span className="zoo-title">Návštěva: {o.name}</span>
              <span className="zoo-desc">{o.animals.length ? `Zvířat: ${o.animals.length}` : 'Zoo se teprve staví'}</span>
            </button>
          ))}
        </div>
      </section>
      <Toasts items={toasts.items} />
    </div>
  );
}

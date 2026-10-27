import { refresh } from '../state/store';
import type { Route } from '../App';

const COPY = {
  closed: {
    title: 'Zoo má přestávku',
    text: 'Teď se necvičí. Zoo se zase otevře v čase, který nastavili rodiče. Nic se neztratí, zvířátka počkají.',
  },
  offline: {
    title: 'Nejde se připojit',
    text: 'Tablet se nemůže spojit se serverem. Zkontroluj Wi-Fi a zkus to znovu.',
  },
};

/** Friendly full-screen stop: outside the allowed time, or no connection and nothing saved on this tablet. */
export function StatusScreen({ kind, go }: { kind: keyof typeof COPY; go: (r: Route) => void }) {
  const copy = COPY[kind];
  return (
    <div className="page">
      <header className="page-head">
        <h1>{copy.title}</h1>
      </header>
      <section className="panel" data-testid={`learning-status-${kind}`}>
        <p>{copy.text}</p>
        <div className="row">
          <button type="button" className="btn primary" data-testid="learning-status-retry" onClick={() => void refresh()}>
            Zkusit znovu
          </button>
          <button type="button" className="btn" onClick={() => go({ name: 'profiles' })}>
            Přepnout
          </button>
        </div>
      </section>
    </div>
  );
}

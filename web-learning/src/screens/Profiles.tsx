import { useRef, useState } from 'react';
import { exportBackup, useZoo } from '../state/store';
import { coinsWord } from '../state/economy';
import { AvatarImage, Coin } from '../ui/bits';
import type { Route } from '../App';

export function Profiles({ go }: { go: (r: Route) => void }) {
  const profiles = useZoo(s => s.profiles);
  const setActive = useZoo(s => s.setActive);
  const importBackup = useZoo(s => s.importBackup);
  const fileRef = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState('');

  const download = () => {
    const blob = new Blob([exportBackup()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `skolni-zoo-zaloha-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    setNote('Záloha je stažená. Ulož si ji třeba do iCloudu.');
  };

  const restore = async (file: File | undefined) => {
    if (!file) return;
    try {
      const n = importBackup(await file.text());
      setNote(n === 1 ? 'Obnoven 1 profil.' : `Obnoveno profilů: ${n}.`);
    } catch (e) {
      setNote(`Zálohu se nepodařilo načíst. ${e instanceof Error ? e.message : ''}`);
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="page">
      <header className="page-head">
        <h1>Kdo jde cvičit?</h1>
      </header>
      <div className="profile-grid">
        {profiles.map(p => (
          <div key={p.id} className="profile-card">
            <button
              type="button"
              className="profile-pick"
              onClick={() => {
                setActive(p.id);
                go({ name: 'home' });
              }}
            >
              <AvatarImage avatar={p.avatar} size={104} />
              <span className="profile-name">{p.name}</span>
              <span className="profile-coins">
                <Coin size={20} /> {p.coins} {coinsWord(p.coins)}
              </span>
            </button>
            <button type="button" className="link" onClick={() => go({ name: 'edit', id: p.id })}>
              Upravit
            </button>
          </div>
        ))}
        <button type="button" className="profile-card add" onClick={() => go({ name: 'edit' })}>
          <span className="plus" aria-hidden="true">+</span>
          <span className="profile-name">Nový profil</span>
        </button>
      </div>

      <section className="backup">
        <h2>Záloha</h2>
        <p>Zoo se ukládá jen v tomto prohlížeči. Zálohu si stáhni, ať o nic nepřijdeš.</p>
        <div className="row">
          <button type="button" className="btn" onClick={download} disabled={!profiles.length}>
            Stáhnout zálohu
          </button>
          <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
            Obnovit ze zálohy
          </button>
          <input ref={fileRef} id="backup-file" type="file" accept="application/json,.json" hidden onChange={e => restore(e.target.files?.[0])} />
        </div>
        {note && <p className="note">{note}</p>}
      </section>
    </div>
  );
}

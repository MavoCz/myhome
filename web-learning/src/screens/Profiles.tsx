import { useState } from 'react';
import { useAccounts } from '../api';
import { forgetAccount, hasUnsaved, openAccount } from '../state/store';
import { DEFAULT_AVATAR } from '../zoo/art/avatar';
import { AvatarImage } from '../ui/bits';
import type { Route } from '../App';

/** The children signed in on this tablet. A parent adds a child once; after that a tap is enough. */
export function Profiles({ go }: { go: (r: Route) => void }) {
  const accounts = useAccounts(s => s.accounts);
  const [removing, setRemoving] = useState<number | null>(null);
  const [note, setNote] = useState('');

  const pick = (userId: number) => {
    void openAccount(userId);
    go({ name: 'home' });
  };

  const remove = async (userId: number) => {
    await forgetAccount(userId);
    setRemoving(null);
    setNote('Účet je z tabletu odebraný. Zoo zůstává uložená.');
  };

  return (
    <div className="page">
      <header className="page-head">
        <h1>Kdo jde cvičit?</h1>
      </header>
      <div className="profile-grid">
        {accounts.map(a => (
          <div key={a.userId} className="profile-card" data-testid={`profile-card-${a.userId}`}>
            <button type="button" className="profile-pick" data-testid={`profile-pick-${a.userId}`} onClick={() => pick(a.userId)}>
              <AvatarImage avatar={a.avatar ?? DEFAULT_AVATAR} size={104} />
              <span className="profile-name">{a.displayName}</span>
            </button>
            <button type="button" className="link" data-testid={`profile-remove-${a.userId}`} onClick={() => setRemoving(a.userId)}>
              Odebrat z tabletu
            </button>
          </div>
        ))}
        <button type="button" className="profile-card add" data-testid="profile-add-btn" onClick={() => go({ name: 'login' })}>
          <span className="plus" aria-hidden="true">+</span>
          <span className="profile-name">Přidat dítě</span>
        </button>
      </div>

      {removing !== null && (
        <section className="panel danger" data-testid="profile-remove-confirm">
          {hasUnsaved(removing) ? (
            <p>Na tabletu jsou ještě neuložené změny. Připoj se k internetu a chvíli počkej, jinak se ztratí.</p>
          ) : (
            <p>Pro další hraní bude potřeba znovu zadat heslo.</p>
          )}
          <div className="row">
            <button type="button" className="btn danger-btn" data-testid="profile-remove-yes" onClick={() => void remove(removing)}>
              Odebrat
            </button>
            <button type="button" className="btn" onClick={() => setRemoving(null)}>
              Nechat
            </button>
          </div>
        </section>
      )}
      {note && <p className="note">{note}</p>}
    </div>
  );
}

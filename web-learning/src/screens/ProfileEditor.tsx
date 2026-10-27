import { useState } from 'react';
import { useZoo } from '../state/store';
import type { Avatar } from '../state/types';
import { DEFAULT_AVATAR, HAIR_COLORS, OUTFIT_COLORS, SKIN_COLORS } from '../zoo/art/avatar';
import { AvatarImage, BackButton } from '../ui/bits';
import type { Route } from '../App';

function Swatches({ id, label, colors, value, onPick }: { id: string; label: string; colors: string[]; value: string; onPick: (c: string) => void }) {
  return (
    <fieldset className="swatches" id={id}>
      <legend>{label}</legend>
      <div className="row">
        {colors.map((c, i) => (
          <button key={c} type="button" className="swatch" style={{ background: c }} aria-pressed={c === value} aria-label={`${label}, barva ${i + 1}`} onClick={() => onPick(c)} />
        ))}
      </div>
    </fieldset>
  );
}

export function ProfileEditor({ id, go }: { id?: string; go: (r: Route) => void }) {
  const existing = useZoo(s => s.profiles.find(p => p.id === id));
  const { createProfile, updateProfile, deleteProfile } = useZoo.getState();
  const [name, setName] = useState(existing?.name ?? '');
  const [avatar, setAvatar] = useState<Avatar>(existing?.avatar ?? DEFAULT_AVATAR);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = (patch: Partial<Avatar>) => setAvatar(a => ({ ...a, ...patch }));

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (existing) {
      updateProfile(existing.id, { name, avatar });
      go({ name: 'profiles' });
    } else {
      createProfile(name, avatar);
      go({ name: 'home' });
    }
  };

  return (
    <div className="page">
      <header className="page-head">
        <BackButton onClick={() => go({ name: 'profiles' })} label="Zpět" />
        <h1>{existing ? 'Upravit profil' : 'Nový profil'}</h1>
      </header>
      <form className="editor" onSubmit={save}>
        <div className="editor-preview">
          <AvatarImage avatar={avatar} size={150} />
        </div>
        <div className="editor-fields">
          <label className="field" htmlFor="profile-name">
            <span>Jméno</span>
            <input id="profile-name" value={name} maxLength={20} autoComplete="off" onChange={e => setName(e.target.value)} placeholder="Jak se jmenuješ?" />
          </label>
          <Swatches id="hair" label="Vlasy" colors={HAIR_COLORS} value={avatar.hair} onPick={hair => set({ hair })} />
          <Swatches id="outfit" label="Šaty" colors={OUTFIT_COLORS} value={avatar.outfit} onPick={outfit => set({ outfit })} />
          <Swatches id="skin" label="Pleť" colors={SKIN_COLORS} value={avatar.skin} onPick={skin => set({ skin })} />
          <div className="row">
            <button type="submit" className="btn primary" disabled={!name.trim()}>
              {existing ? 'Uložit' : 'Vytvořit a začít'}
            </button>
          </div>
          {existing && (
            <div className="danger">
              {!confirmDelete ? (
                <button type="button" className="link" onClick={() => setConfirmDelete(true)}>
                  Smazat profil
                </button>
              ) : (
                <>
                  <p>Smazáním zmizí i celá zoo a všechny bodíky.</p>
                  <div className="row">
                    <button
                      type="button"
                      className="btn danger-btn"
                      onClick={() => {
                        deleteProfile(existing.id);
                        go({ name: 'profiles' });
                      }}
                    >
                      Ano, smazat
                    </button>
                    <button type="button" className="btn" onClick={() => setConfirmDelete(false)}>
                      Nechat
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </form>
    </div>
  );
}

import { useState } from 'react';
import { getProfile, useZoo } from '../state/store';
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
          <button
            key={c}
            type="button"
            className="swatch"
            data-testid={`avatar-${id}-${i}`}
            style={{ background: c }}
            aria-pressed={c === value}
            aria-label={`${label}, barva ${i + 1}`}
            onClick={() => onPick(c)}
          />
        ))}
      </div>
    </fieldset>
  );
}

/**
 * Picks how the child looks in the zoo. The name comes from the myhome account, so only the avatar is
 * chosen here; with no zoo yet this also creates it.
 */
export function ProfileEditor({ go }: { go: (r: Route) => void }) {
  const me = useZoo(s => (s.activeId ? getProfile(s.activeId) : undefined));
  const [avatar, setAvatar] = useState<Avatar>(me?.avatar ?? DEFAULT_AVATAR);
  const set = (patch: Partial<Avatar>) => setAvatar(a => ({ ...a, ...patch }));

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const { createZoo, setAvatar: saveAvatar } = useZoo.getState();
    if (me) saveAvatar(avatar);
    else createZoo(avatar);
    go({ name: 'home' });
  };

  return (
    <div className="page">
      <header className="page-head">
        {me && <BackButton onClick={() => go({ name: 'home' })} label="Zpět" />}
        <h1>{me ? 'Jak vypadám' : 'Vyber si, jak budeš vypadat'}</h1>
      </header>
      <form className="editor" onSubmit={save}>
        <div className="editor-preview">
          <AvatarImage avatar={avatar} size={150} />
        </div>
        <div className="editor-fields">
          <Swatches id="hair" label="Vlasy" colors={HAIR_COLORS} value={avatar.hair} onPick={hair => set({ hair })} />
          <Swatches id="outfit" label="Šaty" colors={OUTFIT_COLORS} value={avatar.outfit} onPick={outfit => set({ outfit })} />
          <Swatches id="skin" label="Pleť" colors={SKIN_COLORS} value={avatar.skin} onPick={skin => set({ skin })} />
          <div className="row">
            <button type="submit" className="btn primary" data-testid="avatar-save-btn">
              {me ? 'Uložit' : 'Postavit moje zoo'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

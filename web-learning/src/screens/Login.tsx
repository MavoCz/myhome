import { useState } from 'react';
import { login, useAccounts } from '../api';
import { openAccount } from '../state/store';
import { BackButton } from '../ui/bits';
import type { Route } from '../App';

const ERRORS = {
  credentials: 'E-mail nebo heslo nesedí.',
  'not-child': 'Tohle je účet rodiče. Zoo mají jen děti.',
  network: 'Nepodařilo se spojit se serverem. Zkus to za chvíli.',
};

/** Filled in by a parent: the child's myhome account. Also shown when a child's sign-in ran out. */
export function Login({ go, expiredName }: { go: (r: Route) => void; expiredName?: string }) {
  const hasAccounts = useAccounts(s => s.accounts.length > 0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const result = await login(email, password);
    setBusy(false);
    if (!result.ok) {
      setError(ERRORS[result.reason]);
      return;
    }
    useAccounts.getState().upsert(result.account);
    void openAccount(result.account.userId);
    go({ name: 'home' });
  };

  return (
    <div className="page">
      <header className="page-head">
        {hasAccounts && <BackButton onClick={() => go({ name: 'profiles' })} label="Zpět" />}
        <h1>Přihlášení</h1>
      </header>
      <form className="panel login" onSubmit={submit} data-testid="login-form">
        <p>
          {expiredName
            ? `Přihlášení pro ${expiredName} vypršelo. Ať rodič zadá heslo znovu.`
            : 'Tohle vyplní rodič: e-mail a heslo dětského účtu z myhome. Na tomto tabletu pak stačí klepnout na obrázek.'}
        </p>
        <label className="field" htmlFor="login-email">
          <span>E-mail</span>
          <input
            id="login-email"
            data-testid="learning-login-email-input"
            type="email"
            autoComplete="username"
            autoCapitalize="none"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </label>
        <label className="field" htmlFor="login-password">
          <span>Heslo</span>
          <input
            id="login-password"
            data-testid="learning-login-password-input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
        </label>
        {error && <p className="note" data-testid="learning-login-error">{error}</p>}
        <div className="row">
          <button type="submit" className="btn primary" data-testid="learning-login-submit" disabled={busy || !email.trim() || !password}>
            {busy ? 'Přihlašuji…' : 'Přihlásit'}
          </button>
        </div>
      </form>
    </div>
  );
}

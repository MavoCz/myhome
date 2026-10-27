import { Suspense, lazy, useEffect, useState } from 'react';
import { useAccounts } from './api';
import { openAccount, useZoo } from './state/store';
import type { ExerciseId } from './exercises';
import { Profiles } from './screens/Profiles';
import { Login } from './screens/Login';
import { ProfileEditor } from './screens/ProfileEditor';
import { StatusScreen } from './screens/StatusScreen';
import { Home } from './screens/Home';
import { ExerciseScreen } from './screens/ExerciseScreen';

// Phaser is big, so the zoo is loaded only when someone opens it
const ZooScreen = lazy(() => import('./screens/ZooScreen').then(m => ({ default: m.ZooScreen })));

export type Route =
  | { name: 'profiles' }
  | { name: 'login' }
  | { name: 'avatar' }
  | { name: 'home' }
  | { name: 'exercise'; id: ExerciseId }
  | { name: 'zoo'; hostId: string };

export function App() {
  const activeUserId = useAccounts(s => s.activeUserId);
  const active = useAccounts(s => s.accounts.find(a => a.userId === s.activeUserId));
  const hasAccounts = useAccounts(s => s.accounts.length > 0);
  const status = useZoo(s => s.status);
  const [route, setRoute] = useState<Route>(() => (activeUserId !== null ? { name: 'home' } : { name: 'profiles' }));

  // the child who played last on this tablet carries on
  useEffect(() => {
    if (activeUserId !== null) void openAccount(activeUserId);
  }, []);

  if (route.name === 'login' || !hasAccounts) return <Login go={setRoute} />;
  if (route.name === 'profiles' || !active) return <Profiles go={setRoute} />;

  switch (status) {
    case 'loading':
      return <div className="page"><p className="note">Načítám zoo…</p></div>;
    case 'signed-out':
      return <Login go={setRoute} expiredName={active.displayName} />;
    case 'closed':
    case 'offline':
      return <StatusScreen kind={status} go={setRoute} />;
    case 'new':
      return <ProfileEditor go={setRoute} />;
  }

  switch (route.name) {
    case 'avatar':
      return <ProfileEditor go={setRoute} />;
    case 'home':
      return <Home go={setRoute} />;
    case 'exercise':
      return <ExerciseScreen id={route.id} go={setRoute} />;
    case 'zoo':
      return (
        <Suspense fallback={<div className="zoo-screen"><div className="zoo-loading">Otevírám zoo…</div></div>}>
          <ZooScreen key={route.hostId} hostId={route.hostId} go={setRoute} />
        </Suspense>
      );
  }
}

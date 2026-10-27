import { Suspense, lazy, useState } from 'react';
import { useZoo } from './state/store';
import type { ExerciseId } from './exercises';
import { Profiles } from './screens/Profiles';
import { ProfileEditor } from './screens/ProfileEditor';
import { Home } from './screens/Home';
import { ExerciseScreen } from './screens/ExerciseScreen';

// Phaser is big, so the zoo is loaded only when someone opens it
const ZooScreen = lazy(() => import('./screens/ZooScreen').then(m => ({ default: m.ZooScreen })));

export type Route =
  | { name: 'profiles' }
  | { name: 'edit'; id?: string }
  | { name: 'home' }
  | { name: 'exercise'; id: ExerciseId }
  | { name: 'zoo'; hostId: string };

export function App() {
  const hasActive = useZoo(s => s.profiles.some(p => p.id === s.activeId));
  const hasProfiles = useZoo(s => s.profiles.length > 0);
  const [route, setRoute] = useState<Route>(() => (hasActive ? { name: 'home' } : hasProfiles ? { name: 'profiles' } : { name: 'edit' }));

  // every screen except the profile ones needs someone signed in
  const needsProfile = route.name === 'home' || route.name === 'exercise' || route.name === 'zoo';
  const current: Route = needsProfile && !hasActive ? { name: 'profiles' } : route;

  switch (current.name) {
    case 'profiles':
      return <Profiles go={setRoute} />;
    case 'edit':
      return <ProfileEditor key={current.id ?? 'new'} id={current.id} go={setRoute} />;
    case 'home':
      return <Home go={setRoute} />;
    case 'exercise':
      return <ExerciseScreen id={current.id} go={setRoute} />;
    case 'zoo':
      return (
        <Suspense fallback={<div className="zoo-screen"><div className="zoo-loading">Otevírám zoo…</div></div>}>
          <ZooScreen key={current.hostId} hostId={current.hostId} go={setRoute} />
        </Suspense>
      );
  }
}

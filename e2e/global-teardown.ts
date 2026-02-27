import { stopPostgres } from './helpers/docker';

function killProcess(pid: string | undefined, label: string): void {
  if (!pid) return;
  console.log(`[e2e] Stopping ${label} (PID ${pid})...`);
  try {
    process.kill(parseInt(pid, 10), 'SIGTERM');
  } catch {
    // Process may already be gone
  }
}

export default async function globalTeardown(): Promise<void> {
  killProcess(process.env.__E2E_VITE_PID, 'Vite dev server');
  killProcess(process.env.__E2E_BACKEND_PID, 'backend');
  await stopPostgres();
  console.log('[e2e] Teardown complete.');
}

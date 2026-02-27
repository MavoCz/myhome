import * as dotenv from 'dotenv';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';
import { startPostgres } from './helpers/docker';

dotenv.config({ path: path.resolve(__dirname, '.env.test') });

const DB_PORT = parseInt(process.env.TEST_DB_PORT ?? '5435', 10);
const DB_NAME = process.env.TEST_DB_NAME ?? 'backend_test';
const DB_USER = process.env.TEST_DB_USER ?? 'root';
const DB_PASSWORD = process.env.TEST_DB_PASSWORD ?? 'root';
const BACKEND_PORT = process.env.TEST_BACKEND_PORT ?? '8081';
const VITE_PORT = process.env.TEST_VITE_PORT ?? '5174';
const BACKEND_DIR = path.resolve(__dirname, process.env.BACKEND_DIR ?? '../backend');
const WEB_DIR = path.resolve(__dirname, '../web');

async function waitForPort(port: string, label: string, timeoutMs = 120_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      await fetch(`http://localhost:${port}`);
      return;
    } catch {
      // Not ready yet
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`${label} did not become available on port ${port} within ${timeoutMs}ms`);
}

async function waitForBackend(port: string, timeoutMs = 120_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`http://localhost:${port}/actuator/health`);
      if (res.ok) {
        const body = (await res.json()) as { status: string };
        if (body.status === 'UP') return;
      }
    } catch {
      // Backend not ready yet
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(`Backend did not become healthy within ${timeoutMs}ms`);
}

function spawnLogged(cmd: string, args: string[], opts: Parameters<typeof spawn>[2], label: string): ChildProcess {
  const proc = spawn(cmd, args, opts);
  proc.stdout?.on('data', (d: Buffer) => {
    const line = d.toString().trim();
    if (line) process.stdout.write(`[${label}] ${line}\n`);
  });
  proc.stderr?.on('data', (d: Buffer) => {
    const line = d.toString().trim();
    if (line) process.stderr.write(`[${label}] ${line}\n`);
  });
  return proc;
}

export default async function globalSetup(): Promise<void> {
  // 1. Start dedicated test Postgres container
  await startPostgres({
    port: DB_PORT,
    database: DB_NAME,
    username: DB_USER,
    password: DB_PASSWORD,
  });

  // 2. Start Spring Boot backend pointing at the test database
  console.log('[e2e] Starting backend...');
  const jdbcUrl = `jdbc:postgresql://localhost:${DB_PORT}/${DB_NAME}`;

  const backend = spawnLogged('./gradlew', ['bootRun', '--no-daemon'], {
    cwd: BACKEND_DIR,
    env: {
      ...process.env,
      SPRING_PROFILES_ACTIVE: 'test',
      SPRING_DATASOURCE_URL: jdbcUrl,
      SPRING_DATASOURCE_USERNAME: DB_USER,
      SPRING_DATASOURCE_PASSWORD: DB_PASSWORD,
      SPRING_DOCKER_COMPOSE_ENABLED: 'false',
      SERVER_PORT: BACKEND_PORT,
    },
    stdio: 'pipe',
  }, 'backend');

  process.env.__E2E_BACKEND_PID = String(backend.pid);

  await waitForBackend(BACKEND_PORT);
  console.log('[e2e] Backend is ready.');

  // 3. Start Vite dev server proxying to the test backend
  console.log('[e2e] Starting Vite dev server...');
  const vite = spawnLogged('pnpm', ['exec', 'vite', '--port', VITE_PORT, '--strictPort'], {
    cwd: WEB_DIR,
    env: {
      ...process.env,
      VITE_API_TARGET: `http://localhost:${BACKEND_PORT}`,
    },
    stdio: 'pipe',
  }, 'vite');

  process.env.__E2E_VITE_PID = String(vite.pid);

  await waitForPort(VITE_PORT, 'Vite dev server');
  console.log('[e2e] Vite dev server is ready.');
}

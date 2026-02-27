import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';

export interface PostgresConfig {
  port: number;
  database: string;
  username: string;
  password: string;
}

let postgresContainer: StartedTestContainer | null = null;

export async function startPostgres(config: PostgresConfig): Promise<void> {
  console.log('[e2e] Starting test Postgres container...');

  postgresContainer = await new GenericContainer('postgres:18')
    .withEnvironment({
      POSTGRES_USER: config.username,
      POSTGRES_PASSWORD: config.password,
      POSTGRES_DB: config.database,
    })
    .withExposedPorts({ container: 5432, host: config.port })
    .withWaitStrategy(Wait.forLogMessage('database system is ready to accept connections'))
    .start();

  console.log(`[e2e] Postgres running on port ${config.port}`);
}

export async function stopPostgres(): Promise<void> {
  if (postgresContainer) {
    console.log('[e2e] Stopping test Postgres container...');
    await postgresContainer.stop();
    postgresContainer = null;
  }
}

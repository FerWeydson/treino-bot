import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { env } from '../config/env';

const runMigrations = async () => {
  const connection = postgres(env.DATABASE_URL, { max: 1 });
  const db = drizzle(connection);

  console.log('⏳ Executando migrations...');
  
  await migrate(db, { migrationsFolder: './src/db/migrations' });
  
  console.log('✅ Migrations concluídas!');
  
  await connection.end();
  process.exit(0);
};

runMigrations().catch((err) => {
  console.error('❌ Erro ao executar migrations:', err);
  process.exit(1);
});
import { db } from './db';
import { users } from './db/schema';

const test = async () => {
  console.log('Testando conexão...');
  const result = await db.select().from(users).limit(1);
  console.log('Conexão OK!', result);
  process.exit(0);
};

test().catch((err) => {
  console.error('Erro:', err);
  process.exit(1);
});
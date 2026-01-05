import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '../config/env';
import * as schema from './schema';

const client = postgres(env.DATABASE_URL, { max: 1 });

export const db = drizzle(client, { schema });
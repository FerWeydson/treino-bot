import { pgTable, uuid, text, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { users } from './users';

export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  messageSid: text('message_sid').notNull().unique(),
  from: text('from').notNull(),
  to: text('to').notNull(),
  body: text('body').notNull(),
  rawPayload: jsonb('raw_payload'),
  receivedAt: timestamp('received_at').defaultNow().notNull(),
});
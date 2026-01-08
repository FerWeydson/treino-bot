import { pgTable, uuid, text, timestamp, numeric, jsonb } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  phone: text('phone').notNull().unique(),
  name: text('name'),
  
  // Perfil (novo)
  weight: numeric('weight'),
  height: numeric('height'),
  objective: text('objective'),
  weeklyRoutine: jsonb('weekly_routine'), // {"monday": "peito", "tuesday": "costas", ...}
  
  // Status onboarding
  onboardingComplete: text('onboarding_complete').default('false'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
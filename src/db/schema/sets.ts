import { pgTable, uuid, text, timestamp, integer, decimal } from 'drizzle-orm/pg-core';
import { workouts } from './workouts';

export const sets = pgTable('sets', {
  id: uuid('id').primaryKey().defaultRandom(),
  workoutId: uuid('workout_id').references(() => workouts.id).notNull(),
  exercise: text('exercise').notNull(),
  exerciseRaw: text('exercise_raw').notNull(),
  setsCount: integer('sets_count').notNull(),
  reps: integer('reps').notNull(),
  weight: decimal('weight', { precision: 6, scale: 2 }),
  orderIndex: integer('order_index').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
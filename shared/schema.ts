import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  boolean,
  doublePrecision,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (required for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  subscriptionStatus: varchar("subscription_status").default("free"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Goals table
export const goals = pgTable("goals", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  timeline: varchar("timeline").notNull(), // "3_months", "6_months", "1_year", "custom"
  timelineValue: integer("timeline_value"), // for custom timeline in months
  status: varchar("status").default("active"), // "active", "completed", "paused"
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Milestones table
export const milestones = pgTable("milestones", {
  id: serial("id").primaryKey(),
  goalId: integer("goal_id").notNull().references(() => goals.id),
  title: text("title").notNull(),
  description: text("description"),
  orderIndex: integer("order_index").notNull(),
  targetMonth: integer("target_month").notNull(),
  isCompleted: boolean("is_completed").default(false),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Actions table
export const actions = pgTable("actions", {
  id: serial("id").primaryKey(),
  milestoneId: integer("milestone_id").notNull().references(() => milestones.id),
  title: text("title").notNull(),
  description: text("description"),
  resources: jsonb("resources").$type<Array<{name: string, url: string, type: string}>>(),
  orderIndex: integer("order_index").notNull(),
  isCompleted: boolean("is_completed").default(false),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Daily check-ins table for nudges and reflections
export const dailyCheckIns = pgTable("daily_check_ins", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  date: varchar("date").notNull(), // YYYY-MM-DD format
  morningIntention: text("morning_intention"), // What's the ONE thing today?
  selectedActionId: integer("selected_action_id").references(() => actions.id),
  eveningAccomplished: boolean("evening_accomplished"), // Did you accomplish it?
  eveningReflection: text("evening_reflection"), // Optional reflection notes
  isCompleted: boolean("is_completed").default(false), // Full day completed
  currentStreak: integer("current_streak").default(0), // Current streak count
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User notification preferences
export const userPreferences = pgTable("user_preferences", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  morningNudgeTime: varchar("morning_nudge_time").default("10:00"), // 10:00 AM
  eveningNudgeTime: varchar("evening_nudge_time").default("20:00"), // 8:00 PM  
  timezone: varchar("timezone").default("America/New_York"),
  nudgesEnabled: boolean("nudges_enabled").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Daily journal entries for reviewing goal progress
export const journalEntries = pgTable("journal_entries", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  date: varchar("date").notNull(), // YYYY-MM-DD format
  morningIntention: text("morning_intention"),
  selectedGoalId: integer("selected_goal_id").references(() => goals.id),
  selectedActionId: integer("selected_action_id").references(() => actions.id),
  eveningReflection: text("evening_reflection"),
  accomplishmentLevel: integer("accomplishment_level"), // 1-5 scale how well they did
  mood: varchar("mood"), // daily mood tracking
  keyLearnings: text("key_learnings"), // what they learned today
  challengesFaced: text("challenges_faced"), // obstacles encountered
  tomorrowFocus: text("tomorrow_focus"), // what to focus on tomorrow
  streakCount: integer("streak_count").default(0),
  isCompleted: boolean("is_completed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  goals: many(goals),
  dailyCheckIns: many(dailyCheckIns),
  journalEntries: many(journalEntries),
  preferences: one(userPreferences),
}));

export const goalsRelations = relations(goals, ({ one, many }) => ({
  user: one(users, {
    fields: [goals.userId],
    references: [users.id],
  }),
  milestones: many(milestones),
}));

export const milestonesRelations = relations(milestones, ({ one, many }) => ({
  goal: one(goals, {
    fields: [milestones.goalId],
    references: [goals.id],
  }),
  actions: many(actions),
}));

export const actionsRelations = relations(actions, ({ one, many }) => ({
  milestone: one(milestones, {
    fields: [actions.milestoneId],
    references: [milestones.id],
  }),
  dailyCheckIns: many(dailyCheckIns),
}));

export const dailyCheckInsRelations = relations(dailyCheckIns, ({ one }) => ({
  user: one(users, {
    fields: [dailyCheckIns.userId],
    references: [users.id],
  }),
  selectedAction: one(actions, {
    fields: [dailyCheckIns.selectedActionId],
    references: [actions.id],
  }),
}));

export const userPreferencesRelations = relations(userPreferences, ({ one }) => ({
  user: one(users, {
    fields: [userPreferences.userId],
    references: [users.id],
  }),
}));

export const journalEntriesRelations = relations(journalEntries, ({ one }) => ({
  user: one(users, {
    fields: [journalEntries.userId],
    references: [users.id],
  }),
  goal: one(goals, {
    fields: [journalEntries.selectedGoalId],
    references: [goals.id],
  }),
  action: one(actions, {
    fields: [journalEntries.selectedActionId],
    references: [actions.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertGoalSchema = createInsertSchema(goals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMilestoneSchema = createInsertSchema(milestones).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertActionSchema = createInsertSchema(actions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDailyCheckInSchema = createInsertSchema(dailyCheckIns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserPreferencesSchema = createInsertSchema(userPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertJournalEntrySchema = createInsertSchema(journalEntries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type UpsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertGoal = z.infer<typeof insertGoalSchema>;
export type Goal = typeof goals.$inferSelect;
export type InsertMilestone = z.infer<typeof insertMilestoneSchema>;
export type Milestone = typeof milestones.$inferSelect;
export type InsertAction = z.infer<typeof insertActionSchema>;
export type Action = typeof actions.$inferSelect;
export type InsertDailyCheckIn = z.infer<typeof insertDailyCheckInSchema>;
export type DailyCheckIn = typeof dailyCheckIns.$inferSelect;
export type InsertUserPreferences = z.infer<typeof insertUserPreferencesSchema>;
export type UserPreferences = typeof userPreferences.$inferSelect;
export type InsertJournalEntry = z.infer<typeof insertJournalEntrySchema>;
export type JournalEntry = typeof journalEntries.$inferSelect;

// Extended types for frontend
export type GoalWithMilestones = Goal & {
  milestones: (Milestone & {
    actions: Action[];
  })[];
};

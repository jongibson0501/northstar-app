import {
  users,
  goals,
  milestones,
  actions,
  dailyCheckIns,
  userPreferences,
  journalEntries,
  type User,
  type UpsertUser,
  type Goal,
  type InsertGoal,
  type Milestone,
  type InsertMilestone,
  type Action,
  type InsertAction,
  type DailyCheckIn,
  type InsertDailyCheckIn,
  type UserPreferences,
  type InsertUserPreferences,
  type JournalEntry,
  type InsertJournalEntry,
  type GoalWithMilestones,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, inArray } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserStripeInfo(userId: string, customerId: string, subscriptionId: string): Promise<User>;

  // Goal operations
  createGoal(goal: InsertGoal): Promise<Goal>;
  getUserGoals(userId: string): Promise<GoalWithMilestones[]>;
  getGoal(id: number): Promise<GoalWithMilestones | undefined>;
  updateGoal(id: number, updates: Partial<InsertGoal>): Promise<Goal>;
  deleteGoal(id: number): Promise<void>;

  // Milestone operations
  createMilestone(milestone: InsertMilestone): Promise<Milestone>;
  updateMilestone(id: number, updates: Partial<InsertMilestone>): Promise<Milestone>;
  deleteMilestone(id: number): Promise<void>;

  // Action operations
  createAction(action: InsertAction): Promise<Action>;
  updateAction(id: number, updates: Partial<InsertAction>): Promise<Action>;
  deleteAction(id: number): Promise<void>;

  // Daily check-in operations
  getTodayCheckIn(userId: string, date: string): Promise<DailyCheckIn | undefined>;
  createCheckIn(checkIn: InsertDailyCheckIn): Promise<DailyCheckIn>;
  updateCheckIn(id: number, updates: Partial<InsertDailyCheckIn>): Promise<DailyCheckIn>;
  getUserIncompleteActions(userId: string): Promise<(Action & { milestone: { title: string; targetMonth: number; goalTitle: string } })[]>;
  calculateStreak(userId: string): Promise<number>;
  getRecentCheckIns(userId: string, days: number): Promise<DailyCheckIn[]>;

  // User preferences operations
  getUserPreferences(userId: string): Promise<UserPreferences | undefined>;
  upsertUserPreferences(preferences: InsertUserPreferences): Promise<UserPreferences>;

  // Journal entry operations
  createJournalEntry(entry: InsertJournalEntry): Promise<JournalEntry>;
  updateJournalEntry(id: number, updates: Partial<InsertJournalEntry>): Promise<JournalEntry>;
  getUserJournalEntries(userId: string, days?: number): Promise<JournalEntry[]>;
  getJournalEntriesForGoal(userId: string, goalId: number): Promise<JournalEntry[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserStripeInfo(userId: string, customerId: string, subscriptionId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        subscriptionStatus: "active",
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Goal operations
  async createGoal(goal: InsertGoal): Promise<Goal> {
    const [newGoal] = await db.insert(goals).values(goal).returning();
    return newGoal;
  }

  async getUserGoals(userId: string): Promise<GoalWithMilestones[]> {
    const userGoals = await db.query.goals.findMany({
      where: eq(goals.userId, userId),
      orderBy: [desc(goals.createdAt)],
      with: {
        milestones: {
          orderBy: [milestones.orderIndex],
          with: {
            actions: {
              orderBy: [actions.orderIndex],
            },
          },
        },
      },
    });
    return userGoals;
  }

  async getGoal(id: number): Promise<GoalWithMilestones | undefined> {
    const goal = await db.query.goals.findFirst({
      where: eq(goals.id, id),
      with: {
        milestones: {
          orderBy: [milestones.orderIndex],
          with: {
            actions: {
              orderBy: [actions.orderIndex],
            },
          },
        },
      },
    });
    return goal;
  }

  async updateGoal(id: number, updates: Partial<InsertGoal>): Promise<Goal> {
    const [goal] = await db
      .update(goals)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(goals.id, id))
      .returning();
    return goal;
  }

  async deleteGoal(id: number): Promise<void> {
    // First, get all milestones for this goal
    const goalMilestones = await db.select({ id: milestones.id }).from(milestones).where(eq(milestones.goalId, id));
    
    // Delete all actions for these milestones
    for (const milestone of goalMilestones) {
      await db.delete(actions).where(eq(actions.milestoneId, milestone.id));
    }
    
    // Then delete all milestones for this goal
    await db.delete(milestones).where(eq(milestones.goalId, id));
    
    // Finally, delete the goal
    await db.delete(goals).where(eq(goals.id, id));
  }

  // Milestone operations
  async createMilestone(milestone: InsertMilestone): Promise<Milestone> {
    const [newMilestone] = await db.insert(milestones).values(milestone).returning();
    return newMilestone;
  }

  async updateMilestone(id: number, updates: Partial<InsertMilestone>): Promise<Milestone> {
    const [milestone] = await db
      .update(milestones)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(milestones.id, id))
      .returning();
    return milestone;
  }

  async deleteMilestone(id: number): Promise<void> {
    await db.delete(milestones).where(eq(milestones.id, id));
  }

  // Action operations
  async createAction(action: InsertAction): Promise<Action> {
    const [newAction] = await db.insert(actions).values(action).returning();
    return newAction;
  }

  async updateAction(id: number, updates: Partial<InsertAction>): Promise<Action> {
    const [action] = await db
      .update(actions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(actions.id, id))
      .returning();
    return action;
  }

  async deleteAction(id: number): Promise<void> {
    await db.delete(actions).where(eq(actions.id, id));
  }

  // Daily check-in operations
  async getTodayCheckIn(userId: string, date: string): Promise<DailyCheckIn | undefined> {
    const [checkIn] = await db
      .select()
      .from(dailyCheckIns)
      .where(and(eq(dailyCheckIns.userId, userId), eq(dailyCheckIns.date, date)));
    return checkIn;
  }

  async createCheckIn(checkIn: InsertDailyCheckIn): Promise<DailyCheckIn> {
    const [newCheckIn] = await db.insert(dailyCheckIns).values(checkIn).returning();
    return newCheckIn;
  }

  async updateCheckIn(id: number, updates: Partial<InsertDailyCheckIn>): Promise<DailyCheckIn> {
    const [checkIn] = await db
      .update(dailyCheckIns)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(dailyCheckIns.id, id))
      .returning();
    return checkIn;
  }

  async getUserIncompleteActions(userId: string): Promise<(Action & { milestone: { title: string; targetMonth: number; goalTitle: string } })[]> {
    const incompleteActions = await db
      .select({
        id: actions.id,
        milestoneId: actions.milestoneId,
        title: actions.title,
        description: actions.description,
        resources: actions.resources,
        orderIndex: actions.orderIndex,
        isCompleted: actions.isCompleted,
        completedAt: actions.completedAt,
        createdAt: actions.createdAt,
        updatedAt: actions.updatedAt,
        milestone: {
          title: milestones.title,
          targetMonth: milestones.targetMonth,
          goalTitle: goals.title,
        }
      })
      .from(actions)
      .innerJoin(milestones, eq(actions.milestoneId, milestones.id))
      .innerJoin(goals, eq(milestones.goalId, goals.id))
      .where(and(eq(goals.userId, userId), eq(actions.isCompleted, false)))
      .orderBy(milestones.targetMonth, actions.orderIndex);
    return incompleteActions;
  }

  // User preferences operations
  async getUserPreferences(userId: string): Promise<UserPreferences | undefined> {
    const [preferences] = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId));
    return preferences;
  }

  async upsertUserPreferences(preferences: InsertUserPreferences): Promise<UserPreferences> {
    const [userPref] = await db
      .insert(userPreferences)
      .values(preferences)
      .onConflictDoUpdate({
        target: userPreferences.userId,
        set: {
          ...preferences,
          updatedAt: new Date(),
        },
      })
      .returning();
    return userPref;
  }

  async calculateStreak(userId: string): Promise<number> {
    const checkIns = await db
      .select()
      .from(dailyCheckIns)
      .where(eq(dailyCheckIns.userId, userId))
      .orderBy(desc(dailyCheckIns.date))
      .limit(90); // Check last 90 days for streak

    if (checkIns.length === 0) return 0;

    let streak = 0;
    const today = new Date().toISOString().split('T')[0];
    let currentDate = new Date(today);

    // Check if today's check-in is completed
    const todayCheckIn = checkIns.find(c => c.date === today);
    if (!todayCheckIn?.isCompleted) {
      // Check yesterday first if today isn't complete
      currentDate.setDate(currentDate.getDate() - 1);
    }

    // Count consecutive completed days backwards from today/yesterday
    for (let i = 0; i < 90; i++) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const checkIn = checkIns.find(c => c.date === dateStr);
      
      if (checkIn?.isCompleted) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  }

  async getRecentCheckIns(userId: string, days: number): Promise<DailyCheckIn[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    const checkIns = await db
      .select()
      .from(dailyCheckIns)
      .where(and(
        eq(dailyCheckIns.userId, userId)
      ))
      .orderBy(desc(dailyCheckIns.date))
      .limit(days);

    return checkIns.filter(checkIn => checkIn.date >= startDateStr);
  }

  // Journal entry operations
  async createJournalEntry(entry: InsertJournalEntry): Promise<JournalEntry> {
    const [journalEntry] = await db
      .insert(journalEntries)
      .values(entry)
      .returning();
    return journalEntry;
  }

  async updateJournalEntry(id: number, updates: Partial<InsertJournalEntry>): Promise<JournalEntry> {
    const [journalEntry] = await db
      .update(journalEntries)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(journalEntries.id, id))
      .returning();
    return journalEntry;
  }

  async getUserJournalEntries(userId: string, days: number = 30): Promise<JournalEntry[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    const entries = await db
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.userId, userId))
      .orderBy(desc(journalEntries.date))
      .limit(days);

    return entries.filter(entry => entry.date >= startDateStr);
  }

  async getJournalEntriesForGoal(userId: string, goalId: number): Promise<JournalEntry[]> {
    const entries = await db
      .select()
      .from(journalEntries)
      .where(and(
        eq(journalEntries.userId, userId),
        eq(journalEntries.selectedGoalId, goalId)
      ))
      .orderBy(desc(journalEntries.date));

    return entries;
  }
}

export const storage = new DatabaseStorage();

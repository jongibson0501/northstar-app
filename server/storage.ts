import {
  users,
  goals,
  milestones,
  actions,
  type User,
  type UpsertUser,
  type Goal,
  type InsertGoal,
  type Milestone,
  type InsertMilestone,
  type Action,
  type InsertAction,
  type GoalWithMilestones,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

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
}

export const storage = new DatabaseStorage();

import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertGoalSchema, insertMilestoneSchema, insertActionSchema } from "@shared/schema";
import OpenAI from "openai";
import Stripe from "stripe";
import { z } from "zod";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

if (!process.env.OPENAI_API_KEY) {
  throw new Error('Missing required OpenAI API key: OPENAI_API_KEY');
}
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Goal routes
  app.get('/api/goals', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const goals = await storage.getUserGoals(userId);
      res.json(goals);
    } catch (error) {
      console.error("Error fetching goals:", error);
      res.status(500).json({ message: "Failed to fetch goals" });
    }
  });

  app.post('/api/goals', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const goalData = insertGoalSchema.parse({ ...req.body, userId });
      const goal = await storage.createGoal(goalData);
      res.json(goal);
    } catch (error) {
      console.error("Error creating goal:", error);
      res.status(400).json({ message: "Failed to create goal" });
    }
  });

  app.get('/api/goals/:id', isAuthenticated, async (req: any, res) => {
    try {
      const goalId = parseInt(req.params.id);
      const goal = await storage.getGoal(goalId);
      if (!goal) {
        return res.status(404).json({ message: "Goal not found" });
      }
      res.json(goal);
    } catch (error) {
      console.error("Error fetching goal:", error);
      res.status(500).json({ message: "Failed to fetch goal" });
    }
  });

  app.put('/api/goals/:id', isAuthenticated, async (req: any, res) => {
    try {
      const goalId = parseInt(req.params.id);
      const updates = insertGoalSchema.partial().parse(req.body);
      const goal = await storage.updateGoal(goalId, updates);
      res.json(goal);
    } catch (error) {
      console.error("Error updating goal:", error);
      res.status(400).json({ message: "Failed to update goal" });
    }
  });

  app.delete('/api/goals/:id', isAuthenticated, async (req: any, res) => {
    try {
      const goalId = parseInt(req.params.id);
      await storage.deleteGoal(goalId);
      res.json({ message: "Goal deleted successfully" });
    } catch (error) {
      console.error("Error deleting goal:", error);
      res.status(500).json({ message: "Failed to delete goal" });
    }
  });

  // Milestone routes
  app.post('/api/milestones', isAuthenticated, async (req: any, res) => {
    try {
      const milestoneData = insertMilestoneSchema.parse(req.body);
      const milestone = await storage.createMilestone(milestoneData);
      res.json(milestone);
    } catch (error) {
      console.error("Error creating milestone:", error);
      res.status(400).json({ message: "Failed to create milestone" });
    }
  });

  app.put('/api/milestones/:id', isAuthenticated, async (req: any, res) => {
    try {
      const milestoneId = parseInt(req.params.id);
      const updates = insertMilestoneSchema.partial().parse(req.body);
      const milestone = await storage.updateMilestone(milestoneId, updates);
      res.json(milestone);
    } catch (error) {
      console.error("Error updating milestone:", error);
      res.status(400).json({ message: "Failed to update milestone" });
    }
  });

  // Action routes
  app.post('/api/actions', isAuthenticated, async (req: any, res) => {
    try {
      const actionData = insertActionSchema.parse(req.body);
      const action = await storage.createAction(actionData);
      res.json(action);
    } catch (error) {
      console.error("Error creating action:", error);
      res.status(400).json({ message: "Failed to create action" });
    }
  });

  app.put('/api/actions/:id', isAuthenticated, async (req: any, res) => {
    try {
      const actionId = parseInt(req.params.id);
      const updates = insertActionSchema.partial().parse(req.body);
      const action = await storage.updateAction(actionId, updates);
      res.json(action);
    } catch (error) {
      console.error("Error updating action:", error);
      res.status(400).json({ message: "Failed to update action" });
    }
  });

  // AI-powered planning routes
  app.post('/api/generate-questions', isAuthenticated, async (req: any, res) => {
    try {
      const { goalTitle, timeline } = req.body;
      
      const prompt = `Generate exactly 5 personalized questions to help someone create a detailed action plan for achieving their goal: "${goalTitle}" within a ${timeline.replace('_', ' ')} timeframe.

The questions should help understand:
1. Current situation and starting point
2. Available resources and constraints
3. Past experience and challenges
4. Motivation and commitment level
5. Specific preferences and circumstances

Return only a JSON object with a "questions" array containing exactly 5 strings. Each question should be direct, actionable, and help create a personalized roadmap.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.7,
      });

      const result = JSON.parse(response.choices[0].message.content || '{"questions": []}');
      res.json(result);
    } catch (error) {
      console.error("Error generating questions:", error);
      res.status(500).json({ message: "Failed to generate questions" });
    }
  });

  app.post('/api/generate-milestones', isAuthenticated, async (req: any, res) => {
    try {
      const { goalTitle, timeline, questionsAndAnswers } = req.body;
      
      const timelineMonths = timeline === "3_months" ? 3 : timeline === "6_months" ? 6 : 12;
      const qaText = questionsAndAnswers.map((qa: any) => `Q: ${qa.question}\nA: ${qa.answer}`).join('\n\n');
      
      const prompt = `Based on the goal "${goalTitle}" to be achieved in ${timelineMonths} months and these user responses:

${qaText}

Create a personalized roadmap with exactly 3 milestones. Each milestone should have:
- A clear, specific title
- Target month (distributed evenly: month ${Math.ceil(timelineMonths/3)}, ${Math.ceil(timelineMonths*2/3)}, ${timelineMonths})
- Exactly 3 concrete, actionable steps

Return only a JSON object with a "milestones" array. Each milestone should have: title, targetMonth, and actions array with 3 objects containing "title" field.

Make the milestones and actions specific to the user's situation based on their answers.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.7,
      });

      const result = JSON.parse(response.choices[0].message.content || '{"milestones": []}');
      res.json(result);
    } catch (error) {
      console.error("Error generating milestones:", error);
      res.status(500).json({ message: "Failed to generate milestones" });
    }
  });

  app.post('/api/save-milestones', isAuthenticated, async (req: any, res) => {
    try {
      const { goalId, milestones, timeline } = req.body;
      const userId = req.user.claims.sub;
      
      // Update goal with timeline
      await storage.updateGoal(goalId, { timeline });
      
      // Save milestones and actions
      for (let i = 0; i < milestones.length; i++) {
        const milestone = milestones[i];
        const savedMilestone = await storage.createMilestone({
          goalId,
          title: milestone.title,
          description: "",
          targetMonth: milestone.targetMonth,
          orderIndex: i,
          isCompleted: false,
        });
        
        // Save actions for this milestone
        for (let j = 0; j < milestone.actions.length; j++) {
          const action = milestone.actions[j];
          await storage.createAction({
            milestoneId: savedMilestone.id,
            title: action.title,
            description: "",
            orderIndex: j,
            isCompleted: false,
          });
        }
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error saving milestones:", error);
      res.status(500).json({ message: "Failed to save milestones" });
    }
  });

  // Subscription routes
  app.post('/api/get-or-create-subscription', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.stripeSubscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
        res.json({
          subscriptionId: subscription.id,
          clientSecret: (subscription.latest_invoice as any)?.payment_intent?.client_secret,
        });
        return;
      }

      if (!user.email) {
        return res.status(400).json({ message: 'No user email on file' });
      }

      const customer = await stripe.customers.create({
        email: user.email,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
      });

      const subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{
          price: process.env.STRIPE_PRICE_ID || 'price_1234567890', // Replace with actual price ID
        }],
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent'],
      });

      await storage.updateUserStripeInfo(userId, customer.id, subscription.id);

      res.json({
        subscriptionId: subscription.id,
        clientSecret: (subscription.latest_invoice as any)?.payment_intent?.client_secret,
      });
    } catch (error: any) {
      console.error("Error creating subscription:", error);
      res.status(400).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

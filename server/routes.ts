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
      console.log('Fetching goal with ID:', goalId);
      const goal = await storage.getGoal(goalId);
      console.log('Goal found:', goal ? `${goal.title} with ${goal.milestones?.length || 0} milestones` : 'null');
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
      console.log('Question generation request:', { goalTitle, timeline });
      
      // Try AI first, fallback to contextual questions if quota exceeded
      try {
        const prompt = `Generate exactly 5 simple, easy-to-answer questions for someone working on: "${goalTitle}" in ${timeline.replace('_', ' ')}.

Make questions conversational and specific. Focus on:
1. Where they are now (current state)
2. What time they have available
3. What they prefer or enjoy
4. What has worked/not worked before
5. What success looks like to them

Keep questions under 15 words each. Make them feel like a friendly conversation, not an interview.

Return only a JSON object with a "questions" array containing exactly 5 simple question strings.`;

        const response = await openai.chat.completions.create({
          model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
          temperature: 0.7,
        });

        const result = JSON.parse(response.choices[0].message.content || '{"questions": []}');
        res.json(result);
      } catch (aiError: any) {
        if (aiError.status === 429) {
          // Generate contextual questions based on goal type
          const questions = generateContextualQuestions(goalTitle, timeline);
          res.json({ questions });
        } else {
          throw aiError;
        }
      }
    } catch (error) {
      console.error("Error generating questions:", error);
      res.status(500).json({ message: "Failed to generate questions" });
    }
  });

  function generateContextualQuestions(goalTitle: string, timeline: string): string[] {
    const goal = goalTitle.toLowerCase();
    const timeframe = timeline.replace('_', ' ');
    
    // Fitness/Health goals
    if (goal.includes('shape') || goal.includes('fit') || goal.includes('health') || goal.includes('weight') || goal.includes('exercise')) {
      return [
        `What is your current fitness level and how often do you currently exercise?`,
        `What time of day works best for you to work out, and how much time can you realistically commit each week?`,
        `Do you prefer working out at home, at a gym, or outdoors? What equipment or resources do you have access to?`,
        `Have you tried fitness programs before? What worked well and what challenges did you face?`,
        `What specific aspect of getting in shape motivates you most - strength, endurance, weight loss, or feeling more confident?`
      ];
    }
    
    // Learning goals
    if (goal.includes('learn') || goal.includes('study') || goal.includes('skill') || goal.includes('language')) {
      return [
        `What is your current experience level with this subject, and why do you want to learn it?`,
        `How much time can you dedicate to learning each day or week given your current schedule?`,
        `Do you learn better through reading, watching videos, hands-on practice, or working with others?`,
        `What resources do you currently have access to (books, courses, mentors, software)?`,
        `What would success look like to you at the end of your ${timeframe} timeline?`
      ];
    }
    
    // Career/Business goals
    if (goal.includes('career') || goal.includes('job') || goal.includes('business') || goal.includes('work') || goal.includes('promotion')) {
      return [
        `What is your current situation and what specific career change or advancement are you seeking?`,
        `What skills, connections, or qualifications do you currently have that support this goal?`,
        `How much time can you dedicate to career development activities outside of your current responsibilities?`,
        `What obstacles or challenges do you anticipate, and what support system do you have?`,
        `What would achieving this goal mean for your life and how will you measure success?`
      ];
    }
    
    // Financial goals
    if (goal.includes('money') || goal.includes('save') || goal.includes('debt') || goal.includes('financial') || goal.includes('income')) {
      return [
        `What is your current financial situation and what specific financial goal are you working toward?`,
        `How much money can you realistically set aside each month toward this goal?`,
        `What are your main expenses and where do you see potential opportunities to optimize your budget?`,
        `Have you tried saving or budgeting strategies before? What worked and what didn't?`,
        `What would achieving this financial goal enable you to do that you can't do now?`
      ];
    }
    
    // Generic questions for other goals
    return [
      `What is your current situation regarding "${goalTitle}" and what specifically do you want to achieve?`,
      `What resources, skills, or support do you currently have that will help you reach this goal?`,
      `How much time can you realistically dedicate to working on this goal each week?`,
      `What challenges or obstacles do you anticipate, and how have you handled similar challenges before?`,
      `What will success look like to you, and how will you know when you've achieved your goal?`
    ];
  }

  app.post('/api/generate-milestones', isAuthenticated, async (req: any, res) => {
    try {
      const { goalTitle, timeline, questionsAndAnswers } = req.body;
      console.log('Milestone generation request:', { goalTitle, timeline, questionsAndAnswers });
      
      // Parse timeline properly
      let timelineMonths;
      let timelineText;
      if (timeline.includes('month')) {
        timelineMonths = parseInt(timeline.replace(/\D/g, '')) || 12;
        timelineText = timeline;
      } else if (timeline.includes('year')) {
        timelineMonths = parseInt(timeline.replace(/\D/g, '')) * 12 || 12;
        timelineText = timeline;
      } else {
        // Handle predefined timeline values
        timelineMonths = timeline === "1_month" ? 1 : timeline === "3_months" ? 3 : timeline === "6_months" ? 6 : 12;
        timelineText = timeline.replace('_', ' ');
      }
      
      const qaText = questionsAndAnswers.map((qa: any) => `Q: ${qa.question}\nA: ${qa.answer}`).join('\n\n');
      
      // Try AI first, fallback to contextual milestones if quota exceeded
      try {
        const prompt = `Create a specific, actionable roadmap for the goal: "${goalTitle}" to be achieved in ${timelineText}.

User context:
${qaText}

Generate exactly 6 progressive milestones with these specific timeframes:
1. Week 1 - Immediate start actions
2. Month 1 - Early momentum building  
3. Month 3 - Skill development phase
4. Month 6 - Intermediate progress
5. Month 9 - Advanced application
6. Month 12 - Goal completion and mastery

For language learning specifically, include:
- Week 1: Setup learning environment, first lessons
- Month 1: Basic vocabulary and grammar foundation
- Month 3: Conversational practice begins
- Month 6: Intermediate proficiency
- Month 9: Advanced conversations and media
- Month 12: Near-fluency and practical application

Each milestone needs:
- Specific title describing what they'll achieve
- timeframe: "Week 1", "Month 1", "Month 3", "Month 6", "Month 9", or "Month 12"
- 3-5 concrete actions with specific, measurable steps

Return JSON: {"milestones": [{"title": "...", "timeframe": "Week 1", "actions": [{"title": "..."}]}]}

Make every action specific to ${goalTitle} with clear, achievable steps.`;

        const response = await openai.chat.completions.create({
          model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
          temperature: 0.7,
        });

        const result = JSON.parse(response.choices[0].message.content || '{"milestones": []}');
        res.json(result);
      } catch (aiError: any) {
        if (aiError.status === 429) {
          // Generate contextual milestones based on goal type and answers
          const milestones = generateContextualMilestones(goalTitle, timeline, questionsAndAnswers);
          res.json({ milestones });
        } else {
          throw aiError;
        }
      }
    } catch (error) {
      console.error("Error generating milestones:", error);
      res.status(500).json({ message: "Failed to generate milestones" });
    }
  });

  function generateContextualMilestones(goalTitle: string, timeline: string, questionsAndAnswers: any[]): any[] {
    const goal = goalTitle.toLowerCase();
    const timelineMonths = timeline === "3_months" ? 3 : timeline === "6_months" ? 6 : 12;
    const answers = questionsAndAnswers.map(qa => qa.answer.toLowerCase());
    
    // Fitness/Health goals
    if (goal.includes('shape') || goal.includes('fit') || goal.includes('health') || goal.includes('weight') || goal.includes('exercise')) {
      const milestones = [
        {
          title: "Get Started This Week",
          targetMonth: 0.25,
          actions: [
            { title: "Schedule 3 workout days this week" },
            { title: "Take baseline measurements and photos" },
            { title: "Download a fitness tracking app" },
            { title: "Clear out junk food from kitchen" }
          ]
        },
        {
          title: "Build Your Foundation",
          targetMonth: 1,
          actions: [
            { title: "Complete 4 weeks of consistent workouts" },
            { title: "Establish healthy eating routine" },
            { title: "Find workout buddy or join fitness community" },
            { title: "Track progress and adjust plan as needed" }
          ]
        }
      ];
      
      if (timelineMonths >= 3) {
        milestones.push({
          title: "Level Up Your Fitness",
          targetMonth: 3,
          actions: [
            { title: "Increase workout intensity and duration" },
            { title: "Try new types of exercise for variety" },
            { title: "See noticeable improvements in strength/endurance" },
            { title: "Refine nutrition plan based on results" }
          ]
        });
      }
      
      if (timelineMonths >= 6) {
        milestones.push({
          title: "Hit Your Stride",
          targetMonth: 6,
          actions: [
            { title: "Achieve significant fitness improvements" },
            { title: "Set new challenging but achievable goals" },
            { title: "Help or inspire someone else to get started" },
            { title: "Plan active vacation or fitness event" }
          ]
        });
      }
      
      if (timelineMonths >= 12) {
        milestones.push({
          title: "Master Your Fitness Journey",
          targetMonth: 12,
          actions: [
            { title: "Achieve original fitness goals" },
            { title: "Develop sustainable long-term habits" },
            { title: "Set ambitious new fitness challenges" },
            { title: "Share your transformation story" }
          ]
        });
      }
      
      return milestones;
    }
    
    // Learning goals
    if (goal.includes('learn') || goal.includes('study') || goal.includes('skill') || goal.includes('language')) {
      const milestones = [
        {
          title: "Set Up Learning Foundation",
          timeframe: "Week 1",
          actions: [
            { title: "Choose primary learning resource (app, course, or textbook)" },
            { title: "Set up daily 15-30 minute study schedule" },
            { title: "Learn basic greetings and essential phrases" },
            { title: "Download language learning apps and create accounts" }
          ]
        },
        {
          title: "Build Core Vocabulary",
          timeframe: "Month 1",
          actions: [
            { title: "Master 100-150 essential words" },
            { title: "Complete beginner grammar lessons" },
            { title: "Practice pronunciation daily" },
            { title: "Start simple sentence construction" }
          ]
        },
        {
          title: "Begin Conversational Practice",
          timeframe: "Month 3",
          actions: [
            { title: "Expand vocabulary to 500+ words" },
            { title: "Practice speaking with language exchange partner" },
            { title: "Listen to simple audio content daily" },
            { title: "Write short paragraphs about daily activities" }
          ]
        }
      ];
      
      if (timelineMonths >= 6) {
        milestones.push({
          title: "Intermediate Proficiency",
          timeframe: "Month 6",
          actions: [
            { title: "Hold 10-minute conversations on familiar topics" },
            { title: "Read simple articles or children's books" },
            { title: "Know 1000+ vocabulary words" },
            { title: "Use past and future tenses confidently" }
          ]
        });
      }
      
      if (timelineMonths >= 9) {
        milestones.push({
          title: "Advanced Application",
          timeframe: "Month 9",
          actions: [
            { title: "Watch movies or shows with subtitles" },
            { title: "Participate in online forums or communities" },
            { title: "Express opinions and discuss complex topics" },
            { title: "Start reading intermediate level books" }
          ]
        });
      }
      
      if (timelineMonths >= 12) {
        milestones.push({
          title: "Near-Fluency Achievement",
          timeframe: "Month 12",
          actions: [
            { title: "Conduct business or academic conversations" },
            { title: "Write essays or formal documents" },
            { title: "Understand native speakers at normal speed" },
            { title: "Plan trip to country where language is spoken" }
          ]
        });
      }
      
      return milestones;
    }
    
    // Default fallback milestone structure
    return [
      {
        title: "Get Started",
        timeframe: "Week 1",
        actions: [
          { title: "Set up initial plan and resources" },
          { title: "Take first concrete steps" },
          { title: "Establish routine or schedule" }
        ]
      }
    ];
  }

  app.post('/api/save-milestones', isAuthenticated, async (req: any, res) => {
    try {
      const { goalId, milestones, timeline } = req.body;
      const userId = req.user.claims.sub;
      
      // Update goal with timeline
      await storage.updateGoal(goalId, { timeline });
      
      // Function to convert timeframe to target month (using whole numbers for database)
      const convertTimeframeToMonth = (timeframe: string, fallback: number): number => {
        if (timeframe === "Week 1") return 1;  // Use 1 for Week 1
        if (timeframe === "Month 1") return 1;
        if (timeframe === "Month 3") return 3;
        if (timeframe === "Month 6") return 6;
        if (timeframe === "Month 9") return 9;
        if (timeframe === "Month 12") return 12;
        return fallback;
      };

      // Save milestones and actions
      for (let i = 0; i < milestones.length; i++) {
        const milestone = milestones[i];
        const targetMonth = milestone.timeframe ? 
          convertTimeframeToMonth(milestone.timeframe, i + 1) : 
          (milestone.targetMonth || (i + 1));
          
        const savedMilestone = await storage.createMilestone({
          goalId,
          title: milestone.title,
          description: "",
          targetMonth: targetMonth,
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

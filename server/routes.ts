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
      const updates = req.body;
      
      // Convert completedAt string to Date if present
      if (updates.completedAt && typeof updates.completedAt === 'string') {
        updates.completedAt = new Date(updates.completedAt);
      }
      
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
      
      // Convert completedAt string to Date if present
      const body = { ...req.body };
      if (body.completedAt && typeof body.completedAt === 'string') {
        body.completedAt = new Date(body.completedAt);
      }
      
      const updates = insertMilestoneSchema.partial().parse(body);
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
      // Handle date conversion for completedAt field
      const requestData = { ...req.body };
      if (requestData.completedAt && typeof requestData.completedAt === 'string') {
        requestData.completedAt = new Date(requestData.completedAt);
      }
      const updates = insertActionSchema.partial().parse(requestData);
      const action = await storage.updateAction(actionId, updates);
      res.json(action);
    } catch (error) {
      console.error("Error updating action:", error);
      res.status(400).json({ message: "Failed to update action" });
    }
  });

  // Clear existing plan and allow regeneration
  app.delete('/api/goals/:id/plan', isAuthenticated, async (req: any, res) => {
    try {
      const goalId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      // Get the goal to verify ownership
      const goal = await storage.getGoal(goalId);
      if (!goal || goal.userId !== userId) {
        return res.status(404).json({ message: "Goal not found" });
      }
      
      // Delete all milestones and actions for this goal
      for (const milestone of goal.milestones) {
        for (const action of milestone.actions) {
          await storage.deleteAction(action.id);
        }
        await storage.deleteMilestone(milestone.id);
      }
      
      res.json({ success: true, message: "Plan cleared successfully" });
    } catch (error) {
      console.error("Error clearing plan:", error);
      res.status(500).json({ message: "Failed to clear plan" });
    }
  });

  // Helper function for fallback plan generation
  function generateContextualPlan(goalTitle: string, timeline: string): any[] {
    const timelineMonths = timeline === "1_month" ? 1 : timeline === "3_months" ? 3 : 6;
    const weeksPerMilestone = Math.ceil((timelineMonths * 4) / 6);
    
    return [
      {
        title: "Foundation & Basics",
        description: `Learn fundamental concepts for ${goalTitle}`,
        targetDate: new Date(Date.now() + weeksPerMilestone * 7 * 24 * 60 * 60 * 1000).toISOString(),
        actions: [
          { title: "Research and understand basics", description: "Learn core concepts and terminology" },
          { title: "Gather necessary resources", description: "Acquire tools, materials, or access needed" }
        ]
      },
      {
        title: "First Steps",
        description: "Begin practical application",
        targetDate: new Date(Date.now() + weeksPerMilestone * 2 * 7 * 24 * 60 * 60 * 1000).toISOString(),
        actions: [
          { title: "Start with simple exercises", description: "Practice basic techniques or methods" },
          { title: "Build initial habits", description: "Establish routine and consistency" }
        ]
      },
      {
        title: "Skill Development",
        description: "Expand knowledge and abilities",
        targetDate: new Date(Date.now() + weeksPerMilestone * 3 * 7 * 24 * 60 * 60 * 1000).toISOString(),
        actions: [
          { title: "Take on intermediate challenges", description: "Push beyond beginner level" },
          { title: "Learn from mistakes", description: "Analyze and improve from setbacks" }
        ]
      },
      {
        title: "Practical Application",
        description: "Apply skills in real scenarios",
        targetDate: new Date(Date.now() + weeksPerMilestone * 4 * 7 * 24 * 60 * 60 * 1000).toISOString(),
        actions: [
          { title: "Complete meaningful projects", description: "Work on substantial applications of your skills" },
          { title: "Seek feedback", description: "Get input from others to improve" }
        ]
      },
      {
        title: "Advanced Techniques",
        description: "Master complex aspects",
        targetDate: new Date(Date.now() + weeksPerMilestone * 5 * 7 * 24 * 60 * 60 * 1000).toISOString(),
        actions: [
          { title: "Explore advanced methods", description: "Learn sophisticated techniques" },
          { title: "Develop personal style", description: "Find your unique approach" }
        ]
      },
      {
        title: "Mastery & Beyond",
        description: "Achieve proficiency and set future goals",
        targetDate: new Date(Date.now() + weeksPerMilestone * 6 * 7 * 24 * 60 * 60 * 1000).toISOString(),
        actions: [
          { title: "Demonstrate competency", description: "Show mastery through examples or tests" },
          { title: "Plan next level goals", description: "Set objectives for continued growth" }
        ]
      }
    ];
  }

  // Direct AI-powered plan generation
  app.post('/api/generate-plan', isAuthenticated, async (req: any, res) => {
    try {
      const { goalId, goalTitle, timeline } = req.body;
      console.log('AI Plan generation request:', { goalId, goalTitle, timeline });
      console.log('OpenAI API Key exists:', !!process.env.OPENAI_API_KEY);
      console.log('User ID:', req.user?.claims?.sub);
      
      // Update the goal with the selected timeline
      await storage.updateGoal(goalId, { timeline });
      
      const timelineText = timeline.replace('_', ' ');
      let timelineMonths;
      if (timeline === "1_month") {
        timelineMonths = 1;
      } else if (timeline === "3_months") {
        timelineMonths = 3;
      } else if (timeline === "6_months") {
        timelineMonths = 6;
      } else if (timeline === "1_year") {
        timelineMonths = 12;
      } else {
        // Parse custom timeline (e.g., "8 months", "2 weeks", "18 months")
        const timelineMatch = timeline.match(/(\d+)\s*(week|month|year)/i);
        if (timelineMatch) {
          const value = parseInt(timelineMatch[1]);
          const unit = timelineMatch[2].toLowerCase();
          if (unit.startsWith('week')) {
            timelineMonths = Math.ceil(value / 4); // Convert weeks to months
          } else if (unit.startsWith('month')) {
            timelineMonths = value;
          } else if (unit.startsWith('year')) {
            timelineMonths = value * 12;
          } else {
            timelineMonths = 6; // Default fallback
          }
        } else {
          timelineMonths = 6; // Default fallback
        }
      }
      
      console.log('Timeline calculation:', { timeline, timelineText, timelineMonths });
      
      const prompt = `Create a ${timelineMonths}-month plan for: "${goalTitle}".

${timelineMonths === 1 ? 
  `Create exactly 4 milestones for 1 month (4 weeks):
1. Week 1: Foundation and setup
2. Week 2: Initial progress  
3. Week 3: Building momentum
4. Week 4: Achievement

Each milestone should have 3-4 specific tasks.` :
timelineMonths === 3 ?
  `Create exactly 3 milestones for 3 months:
1. Month 1: Foundation and getting started
2. Month 2: Building skills and consistency
3. Month 3: Mastery and achievement

Each milestone should have 5-6 specific tasks.` :
timelineMonths === 6 ?
  `Create exactly 6 milestones for 6 months:
1. Month 1: Foundation
2. Month 2: Basic skills
3. Month 3: Intermediate practice
4. Month 4: Advanced application
5. Month 5: Refinement and mastery
6. Month 6: Goal achievement

Each milestone should have 4-5 specific tasks.` :
timelineMonths === 12 ?
  `Create exactly 12 milestones for 1 year (12 months):
One milestone per month from Month 1 through Month 12.
Each milestone should have 4-5 specific tasks.` :
  `Create exactly ${timelineMonths} milestones for ${timelineMonths} months:
One milestone per month. Each milestone should have 4-5 specific tasks.`}

For each action, include 1-2 FREE resources from well-established platforms only. ONLY suggest resources that are:
- Completely free to access (no paid subscriptions required)
- From major, reliable platforms that won't result in 404 errors
- Actually helpful for completing the specific action

PRIORITIZE these trusted free platforms:
- YouTube (use channel URLs like youtube.com/@channelname or search URLs)
- Khan Academy (khanacademy.org)
- freeCodeCamp (freecodecamp.org)
- Coursera free courses (coursera.org - audit track only)
- MDN Web Docs (developer.mozilla.org)
- W3Schools (w3schools.com)
- GitHub repositories (github.com)
- Official documentation sites
- Government/educational institution sites (.edu, .gov)

Return as JSON:
{
  "milestones": [
    {
      "title": "Milestone Name",
      "actions": [
        {
          "title": "Specific action",
          "resources": [
            {"name": "Free Resource Name", "url": "https://reliablesite.com", "type": "tutorial"},
            {"name": "YouTube Channel", "url": "https://youtube.com/@channel", "type": "video"}
          ]
        }
      ]
    }
  ]
}

Resource types: "tutorial", "documentation", "video", "course", "tool"
AVOID: Paid platforms, obscure websites, specific course URLs that might expire

Focus on realistic goals achievable within exactly ${timelineMonths} months.`;

      let result;
      
      try {
        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
          temperature: 0.7,
        });

        result = JSON.parse(response.choices[0].message.content || '{"milestones": []}');
      } catch (aiError: any) {
        console.error("OpenAI API error:", aiError.message, aiError.status);
        // Generate contextual plan based on goal type
        result = { milestones: generateContextualPlan(goalTitle, timelineText) };
      }
      
      // Save the generated plan to database with proper timeline distribution
      for (let i = 0; i < result.milestones.length; i++) {
        const milestone = result.milestones[i];
        
        // Calculate target month based on selected timeline
        let targetMonth;
        if (timelineMonths === 1) {
          // For 1-month: 4 milestones representing weeks 1-4
          targetMonth = i + 1; // 1, 2, 3, 4 for weeks (will be displayed as weeks)
        } else {
          // For all other timelines: one milestone per month
          targetMonth = i + 1;
        }
        
        console.log(`Creating milestone ${i + 1} with targetMonth: ${targetMonth} for ${timelineMonths}-month plan`);
        
        const savedMilestone = await storage.createMilestone({
          goalId,
          title: milestone.title,
          description: "",
          targetMonth: targetMonth,
          orderIndex: i,
          isCompleted: false,
          completedAt: null,
        });
        
        for (let j = 0; j < milestone.actions.length; j++) {
          const action = milestone.actions[j];
          await storage.createAction({
            milestoneId: savedMilestone.id,
            title: action.title,
            description: "",
            resources: action.resources || null,
            orderIndex: j,
            isCompleted: false,
            completedAt: null,
          });
        }
      }
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error generating plan - Full error:", error);
      console.error("Error details:", {
        message: error.message,
        status: error.status,
        type: error.type,
        stack: error.stack
      });
      res.status(500).json({ 
        message: "Failed to generate plan", 
        error: error.message || "Unknown error" 
      });
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
    
    // Cooking goals
    if (goal.includes('cook') || goal.includes('chef') || goal.includes('kitchen') || goal.includes('recipe') || goal.includes('baking')) {
      return [
        `What is your current cooking experience and what types of dishes can you make now?`,
        `How often do you cook and how much time can you dedicate to cooking practice each week?`,
        `What kitchen equipment and tools do you currently have access to?`,
        `What specific cooking skills or cuisines are you most interested in learning?`,
        `What would being "good at cooking" look like to you - hosting dinner parties, making restaurant-quality meals, or something else?`
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
          completedAt: null,
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
            completedAt: null,
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

  // Daily check-in routes
  app.get('/api/daily-checkin/today', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      
      const checkIn = await storage.getTodayCheckIn(userId, today);
      res.json(checkIn || null);
    } catch (error) {
      console.error("Error fetching today's check-in:", error);
      res.status(500).json({ message: "Failed to fetch today's check-in" });
    }
  });

  app.post('/api/daily-checkin', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { morningIntention, selectedActionId } = req.body;
      const today = new Date().toISOString().split('T')[0];
      
      const checkIn = await storage.createCheckIn({
        userId,
        date: today,
        morningIntention,
        selectedActionId: selectedActionId || null,
      });
      
      res.json(checkIn);
    } catch (error) {
      console.error("Error creating check-in:", error);
      res.status(500).json({ message: "Failed to create check-in" });
    }
  });

  app.put('/api/daily-checkin/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { eveningAccomplished, eveningReflection } = req.body;
      const userId = req.user.claims.sub;
      
      const updates: any = {
        eveningAccomplished,
        eveningReflection,
      };
      
      // If user accomplished their intention, mark as completed and calculate streak
      if (eveningAccomplished === true) {
        updates.isCompleted = true;
        const currentStreak = await storage.calculateStreak(userId);
        updates.currentStreak = currentStreak + 1; // Add 1 for today's completion
      }
      
      const checkIn = await storage.updateCheckIn(Number(id), updates);
      
      // Create or update journal entry when check-in is completed
      if (eveningAccomplished !== null) {
        const today = new Date().toISOString().split('T')[0];
        
        try {
          // Check if journal entry already exists for today
          const existingEntries = await storage.getUserJournalEntries(userId, 1);
          const todayEntry = existingEntries.find(entry => entry.date === today);
          
          const journalData = {
            userId,
            date: today,
            morningIntention: checkIn.morningIntention,
            selectedActionId: checkIn.selectedActionId,
            eveningReflection: checkIn.eveningReflection,
            accomplishmentLevel: eveningAccomplished === true ? 5 : 3, // 5 for accomplished, 3 for progress
            isCompleted: checkIn.isCompleted || false,
            streakCount: checkIn.currentStreak || 0,
          };
          
          if (todayEntry) {
            // Update existing journal entry
            await storage.updateJournalEntry(todayEntry.id, journalData);
          } else {
            // Create new journal entry
            await storage.createJournalEntry(journalData);
          }
        } catch (journalError) {
          console.error("Error creating/updating journal entry:", journalError);
          // Don't fail the check-in if journal creation fails
        }
      }
      
      // Return with celebration data if completed
      const response: any = checkIn;
      if (eveningAccomplished === true) {
        response.celebrationData = {
          streak: updates.currentStreak,
          showCelebration: true
        };
      }
      
      res.json(response);
    } catch (error) {
      console.error("Error updating check-in:", error);
      res.status(500).json({ message: "Failed to update check-in" });
    }
  });

  // Get user's current streak
  app.get('/api/user/streak', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const streak = await storage.calculateStreak(userId);
      res.json({ streak });
    } catch (error) {
      console.error("Error calculating streak:", error);
      res.status(500).json({ message: "Failed to calculate streak" });
    }
  });

  // Journal entry routes
  app.get('/api/journal/entries', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const days = parseInt(req.query.days as string) || 30;
      const goalId = req.query.goalId ? parseInt(req.query.goalId as string) : null;
      
      let entries;
      if (goalId) {
        entries = await storage.getJournalEntriesForGoal(userId, goalId);
      } else {
        entries = await storage.getUserJournalEntries(userId, days);
      }
      
      res.json(entries);
    } catch (error) {
      console.error("Error fetching journal entries:", error);
      res.status(500).json({ message: "Failed to fetch journal entries" });
    }
  });

  app.post('/api/journal/entries', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const entryData = { ...req.body, userId };
      
      const entry = await storage.createJournalEntry(entryData);
      res.json(entry);
    } catch (error) {
      console.error("Error creating journal entry:", error);
      res.status(500).json({ message: "Failed to create journal entry" });
    }
  });

  app.put('/api/journal/entries/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      const entry = await storage.updateJournalEntry(id, updates);
      res.json(entry);
    } catch (error) {
      console.error("Error updating journal entry:", error);
      res.status(500).json({ message: "Failed to update journal entry" });
    }
  });

  app.get('/api/user/incomplete-actions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const actions = await storage.getUserIncompleteActions(userId);
      res.json(actions);
    } catch (error) {
      console.error("Error fetching incomplete actions:", error);
      res.status(500).json({ message: "Failed to fetch incomplete actions" });
    }
  });

  app.get('/api/user/preferences', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const preferences = await storage.getUserPreferences(userId);
      res.json(preferences);
    } catch (error) {
      console.error("Error fetching user preferences:", error);
      res.status(500).json({ message: "Failed to fetch user preferences" });
    }
  });

  app.put('/api/user/preferences', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const preferences = await storage.upsertUserPreferences({
        userId,
        ...req.body,
      });
      res.json(preferences);
    } catch (error) {
      console.error("Error updating user preferences:", error);
      res.status(500).json({ message: "Failed to update user preferences" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

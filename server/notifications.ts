import { storage } from "./storage";
import type { UserPreferences } from "@shared/schema";

interface NotificationScheduler {
  scheduleNotifications(): void;
  sendMorningReminder(userId: string, timezone: string): Promise<void>;
  sendEveningReminder(userId: string, timezone: string): Promise<void>;
}

class LocalNotificationScheduler implements NotificationScheduler {
  private morningIntervals: Map<string, NodeJS.Timeout> = new Map();
  private eveningIntervals: Map<string, NodeJS.Timeout> = new Map();

  scheduleNotifications(): void {
    // Check every hour for users who need notifications
    setInterval(async () => {
      await this.checkForNotifications();
    }, 60 * 60 * 1000); // Every hour

    // Initial check on startup
    this.checkForNotifications();
  }

  private async checkForNotifications(): Promise<void> {
    try {
      // Get all users with notification preferences
      const users = await this.getAllUsersWithPreferences();
      
      for (const user of users) {
        await this.scheduleUserNotifications(user);
      }
    } catch (error) {
      console.error("Error checking for notifications:", error);
    }
  }

  private async getAllUsersWithPreferences(): Promise<Array<{ userId: string; preferences: UserPreferences }>> {
    // This would need to be implemented in storage
    // For now, return empty array - will implement when storage is ready
    return [];
  }

  private async scheduleUserNotifications(user: { userId: string; preferences: UserPreferences }): Promise<void> {
    const { userId, preferences } = user;
    
    if (!preferences.nudgesEnabled) {
      this.clearUserNotifications(userId);
      return;
    }

    const now = new Date();
    const userTimezone = preferences.timezone;
    
    // Calculate next morning notification time (10:00 AM user time)
    const morningTime = this.getNextNotificationTime(
      preferences.morningNudgeTime,
      userTimezone
    );
    
    // Calculate next evening notification time (8:00 PM user time)
    const eveningTime = this.getNextNotificationTime(
      preferences.eveningNudgeTime,
      userTimezone
    );

    // Schedule morning reminder
    if (morningTime > now) {
      this.clearMorningNotification(userId);
      const timeout = setTimeout(async () => {
        await this.sendMorningReminder(userId, userTimezone);
        // Reschedule for next day
        this.scheduleUserNotifications(user);
      }, morningTime.getTime() - now.getTime());
      
      this.morningIntervals.set(userId, timeout);
    }

    // Schedule evening reminder
    if (eveningTime > now) {
      this.clearEveningNotification(userId);
      const timeout = setTimeout(async () => {
        await this.sendEveningReminder(userId, userTimezone);
        // Reschedule for next day
        this.scheduleUserNotifications(user);
      }, eveningTime.getTime() - now.getTime());
      
      this.eveningIntervals.set(userId, timeout);
    }
  }

  private getNextNotificationTime(timeString: string, timezone: string): Date {
    const [hours, minutes] = timeString.split(':').map(Number);
    
    // Get current time in user's timezone
    const now = new Date();
    const userNow = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
    
    // Create notification time for today in user's timezone
    const notificationTime = new Date(userNow);
    notificationTime.setHours(hours, minutes, 0, 0);
    
    // If the time has already passed today, schedule for tomorrow
    if (notificationTime <= userNow) {
      notificationTime.setDate(notificationTime.getDate() + 1);
    }
    
    // Convert back to server timezone
    const timezoneOffset = now.getTimezoneOffset() * 60000;
    const userOffset = (notificationTime.getTime() - userNow.getTime());
    
    return new Date(now.getTime() + userOffset);
  }

  async sendMorningReminder(userId: string, timezone: string): Promise<void> {
    try {
      // Check if user already completed morning check-in
      const today = new Date().toISOString().split('T')[0];
      const existingCheckIn = await storage.getTodayCheckIn(userId, today);
      
      if (existingCheckIn?.morningIntention) {
        // User already completed morning check-in
        return;
      }

      // In a real app, this would send a push notification, email, or SMS
      // For now, we'll log it and potentially use browser notifications
      console.log(`🌅 Morning reminder for user ${userId}: Time to set your daily intention!`);
      
      // Store notification for potential browser display
      await this.logNotification(userId, 'morning', 'Time to set your daily intention and start your day strong!');
      
    } catch (error) {
      console.error(`Error sending morning reminder to user ${userId}:`, error);
    }
  }

  async sendEveningReminder(userId: string, timezone: string): Promise<void> {
    try {
      // Check if user already completed evening reflection
      const today = new Date().toISOString().split('T')[0];
      const existingCheckIn = await storage.getTodayCheckIn(userId, today);
      
      if (existingCheckIn?.eveningAccomplished !== null) {
        // User already completed evening reflection
        return;
      }

      console.log(`🌙 Evening reminder for user ${userId}: Time to reflect on your day!`);
      
      // Store notification for potential browser display
      await this.logNotification(userId, 'evening', 'How did your day go? Take a moment to reflect on your progress.');
      
    } catch (error) {
      console.error(`Error sending evening reminder to user ${userId}:`, error);
    }
  }

  private async logNotification(userId: string, type: 'morning' | 'evening', message: string): Promise<void> {
    // Store notification in a simple log (could be enhanced to store in database)
    const notification = {
      userId,
      type,
      message,
      timestamp: new Date().toISOString(),
      read: false
    };
    
    // In a full implementation, we'd store this in the database for the user to see
    console.log('Notification logged:', notification);
  }

  private clearUserNotifications(userId: string): void {
    this.clearMorningNotification(userId);
    this.clearEveningNotification(userId);
  }

  private clearMorningNotification(userId: string): void {
    const timeout = this.morningIntervals.get(userId);
    if (timeout) {
      clearTimeout(timeout);
      this.morningIntervals.delete(userId);
    }
  }

  private clearEveningNotification(userId: string): void {
    const timeout = this.eveningIntervals.get(userId);
    if (timeout) {
      clearTimeout(timeout);
      this.eveningIntervals.delete(userId);
    }
  }
}

export const notificationScheduler = new LocalNotificationScheduler();

// Enhanced notification service for future web push notifications
export class WebNotificationService {
  static async sendBrowserNotification(title: string, body: string, userId: string): Promise<void> {
    // This would integrate with a web push service like Firebase Cloud Messaging
    // For now, we'll prepare the structure for future implementation
    
    const notificationPayload = {
      title,
      body,
      icon: '/generated-icon.png',
      badge: '/generated-icon.png',
      tag: `reminder-${userId}`,
      data: {
        userId,
        timestamp: Date.now(),
        type: 'daily-reminder'
      },
      actions: [
        {
          action: 'check-in',
          title: 'Start Check-in'
        },
        {
          action: 'dismiss',
          title: 'Dismiss'
        }
      ]
    };
    
    // Log for development - in production this would send actual push notifications
    console.log('Web notification payload prepared:', notificationPayload);
  }
}
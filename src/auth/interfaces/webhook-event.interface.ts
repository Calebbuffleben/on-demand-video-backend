/**
 * Clerk webhook event interface
 * 
 * This interface represents the structure of events received from Clerk webhooks
 */
export interface WebhookEvent {
  /**
   * The type of event (e.g., "user.created", "organization.updated")
   */
  type: string;
  
  /**
   * The data object containing the event details
   */
  data: any;
  
  /**
   * The object that triggered the event
   */
  object: string;
  
  /**
   * The event's unique identifier
   */
  id: string;
} 
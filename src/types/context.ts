import { Context } from "telegraf";

/**
 * FSM states for the bot conversation flow.
 */
export enum BotState {
  IDLE = "IDLE",
  AWAITING_CONTACT = "AWAITING_CONTACT",
  AWAITING_MANUAL_PHONE = "AWAITING_MANUAL_PHONE",
  IDENTIFIED = "IDENTIFIED",
}

/**
 * Session data stored per user.
 */
export interface SessionData {
  state: BotState;
  studentId?: number;
  userId?: number;
  phone?: string;
}

/**
 * Extended Telegraf context with session support.
 */
export interface BotContext extends Context {
  session: SessionData;
}

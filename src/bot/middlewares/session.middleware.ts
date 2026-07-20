import { BotContext, BotState, SessionData } from "../../types/context";

/**
 * In-memory session storage.
 * For production with multiple instances, replace with Redis-backed storage.
 */
const sessions = new Map<string, SessionData>();

/**
 * Get a unique key for each user's session.
 */
function getSessionKey(ctx: BotContext): string | undefined {
  const from = ctx.from;
  if (!from) return undefined;
  const chat = ctx.chat;
  if (!chat) return undefined;
  return `${chat.id}:${from.id}`;
}

/**
 * Default session factory.
 */
function createDefaultSession(): SessionData {
  return {
    state: BotState.IDLE,
  };
}

/**
 * Session middleware that provides FSM state management.
 * Attaches session data to ctx.session and persists it after each update.
 */
export function sessionMiddleware() {
  return async (ctx: BotContext, next: () => Promise<void>) => {
    const key = getSessionKey(ctx);

    if (!key) {
      return next();
    }

    // Load or initialize session
    const session = sessions.get(key) || createDefaultSession();

    // Attach session to context
    ctx.session = session;

    // Process the update
    await next();

    // Persist session after processing
    sessions.set(key, ctx.session);
  };
}

/**
 * Clear a user's session (e.g., on /reset).
 */
export function clearSession(ctx: BotContext): void {
  const key = getSessionKey(ctx);
  if (key) {
    sessions.delete(key);
    ctx.session = createDefaultSession();
  }
}

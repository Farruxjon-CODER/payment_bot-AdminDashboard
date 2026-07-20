import { env } from "./config/env";
import { createBot } from "./bot";
import { PrismaRepository } from "./repositories/prisma.repository";

/**
 * Application entry point.
 * Initializes the bot and starts polling for updates.
 */
async function main(): Promise<void> {
  console.log("🚀 Starting Payment Bot...");
  console.log(`📍 Environment: ${env.NODE_ENV}`);

  // Create bot instance
  const bot = createBot(env.BOT_TOKEN);

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
    bot.stop(signal);
    await PrismaRepository.disconnect();
    console.log("👋 Bot stopped. Goodbye!");
    process.exit(0);
  };

  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));

  // Launch bot
  try {
    await bot.launch();
    console.log("✅ Bot is running! Waiting for messages...");
    console.log(`👤 Admin notifications → Chat ID: ${env.ADMIN_CHAT_ID}`);
    if (env.DIRECTOR_CHAT_ID) {
      console.log(
        `📊 Director reports → Chat ID: ${env.DIRECTOR_CHAT_ID}`
      );
    }
  } catch (error) {
    console.error("❌ Failed to start bot:", error);
    await PrismaRepository.disconnect();
    process.exit(1);
  }
}

main();

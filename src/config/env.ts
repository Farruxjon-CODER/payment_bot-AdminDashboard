import dotenv from "dotenv";
dotenv.config();

// Validate and export all required environment variables
function getEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`❌ Missing required environment variable: ${name}`);
  }
  return value;
}

function getOptionalEnvVar(name: string, defaultValue: string): string {
  return process.env[name] || defaultValue;
}

export const env = {
  // Telegram Bot Token
  BOT_TOKEN: getEnvVar("BOT_TOKEN"),

  // Payment Provider Token (Payme / Click)
  PROVIDER_TOKEN: getEnvVar("PROVIDER_TOKEN"),

  // PostgreSQL connection string
  DATABASE_URL: getEnvVar("DATABASE_URL"),

  // Admin chat ID for real-time notifications
  ADMIN_CHAT_ID: getEnvVar("ADMIN_CHAT_ID"),

  // Director chat ID for reports
  DIRECTOR_CHAT_ID: getOptionalEnvVar("DIRECTOR_CHAT_ID", ""),

  // Node environment
  NODE_ENV: getOptionalEnvVar("NODE_ENV", "development"),
} as const;
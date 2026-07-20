import { PrismaClient } from "@prisma/client";

/**
 * Prisma client singleton.
 * Ensures only one database connection pool is created.
 */
class PrismaRepository {
  private static instance: PrismaClient;

  public static getClient(): PrismaClient {
    if (!PrismaRepository.instance) {
      PrismaRepository.instance = new PrismaClient({
        log:
          process.env.NODE_ENV === "development"
            ? ["query", "error", "warn"]
            : ["error"],
      });
    }
    return PrismaRepository.instance;
  }

  /**
   * Gracefully disconnect from the database.
   */
  public static async disconnect(): Promise<void> {
    if (PrismaRepository.instance) {
      await PrismaRepository.instance.$disconnect();
    }
  }
}

// Export singleton instance
export const prisma = PrismaRepository.getClient();
export { PrismaRepository };

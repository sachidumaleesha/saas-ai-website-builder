import { getUsageStatus } from "@/lib/usage";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

export const usageRouter = createTRPCRouter({
  status: protectedProcedure.query(async ({ ctx }) => {
    try {
      const result = await getUsageStatus(ctx.auth.userId);
      return result;
    } catch (error) {
      console.error("❌ Error in usage status procedure:", error);
      // Return default values if there's an error
      return {
        remainingPoints: 10, // FREE_POINTS
        msBeforeNext: 30 * 24 * 60 * 60 * 1000, // DURATION in milliseconds
      };
    }
  }),
});

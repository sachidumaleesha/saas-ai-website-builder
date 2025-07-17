// Updated usage.ts with debugging
import { auth } from "@clerk/nextjs/server";
import { RateLimiterPrisma } from "rate-limiter-flexible";

import { prisma } from "@/lib/db";

const FREE_POINTS = 10;
const PRO_POINTS = 100;
const PREMIUM_POINTS = 500;
const DURATION = 30 * 24 * 60 * 60;
const GENERATION_COST = 1;

export async function getUsageTracker() {
  const { has } = await auth();
  const hasProAccess = has({ plan: "pro" });
  const hasPremiumAccess = has({ plan: "premium" });

  try {
    const usageTracker = new RateLimiterPrisma({
      storeClient: prisma,
      tableName: "Usage",
      points: hasPremiumAccess
        ? PREMIUM_POINTS
        : hasProAccess
        ? PRO_POINTS
        : FREE_POINTS,
      duration: DURATION,
    });

    return usageTracker;
  } catch (error) {
    console.log("❌ Error creating usage tracker:", error);
    throw new Error(`Failed to initialize usage tracker: ${error}`);
  }
}

export async function consumeCredits(userId: string) {
  console.log("🔍 Starting consumeCredits function");

  console.log("🔍 User ID:", userId);

  if (!userId) {
    console.log("❌ User not authenticated");
    throw new Error("User not authenticated");
  }

  if (GENERATION_COST <= 0) {
    console.log("❌ Generation cost is less than or equal to 0");
    throw new Error("Invalid generation cost configuration");
  }

  console.log("🔍 Creating usage tracker");
  const usageTracker = await getUsageTracker();

  console.log("🔍 About to consume credits for user:", userId);
  console.log("🔍 Generation cost:", GENERATION_COST);

  try {
    const result = await usageTracker.consume(userId, GENERATION_COST);
    console.log("✅ Credits consumed successfully:", result);
    return result;
  } catch (error) {
    console.log("❌ Error consuming credits:", error);
    throw error;
  }
}

export async function getUsageStatus(userId: string) {
  console.log("🔍 Getting usage status");
  console.log("🔍 User ID for status:", userId);

  const { has } = await auth();
  const hasProAccess = has({ plan: "pro" });
  const hasPremiumAccess = has({ plan: "premium" });

  if (!userId) {
    console.log("❌ User not authenticated for status");
    throw new Error("User not authenticated");
  }

  const usageTracker = await getUsageTracker();

  try {
    const result = await usageTracker.get(userId);
    console.log("✅ Usage status retrieved:", result);

    // If no usage record exists, return default values
    if (result === null) {
      console.log("🔍 No usage record found, returning default values");
      return {
        remainingPoints: hasPremiumAccess
          ? PREMIUM_POINTS
          : hasProAccess
          ? PRO_POINTS
          : FREE_POINTS,
        msBeforeNext: DURATION * 1000,
      };
    }

    return {
      remainingPoints: result.remainingPoints || 0,
      msBeforeNext: result.msBeforeNext || 0,
    };
  } catch (error) {
    console.log("❌ Error getting usage status:", error);
    throw error;
  }
}

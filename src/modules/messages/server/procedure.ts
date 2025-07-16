import z from "zod";
import { TRPCError } from "@trpc/server";

import { inngest } from "@/inngest/client";
import { prisma } from "@/lib/db";
import { getUsageStatus } from "@/lib/usage";
import { protectedProcedure, createTRPCRouter } from "@/trpc/init";

export const messageRouter = createTRPCRouter({
  getMany: protectedProcedure
    .input(
      z.object({
        projectId: z.string().min(1, { message: "Project ID is required" }),
      })
    )
    .query(async ({ input, ctx }) => {
      const messages = await prisma.message.findMany({
        where: {
          projectId: input.projectId,
          project: {
            userId: ctx.auth.userId,
          },
        },
        orderBy: {
          updatedAt: "asc",
        },
        include: {
          fragment: true,
        },
      });
      return messages;
    }),
  create: protectedProcedure
    .input(
      z.object({
        value: z.string().min(1, { message: "Message is required" }).max(1000, {
          message: "Message is too long",
        }),
        projectId: z.string().min(1, { message: "Project ID is required" }),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { remainingPoints } = await getUsageStatus(ctx.auth.userId);

      if (remainingPoints <= 0) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "You have run out of credits. Please upgrade your plan.",
        });
      }

      const existingProject = await prisma.project.findUnique({
        where: {
          id: input.projectId,
          userId: ctx.auth.userId,
        },
      });

      if (!existingProject) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }

      const createdMessage = await prisma.message.create({
        data: {
          projectId: existingProject.id,
          content: input.value,
          role: "USER",
          type: "RESULT",
        },
      });

      await inngest.send({
        name: "code-agent/run",
        data: {
          value: input.value,
          projectId: input.projectId,
          userId: ctx.auth.userId,
        },
      });

      return createdMessage;
    }),
});

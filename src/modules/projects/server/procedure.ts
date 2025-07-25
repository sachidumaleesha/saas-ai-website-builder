import z from "zod";
import { prisma } from "@/lib/db";
import { generateSlug } from "random-word-slugs";
import { inngest } from "@/inngest/client";
import { getUsageStatus } from "@/lib/usage";

import { protectedProcedure, createTRPCRouter } from "@/trpc/init";
import { TRPCError } from "@trpc/server";

export const projectRouter = createTRPCRouter({
  getOne: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1, { message: "Project ID is required" }),
      })
    )
    .query(async ({ input, ctx }) => {
      const existingProject = await prisma.project.findUnique({
        where: {
          id: input.id,
          userId: ctx.auth.userId,
        },
      });

      if (!existingProject) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }
      return existingProject;
    }),
  getMany: protectedProcedure.query(async ({ ctx }) => {
    const projects = await prisma.project.findMany({
      where: {
        userId: ctx.auth.userId,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });
    return projects;
  }),
  create: protectedProcedure
    .input(
      z.object({
        value: z.string().min(1, { message: "Prompt is required" }).max(1000, {
          message: "Prompt is too long",
        }),
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

      const createdProject = await prisma.project.create({
        data: {
          userId: ctx.auth.userId,
          name: generateSlug(2, {
            format: "kebab",
          }),
          messages: {
            create: {
              content: input.value,
              role: "USER",
              type: "RESULT",
            },
          },
        },
      });

      await inngest.send({
        name: "code-agent/run",
        data: {
          value: input.value,
          projectId: createdProject.id,
          userId: ctx.auth.userId,
        },
      });

      return createdProject;
    }),
});

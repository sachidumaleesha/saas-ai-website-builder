import { createTRPCRouter } from "../init";

import { usageRouter } from "@/modules/usage/server/procedure";
import { messageRouter } from "@/modules/messages/server/procedure";
import { projectRouter } from "@/modules/projects/server/procedure";

export const appRouter = createTRPCRouter({
  usage: usageRouter,
  messages: messageRouter,
  projects: projectRouter,
});
// export type definition of API
export type AppRouter = typeof appRouter;

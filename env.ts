import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";
 
export const env = createEnv({
  server: {
    APP_URL: z.string().url(),
    DATABASE_URL: z.string().url(),
  },
  experimental__runtimeEnv: {}
});
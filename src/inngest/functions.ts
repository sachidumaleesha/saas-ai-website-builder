import { inngest } from "./client";

import { openai, createAgent } from "@inngest/agent-kit";

export const helloWorld = inngest.createFunction(
  { id: "hello-world" },
  { event: "test/hello.world" },
  async ({ event }) => {
    const codeAgent = createAgent({
      name: "codeAgent",
      system:
        "You are an expert codeAgent.  You generate resuable and maintainable code based on the input.",
      model: openai({ model: "gpt-4o" }),
    });

    // Run the agent with an input.  This automatically uses steps
    // to call your AI model.
    const { output } = await codeAgent.run(
      `Generate code for this: ${event.data.value}`
    );

    return { output }
    // console.log(output);
  }
);

import { z } from "zod";
import { prisma } from "@/lib/db";
import { inngest } from "./client";
import { TRPCError } from "@trpc/server";

import { consumeCredits } from "@/lib/usage";
import Sandbox from "@e2b/code-interpreter";
import {
  createAgent,
  openai,
  gemini,
  createTool,
  createNetwork,
  type Tool,
  type Message,
  createState,
} from "@inngest/agent-kit";

import { PROMPT, FRAGMENT_TITLE_PROMPT, RESPONSE_PROMPT } from "@/prompt";
import { getSandbox, lastAssistantTextMessageContent, parseAgentOutput } from "./utils";

interface AgentState {
  summary: string;
  files: { [path: string]: string };
}

export const codeAgentFunction = inngest.createFunction(
  { id: "code-agent" },
  { event: "code-agent/run" },
  async ({ event, step }) => {
    const sandboxId = await step.run("get-sandbox-id", async () => {
      const sandbox = await Sandbox.create("vibe-nextjs-sandbox4");
      return sandbox.sandboxId;
    });

    const previousMessages = await step.run(
      "get-previous-messages",
      async () => {
        const formatedMessages: Message[] = [];
        const messages = await prisma.message.findMany({
          where: {
            projectId: event.data.projectId,
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 10,
        });

        for (const message of messages) {
          formatedMessages.push({
            type: "text",
            role: message.role === "ASSISTANT" ? "assistant" : "user",
            content: message.content,
          });
        }

        return formatedMessages;
      }
    );

    const state = createState<AgentState>(
      {
        summary: "",
        files: {},
      },
      {
        messages: previousMessages,
      }
    );

    const terminalTool = createTool({
      name: "terminal",
      description:
        "Use this tool to run terminal commands, check file structure, install dependencies, or execute any command line operations",
      parameters: z.object({
        command: z.string(),
      }),
      handler: async ({ command }, { step }) => {
        return await step?.run("terminal", async () => {
          const buffers = { stdout: "", stderr: "" };
          try {
            const sandbox = await getSandbox(sandboxId);
            const result = await sandbox.commands.run(command, {
              onStdout: (data: string) => {
                buffers.stdout += data;
              },
              onStderr: (data: string) => {
                buffers.stderr += data;
              },
            });

            return result.stdout;
          } catch (err) {
            console.error(
              "command failed : ${err} \nstdout: ${buffers.stdout}\nstderr: ${buffers.stderr}"
            );
            return "command failed : ${err} \nstdout: ${buffers.stdout}\nstderr: ${buffers.stderr}";
          }
        });
      },
    });

    const createOrUpdateFiles = createTool({
      name: "createOrUpdateFiles",
      description: "create or Update files in the sandbox",
      parameters: z.object({
        files: z.array(
          z.object({
            path: z.string(),
            content: z.string(),
          })
        ),
      }),
      handler: async (
        { files },
        { step, network }: Tool.Options<AgentState>
      ) => {
        const newFiles = await step?.run("createOrUpdateFiles", async () => {
          try {
            const updatedFiles = network.state.data.files || {};

            const sandbox = await getSandbox(sandboxId);
            for (const file of files) {
              await sandbox.files.write(file.path, file.content);
              updatedFiles[file.path] = file.content;
            }

            return updatedFiles;
          } catch (err) {
            console.error("command failed : ${err}");

            return "command failed : ${err}";
          }
        });

        if (typeof newFiles === "object") {
          network.state.data.files = newFiles;
        }
      },
    });

    const readFiles = createTool({
      name: "readFiles",
      description: "readFiles from sandbox",
      parameters: z.object({
        files: z.array(z.string()),
      }),

      handler: async ({ files }, { step }) => {
        return await step?.run("readFiles", async () => {
          try {
            const sandbox = await getSandbox(sandboxId);
            const contents = [];

            for (const file of files) {
              const content = await sandbox.files.read(file);
              contents.push({ path: file, content });
            }

            return JSON.stringify(contents);
          } catch (err) {
            console.error("command failed : ${err}");
            return "command failed : ${err}";
          }
        });
      },
    });

    const geminiCodeAgent = createAgent<AgentState>({
      name: "geminiCodeAgent",
      description: "An expert Coding Agent",
      system: PROMPT,
      // system: `You are an expert frontend developer. You have access to several tools to help you:
      //   1. Use the 'terminal' tool to run commands and check the system
      //   2. Use the 'createOrUpdateFiles' tool to create or modify files
      //   3. Use the 'readFiles' tool to read existing files

      //   Always use these tools when you need to interact with the file system or run commands.
      //   Start by reading files to understand the current state, then make necessary changes.

      //   Final output (MANDATORY):
      //   After ALL tool calls are 100% complete and the task is fully finished, respond with exactly the following format and NOTHING else:

      //   <task_summary>
      //   A short, high-level summary of what was created or changed.
      //   </task_summary>

      //   This marks the task as FINISHED. Do not include this early. Do not wrap it in backticks. Do not print it after each step. Print it once, only at the very end — never during or between tool usage.

      //   ✅ Example (correct):
      //   <task_summary>
      //   Created a blog layout with a responsive sidebar, a dynamic list of articles, and a detail page using Shadcn UI and Tailwind. Integrated the layout in app/page.tsx and added reusable components in app/.
      //   </task_summary>

      //   ❌ Incorrect:
      //   - Wrapping the summary in backticks
      //   - Including explanation or code after the summary
      //   - Ending without printing <task_summary>

      //   This is the ONLY valid way to terminate your task. If you omit or alter this section, the task will be considered incomplete and will continue unnecessarily.
      //   `,
      model: gemini({
        model: "gemini-2.0-flash",
      }),
      tools: [terminalTool, createOrUpdateFiles, readFiles],
      lifecycle: {
        onResponse: async ({ result, network }) => {
          const lastAssistantMessageText =
            lastAssistantTextMessageContent(result);
          if (lastAssistantMessageText && network) {
            if (lastAssistantMessageText?.includes("<task_summary>")) {
              network.state.data.summary = lastAssistantMessageText;
            }
          }

          return result;
        },
      },
    });

    const openAiCodeAgent = createAgent<AgentState>({
      name: "openAICodeAgent ",
      description: "An expert Coding Agent",
      system: PROMPT,
      // system: `You are an expert frontend developer. You have access to several tools to help you:
      //   1. Use the 'terminal' tool to run commands and check the system
      //   2. Use the 'createOrUpdateFiles' tool to create or modify files
      //   3. Use the 'readFiles' tool to read existing files

      //   use use client directive only in client side code.

      //   Always use these tools when you need to interact with the file system or run commands.
      //   Start by reading files to understand the current state, then make necessary changes.`,
      model: openai({
        model: "gpt-4o",
        baseUrl: "https://api.moonshot.ai/v1",
        apiKey: "sk-U3wXmdwO0Ly4rEwYq7LnxFK3sfgvg04bDllqCbVwvcxY7hmJ",
      }),
      tools: [terminalTool, createOrUpdateFiles, readFiles],
      lifecycle: {
        onResponse: async ({ result, network }) => {
          const lastAssistantMessageText =
            lastAssistantTextMessageContent(result);
          if (lastAssistantMessageText && network) {
            if (lastAssistantMessageText?.includes("<task_summary>")) {
              network.state.data.summary = lastAssistantMessageText;
            }
          }

          return result;
        },
      },
    });

    const network = createNetwork<AgentState>({
      name: "coding-agent-network",
      agents: [geminiCodeAgent],
      maxIter: 15,
      defaultState: state,
      router: async ({ network, callCount }) => {
        const summary = network.state.data.summary;

        if (callCount > 5) {
          return undefined;
        }

        if (summary) {
          return undefined;
        }
        return geminiCodeAgent;
      },
    });

    const result = await network.run(event.data.value, {
      state,
    });

    const fragmentTitleGenerator = createAgent<AgentState>({
      name: "fragment-title-generator",
      description: "A fragment title generator",
      system: FRAGMENT_TITLE_PROMPT,
      model: gemini({
        model: "gemini-2.0-flash",
      }),
    });

    const responseGenerator = createAgent<AgentState>({
      name: "response-generator",
      description: "A response generator",
      system: RESPONSE_PROMPT,
      model: gemini({
        model: "gemini-2.0-flash",
      }),
    });

    const { output: fragmentTitleOutput } = await fragmentTitleGenerator.run(
      result.state.data.summary
    );
    const { output: responseOutput } = await responseGenerator.run(
      result.state.data.summary
    );

    const isError =
      !result.state.data.summary ||
      Object.keys(result.state.data.files || {}).length === 0;

    const sandboxUrl = await step.run("get-sandbox-url", async () => {
      try {
        const sandbox = await getSandbox(sandboxId);
        const host = sandbox.getHost(3000);
        const url = `https://${host}`;
        console.log(`Sandbox URL generated: ${url}`);
        return url;
      } catch (error) {
        console.error("Failed to get sandbox URL:", error);
        throw new Error(`URL generation failed: ${error}`);
      }
    });

    await step.run("save-result", async () => {
      if (isError) {
        return await prisma.message.create({
          data: {
            projectId: event.data.projectId,
            content: "Something went wrong. Please try again.",
            role: "ASSISTANT",
            type: "ERROR",
          },
        });
      }

      //save the result to the database
      return await prisma.message.create({
        data: {
          projectId: event.data.projectId,
          content: parseAgentOutput(responseOutput),
          role: "ASSISTANT",
          type: "RESULT",
          fragment: {
            create: {
              sandBoxUrl: sandboxUrl,
              title: parseAgentOutput(fragmentTitleOutput),
              files: result.state.data.files,
            },
          },
        },
      });
    });

    if (!isError) {
      try {
        await consumeCredits(event.data.userId);
        console.log("✅ Credits consumed successfully");
      } catch (error) {
        // Check if it's a rate limit error (out of credits)
        if (error && typeof error === "object" && "remainingPoints" in error) {
          console.log("❌ Out of credits");
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: "You have run out of credits",
          });
        }

        // For any other error
        console.log("❌ Something went wrong while consuming credits");
        // We don't re-throw here because the main task succeeded.
        // We can log this for monitoring.
      }
    }

    return {
      url: sandboxUrl,
      title: "Fragment",
      files: result.state.data.summary,
    };
  }
);

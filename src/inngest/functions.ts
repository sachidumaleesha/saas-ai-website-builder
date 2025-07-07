import { z } from "zod";
import { inngest } from "./client";
import Sandbox from "@e2b/code-interpreter";
import {
  createAgent,
  openai,
  createTool,
  createNetwork,
  type Tool,
} from "@inngest/agent-kit";
import { getSandbox, lastAssistantTextMessageContent } from "./utils";

import { PROMPT } from "@/prompt";
import { prisma } from "@/lib/db";

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

    const terminalTool = createTool({
      name: "terminal",
      description: "Use the terminal to run commands",
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

    const openAiCodeAgent = createAgent<AgentState>({
      name: "openAICodeAgent ",
      description: "An expert Coding Agent",
      // system: PROMPT,
      system: "You are an expert frontend developer",
      model: openai({
        model: "gpt-4o",
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
      agents: [openAiCodeAgent],
      maxIter: 15,
      // defaultState : state,
      router: async ({ network }) => {
        const summary = network.state.data.summary;

        if (summary) {
          return;
        }
        return openAiCodeAgent;
      },
    });

    const result = await network.run(event.data.value);

    const isErorr =
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
      if (isErorr) {
        return await prisma.message.create({
          data: {
            projectId: event.data.projectId,
            content: "Something went wrong",
            role: "ASSISTANT",
            type: "ERROR",
          },
        });
      }

      //save the result to the database
      return await prisma.message.create({
        data: {
          projectId: event.data.projectId,
          content: "Something went wrong",
          role: "ASSISTANT",
          type: "RESULT",
          fragment: {
            create: {
              sandBoxUrl: sandboxUrl,
              title: "Fragment",
              files: result.state.data.files,
            },
          },
        },
      });
    });

    return {
      url: sandboxUrl,
      title: "Fragment",
      files: result.state.data.summary,
    };
  }
);

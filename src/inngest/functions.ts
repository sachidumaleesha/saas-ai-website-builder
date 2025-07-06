import z from "zod";
import { PROMPT, PROMPT2 } from "@/prompt";
import { inngest } from "./client";
import { getSandbox, lastAssistantTextMessageContent } from "./utils";
import { Sandbox } from "@e2b/code-interpreter";
import {
  openai,
  createAgent,
  createTool,
  createNetwork,
  gemini,
} from "@inngest/agent-kit";

// Define the network state interface
interface NetworkState {
  files?: Record<string, string>;
  summary?: string;
}

export const helloWorld = inngest.createFunction(
  { id: "hello-world" },
  { event: "test/hello.world" },
  async ({ event, step }) => {
    // Enhanced sandbox creation with error handling
    const sandboxId = await step.run("get-sandbox-id", async () => {
      try {
        const sandbox = await Sandbox.create("vibe-nextjs-sandbox4");
        console.log(`Sandbox created with ID: ${sandbox.sandboxId}`);
        return sandbox.sandboxId;
      } catch (error) {
        console.error("Failed to create sandbox:", error);
        throw new Error(`Sandbox creation failed: ${error}`);
      }
    });

    // Enhanced terminal tool - remove step.run from handler
    const terminalTool = createTool({
      name: "terminal",
      description: "Use the terminal to run commands",
      parameters: z.object({
        command: z.string(),
      }),
      handler: async ({ command }) => {
        console.log("🔧 Terminal tool called with command:", command);

        const buffers = {
          stdout: "",
          stderr: "",
        };

        try {
          const sandbox = await getSandbox(sandboxId);
          console.log(`Executing command: ${command}`);

          const result = await sandbox.commands.run(command, {
            onStdout: (data: string) => {
              buffers.stdout += data;
              console.log(`STDOUT: ${data}`);
            },
            onStderr: (data: string) => {
              buffers.stderr += data;
              console.log(`STDERR: ${data}`);
            },
          });

          console.log(`Command completed with exit code: ${result.exitCode}`);

          return {
            success: result.exitCode === 0,
            exitCode: result.exitCode,
            stdout: result.stdout || buffers.stdout,
            stderr: buffers.stderr,
          };
        } catch (e) {
          const errorMessage = `Command failed: ${e}\nstdout: ${buffers.stdout}\nstderr: ${buffers.stderr}`;
          console.error(errorMessage);
          return {
            success: false,
            error: errorMessage,
            stdout: buffers.stdout,
            stderr: buffers.stderr,
          };
        }
      },
    });

    // Enhanced file creation tool - remove step.run from handler
    const createOrUpdateFileTool = createTool({
      name: "createOrUpdateFile",
      description: "Use this to create or update files in the sandbox",
      parameters: z.object({
        files: z.array(
          z.object({
            path: z.string(),
            content: z.string(),
          })
        ),
      }),
      handler: async ({ files }, { network }) => {
        console.log("🔧 createOrUpdateFileTool called with:", {
          filesCount: files.length,
          filePaths: files.map((f) => f.path),
          hasNetwork: !!network,
          networkStateData: network?.state.data,
        });

        try {
          const updateFiles =
            (network?.state.data as NetworkState)?.files || {};
          console.log(
            "📁 Current files in network state:",
            Object.keys(updateFiles)
          );

          const sandbox = await getSandbox(sandboxId);
          console.log("📦 Sandbox obtained successfully");

          for (const file of files) {
            console.log(`📝 Creating/updating file: ${file.path}`);
            console.log(`📄 Content length: ${file.content.length} characters`);

            await sandbox.files.write(file.path, file.content);
            updateFiles[file.path] = file.content;

            console.log(`✅ Successfully wrote file: ${file.path}`);
          }

          console.log(`🎉 Successfully updated ${files.length} files`);
          console.log("📂 Final updateFiles keys:", Object.keys(updateFiles));

          // Update network state
          if (network) {
            (network.state.data as NetworkState).files = updateFiles;
            console.log(
              "💾 Network state updated with files:",
              Object.keys(updateFiles)
            );
          }

          return {
            success: true as const,
            filesUpdated: files.length,
            files: updateFiles,
          };
        } catch (e) {
          console.error("💥 File creation error:", e);
          return {
            success: false as const,
            error: `Error creating files: ${e}`,
          };
        }
      },
    });

    // Enhanced file reading tool - remove step.run from handler
    const readFileTool = createTool({
      name: "readFile",
      description: "Use this to read files in the sandbox",
      parameters: z.object({
        files: z.array(z.string()),
      }),
      handler: async ({ files }) => {
        console.log("🔧 readFile tool called with:", files);

        try {
          const sandbox = await getSandbox(sandboxId);
          const contents: any[] = [];

          for (const file of files) {
            console.log(`Reading file: ${file}`);
            try {
              const content = await sandbox.files.read(file);
              contents.push({
                path: file,
                content,
                success: true,
              });
            } catch (fileError) {
              contents.push({
                path: file,
                error: `Failed to read ${file}: ${fileError}`,
                success: false,
              });
            }
          }

          console.log(`Successfully processed ${files.length} files`);
          return {
            success: true,
            files: contents,
            summary: JSON.stringify(contents, null, 2),
          };
        } catch (e) {
          console.error("File reading error:", e);
          return {
            success: false,
            error: `Error reading files: ${e}`,
          };
        }
      },
    });

    // Enhanced agent with better configuration
    const OpenAICodeAgent = createAgent<NetworkState>({
      name: "codeAgent",
      description: "An Expert Coding Agent specialized in Next.js development",
      system: PROMPT2,
      model: openai({
        model: "gpt-4o",
        defaultParameters: {
          temperature: 0.1,
        },
      }),
      tools: [terminalTool, createOrUpdateFileTool, readFileTool],
      lifecycle: {
        onResponse: async ({ result, network }) => {
          console.log("🤖 Agent response lifecycle triggered");

          const lastAssistantMessageText =
            lastAssistantTextMessageContent(result);

          if (lastAssistantMessageText && network) {
            console.log(
              "📝 Agent response received:",
              lastAssistantMessageText.substring(0, 200) + "..."
            );

            // Debug network state
            const currentNetworkState = network.state.data as NetworkState;
            console.log("🌐 Current network state:", {
              hasFiles: !!currentNetworkState.files,
              filesCount: currentNetworkState.files
                ? Object.keys(currentNetworkState.files).length
                : 0,
              hasSummary: !!currentNetworkState.summary,
            });

            if (lastAssistantMessageText.includes("<task_summary>")) {
              (network.state.data as NetworkState).summary =
                lastAssistantMessageText;
              console.log("📋 Task summary captured");
            }
          }

          return result;
        },
      },
    });

    // Run the agent directly instead of using a network
    // This is the key change - bypass the network routing issue
    // Enhanced network with better routing logic
    /*
    const network = createNetwork<NetworkState>({
      name: "code-agent-network",
      agents: [OpenAICodeAgent],
      maxIter: 10,
      router: async ({ network }) => {
        const summary = (network.state.data as NetworkState).summary;

        if (summary) {
          console.log("Task completed, stopping network");
          return;
        }

        console.log("Routing to code agent");
        return OpenAICodeAgent;
      },
    });

    // Run the network with enhanced logging

    
    console.log(`Starting network with input: ${event.data.value}`);
    const result = await network.run(event.data.value);
    console.log("Network execution completed");
*/
    
    // Get sandbox URL with error handling
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

    console.log(`Starting agent with input: ${event.data.value}`);

    const result = await step.run("run-agent", async () => {
      const agentNetwork = createNetwork<NetworkState>({
        name: "code-agent-network",
        agents: [OpenAICodeAgent],
        maxIter: 10, // Reduced from 20
        router: async ({ network }) => {
          const summary = (network.state.data as NetworkState).summary;

          if (summary) {
            console.log("Task completed, stopping network");
            return; // This stops the network
          }

          console.log("Routing to code agent");
          return OpenAICodeAgent;
        },
      });

      return await agentNetwork.run(event.data.value);
    });

    console.log("Agent execution completed");

    // Enhanced response with metadata
    const networkState = result.state.data as NetworkState;

    console.log("🏁 Final network state before response:", {
      hasFiles: !!networkState.files,
      filesCount: networkState.files
        ? Object.keys(networkState.files).length
        : 0,
      fileKeys: networkState.files ? Object.keys(networkState.files) : [],
      hasSummary: !!networkState.summary,
    });

    const response = {
      url: sandboxUrl,
      title: "Generated Application",
      files: networkState.files || {},
      summary: networkState.summary || "Application generated successfully",
      sandboxId: sandboxId,
      timestamp: new Date().toISOString(),
      filesCount: Object.keys(networkState.files || {}).length,
    };

    console.log("📤 Final response:", {
      filesCount: response.filesCount,
      hasFiles: Object.keys(response.files).length > 0,
      fileKeys: Object.keys(response.files),
    });

    console.log("Function completed successfully:", response);
    return response;
  }
);

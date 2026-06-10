import { getModel } from "@earendil-works/pi-ai";
import { Type } from "typebox";
import {
  AuthStorage,
  createAgentSession,
  DefaultResourceLoader,
  defineTool,
  ModelRegistry,
  SessionManager,
  SettingsManager,
} from "@earendil-works/pi-coding-agent";
import { getRedisConnection } from "./redisClient";
import fs, { Utf8Stream } from "fs";
import type { chatRequest } from "./types/index";

// Set up auth storage (custom location)
const authStorage = AuthStorage.create("/custom/agent/auth.json");

// Runtime API key override (not persisted)
if (process.env.ANTHROPIC_API) {
  authStorage.setRuntimeApiKey("anthropic", process.env.ANTHROPIC_API);
}

// Model registry (no custom models.json)
const modelRegistry = ModelRegistry.create(authStorage);

// Inline tool
const statusTool = defineTool({
  name: "Status",
  label: "Status",
  description: "run a shell command",
  parameters: Type.Object({}),
  execute: async () => ({
    content: [{ type: "text", text: `Uptime: ${process.uptime()}s` }],
    details: {},
  }),
});

const model = getModel("anthropic", "claude-haiku-4-5");
if (!model) throw new Error("Model not found");

// In-memory settings with overrides
const settingsManager = SettingsManager.inMemory({
  compaction: { enabled: false },
  retry: { enabled: true, maxRetries: 2 },
});

const loader = new DefaultResourceLoader({
  cwd: process.cwd(),
  agentDir: "/custom/agent",
  settingsManager,
  systemPromptOverride: () => "You are a minimal assistant. Be concise.",
});
await loader.reload();

const { session } = await createAgentSession({
  cwd: process.cwd(),
  agentDir: "/custom/agent",

  model,
  thinkingLevel: "off",
  authStorage,
  modelRegistry,

  tools: ["read", "bash", "status"],
  customTools: [statusTool],
  resourceLoader: loader,

  sessionManager: SessionManager.inMemory(),
  settingsManager,
});

let data: chatRequest;

const redisClient = await getRedisConnection();

let initialConvo;

let response = await redisClient.brPop("chat-session-req", 0);
if (!response) {
  throw new Error("no response");
}

data = JSON.parse(response.element);
console.log("extracted from the queue", data);

const fileExist = fs.existsSync(data.sessionId);
console.log("value for fileExists : ", fileExist);

const sessionsDir = "./sessions";

if (!fs.existsSync(sessionsDir)) {
  fs.mkdirSync(sessionsDir, { recursive: true });
}

if (fileExist) {
  initialConvo = fs.readFile(
    `./sessions/${data.sessionId}`,
    "utf8",
    (err, data) => {
      if (err) {
        console.log(err);
      }
      console.log(data);
    },
  );
} else {
  const filePath = `./sessions/${data.sessionId}.json`;

  console.log("creating a new file...", filePath);

  fs.writeFile(
    filePath,
    JSON.stringify(
      {
        user: data.prompt,
      },
      null,
      2,
    ),
    "utf-8",
    (err) => {
      if (err) {
        console.error("Error writing file:", err);
        return;
      }

      console.log("File created and written successfully!");
    },
  );
}

let done = false;

session.subscribe(async (event) => {
  if (
    event.type === "message_update" &&
    event.assistantMessageEvent.type === "text_delta"
  ) {
    process.stdout.write(event.assistantMessageEvent.delta);
  }
});

let aiResponse: any = await session.prompt(data.prompt);
const startTime = Date.now();
const timeout = 30 * 1000;

while (!done && Date.now() - startTime < timeout) {
  console.log("\n\nrunning the loop");
  const userPrompt = data.prompt;
  aiResponse = await session.prompt(
    `this is the initial user prompt: ${userPrompt} \n\n this is the AI Response: ${aiResponse} \n\n, is the users request has been satisfied return only one word as "EXECUTED" and nothing else `,
  );
  console.log("\n\n response : \n", aiResponse);
  if (aiResponse === "EXECUTED") {
    done = true;
    console.log("\n\nexiting cause request is satisfied");
  }

  await new Promise((resolve) => setTimeout(resolve, 1000));

  if (Date.now() - startTime > timeout) {
    console.log("\n\nexiting cause timeout");
  }
}

import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  registerAppResource,
  registerAppTool,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

const WIDGET_URI = "ui://lk-uni/dashboard-v1.html";
const widgetHtml = readFileSync(
  fileURLToPath(new URL("./public/dashboard.html", import.meta.url)),
  "utf8",
);

const access = {
  contour: "user_app",
  projectName: "DevHub",
  role: "user",
  mode: "read_mostly",
  allowedActions: [
    "Просмотр собственного профиля",
    "Просмотр собственных способов входа",
    "Просмотр собственных активных сессий",
  ],
  protectedScopes: [
    "Настройки проекта",
    "Пользователи проекта",
    "Глобальные политики Lk_uni",
    "Архитектурные и концептуальные настройки",
  ],
};

const profile = {
  id: "demo-user-001",
  displayName: "Иван",
  status: "active",
  identities: [
    { provider: "phone", label: "+7 *** *** 12 34", verified: true },
    { provider: "email", label: "i***@mail.ru", verified: true },
    { provider: "max", label: "Аккаунт привязан", verified: true },
    { provider: "telegram", label: "Не привязан", verified: false },
  ],
};

const security = {
  score: 82,
  activeSessions: 2,
  lastLogin: "2026-07-12T15:20:00Z",
  recommendations: [
    "Привязать резервный канал Telegram",
    "Проверить активные устройства",
  ],
};

const emptyInputSchema = {};

const accessOutputSchema = {
  view: z.literal("access"),
  access: z.object({
    contour: z.literal("user_app"),
    projectName: z.string(),
    role: z.literal("user"),
    mode: z.literal("read_mostly"),
    allowedActions: z.array(z.string()),
    protectedScopes: z.array(z.string()),
  }),
};

const profileOutputSchema = {
  view: z.literal("profile"),
  profile: z.object({
    id: z.string(),
    displayName: z.string(),
    status: z.string(),
    identities: z.array(z.object({
      provider: z.string(),
      label: z.string(),
      verified: z.boolean(),
    })),
  }),
};

const securityOutputSchema = {
  view: z.literal("security"),
  security: z.object({
    score: z.number(),
    activeSessions: z.number(),
    lastLogin: z.string(),
    recommendations: z.array(z.string()),
  }),
};

function toolMeta(invoking, invoked) {
  return {
    ui: { resourceUri: WIDGET_URI },
    "openai/outputTemplate": WIDGET_URI,
    "openai/toolInvocation/invoking": invoking,
    "openai/toolInvocation/invoked": invoked,
  };
}

function createLkUniServer() {
  const server = new McpServer(
    { name: "lk-uni", version: "0.1.0" },
    {
      instructions:
        "This is the Lk_uni User App contour. It may access only the authenticated user's own profile, identities, and sessions. Never expose project administration or platform-owner policies. The current version is read-only and never returns credentials or unmasked personal data.",
    },
  );

  registerAppResource(server, "lk-uni-dashboard", WIDGET_URI, {}, async () => ({
    contents: [{
      uri: WIDGET_URI,
      mimeType: RESOURCE_MIME_TYPE,
      text: widgetHtml,
      _meta: {
        ui: {
          prefersBorder: true,
          csp: { connectDomains: [], resourceDomains: [] },
        },
        "openai/widgetDescription":
          "Интерактивный кабинет Lk_uni: проект, способы входа и состояние безопасности.",
      },
    }],
  }));

  registerAppTool(server, "get_my_access_summary", {
    title: "Мои права в Lk_uni",
    description: "Use this when the user wants to understand what their User App can access and which settings are protected.",
    inputSchema: emptyInputSchema,
    outputSchema: accessOutputSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false, idempotentHint: true },
    _meta: toolMeta("Проверяю доступ…", "Права доступа готовы"),
  }, async () => ({
    structuredContent: { view: "access", access },
    content: [{ type: "text", text: "Показываю границы пользовательского контура Lk_uni." }],
  }));

  registerAppTool(server, "get_my_profile", {
    title: "Мой профиль Lk_uni",
    description: "Use this when the user wants to see their Lk_uni profile and linked sign-in identities.",
    inputSchema: emptyInputSchema,
    outputSchema: profileOutputSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false, idempotentHint: true },
    _meta: toolMeta("Загружаю профиль…", "Профиль готов"),
  }, async () => ({
    structuredContent: { view: "profile", profile },
    content: [{ type: "text", text: "Показываю демонстрационный профиль и связанные способы входа." }],
  }));

  registerAppTool(server, "get_security_status", {
    title: "Безопасность моего аккаунта Lk_uni",
    description: "Use this when the user wants to review account security, sessions, or recommended actions.",
    inputSchema: emptyInputSchema,
    outputSchema: securityOutputSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false, idempotentHint: true },
    _meta: toolMeta("Проверяю безопасность…", "Проверка завершена"),
  }, async () => ({
    structuredContent: { view: "security", security },
    content: [{ type: "text", text: `Оценка безопасности аккаунта: ${security.score} из 100.` }],
  }));

  return server;
}

const port = Number(process.env.PORT ?? 8787);
const MCP_PATH = "/mcp";

const httpServer = createServer(async (req, res) => {
  if (!req.url) return res.writeHead(400).end("Missing URL");
  const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);

  if (req.method === "OPTIONS" && url.pathname === MCP_PATH) {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "content-type, mcp-session-id, last-event-id",
      "Access-Control-Expose-Headers": "Mcp-Session-Id",
    });
    return res.end();
  }

  if (req.method === "GET" && url.pathname === "/") {
    res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
    return res.end(JSON.stringify({ name: "Lk_uni ChatGPT App", mcp: MCP_PATH, status: "ok" }));
  }

  if (url.pathname === MCP_PATH && ["POST", "GET", "DELETE"].includes(req.method ?? "")) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");
    const server = createLkUniServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    res.on("close", () => {
      transport.close();
      server.close();
    });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res);
    } catch (error) {
      console.error("MCP request failed", error);
      if (!res.headersSent) res.writeHead(500).end("Internal server error");
    }
    return;
  }

  res.writeHead(404).end("Not Found");
});

httpServer.listen(port, () => {
  console.log(`Lk_uni ChatGPT App: http://localhost:${port}${MCP_PATH}`);
});

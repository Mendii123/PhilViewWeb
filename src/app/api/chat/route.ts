import { NextResponse } from "next/server";
import { ChatOpenAI } from "@langchain/openai";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

type AgentAction =
  | { type: "navigate"; target: string; payload?: Record<string, unknown> }
  | { type: "logout" };

type ChatRequest = {
  message?: string;
  user?: { role?: string; name?: string };
};

type ChatResult = {
  reply: string;
  action?: AgentAction;
};

const NAV_TARGETS = [
  "dashboard",
  "properties",
  "appointments",
  "balance",
  "inquiries",
  "clients",
  "events",
] as const;

const navigateTool = new DynamicStructuredTool({
  name: "navigate",
  description:
    "Navigate the Philview UI to a target section. Only use supported targets.",
  schema: z.object({
    target: z.enum(NAV_TARGETS),
  }),
  func: async ({ target }) =>
    JSON.stringify({ type: "navigate" as const, target }),
});

const logoutTool = new DynamicStructuredTool({
  name: "logout",
  description: "Sign the current user out of the Philview UI.",
  schema: z.object({ confirm: z.boolean().default(true) }),
  func: async () => JSON.stringify({ type: "logout" as const }),
});

const tools = [navigateTool, logoutTool];

const systemPrompt = `You are Philip, an in-app agent for Philview.
Always be concise (<=2 sentences) and helpful.
You can call tools to navigate: dashboard, properties, appointments, balance, inquiries, clients, events.
Use logout when asked to sign out.
If no tool is needed, just answer briefly.`;

const fallbackRoute = (text: string): AgentAction | null => {
  const lower = text.toLowerCase();
  if (lower.includes("logout") || lower.includes("sign out")) {
    return { type: "logout" };
  }
  if (lower.includes("appointment"))
    return { type: "navigate", target: "appointments", payload: { reason: "schedule" } };
  if (lower.includes("balance")) return { type: "navigate", target: "balance" };
  if (lower.includes("inquiries") || lower.includes("inquiry"))
    return { type: "navigate", target: "inquiries" };
  if (lower.includes("client")) return { type: "navigate", target: "clients" };
  if (lower.includes("event")) return { type: "navigate", target: "events" };
  if (lower.includes("property") || lower.includes("browse"))
    return { type: "navigate", target: "properties" };
  if (lower.includes("dashboard")) return { type: "navigate", target: "dashboard" };
  return null;
};

export async function POST(req: Request) {
  const body = (await req.json()) as ChatRequest;
  const message = body.message?.trim();

  try {

    if (!message) {
      return NextResponse.json(
        { reply: "Please provide a message." } satisfies ChatResult,
        { status: 400 }
      );
    }

    // Fast heuristic action if no API key present.
    if (!process.env.OPENAI_API_KEY) {
      const action = fallbackRoute(message) ?? undefined;
      const reply =
        action?.type === "navigate"
          ? `Navigating to ${action.target}.`
          : action?.type === "logout"
            ? "Signing you out."
            : "Noted. Let me know if you want to navigate somewhere.";
      return NextResponse.json({ reply, action } satisfies ChatResult);
    }

    const model = new ChatOpenAI({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini-high",
      temperature: 0,
      maxTokens: 256,
    }).bindTools(tools);

    const aiMessage = await model.invoke([
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `User (${body.user?.role ?? "unknown role"}): ${message}`,
      },
    ]);

    if ("tool_calls" in aiMessage && aiMessage.tool_calls?.length) {
      // Execute the first tool call.
      const call = aiMessage.tool_calls[0];
      const tool = tools.find((t) => t.name === call.name);
      if (tool) {
        // Tool invoke signature unions don't line up cleanly; coerce to avoid TS confusion.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const raw = await (tool as any).invoke(call.args ?? {});
        const action = JSON.parse(raw) as AgentAction;
        const reply =
          action.type === "logout"
            ? "Signing you out."
            : `Navigating to ${"target" in action ? action.target : "section"}.`;
        return NextResponse.json({ reply, action } satisfies ChatResult);
      }
    }

    const replyText =
      typeof aiMessage.content === "string"
        ? aiMessage.content
        : Array.isArray(aiMessage.content)
          ? aiMessage.content.map((c) => ("text" in c ? c.text : "")).join(" ")
          : "Let me know what you need next.";

    return NextResponse.json({ reply: replyText } satisfies ChatResult);
  } catch (error) {
    console.error("Chat API error", error);
    // Graceful fallback to heuristic router
    const fallback = fallbackRoute(message ?? "");
    const reply =
      fallback?.type === "navigate"
        ? `Navigating to ${fallback.target}.`
        : fallback?.type === "logout"
          ? "Signing you out."
          : "LLM call failed; using fallback routing. Let me know where to navigate.";
    return NextResponse.json({ reply, action: fallback ?? undefined } satisfies ChatResult, { status: 200 });
  }
}

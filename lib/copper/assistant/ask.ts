"use server";

// Module 2: the server action the Ask Copper chat calls. It streams the
// conversation to the model through callStream (lib/ai/call.ts), with or
// without the tools, and sends back each step as it happens, so the panel can
// show Copper thinking and using its tools. The contract is in
// specs/module-2/spec.md.
import { stepCountIs } from "ai";
import { z } from "zod";
import { callStream, THOUGHT_SUMMARIES } from "@/lib/ai/call";
import { createLive, type Live } from "@/lib/ai/live";
import { COPPER_INSTRUCTIONS } from "@/lib/copper/assistant/instructions";
import type { Progress, Step } from "@/lib/copper/assistant/progress";
import { copperTools } from "@/lib/copper/assistant/tools";

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type AskCopperRequest = {
  messages: ChatMessage[];
  useTools: boolean;
};

export type AskCopperResult = { progress: Live<Progress> };

/** At most this many model steps (tool calls plus the reply) per question. */
const MAX_STEPS = 5;

// A Server Action is open to anyone who can send the POST, so the request is
// checked for shape and size before it reaches the model.
const requestSchema = z
  .object({
    messages: z
      .array(
        z
          .object({
            role: z.enum(["user", "assistant"]),
            content: z.string().max(4000),
          })
          .strict(),
      )
      .min(1)
      .max(40),
    useTools: z.boolean(),
  })
  .strict();

const APOLOGY = "Sorry, I couldn't answer that just now. Please try again.";

/** A copy that shares nothing with the working progress. */
function snapshot(progress: Progress): Progress {
  return {
    ...progress,
    steps: progress.steps.map((step): Step => ({ ...step })),
  };
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function askCopper(
  request: AskCopperRequest,
): Promise<AskCopperResult> {
  const { messages, useTools } = requestSchema.parse(request);
  const { live, update, done } = createLive<Progress>();

  // Read the stream in the background, so the panel gets `live` straight away.
  void (async () => {
    const progress: Progress = { steps: [], reply: "", status: "working" };
    const toolStep = (id: string) =>
      progress.steps.find((s) => s.type === "tool" && s.id === id);
    try {
      const result = callStream(
        { module: 2, feature: "ask-copper" },
        {
          messages,
          providerOptions: THOUGHT_SUMMARIES,
          // With tools off the model gets the conversation and nothing else.
          ...(useTools && {
            instructions: COPPER_INSTRUCTIONS,
            tools: copperTools,
            stopWhen: stepCountIs(MAX_STEPS),
          }),
        },
      );

      for await (const part of result.fullStream) {
        switch (part.type) {
          case "reasoning-delta": {
            const last = progress.steps.at(-1);
            if (last?.type === "thinking") last.text += part.text;
            else progress.steps.push({ type: "thinking", text: part.text });
            break;
          }
          case "tool-input-start":
            // Only the name is known yet; the input arrives with tool-call.
            progress.steps.push({
              type: "tool",
              id: part.id,
              name: part.toolName,
              state: "calling",
            });
            break;
          case "tool-call": {
            const step = toolStep(part.toolCallId);
            if (step?.type === "tool") step.input = part.input;
            else
              progress.steps.push({
                type: "tool",
                id: part.toolCallId,
                name: part.toolName,
                state: "calling",
                input: part.input,
              });
            break;
          }
          case "tool-result": {
            const step = toolStep(part.toolCallId);
            if (step?.type === "tool") {
              step.output = part.output;
              step.state = "done";
            }
            break;
          }
          case "tool-error": {
            const step = toolStep(part.toolCallId);
            if (step?.type === "tool") {
              step.output = messageOf(part.error);
              step.state = "error";
            }
            break;
          }
          case "text-delta":
            progress.reply += part.text;
            break;
          case "error":
            throw part.error;
          default:
            continue; // nothing the panel draws
        }
        update(snapshot(progress));
      }

      // A model that ends without a word still gets a polite answer.
      if (!progress.reply.trim()) progress.reply = APOLOGY;
      done(snapshot({ ...progress, status: "done" }));
    } catch {
      done(
        snapshot({
          ...progress,
          reply: progress.reply || APOLOGY,
          status: "error",
        }),
      );
    }
  })();

  return { progress: live };
}

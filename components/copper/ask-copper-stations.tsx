// One answer, drawn as stations on a vertical rail in the order they happened:
// the tools on offer, Copper thinking, each tool call, and what's happening
// now. The reply sits below the rail in its own bubble.
import { BrainIcon, ListIcon, WrenchIcon } from "lucide-react";
import type { ReactNode } from "react";
import { MessageResponse } from "@/components/ai-elements/message";
import { ToolCard } from "@/components/copper/ask-copper-tool-card";
import {
  TOOL_LABELS,
  type Progress,
  type ToolStep,
} from "@/lib/copper/assistant/progress";
import { cn } from "@/lib/utils";

function Station({
  icon,
  nodeClassName,
  label,
  children,
}: {
  icon: ReactNode;
  nodeClassName: string;
  label?: string;
  children?: ReactNode;
}) {
  return (
    <div className="relative pb-5">
      <span
        className={cn(
          "text-primary-foreground ring-secondary absolute top-0 -left-10 flex size-7 items-center justify-center rounded-full ring-4",
          nodeClassName,
        )}
      >
        {icon}
      </span>
      {label && (
        <p className="text-muted-foreground mb-1.5 text-xs font-semibold tracking-widest uppercase">
          {label}
        </p>
      )}
      {children}
    </div>
  );
}

function workingText(progress: Progress, useTools: boolean): string {
  if (progress.reply) return "Writing the answer…";
  if (!useTools) return "Answering from memory…";
  return progress.steps.length === 0
    ? "Reading your question…"
    : "Deciding what to do next…";
}

export function Stations({
  progress,
  useTools,
}: {
  progress: Progress;
  useTools: boolean;
}) {
  const used = new Set(
    progress.steps.flatMap((s) => (s.type === "tool" ? [s.name] : [])),
  );
  // Each tool card is numbered by how many tool steps come up to it.
  const toolNumber = progress.steps.map(
    (_, i) =>
      progress.steps.slice(0, i + 1).filter((s) => s.type === "tool").length,
  );
  const accent = useTools ? "bg-primary" : "bg-chart-3";

  return (
    <div>
      <div className="relative pl-10">
        <div
          aria-hidden
          className={cn(
            "absolute top-3 bottom-3 left-[13px] w-0.5 rounded-full",
            useTools
              ? "from-primary via-accent to-accent bg-linear-to-b"
              : "bg-chart-3",
          )}
        />

        <Station
          icon={<ListIcon className="size-3.5" />}
          nodeClassName={accent}
          label={
            useTools ? "Tools Copper can use" : "Tools given to Copper: none"
          }
        >
          <div className="flex flex-wrap gap-1.5">
            {Object.keys(TOOL_LABELS).map((name) => (
              <span
                key={name}
                className={cn(
                  "rounded-md px-2 py-0.5 font-mono text-xs",
                  !useTools && "text-muted-foreground bg-muted line-through",
                  useTools &&
                    used.has(name) &&
                    "bg-accent text-primary-foreground font-bold",
                  useTools &&
                    !used.has(name) &&
                    "bg-muted text-muted-foreground",
                )}
              >
                {name}
              </span>
            ))}
          </div>
          {!useTools && (
            <p className="mt-1.5 text-sm">
              Copper has to answer from memory alone.
            </p>
          )}
        </Station>

        {progress.steps.map((step, i) =>
          step.type === "thinking" ? (
            <Station
              key={`thinking-${i}`}
              icon={<BrainIcon className="size-3.5" />}
              nodeClassName={accent}
              label="Copper is thinking"
            >
              <div
                data-testid="thinking"
                className="text-muted-foreground border-l-2 pl-3 text-sm italic"
              >
                <MessageResponse>{step.text}</MessageResponse>
              </div>
            </Station>
          ) : (
            <Station
              key={step.id}
              icon={<WrenchIcon className="size-3.5" />}
              nodeClassName="bg-accent"
              label={
                step.state === "calling"
                  ? "Copper is calling a tool"
                  : "Copper called a tool"
              }
            >
              <ToolCard step={step as ToolStep} number={toolNumber[i]} />
            </Station>
          ),
        )}

        {progress.status === "working" && (
          <Station
            icon={
              <span className="flex gap-0.5">
                {[0, 1, 2].map((dot) => (
                  <span
                    key={dot}
                    className="bg-primary-foreground size-1 animate-bounce rounded-full"
                    style={{ animationDelay: `${dot * 120}ms` }}
                  />
                ))}
              </span>
            }
            nodeClassName={cn(accent, "animate-pulse")}
          >
            <p className="text-muted-foreground pt-1 text-sm">
              {workingText(progress, useTools)}
            </p>
          </Station>
        )}
      </div>

      {progress.reply && (
        <div className="bg-card mt-1 rounded-2xl rounded-tl-sm border p-3 text-sm shadow-xs">
          <p className="text-primary mb-1 text-xs font-semibold">Copper</p>
          {!useTools && (
            <div className="border-chart-3 bg-chart-3/10 mb-2 rounded-md border p-2 text-xs">
              <p className="font-semibold">
                ⚠ Answered without tools: may be made up
              </p>
              <p className="mt-0.5">
                With tools off, Copper can&apos;t see today&apos;s prices or
                stock. The AI only has what it learned in training, so it fills
                the gaps with guesses that sound right. That&apos;s a
                hallucination.
              </p>
            </div>
          )}
          <p className="whitespace-pre-wrap">
            {progress.reply}
            {progress.status === "working" && (
              <span aria-hidden className="ml-0.5 animate-pulse">
                ▍
              </span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}

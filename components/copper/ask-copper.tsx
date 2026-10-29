"use client";

// Ask Copper: a floating chat panel. It calls the askCopper Server Action and
// draws each answer as it streams in. Tools on and tools off are two separate
// conversations, so the tools-off model can't copy what the tools worked out.
import { ArrowUpIcon, MessageCircleIcon } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Stations } from "@/components/copper/ask-copper-stations";
import { SetupRequired } from "@/components/setup-required";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { readLive } from "@/lib/ai/live";
import { askCopper, type ChatMessage } from "@/lib/copper/assistant/ask";
import type { Progress } from "@/lib/copper/assistant/progress";

export const STARTER_QUESTIONS = [
  "How much is Copper Home with Copper Plus, paid yearly, for 2 years?",
  "Is Copper Notes in Night Sky in stock?",
  "Is Copper Plus cheaper monthly or yearly?",
];

type Turn = { question: string; progress: Progress | null };
type Chats = { on: Turn[]; off: Turn[] };

const FAILED: Progress = {
  steps: [],
  reply: "Sorry, I couldn't answer that just now. Please try again.",
  status: "error",
};

/** Only finished answers go back to the model: the questions and replies. */
function historyOf(turns: Turn[]): ChatMessage[] {
  return turns.flatMap(({ question, progress }) =>
    progress?.status === "done"
      ? [
          { role: "user" as const, content: question },
          { role: "assistant" as const, content: progress.reply },
        ]
      : [],
  );
}

const isStreaming = (turns: Turn[]) => {
  const last = turns.at(-1);
  return (
    last !== undefined && (!last.progress || last.progress.status === "working")
  );
};

export function AskCopper({ aiConfigured }: { aiConfigured: boolean }) {
  const [open, setOpen] = useState(false);
  const [useTools, setUseTools] = useState(true);
  const [chats, setChats] = useState<Chats>({ on: [], off: [] });
  const [draft, setDraft] = useState("");
  const body = useRef<HTMLDivElement>(null);

  // The header's Ask Copper link, and loading the site at /#ask, open the panel.
  // A click is heard as well as hashchange: once the address already ends in
  // #ask, clicking the link again fires no hashchange.
  useEffect(() => {
    const openFromHash = () => {
      if (window.location.hash === "#ask") setOpen(true);
    };
    const onClick = (event: MouseEvent) => {
      if ((event.target as Element).closest('a[href="#ask"]')) setOpen(true);
    };
    const first = window.setTimeout(openFromHash, 0);
    window.addEventListener("hashchange", openFromHash);
    document.addEventListener("click", onClick);
    return () => {
      window.clearTimeout(first);
      window.removeEventListener("hashchange", openFromHash);
      document.removeEventListener("click", onClick);
    };
  }, []);

  const key = useTools ? "on" : "off";
  const turns = chats[key];
  const streaming = isStreaming(turns);

  // Keep the newest step in view as the answer streams in.
  useEffect(() => {
    const el = body.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chats, key]);

  async function send(text: string) {
    const question = text.trim();
    if (!question || streaming) return;
    const chat = key;
    const index = turns.length;
    const messages = [
      ...historyOf(turns),
      { role: "user" as const, content: question },
    ];
    const setProgress = (progress: Progress | null) =>
      setChats((all) => ({
        ...all,
        [chat]: all[chat].map((turn, i) =>
          i === index ? { ...turn, progress } : turn,
        ),
      }));

    setDraft("");
    setChats((all) => ({
      ...all,
      [chat]: [...all[chat], { question, progress: null }],
    }));
    try {
      const { progress } = await askCopper({
        messages,
        useTools: chat === "on",
      });
      for await (const update of readLive(progress)) setProgress(update);
    } catch {
      setProgress(FAILED);
    }
  }

  return (
    <>
      <Button
        data-testid="ask-copper-launcher"
        onClick={() => setOpen(true)}
        className="fixed right-4 bottom-4 z-40 h-12 rounded-full px-5 shadow-lg"
      >
        <MessageCircleIcon />
        Ask Copper
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          data-testid="ask-copper"
          showCloseButton={false}
          className="w-full gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-md"
        >
          <header className="bg-chart-5 text-secondary">
            <div className="flex items-center gap-3 p-4">
              <span className="bg-primary flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full">
                <Image
                  src="/assets/brand/copper-mascot.png"
                  alt="Copper, the Copper State Labs mascot"
                  width={40}
                  height={40}
                />
              </span>
              <div className="min-w-0 flex-1">
                <SheetTitle className="text-secondary">Ask Copper</SheetTitle>
                <SheetDescription className="text-secondary/70">
                  Prices, totals and stock, checked with tools.
                </SheetDescription>
              </div>
              <SheetClose asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="hover:bg-secondary/10 hover:text-secondary text-secondary"
                >
                  Close
                </Button>
              </SheetClose>
            </div>
            <div className="bg-secondary/10 flex items-center justify-between gap-3 px-4 py-2 text-sm">
              <div>
                <p className="font-medium">Use tools</p>
                <p className="text-secondary/70 text-xs">
                  {useTools ? "Checks every answer" : "Model guesses alone"}
                </p>
              </div>
              <Switch
                aria-label="Use tools"
                checked={useTools}
                onCheckedChange={setUseTools}
              />
            </div>
          </header>

          {aiConfigured ? (
            <>
              <div
                ref={body}
                className="bg-secondary flex-1 space-y-5 overflow-y-auto p-4"
              >
                {turns.length === 0 && (
                  <p className="text-muted-foreground text-sm">
                    Ask me what Copper costs or whether it&apos;s in stock.
                  </p>
                )}
                {turns.map((turn, i) => (
                  <div key={i} className="space-y-3">
                    <p className="bg-primary text-primary-foreground ml-auto w-fit max-w-[85%] rounded-2xl rounded-tr-sm px-3 py-2 text-sm">
                      {turn.question}
                    </p>
                    <Stations
                      progress={
                        turn.progress ?? {
                          steps: [],
                          reply: "",
                          status: "working",
                        }
                      }
                      useTools={key === "on"}
                    />
                  </div>
                ))}
                {!streaming && (
                  <div className="flex flex-col items-start gap-2">
                    {STARTER_QUESTIONS.map((starter) => (
                      <Button
                        key={starter}
                        variant="outline"
                        size="sm"
                        className="bg-card h-auto rounded-xl py-1.5 text-left whitespace-normal"
                        onClick={() => send(starter)}
                      >
                        {starter}
                      </Button>
                    ))}
                  </div>
                )}
              </div>

              <form
                className="bg-card flex items-center gap-2 border-t p-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  void send(draft);
                }}
              >
                <input
                  aria-label="Your question"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Ask about prices or stock…"
                  className="border-input focus-visible:ring-ring/50 min-w-0 flex-1 rounded-full border px-4 py-2 text-sm outline-none focus-visible:ring-3"
                />
                <Button
                  type="submit"
                  size="icon"
                  aria-label="Send"
                  disabled={streaming || !draft.trim()}
                  className="rounded-full"
                >
                  <ArrowUpIcon />
                </Button>
              </form>
            </>
          ) : (
            <div className="bg-secondary flex-1 overflow-y-auto p-4">
              <SetupRequired service="ai" />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

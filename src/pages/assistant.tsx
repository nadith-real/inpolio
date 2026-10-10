import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { defaultProvider, SUGGESTED_QUERIES } from "@/lib/assistant/local";
import type { AssistantMessage } from "@/lib/assistant/provider";
import { useStore } from "@/lib/store";
import { createId } from "@/lib/utils";

export function AssistantPage() {
  const { data } = useStore();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "I answer from data stored on this computer. No online AI is used. Ask about stock, invoices, sales or tasks.",
    },
  ]);

  const ask = async (question: string) => {
    const q = question.trim();
    if (!q) return;
    const user: AssistantMessage = { id: createId(), role: "user", content: q };
    setMessages((m) => [...m, user]);
    setInput("");
    const answer = await defaultProvider.answer(q, data);
    setMessages((m) => [...m, { id: createId(), role: "assistant", content: String(answer) }]);
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Business Assistant"
        description={`Local provider: ${defaultProvider.name}. Optional local models can implement the AIProvider interface later.`}
      />
      <div className="mb-3 flex flex-wrap gap-2">
        {SUGGESTED_QUERIES.map((q) => (
          <Button key={q} size="sm" variant="outline" onClick={() => ask(q)}>
            {q}
          </Button>
        ))}
      </div>
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="max-h-[50vh] space-y-3 overflow-y-auto">
            {messages.map((m) => (
              <div key={m.id} className={m.role === "user" ? "ml-8 rounded-md bg-secondary p-3 text-sm" : "mr-8 rounded-md border p-3 text-sm whitespace-pre-wrap"}>
                {m.content}
              </div>
            ))}
          </div>
          <form
            className="flex flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              void ask(input);
            }}
          >
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your business data…"
              className="min-h-16"
              aria-label="Assistant question"
            />
            <Button type="submit">Ask</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

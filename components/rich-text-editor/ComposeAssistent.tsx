import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Streamdown } from "streamdown";
import { Skeleton } from "../ui/skeleton";
import { useChat } from "@ai-sdk/react";
import { client } from "@/lib/orpc";
import { eventIteratorToStream } from "@orpc/server";

interface ComposeAssistentProps {
  content: string;
  onAccept?: (markdown: string) => void;
}

export function ComposeAssistent({ content, onAccept }: ComposeAssistentProps) {
  const contentRef = useRef(content);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  const {
    messages,
    status,
    error,
    sendMessage,
    setMessages,
    stop,
    clearError,
  } = useChat({
    id: "compose-assitent",
    transport: {
      async sendMessages(options) {
        return eventIteratorToStream(
          await client.ai.compose.generate(
            {
              content: contentRef.current,
            },
            {
              signal: options.abortSignal,
            },
          ),
        );
      },
      reconnectToStream() {
        throw new Error("Unsupported");
      },
    },
  });
  const lastAssistent = messages.findLast((m) => m.role === "assistant");
  const composeText =
    lastAssistent?.parts
      .filter((p) => p.type === "text")
      .map((p) => p.text)
      .join("\n\n") ?? "";
  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);

    if (nextOpen) {
      const hasAssistantMessage = messages.some((m) => m.role === "assistant");
      if (status !== "ready" || hasAssistantMessage) {
        return;
      }
      sendMessage({
        text: "Rewrite",
      });
    } else {
      stop();
      clearError();
      setMessages([]);
    }
  }
  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          size="sm"
          className="relative overflow-hidden rounded-full bg-linear-to-t from-violet-600 to-fuchsia-600 text-white shadow-md hover:shadow-lg focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="flex items-center gap-1.5">
            <Sparkles className="size-3.5" />
            <span className="text-xs font-medium">Compose</span>
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-100 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <span className="relative inline-flex items-center justify-center rounded-full bg-linear-to-r from-violet-600 to-fuchsia-600 py-1.5 px-4 gap-1.5">
              <Sparkles className="size-3.5 text-white" />
              <span className="text-sm font-medium">Compose Assistant</span>
            </span>
          </div>
          {status === "streaming" && (
            <Button
              onClick={() => stop()}
              size="sm"
              variant="outline"
              type="button"
            >
              Stop
            </Button>
          )}
        </div>
        <div className="px-4 py-3 max-h-80 overflow-y-auto">
          {error ? (
            <div>
              <p className="text-red-500">{error.message}</p>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  clearError();
                  setMessages([]);
                  sendMessage({ text: "Summarize Thread" });
                }}
              >
                Try Again
              </Button>
            </div>
          ) : composeText ? (
            <Streamdown>{composeText}</Streamdown>
          ) : status === "submitted" || status === "streaming" ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              Click Compose to generate.
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 border-t px-3 py-2 bg-muted/30">
          <Button
            onClick={() => {
              stop();
              clearError();
              setMessages([]);
              setOpen(false);
            }}
            type="submit"
            size="sm"
            variant="outline"
          >
            Decline
          </Button>
          <Button
            onClick={() => {
              if (!composeText) return;
              onAccept?.(composeText);
              stop();
              clearError();
              setMessages([]);
              setOpen(false);
            }}
            disabled={!composeText}
            type="submit"
            size="sm"
          >
            Accept
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

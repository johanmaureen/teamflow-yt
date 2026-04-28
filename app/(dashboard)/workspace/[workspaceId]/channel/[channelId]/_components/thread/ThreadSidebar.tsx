"use client";

import { Button } from "@/components/ui/button";
import { ChevronDown, MessageSquare, X } from "lucide-react";
import Image from "next/image";
import { ThreadReply } from "./ThreadReply";
import { ThreadReplyForm } from "./ThreadRreplyForm";
import { useThread } from "@/providers/ThreadProvider";
import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc";
import { SafeContent } from "@/components/rich-text-editor/SafeContent";
import { KindeUser } from "@kinde-oss/kinde-auth-nextjs/types";
import { ThreadSidebarSkeleton } from "./ThreadSidebarSkeleton";
import { useEffect, useRef, useState } from "react";

interface ThreadSidebarProps {
  user: KindeUser<Record<string, unknown>>;
}

export function ThreadSidebar({ user }: ThreadSidebarProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const lastMessageCountRef = useRef(0);
  const [isAtBottom, setIsAtBottom] = useState(false);
  const { selectedThreadId, closeThread } = useThread();
  const { data, isLoading, isFetching } = useQuery(
    orpc.message.thread.list.queryOptions({
      input: {
        messageId: selectedThreadId!,
      },
      enabled: Boolean(selectedThreadId),
    }),
  );
  const messageCount = data?.messages.length ?? 0;
  const isNearBottom = (el: HTMLDivElement) =>
    el.scrollHeight - el.scrollTop - el.clientHeight <= 80;

  const handleSrcoll = () => {
    const el = scrollRef.current;
    if (!el) return;

    setIsAtBottom(isNearBottom(el));
  };

  useEffect(() => {
    if (messageCount === 0) return;
    const prevMessageCount = lastMessageCountRef.current;
    const el = scrollRef.current;
    if (prevMessageCount > 0 && messageCount !== prevMessageCount) {
      if (el && isNearBottom(el)) {
        requestAnimationFrame(() => {
          bottomRef.current?.scrollIntoView({
            block: "end",
            behavior: "smooth",
          });
        });
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsAtBottom(true);
      }
    }
    lastMessageCountRef.current = messageCount;
  }, [messageCount]);

  // keep view to bottom on late content grow
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const scrollToBottomIfNeeded = () => {
      if (isAtBottom) {
        requestAnimationFrame(() => {
          bottomRef.current?.scrollIntoView({
            block: "end",
            behavior: "smooth",
          });
        });
      }
    };

    const onImageLoad = (e: Event) => {
      if (e.target instanceof HTMLImageElement) {
        scrollToBottomIfNeeded();
      }
    };

    el.addEventListener("load", onImageLoad, true);

    const resizeObserver = new ResizeObserver(scrollToBottomIfNeeded);
    resizeObserver.observe(el);

    const mutationObserver = new MutationObserver(scrollToBottomIfNeeded);
    mutationObserver.observe(el, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
    });

    return () => {
      resizeObserver.disconnect();
      el.removeEventListener("load", onImageLoad, true);
      mutationObserver.disconnect();
    };
  }, [isAtBottom]);

  const scrollToBottom = () => {
    const el = scrollRef.current;
    if (!el) return;
    bottomRef.current?.scrollIntoView({
      block: "end",
      behavior: "smooth",
    });
    setIsAtBottom(true);
  };

  if (isLoading || isFetching || !data) {
    return <ThreadSidebarSkeleton />;
  }

  return (
    <div className="w-120 border-l flex flex-col h-full">
      {/* Header */}
      <div className="border-b h-14 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="size-4" />
          <span>Thread</span>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={closeThread} variant="outline" size="icon">
            <X className="size-4" />
          </Button>
        </div>
      </div>
      {/* Main Content*/}
      <div className="flex-1 overflow-y-auto relative">
        <div
          ref={scrollRef}
          onScroll={handleSrcoll}
          className="h-full overflow-y-auto"
        >
          {data && (
            <>
              <div className="p-4 border-b bg-muted/20">
                <div className="flex space-x-3">
                  <Image
                    src={data.parent.authorAvatar}
                    alt="author image"
                    width={32}
                    height={32}
                    className="size-8 rounded-full shrink-0"
                  />
                  <div className="flex-1 space-y-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-sm">
                        {data.parent.authorName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Intl.DateTimeFormat("en-US", {
                          hour12: true,
                          hour: "numeric",
                          minute: "numeric",
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        }).format(data.parent.createdAt)}
                      </span>
                    </div>
                    <SafeContent
                      content={JSON.parse(data.parent.content)}
                      className="text-sm wrap-break-word prose dark:prose-invert max-w-none"
                    />
                  </div>
                </div>
              </div>
              {/* Thread replies */}
              <div className="p-2">
                <p className="text-xs text-muted-foreground mb-3 px-2">
                  {data.messages.length} replies
                </p>
                <div className="space-y-1">
                  {data.messages.map((reply) => (
                    <ThreadReply message={reply} key={reply.id} />
                  ))}
                </div>
              </div>
              <div ref={bottomRef}></div>
            </>
          )}
        </div>
        {/* Srcoll to bottom button*/}
        {!isAtBottom && (
          <Button
            onClick={scrollToBottom}
            type="button"
            size="sm"
            className="absolute bottom-4 right-5 z-20 rounded-full hover:shadow-xl transition-all duration-200"
          >
            <ChevronDown className="size-4" />
          </Button>
        )}
      </div>

      {/* Thread Reply form*/}
      <div className="border-t p-4">
        <ThreadReplyForm threadId={selectedThreadId!} user={user} />
      </div>
    </div>
  );
}

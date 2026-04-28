"use client";
import { useInfiniteQuery, useSuspenseQuery } from "@tanstack/react-query";
import { MessageItem } from "./message/MessageItem";
import { orpc } from "@/lib/orpc";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/general/EmptyState";
import { ChevronDown, Loader2 } from "lucide-react";

export function MessageList() {
  const { channelId } = useParams<{ channelId: string }>();
  const [hasInitialScrolled, setHasInitialScrolled] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(false);
  const lastItemIdRef = useRef<string | undefined>(undefined);

  const inifiteOptions = orpc.message.list.infiniteOptions({
    input: (pageParam: string | undefined) => ({
      channelId: channelId,
      cursor: pageParam,
      limit: 5,
    }),
    queryKey: ["message.list", channelId],
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    select: (data) => ({
      pages: [...data.pages]
        .map((p) => ({ ...p, items: [...p.items].reverse() }))
        .reverse(),
      pageParams: [...data.pageParams].reverse(),
    }),
  });

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    isLoading,
    error,
  } = useInfiniteQuery({
    ...inifiteOptions,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
  const {
    data: { user },
  } = useSuspenseQuery(orpc.workspace.list.queryOptions());
  // scroll to the bottom when messages first load
  useEffect(() => {
    if (!hasInitialScrolled && data?.pages.length) {
      const el = scrollRef.current;
      if (el) {
        bottomRef.current?.scrollIntoView({
          block: "end",
          behavior: "smooth",
        });
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setHasInitialScrolled(true);
        setIsAtBottom(true);
      }
    }
  }, [hasInitialScrolled, data?.pages.length]);

  // keep view to bottom on late content grow
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const scrollToBottomIfNeeded = () => {
      if (isAtBottom || !hasInitialScrolled) {
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
  }, [isAtBottom, hasInitialScrolled]);

  const isNearBottom = (el: HTMLDivElement) =>
    el.scrollHeight - el.scrollTop - el.clientHeight <= 80;

  const handleSrcoll = () => {
    const el = scrollRef.current;
    if (!el) return;

    if (el.scrollTop <= 80 && hasNextPage && !isFetching) {
      const prevScrollHeight = el.scrollHeight;
      const prevScrollTop = el.scrollTop;
      fetchNextPage().then(() => {
        const newScrollHeight = el.scrollHeight;
        el.scrollTop = newScrollHeight - prevScrollHeight + prevScrollTop;
      });
    }

    setIsAtBottom(isNearBottom(el));
  };

  const items = useMemo(() => {
    return data?.pages.flatMap((p) => p.items) ?? [];
  }, [data]);

  const isEmpty = !isLoading && !error && items.length === 0;

  useEffect(() => {
    if (!items.length) return;
    const lastId = items[items.length - 1].id;
    const prevLastId = lastItemIdRef.current;
    const el = scrollRef.current;
    if (prevLastId && lastId !== prevLastId) {
      if (el && isNearBottom(el)) {
        requestAnimationFrame(() => {
          el.scrollTop = el.scrollHeight;
        });
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsAtBottom(true);
      }
    }
    lastItemIdRef.current = lastId;
  }, [items]);

  const scrollToBottom = () => {
    const el = scrollRef.current;
    if (!el) return;
    bottomRef.current?.scrollIntoView({
      block: "end",
      behavior: "smooth",
    });
    setIsAtBottom(true);
  };

  return (
    <div className="relative h-full">
      <div
        onScroll={handleSrcoll}
        ref={scrollRef}
        className="h-full overflow-y-auto px-4 flex flex-col space-y-1"
      >
        {isEmpty ? (
          <div className="flex h-full pt-4">
            <EmptyState
              title="No messages yet"
              description="Start the conversation by sending the first message"
              buttonText="Send a message"
              href="#"
            />
          </div>
        ) : (
          items?.map((message) => (
            <MessageItem
              key={message.id}
              message={message}
              currentUserId={user.id}
            />
          ))
        )}
        <div ref={bottomRef}></div>
        {isFetching && !isFetchingNextPage ? (
          <div className="py-2 text-center text-sm text-mu">Fetching...</div>
        ) : null}
      </div>
      {isFetchingNextPage && (
        <div className="pointer-events-none absolute top-0 left-0 right-0 z-20 flex items-center justify-center py-2">
          <div className="flex items-center gap-2 rounded-md bg-linear-to-b form-white/80 to-transparent dark:from-neutral-900/80 backdrop-blur px-3 py-1">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
            <span>Loading previous message...</span>
          </div>
        </div>
      )}
      <Button
        onClick={scrollToBottom}
        type="button"
        size="sm"
        className="absolute bottom-4 right-5 z-20 rounded-full hover:shadow-xl transition-all duration-200"
      >
        <ChevronDown className="size-4" />
      </Button>
      {/* 
      {!isAtBottom && (
        <Button
          onClick={scrollToBottom}
          type="button"
          size="sm"
          className="absolute bottom-4 right-5 z-20 rouned-full hover:shadow-xl transition-all duration-200"
        >
          <ChevronDown className="size-4" />
        </Button>

      )} */}
    </div>
  );
}

"use client";
import { useQuery } from "@tanstack/react-query";
import { ChannelHeader } from "./_components/ChannelHeaer";
import { MessageList } from "./_components/MessageList";
import { MessageInputForm } from "./_components/message/MessageInputForm";
import { useParams } from "next/navigation";
import { orpc } from "@/lib/orpc";
import { KindeUser } from "@kinde-oss/kinde-auth-nextjs/types";
import { Skeleton } from "@/components/ui/skeleton";
import { ThreadProvider, useThread } from "@/providers/ThreadProvider";
import { ThreadSidebar } from "./_components/thread/ThreadSidebar";

const ThisIsTheChannelPage = () => {
  const { channelId } = useParams<{ channelId: string }>();
  const { isThreadOpen } = useThread();
  const { data, error, isLoading } = useQuery(
    orpc.channel.get.queryOptions({
      input: {
        channelId: channelId,
      },
    }),
  );
  if (error) {
    return <p>Error</p>;
  }
  return (
    <div className="flex h-screen w-full">
      {/* Main Channel Area*/}
      <div className="flex flex-col flex-1 m-w-0">
        {isLoading ? (
          <div className="flex items-center justify-between h-14 px-4 border-b">
            <Skeleton className="h-6 w-40" />
            <div className="flex items-center space-x-2">
              <Skeleton className="h-8 w-28" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="size-8" />
            </div>
          </div>
        ) : (
          <ChannelHeader channelName={data?.channelName} />
        )}
        {/* Scroolable Message Area*/}
        <div className="flex-1 overflow-hidden mb-4">
          <MessageList />
        </div>
        {/* Fixed Input */}
        <div className="border-t bg-background p-4">
          <MessageInputForm
            channelId={channelId}
            user={data?.currentUser as KindeUser<Record<string, unknown>>}
          />
        </div>
      </div>

      {isThreadOpen && (
        <ThreadSidebar
          user={data?.currentUser as KindeUser<Record<string, unknown>>}
        />
      )}
    </div>
  );
};

const ChannelpageMain = () => {
  return (
    <ThreadProvider>
      <ThisIsTheChannelPage />
    </ThreadProvider>
  );
};

export default ChannelpageMain;

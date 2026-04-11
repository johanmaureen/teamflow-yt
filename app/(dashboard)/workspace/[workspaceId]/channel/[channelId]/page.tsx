"use client";
import { ChannelHeader } from "./_components/ChannelHeaer";
import { MessageList } from "./_components/MessageList";
import { MessageInputForm } from "./_components/message/MessageInputForm";
import { useParams } from "next/navigation";

const ChannelpageMain = () => {
  const { channelId } = useParams<{ channelId: string }>();
  return (
    <div className="flex h-screen w-full">
      {/* Main Channel Area*/}
      <div className="flex flex-col flex-1 m-w-0">
        <ChannelHeader />
        {/* Scroolable Message Area*/}
        <div className="flex-1 overflow-hidden mb-4">
          <MessageList />
        </div>
        {/* Fixed Input */}
        <div className="border-t bg-background p-4">
          <MessageInputForm channelId={channelId} />
        </div>
      </div>
    </div>
  );
};

export default ChannelpageMain;

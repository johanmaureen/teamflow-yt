import { MessageItem } from "./message/MessageItem";

const messages = [
  {
    id: 1,
    message: "how are you?",
    date: new Date(),
    avatar: "https://avatars.githubusercontent.com/u/76267404?v=4",
    userName: "Jan Marshall",
  },
  {
    id: 2,
    message: "i am fine",
    date: new Date(),
    avatar: "https://avatars.githubusercontent.com/u/76267404?v=4",
    userName: "Johan Russouw",
  },
  {
    id: 3,
    message: "Good night",
    date: new Date(),
    avatar: "https://avatars.githubusercontent.com/u/76267404?v=4",
    userName: "Maureen Linda",
  },
];
export function MessageList() {
  return (
    <div className="relative-h-full">
      <div className="h-full overflow-y-auto px-4">
        {messages.map((message) => (
          <MessageItem key={message.id} {...message} />
        ))}
      </div>
    </div>
  );
}

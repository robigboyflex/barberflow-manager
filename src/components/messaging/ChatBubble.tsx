import { format } from "date-fns";
import { Reply, Check, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatBubbleProps {
  content: string;
  senderName: string;
  senderType: "owner" | "cashier";
  isOwnMessage: boolean;
  isRead: boolean;
  createdAt: string;
  replyContent?: string | null;
  replySenderName?: string | null;
  onReply?: () => void;
}

export default function ChatBubble({
  content,
  senderName,
  isOwnMessage,
  isRead,
  createdAt,
  replyContent,
  replySenderName,
  onReply,
}: ChatBubbleProps) {
  return (
    <div className={cn("flex flex-col gap-1 max-w-[80%]", isOwnMessage ? "ml-auto items-end" : "mr-auto items-start")}>
      <span className="text-xs text-muted-foreground px-1">{senderName}</span>
      <div
        className={cn(
          "rounded-2xl px-4 py-2.5 relative group",
          isOwnMessage
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-secondary text-secondary-foreground rounded-bl-md"
        )}
      >
        {replyContent && (
          <div className={cn(
            "text-xs mb-1.5 pb-1.5 border-b",
            isOwnMessage ? "border-primary-foreground/20 text-primary-foreground/70" : "border-border text-muted-foreground"
          )}>
            <span className="font-medium">{replySenderName}</span>
            <p className="truncate">{replyContent}</p>
          </div>
        )}
        <p className="text-sm whitespace-pre-wrap break-words">{content}</p>
        {onReply && (
          <button
            onClick={onReply}
            className={cn(
              "absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 rounded-full flex items-center justify-center",
              "bg-muted hover:bg-muted/80"
            )}
          >
            <Reply className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        )}
      </div>
      <div className="flex items-center gap-1 px-1">
        <span className="text-[10px] text-muted-foreground">
          {format(new Date(createdAt), "h:mm a")}
        </span>
        {isOwnMessage && (
          isRead
            ? <CheckCheck className="w-3 h-3 text-primary" />
            : <Check className="w-3 h-3 text-muted-foreground" />
        )}
      </div>
    </div>
  );
}

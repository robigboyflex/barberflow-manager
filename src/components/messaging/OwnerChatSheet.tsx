import { useState, useEffect, useRef } from "react";
import { MessageSquare, Send, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ChatBubble from "./ChatBubble";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface Message {
  id: string;
  shop_id: string;
  sender_type: string;
  sender_id: string;
  sender_name: string;
  content: string;
  reply_to: string | null;
  is_read: boolean;
  created_at: string;
  reply_content?: string | null;
  reply_sender_name?: string | null;
}

interface OwnerChatSheetProps {
  shopId: string;
  shopName: string;
  ownerId: string;
  ownerName: string;
}

export default function OwnerChatSheet({ shopId, shopName, ownerId, ownerName }: OwnerChatSheetProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const scrollEndRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("shop_id", shopId)
      .order("created_at", { ascending: true })
      .limit(100);

    if (error) {
      console.error("Failed to fetch messages:", error);
      return;
    }

    // Enrich with reply data
    const enriched = (data || []).map((msg: any) => {
      const replyMsg = msg.reply_to ? data?.find((m: any) => m.id === msg.reply_to) : null;
      return {
        ...msg,
        reply_content: replyMsg?.content || null,
        reply_sender_name: replyMsg?.sender_name || null,
      };
    });

    setMessages(enriched);
    
    const unread = enriched.filter((m: Message) => m.sender_type === "cashier" && !m.is_read).length;
    setUnreadCount(unread);
  };

  const markAsRead = async () => {
    await supabase
      .from("messages")
      .update({ is_read: true })
      .eq("shop_id", shopId)
      .eq("sender_type", "cashier")
      .eq("is_read", false);
  };

  useEffect(() => {
    fetchMessages();
    const channel = supabase
      .channel(`owner-messages-${shopId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `shop_id=eq.${shopId}` }, () => {
        fetchMessages();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [shopId]);

  useEffect(() => {
    if (isOpen) {
      markAsRead();
      setUnreadCount(0);
      setTimeout(() => {
        scrollEndRef.current?.scrollIntoView({ behavior: "instant" });
      }, 100);
    }
  }, [isOpen, messages.length]);

  const handleSend = async () => {
    if (!newMessage.trim() || isSending) return;
    setIsSending(true);
    try {
      const { error } = await supabase.from("messages").insert({
        shop_id: shopId,
        sender_type: "owner",
        sender_id: ownerId,
        sender_name: ownerName,
        content: newMessage.trim(),
        reply_to: replyTo?.id || null,
      });
      if (error) throw error;
      setNewMessage("");
      setReplyTo(null);
      fetchMessages();
    } catch (err) {
      toast.error("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <MessageSquare className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px] bg-destructive text-destructive-foreground">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="p-4 border-b border-border">
          <SheetTitle className="font-display text-lg">Chat — {shopName}</SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="w-10 h-10 mx-auto mb-2 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No messages yet</p>
              </div>
            ) : (
              messages.map((msg) => (
                <ChatBubble
                  key={msg.id}
                  content={msg.content}
                  senderName={msg.sender_name}
                  senderType={msg.sender_type as "owner" | "cashier"}
                  isOwnMessage={msg.sender_type === "owner"}
                  isRead={msg.is_read}
                  createdAt={msg.created_at}
                  replyContent={msg.reply_content}
                  replySenderName={msg.reply_sender_name}
                  onReply={() => setReplyTo(msg)}
                />
              ))
            )}
            <div ref={scrollEndRef} />
          </div>
        </ScrollArea>

        <div className="border-t border-border p-3 space-y-2">
          {replyTo && (
            <div className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-2 text-xs">
              <span className="text-muted-foreground truncate flex-1">
                Replying to <strong>{replyTo.sender_name}</strong>: {replyTo.content}
              </span>
              <button onClick={() => setReplyTo(null)}>
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
          )}
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder="Type a message..."
              className="flex-1"
            />
            <Button size="icon" onClick={handleSend} disabled={!newMessage.trim() || isSending}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

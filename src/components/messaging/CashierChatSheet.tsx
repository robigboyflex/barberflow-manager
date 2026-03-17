import { useState, useEffect, useRef } from "react";
import { MessageSquare, Send, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useStaffAuth } from "@/contexts/StaffAuthContext";
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

export default function CashierChatSheet() {
  const { staff, getSessionToken } = useStaffAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const scrollEndRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    if (!staff) return;
    const token = getSessionToken();
    if (!token) return;

    const { data, error } = await supabase.rpc("get_staff_messages", {
      p_staff_id: staff.id,
      p_session_token: token,
      p_limit: 100,
    });

    if (error) {
      console.error("Failed to fetch messages:", error);
      return;
    }

    // Reverse to show oldest first
    const sorted = [...(data || [])].reverse();
    setMessages(sorted);

    const unread = sorted.filter((m: Message) => m.sender_type === "owner" && !m.is_read).length;
    setUnreadCount(unread);
  };

  const markAsRead = async () => {
    if (!staff) return;
    const token = getSessionToken();
    if (!token) return;
    await supabase.rpc("mark_staff_messages_read", {
      p_staff_id: staff.id,
      p_session_token: token,
    });
  };

  useEffect(() => {
    if (!staff) return;
    fetchMessages();
    const channel = supabase
      .channel(`cashier-messages-${staff.shop_id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `shop_id=eq.${staff.shop_id}` }, () => {
        fetchMessages();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [staff?.shop_id]);

  // Poll for new messages when sheet is open (realtime may not work due to RLS)
  useEffect(() => {
    if (!isOpen || !staff) return;
    markAsRead();
    setUnreadCount(0);
    setTimeout(() => {
      scrollEndRef.current?.scrollIntoView({ behavior: "instant" });
    }, 100);

    const pollInterval = setInterval(() => fetchMessages(), 5000);
    return () => clearInterval(pollInterval);
  }, [isOpen, staff?.shop_id]);

  // Auto-scroll when messages change
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        scrollEndRef.current?.scrollIntoView({ behavior: "instant" });
      }, 50);
    }
  }, [messages.length, isOpen]);

  const handleSend = async () => {
    if (!newMessage.trim() || isSending || !staff) return;
    const token = getSessionToken();
    if (!token) {
      toast.error("Session expired");
      return;
    }
    setIsSending(true);
    try {
      const { error } = await supabase.rpc("send_staff_message", {
        p_staff_id: staff.id,
        p_session_token: token,
        p_content: newMessage.trim(),
        p_reply_to: replyTo?.id || null,
      });
      if (error) throw error;
      setNewMessage("");
      setReplyTo(null);
      fetchMessages(); // Manually refetch since realtime may not trigger for RPC inserts
    } catch (err) {
      toast.error("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  if (!staff) return null;

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
          <SheetTitle className="font-display text-lg">Chat with Owner</SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
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
                  isOwnMessage={msg.sender_type === "cashier"}
                  isRead={msg.is_read}
                  createdAt={msg.created_at}
                  replyContent={msg.reply_content}
                  replySenderName={msg.reply_sender_name}
                  onReply={() => setReplyTo(msg)}
                />
              ))
            )}
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

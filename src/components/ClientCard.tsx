import { Phone, Mail, MoreVertical } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ClientCardProps {
  name: string;
  phone: string;
  email?: string | null;
  lastVisit?: string;
  totalVisits?: number;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export default function ClientCard({
  name,
  phone,
  email,
  lastVisit,
  totalVisits,
  onClick,
  onEdit,
  onDelete,
}: ClientCardProps) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Card className="glass-card overflow-hidden animate-fade-in">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <Avatar className="w-12 h-12 bg-gradient-gold">
            <AvatarFallback className="bg-gradient-gold text-primary-foreground font-display text-lg">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0" onClick={onClick}>
            <p className="font-medium text-foreground truncate">{name}</p>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Phone className="w-3 h-3" />
              <span>{phone}</span>
            </div>
            {email && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Mail className="w-3 h-3" />
                <span className="truncate">{email}</span>
              </div>
            )}
          </div>
          <div className="text-right space-y-1">
            {totalVisits !== undefined && (
              <p className="text-sm text-muted-foreground">{totalVisits} visits</p>
            )}
            {lastVisit && (
              <p className="text-xs text-muted-foreground">Last: {lastVisit}</p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>Edit</DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}

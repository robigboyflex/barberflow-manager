import { Clock, DollarSign, MoreVertical } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface ServiceCardProps {
  name: string;
  description?: string | null;
  duration: number;
  price: number;
  isActive?: boolean;
  onEdit?: () => void;
  onToggleActive?: () => void;
  onDelete?: () => void;
}

export default function ServiceCard({
  name,
  description,
  duration,
  price,
  isActive = true,
  onEdit,
  onToggleActive,
  onDelete,
}: ServiceCardProps) {
  return (
    <Card className={cn(
      "glass-card overflow-hidden animate-fade-in transition-opacity",
      !isActive && "opacity-60"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <p className="font-display text-lg tracking-wide">{name}</p>
              {!isActive && (
                <Badge variant="secondary" className="text-xs">Inactive</Badge>
              )}
            </div>
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                {duration} min
              </span>
              <span className="flex items-center gap-1 text-sm font-medium text-primary">
                <DollarSign className="w-4 h-4" />
                {price.toFixed(2)}
              </span>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>Edit</DropdownMenuItem>
              <DropdownMenuItem onClick={onToggleActive}>
                {isActive ? "Deactivate" : "Activate"}
              </DropdownMenuItem>
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

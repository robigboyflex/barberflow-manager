import { useState, useEffect, memo } from "react";
import { Clock } from "lucide-react";

interface LiveClockProps {
  className?: string;
  showIcon?: boolean;
}

export default memo(function LiveClock({ className = "", showIcon = true }: LiveClockProps) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const dateStr = now.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const timeStr = now.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {showIcon && <Clock className="w-3.5 h-3.5 text-muted-foreground" />}
      <span className="text-xs text-muted-foreground">
        {dateStr} • {timeStr}
      </span>
    </div>
  );
});

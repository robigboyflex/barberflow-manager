import { Scissors } from "lucide-react";

export default function Header() {
  return (
    <header className="bg-card border-b border-border px-4 py-4 sticky top-0 z-40">
      <div className="max-w-lg mx-auto flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-gold rounded-lg flex items-center justify-center glow-gold">
          <Scissors className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-display text-2xl tracking-wider text-gradient-gold">
            BARBERFLOW
          </h1>
          <p className="text-xs text-muted-foreground -mt-1">Premium Barbershop Management</p>
        </div>
      </div>
    </header>
  );
}

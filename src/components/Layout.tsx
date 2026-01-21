import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import BottomNav from "./BottomNav";
import RoleSelector from "./RoleSelector";

export default function Layout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <RoleSelector />
      <main className="flex-1 pb-24 px-4 pt-4 max-w-lg mx-auto w-full overflow-hidden">
        <AnimatePresence mode="wait">
          <Outlet key={location.pathname} />
        </AnimatePresence>
      </main>
      <BottomNav />
    </div>
  );
}

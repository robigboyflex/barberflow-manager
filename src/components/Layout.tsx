import { Outlet } from "react-router-dom";
import BottomNav from "./BottomNav";
import Header from "./Header";

export default function Layout() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 pb-20 px-4 pt-4 max-w-lg mx-auto w-full">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}

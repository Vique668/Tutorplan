"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Header } from "./header";
import { Sidebar } from "./sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => setMenuOpen(false), [pathname]);

  return (
    <div className="app-shell">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      {menuOpen && <button className="sidebar-backdrop" aria-label="Закрыть меню" onClick={() => setMenuOpen(false)} />}
      <div className="app-content">
        <Header onMenuOpen={() => setMenuOpen(true)} />
        <main className="main-content">{children}</main>
      </div>
    </div>
  );
}

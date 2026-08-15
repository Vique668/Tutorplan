"use client";

import { Bell, Menu } from "lucide-react";

export function Header({ onMenuOpen }: { onMenuOpen: () => void }) {
  return (
    <header className="topbar">
      <button className="icon-button mobile-menu" aria-label="Открыть меню" onClick={onMenuOpen}>
        <Menu size={22} />
      </button>
      <img src="/brand/logo-full.png?v=transparent-1" alt="TutorPlan" width={124} height={42} decoding="async" />
      <button className="icon-button notification-button" aria-label="Уведомления">
        <Bell size={19} />
        <span />
      </button>
    </header>
  );
}

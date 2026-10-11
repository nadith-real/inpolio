import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { LogOut, Menu, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sidebar } from "./sidebar";
import { CommandSearch } from "./command-search";
import { NotificationsBell } from "./notifications";
import { useStore } from "@/lib/store";
import { useTheme } from "@/hooks/useTheme";

export function AppShell() {
  const { data, currentBusiness, accessibleBusinesses, switchBusiness, logout, user, can } = useStore();
  useTheme(data.settings.appearance);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-full bg-background">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2">
          Skip to content
        </a>
        <aside className={cnDesktop(collapsed)} aria-label="Sidebar">
          <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
        </aside>
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="p-0 w-64">
            <Sidebar collapsed={false} onToggle={() => setMobileOpen(false)} onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 items-center gap-2 border-b px-3 no-print">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu">
              <Menu />
            </Button>
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-md border bg-background px-3 text-left text-sm text-muted-foreground md:max-w-md"
            >
              <Search className="h-4 w-4" />
              <span className="truncate">Search…</span>
              <kbd className="ml-auto hidden rounded border px-1.5 text-[10px] sm:inline">Ctrl K</kbd>
            </button>
            {accessibleBusinesses.length > 1 && currentBusiness ? (
              <Select value={currentBusiness.id} onValueChange={switchBusiness}>
                <SelectTrigger className="hidden h-9 w-40 sm:flex" aria-label="Switch business">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {accessibleBusinesses.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
            {can("assistant") ? (
              <Button variant="ghost" size="sm" onClick={() => navigate("/assistant")} className="hidden sm:inline-flex">
                <Sparkles /> Assistant
              </Button>
            ) : null}
            <NotificationsBell />
            <div className="hidden text-right sm:block">
              <p className="text-xs font-medium leading-none">{currentBusiness?.name || data.settings.businessName || "Inpolio"}</p>
              <p className="text-[11px] text-muted-foreground">{user?.displayName || user?.username}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={logout} aria-label="Sign out">
              <LogOut />
            </Button>
          </header>
          <main id="main-content" className="flex-1 overflow-y-auto p-4 md:p-6">
            <Outlet />
          </main>
        </div>
        <CommandSearch open={searchOpen} onOpenChange={setSearchOpen} />
      </div>
    </TooltipProvider>
  );
}

function cnDesktop(collapsed: boolean) {
  return `hidden md:block shrink-0 transition-[width] ${collapsed ? "w-16" : "w-56"}`;
}

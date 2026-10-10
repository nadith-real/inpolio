import { NavLink } from "react-router-dom";
import { ChevronsLeft, ChevronsRight } from "lucide-react";
import { NAV_ITEMS } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function Sidebar({
  collapsed,
  onToggle,
  onNavigate,
}: {
  collapsed: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col border-r bg-card">
      <div className={cn("flex items-center gap-2 border-b px-3 py-3", collapsed && "justify-center")}>
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">
          IN
        </div>
        {!collapsed ? (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">Inpolio</p>
            <p className="truncate text-[11px] text-muted-foreground">Business OS</p>
          </div>
        ) : null}
      </div>
      <ScrollArea className="flex-1">
        <nav className="p-2" aria-label="Main">
          {NAV_ITEMS.map((item) => {
            const link = (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-accent",
                    collapsed && "justify-center",
                    isActive && "bg-accent font-medium",
                  )
                }
              >
                <item.icon className="h-4 w-4 shrink-0" aria-hidden />
                {!collapsed ? <span>{item.label}</span> : <span className="sr-only">{item.label}</span>}
              </NavLink>
            );
            if (!collapsed) return link;
            return (
              <Tooltip key={item.to}>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            );
          })}
        </nav>
      </ScrollArea>
      <div className="border-t p-2">
        <Button variant="ghost" className="w-full justify-center" onClick={onToggle} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
          {collapsed ? <ChevronsRight /> : <ChevronsLeft />}
          {!collapsed ? <span>Collapse</span> : null}
        </Button>
      </div>
    </div>
  );
}

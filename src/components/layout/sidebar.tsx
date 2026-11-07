import { NavLink } from "react-router-dom";
import { ChevronsLeft, ChevronsRight } from "lucide-react";
import { navGroupsFor } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useStore } from "@/lib/store";

export function Sidebar({
  collapsed,
  onToggle,
  onNavigate,
}: {
  collapsed: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
}) {
  const { can } = useStore();
  const groups = navGroupsFor(can);

  return (
    <div className="flex h-full min-w-0 flex-col bg-card">
      <div className={cn("flex h-14 shrink-0 items-center border-b border-border", collapsed ? "justify-center px-0" : "gap-2.5 px-3")}>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-[11px] font-semibold tracking-wide text-primary-foreground">
          IN
        </div>
        {!collapsed ? (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight">Inpolio</p>
            <p className="truncate text-[11px] text-muted-foreground">Business OS</p>
          </div>
        ) : null}
      </div>
      <nav
        className={cn(
          "min-h-0 flex-1 overflow-x-hidden overflow-y-auto py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          collapsed ? "px-0" : "px-2",
        )}
        aria-label="Main"
      >
        {groups.map((group, index) => (
          <div key={group.id} className={cn(index > 0 && (collapsed ? "mt-2" : "mt-4"))}>
            {!collapsed ? (
              <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {group.label}
              </p>
            ) : (
              index > 0 ? <div className="mx-auto mb-2 h-px w-4 bg-border" /> : null
            )}
            <div className={cn(collapsed ? "flex flex-col items-center gap-1.5" : "space-y-0.5")}>
              {group.items.map((item) => {
                const link = (
                  <NavLink
                    to={item.to}
                    end={item.to === "/"}
                    onClick={onNavigate}
                    aria-label={item.label}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                        collapsed ? "h-10 w-10 justify-center rounded-md" : "gap-2.5 rounded-md px-2 py-1.5",
                        isActive && "bg-accent font-medium text-foreground",
                      )
                    }
                  >
                    <item.icon className="h-4 w-4 shrink-0" aria-hidden />
                    {!collapsed ? <span>{item.label}</span> : null}
                  </NavLink>
                );
                if (!collapsed) return <div key={item.to}>{link}</div>;
                return (
                  <Tooltip key={item.to}>
                    <TooltipTrigger asChild>{link}</TooltipTrigger>
                    <TooltipContent side="right">{item.label}</TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className={cn("flex shrink-0 border-t border-border", collapsed ? "h-12 items-center justify-center" : "p-2")}>
        <Button
          variant="ghost"
          size={collapsed ? "icon" : "default"}
          className={cn("text-muted-foreground", !collapsed && "w-full justify-center")}
          onClick={onToggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronsRight /> : <ChevronsLeft />}
          {!collapsed ? <span>Collapse</span> : null}
        </Button>
      </div>
    </div>
  );
}

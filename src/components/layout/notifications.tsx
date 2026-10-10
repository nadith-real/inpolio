import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useStore } from "@/lib/store";
import { formatDateTime } from "@/lib/utils";

export function NotificationsBell() {
  const { data, markNotificationRead, markAllNotificationsRead } = useStore();
  const navigate = useNavigate();
  const unread = data.notifications.filter((n) => !n.read).length;
  const recent = data.notifications.slice(0, 12);

  const openRelated = (type?: string, id?: string) => {
    if (!type || !id) return;
    if (type === "invoice") navigate(`/invoices/${id}`);
    else if (type === "order") navigate(`/orders/${id}`);
    else if (type === "product") navigate("/inventory");
    else if (type === "task") navigate("/tasks");
    else if (type === "appointment") navigate("/appointments");
    else if (type === "payment") navigate("/payments");
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`} className="relative">
          <Bell />
          {unread ? (
            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-destructive" />
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <p className="text-sm font-medium">Notifications</p>
          {unread ? (
            <button type="button" className="text-xs text-muted-foreground hover:underline" onClick={markAllNotificationsRead}>
              Mark all read
            </button>
          ) : null}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {recent.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No notifications yet.</p>
          ) : (
            recent.map((n) => (
              <button
                key={n.id}
                type="button"
                className={`block w-full border-b px-3 py-2 text-left last:border-0 ${n.read ? "" : "bg-muted/40"}`}
                onClick={() => {
                  markNotificationRead(n.id);
                  openRelated(n.relatedType, n.relatedId);
                }}
              >
                <p className="text-sm font-medium">{n.title}</p>
                <p className="text-xs text-muted-foreground">{n.message}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{formatDateTime(n.createdAt)}</p>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

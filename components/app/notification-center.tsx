"use client";

import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  CircleAlert,
  Landmark,
  PieChart,
  Receipt,
  Repeat2,
  Split,
  Target,
  Trash2,
  Wallet,
} from "lucide-react";
import { EMPTY_STATES } from "@/lib/copy";
import type { NotificationKind, NotificationType } from "@/lib/types";
import { cn } from "@/lib/utils";

const ICONS: Record<NotificationKind, typeof Bell> = {
  success: CheckCircle2,
  error: CircleAlert,
  warning: AlertTriangle,
  limit: AlertTriangle,
  goal: Target,
  "goal-done": CheckCircle2,
  transaction: Receipt,
  investment: Landmark,
  report: PieChart,
  info: Bell,
  subscription: Repeat2,
  installment: Split,
  planning: Wallet,
};

const TYPE_TONE: Record<NotificationType, string> = {
  success: "bg-success/10 text-success",
  error: "bg-destructive/10 text-destructive",
  warning: "bg-primary/10 text-primary",
  info: "bg-primary/10 text-primary",
};

const TYPE_LABEL: Record<NotificationType, string> = {
  success: "Sucesso",
  error: "Erro",
  warning: "Aviso",
  info: "Aviso",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return "agora há pouco";
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  return d === 1 ? "ontem" : `há ${d} dias`;
}

export function NotificationCenter() {
  const {
    notifications,
    markAllNotificationsRead,
    markNotificationRead,
    deleteNotification,
    clearNotifications,
  } = useStore();
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <Popover>
      <span className="relative inline-flex">
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-2xl border border-border/70 bg-card/80 hover:bg-card"
            aria-label={`Notificações: ${unread} não lida(s)`}
          >
            <Bell className="h-5 w-5" />
          </Button>
        </PopoverTrigger>
        {unread > 0 && (
          <span className="pointer-events-none absolute -right-1 -top-1 z-10 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground ring-2 ring-background">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </span>
      <PopoverContent
        align="end"
        sideOffset={12}
        className="w-[min(calc(100dvw-1.5rem),24rem)] overflow-hidden rounded-2xl border-border/70 bg-card/95 p-0 backdrop-blur-xl"
      >
        <div className="border-b border-border/70 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-0.5">
              <p className="text-sm font-extrabold">Notificações</p>
              <p className="text-xs text-muted-foreground">
                {unread > 0 ? `${unread} não lida(s)` : "Tudo em dia"}
              </p>
            </div>
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 shrink-0 rounded-2xl px-2 text-xs"
                onClick={markAllNotificationsRead}
              >
                Marcar lidas
              </Button>
            )}
          </div>
        </div>

        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
            <Bell className="h-7 w-7 text-muted-foreground/50" />
            <p className="text-sm font-bold">{EMPTY_STATES.notifications.title}</p>
            <p className="text-xs text-muted-foreground">
              {EMPTY_STATES.notifications.description}
            </p>
          </div>
        ) : (
          <div className="max-h-[min(24rem,calc(100dvh-13rem))] overflow-y-auto overscroll-contain">
            <ul className="grid gap-1 p-2">
              {notifications.map((n) => {
                const Icon = ICONS[n.kind] ?? Bell;
                return (
                  <li
                    key={n.id}
                    className={cn(
                      "rounded-2xl transition-colors",
                      !n.read && "bg-accent/50",
                    )}
                  >
                    <div className="grid grid-cols-[2.25rem_minmax(0,1fr)_2rem] items-start gap-3 px-3 py-3">
                      <button
                        type="button"
                        onClick={() => markNotificationRead(n.id)}
                        className={cn(
                          "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl",
                          TYPE_TONE[n.type],
                        )}
                        aria-label="Marcar como lida"
                      >
                        <Icon className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => markNotificationRead(n.id)}
                        className="min-w-0 flex-1 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/20"
                      >
                        <span className="flex min-w-0 items-start gap-2">
                          <span className="min-w-0 flex-1 break-words text-sm font-bold leading-5">
                            {n.title}
                          </span>
                          {!n.read && (
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                          )}
                        </span>
                        <span className="mt-0.5 block break-words text-xs leading-5 text-muted-foreground">
                          {n.message}
                        </span>
                        <span className="mt-1 block text-[11px] font-semibold text-muted-foreground/70">
                          {TYPE_LABEL[n.type]} - {timeAgo(n.date)}
                        </span>
                      </button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-2xl text-muted-foreground hover:text-destructive"
                        onClick={() => deleteNotification(n.id)}
                        aria-label="Excluir notificação"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {notifications.length > 0 && (
          <div className="border-t border-border/70 p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full rounded-2xl text-xs text-muted-foreground"
              onClick={clearNotifications}
            >
              Limpar todas
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

"use client";

import * as React from "react";

type TooltipSide = "top" | "right" | "bottom" | "left";

type TooltipContextValue = {
  open: boolean;
  contentId: string;
  side: TooltipSide;
  sideOffset: number;
  show: () => void;
  hide: () => void;
};

const TooltipContext = React.createContext<TooltipContextValue | null>(null);
const TooltipProviderContext = React.createContext({ openDelay: 0, closeDelay: 0 });

export type TooltipProviderProps = {
  children: React.ReactNode;
  openDelay?: number;
  closeDelay?: number;
};

export function TooltipProvider({ children, openDelay = 0, closeDelay = 0 }: TooltipProviderProps) {
  return <TooltipProviderContext.Provider value={{ openDelay, closeDelay }}>{children}</TooltipProviderContext.Provider>;
}

export type TooltipProps = {
  children: React.ReactNode;
  side?: TooltipSide;
  sideOffset?: number;
};

export function Tooltip({ children, side = "top", sideOffset = 8 }: TooltipProps) {
  const { openDelay, closeDelay } = React.useContext(TooltipProviderContext);
  const [open, setOpen] = React.useState(false);
  const contentId = React.useId();
  const openTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => () => {
    if (openTimer.current) clearTimeout(openTimer.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  const show = React.useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    openTimer.current = setTimeout(() => setOpen(true), openDelay);
  }, [openDelay]);

  const hide = React.useCallback(() => {
    if (openTimer.current) clearTimeout(openTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), closeDelay);
  }, [closeDelay]);

  return (
    <TooltipContext.Provider value={{ open, contentId, side, sideOffset, show, hide }}>
      <div
        className="avatar-group-tooltip-root"
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocusCapture={show}
        onBlurCapture={hide}
      >
        {children}
      </div>
    </TooltipContext.Provider>
  );
}

export function TooltipTrigger({ children }: { children: React.ReactNode }) {
  const context = React.useContext(TooltipContext);
  if (!context) throw new Error("TooltipTrigger precisa estar dentro de Tooltip.");

  return <div aria-describedby={context.open ? context.contentId : undefined} className="avatar-group-tooltip-trigger">{children}</div>;
}

export type TooltipContentProps = React.HTMLAttributes<HTMLDivElement> & {
  side?: TooltipSide;
  sideOffset?: number;
};

export function TooltipContent({ className, children, side, sideOffset, style, ...props }: TooltipContentProps) {
  const context = React.useContext(TooltipContext);
  if (!context || !context.open) return null;

  return (
    <div
      id={context.contentId}
      role="tooltip"
      className={['avatar-group-tooltip-content', `avatar-group-tooltip-${side || context.side}`, className].filter(Boolean).join(' ')}
      style={{ '--avatar-tooltip-offset': `${sideOffset ?? context.sideOffset}px`, ...style } as React.CSSProperties}
      {...props}
    >
      {children}
    </div>
  );
}

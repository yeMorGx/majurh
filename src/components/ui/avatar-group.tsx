"use client";

import * as React from "react";
import { motion, useReducedMotion, type Transition } from "motion/react";

import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  type TooltipProps,
  type TooltipContentProps,
} from "@/components/ui/avatar-group-utils/tooltip";

type AvatarProps = TooltipProps & {
  children: React.ReactNode;
  zIndex: number;
  transition: Transition;
  translate: string | number;
};

function AvatarContainer({ children, zIndex, transition, translate, ...props }: AvatarProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <Tooltip {...props}>
      <TooltipTrigger>
        <motion.div
          data-slot="avatar-container"
          initial="initial"
          whileHover={prefersReducedMotion ? undefined : "hover"}
          whileTap={prefersReducedMotion ? undefined : "hover"}
          className="relative"
          style={{ zIndex }}
        >
          <motion.div
            variants={{ initial: { y: 0 }, hover: { y: translate } }}
            transition={prefersReducedMotion ? { duration: 0 } : transition}
          >
            {children}
          </motion.div>
        </motion.div>
      </TooltipTrigger>
    </Tooltip>
  );
}

type AvatarGroupTooltipProps = TooltipContentProps;

function AvatarGroupTooltip(props: AvatarGroupTooltipProps) {
  return <TooltipContent {...props} />;
}

type AvatarGroupProps = Omit<React.ComponentProps<"div">, "translate"> & {
  children: React.ReactElement[];
  transition?: Transition;
  invertOverlap?: boolean;
  translate?: string | number;
  tooltipProps?: Omit<TooltipProps, "children">;
};

function AvatarGroup({
  children,
  className,
  transition = { type: "spring", stiffness: 300, damping: 17 },
  invertOverlap = false,
  translate = "-30%",
  tooltipProps = { side: "top", sideOffset: 10 },
  ...props
}: AvatarGroupProps) {
  const childList = React.Children.toArray(children) as React.ReactElement[];

  return (
    <TooltipProvider openDelay={0} closeDelay={0}>
      <div
        data-slot="avatar-group"
        className={cn("avatar-group flex flex-row -space-x-2 items-center h-8", className)}
        {...props}
      >
        {childList.map((child, index) => (
          <AvatarContainer
            key={child.key ?? index}
            zIndex={invertOverlap ? childList.length - index : index}
            transition={transition}
            translate={translate}
            {...tooltipProps}
          >
            {child}
          </AvatarContainer>
        ))}
      </div>
    </TooltipProvider>
  );
}

export {
  AvatarGroup,
  AvatarGroupTooltip,
  type AvatarGroupProps,
  type AvatarGroupTooltipProps,
};

export default AvatarGroup;

import { Children, cloneElement, isValidElement } from "react";

import { cn } from "@/lib/utils";

type SlotProps = React.HTMLAttributes<HTMLElement> & {
  children?: React.ReactNode;
};

type MergeableProps = React.HTMLAttributes<HTMLElement> & {
  className?: string;
};

export function Slot({ children, className, ...slotProps }: SlotProps) {
  const child = Children.only(children);

  if (!isValidElement<MergeableProps>(child)) return null;

  return cloneElement(child, {
    ...slotProps,
    ...child.props,
    className: cn(className, child.props.className),
  });
}

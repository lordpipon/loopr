import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const variants = cva("button", {
  variants: { variant: { primary: "button-primary", outline: "button-outline", quiet: "button-quiet" } },
  defaultVariants: { variant: "primary" },
});

export function Button({ variant, className, type = "button", ...props }: ComponentProps<"button"> & VariantProps<typeof variants>) {
  return <button type={type} className={cn(variants({ variant }), className)} {...props} />;
}

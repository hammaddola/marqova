import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[8px] text-sm font-semibold transition-[background-color,color,box-shadow,transform] duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Add to Cart: gold background, navy text.
        gold: "bg-gold-500 text-navy-900 hover:bg-gold-600 hover:text-white shadow-sm",
        // Buy Now: navy background, white text.
        navy: "bg-navy-900 text-white hover:bg-navy-700 shadow-sm",
        secondary: "bg-white text-ink border border-sand hover:border-slate/40 hover:bg-sand-50",
        ghost: "text-ink hover:bg-sand-50",
        link: "text-gold-text underline-offset-4 hover:underline px-0 h-auto min-h-0",
        danger: "bg-crimson text-white hover:bg-crimson/90",
        outlineLight: "border border-white/30 text-white hover:bg-white/10",
      },
      size: {
        sm: "h-9 min-h-9 px-3 text-[13px]",
        md: "h-11 min-h-11 px-5",
        lg: "h-12 min-h-12 px-6 text-base",
        icon: "size-11 min-h-11",
        iconSm: "size-9",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

type ButtonProps = React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean; loading?: boolean };

export function Button({ className, variant, size, asChild, loading, children, disabled, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp className={cn(buttonVariants({ variant, size }), className)} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {asChild ? (
        children
      ) : (
        <>
          {loading && <Loader2 className="animate-spin" aria-hidden />}
          {children}
        </>
      )}
    </Comp>
  );
}

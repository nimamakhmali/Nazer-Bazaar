import { cn } from "@/lib/cn";

type BadgeVariant =
  | "success" | "danger" | "warning" | "info"
  | "default" | "primary" | "secondary";

type BadgeSize = "sm" | "md";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  icon?: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  success:   "bg-green-50    text-green-800   border-green-200",
  danger:    "bg-red-50      text-red-800     border-red-200",
  warning:   "bg-amber-50    text-amber-800   border-amber-200",
  info:      "bg-blue-50     text-blue-800    border-blue-200",
  default:   "bg-slate-50    text-slate-700   border-slate-200",
  primary:   "bg-blue-50     text-blue-900    border-blue-200",
  secondary: "bg-yellow-50   text-yellow-900  border-yellow-200",
};

const dotColors: Record<BadgeVariant, string> = {
  success:   "bg-green-500",
  danger:    "bg-red-500",
  warning:   "bg-amber-500",
  info:      "bg-blue-500",
  default:   "bg-slate-400",
  primary:   "bg-blue-600",
  secondary: "bg-yellow-600",
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: "px-2 py-0.5 text-xs gap-1",
  md: "px-2.5 py-1 text-sm gap-1.5",
};

export const Badge = ({
  children,
  variant = "default",
  size = "sm",
  dot = false,
  icon,
  className,
}: BadgeProps) => (
  <span
    className={cn(
      "inline-flex items-center font-medium rounded-full border",
      variantStyles[variant],
      sizeStyles[size],
      className
    )}
  >
    {dot && (
      <span
        className={cn(
          "rounded-full flex-shrink-0",
          dotColors[variant],
          size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2"
        )}
        aria-hidden="true"
      />
    )}
    {icon && !dot && (
      <span className="flex-shrink-0" aria-hidden="true">{icon}</span>
    )}
    {children}
  </span>
);
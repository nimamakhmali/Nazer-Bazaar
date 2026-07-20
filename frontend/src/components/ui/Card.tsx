import { cn } from "@/lib/cn";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
  as?: React.ElementType;
  onClick?: () => void;
}

const paddingMap = {
  none: "",
  sm:   "p-4",
  md:   "p-6",
  lg:   "p-8",
};

export const Card = ({
  children,
  className,
  hover = false,
  padding = "md",
  as: Tag = "div",
  onClick,
}: CardProps) => (
  <Tag
    onClick={onClick}
    className={cn(
      "bg-white rounded-xl border border-slate-100 shadow-card",
      hover && "card-hover",
      onClick && "cursor-pointer",
      paddingMap[padding],
      className
    )}
  >
    {children}
  </Tag>
);

export const CardHeader = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={cn("flex items-center justify-between mb-5", className)}>
    {children}
  </div>
);

export const CardTitle = ({
  children,
  subtitle,
  className,
}: {
  children: React.ReactNode;
  subtitle?: string;
  className?: string;
}) => (
  <div className={className}>
    <h3 className="text-base font-bold text-blue-900">{children}</h3>
    {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
  </div>
);

export const CardFooter = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={cn(
    "mt-5 pt-4 border-t border-slate-100 flex items-center justify-end gap-3",
    className
  )}>
    {children}
  </div>
);
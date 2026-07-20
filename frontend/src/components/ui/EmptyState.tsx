import { cn } from "@/lib/cn";
import { InboxIcon } from "@heroicons/react/24/outline";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeConfig = {
  sm: { wrapper: "py-10", icon: "h-10 w-10", title: "text-base", desc: "text-xs" },
  md: { wrapper: "py-16", icon: "h-14 w-14", title: "text-lg",  desc: "text-sm" },
  lg: { wrapper: "py-24", icon: "h-20 w-20", title: "text-xl",  desc: "text-base" },
};

export const EmptyState = ({
  title,
  description,
  icon,
  action,
  className,
  size = "md",
}: EmptyStateProps) => {
  const config = sizeConfig[size];

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center px-4",
        config.wrapper,
        className
      )}
    >
      <div className="text-slate-300 mb-4">
        {icon ?? (
          <InboxIcon className={config.icon} />
        )}
      </div>

      <h3 className={cn("font-semibold text-slate-600 mb-2", config.title)}>
        {title}
      </h3>

      {description && (
        <p className={cn("text-slate-400 max-w-sm leading-relaxed mb-6", config.desc)}>
          {description}
        </p>
      )}

      {action}
    </div>
  );
};
import { cn } from "@/lib/cn";
import { Breadcrumb } from "./Breadcrumb";
import type { BreadcrumbItem } from "./Breadcrumb";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  className?: string;
}

export const PageHeader = ({
  title,
  subtitle,
  actions,
  breadcrumbs,
  className,
}: PageHeaderProps) => (
  <div className={cn("mb-6", className)}>
    {breadcrumbs && breadcrumbs.length > 0 && (
      <Breadcrumb items={breadcrumbs} className="mb-3" />
    )}

    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-primary-700 leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {actions}
        </div>
      )}
    </div>

    <div className="mt-4 border-b border-slate-200" />
  </div>
);
import Link from "next/link";
import { ChevronLeftIcon, HomeIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/cn";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export const Breadcrumb = ({ items, className }: BreadcrumbProps) => {
  if (items.length === 0) return null;

  return (
    <nav
      aria-label="مسیر ناوبری"
      className={cn("flex items-center gap-1 text-xs text-slate-500", className)}
    >
      <Link
        href="/dashboard"
        className="hover:text-primary-600 transition-colors p-1 rounded"
        aria-label="داشبورد"
      >
        <HomeIcon className="h-3.5 w-3.5" />
      </Link>

      {items.map((item, index) => (
        <span key={index} className="flex items-center gap-1">
          <ChevronLeftIcon className="h-3 w-3 text-slate-300" aria-hidden="true" />
          {item.href && index < items.length - 1 ? (
            <Link
              href={item.href}
              className="hover:text-primary-600 transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span
              className="text-primary-600 font-medium"
              aria-current={index === items.length - 1 ? "page" : undefined}
            >
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
};
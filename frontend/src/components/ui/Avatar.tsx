import { cn } from "@/lib/cn";
import { getInitials } from "@/utils/string.utils";
import Image from "next/image";

type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";
type StatusType = "online" | "offline" | "away" | "busy";

interface AvatarProps {
  name?: string;
  src?: string | null;
  size?: AvatarSize;
  status?: StatusType;
  className?: string;
}

const sizeConfig: Record<AvatarSize, { container: string; text: string; status: string }> = {
  xs: { container: "h-6 w-6",  text: "text-xs",  status: "h-1.5 w-1.5 border" },
  sm: { container: "h-8 w-8",  text: "text-xs",  status: "h-2 w-2 border" },
  md: { container: "h-10 w-10", text: "text-sm", status: "h-2.5 w-2.5 border-2" },
  lg: { container: "h-12 w-12", text: "text-base", status: "h-3 w-3 border-2" },
  xl: { container: "h-16 w-16", text: "text-xl", status: "h-3.5 w-3.5 border-2" },
};

const statusColors: Record<StatusType, string> = {
  online:  "bg-green-500",
  offline: "bg-slate-400",
  away:    "bg-amber-500",
  busy:    "bg-red-500",
};

const bgColors = [
  "bg-primary-600", "bg-secondary-600", "bg-green-600",
  "bg-purple-600",  "bg-pink-600",       "bg-indigo-600",
];

export const Avatar = ({ name, src, size = "md", status, className }: AvatarProps) => {
  const config = sizeConfig[size];
  const initials = name ? getInitials(name) : "?";
  const colorIndex = name
    ? name.charCodeAt(0) % bgColors.length
    : 0;

  return (
    <div className={cn("relative inline-flex flex-shrink-0", className)}>
      <div
        className={cn(
          "rounded-full overflow-hidden flex items-center justify-center",
          "font-semibold text-white select-none",
          config.container,
          !src && bgColors[colorIndex]
        )}
        aria-label={name}
      >
        {src ? (
          <Image
            src={src}
            alt={name ?? "avatar"}
            fill
            className="object-cover"
          />
        ) : (
          <span className={config.text}>{initials}</span>
        )}
      </div>

      {status && (
        <span
          className={cn(
            "absolute bottom-0 left-0 rounded-full border-white",
            statusColors[status],
            config.status
          )}
          aria-label={`وضعیت: ${status}`}
        />
      )}
    </div>
  );
};
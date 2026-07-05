import Link from "next/link";
import { Plus } from "lucide-react";
import { BackButton } from "./BackButton";

interface PageHeaderProps {
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  children?: React.ReactNode;
}

export function PageHeader({
  title,
  description,
  actionLabel,
  actionHref,
  children,
}: PageHeaderProps) {
  return (
    <div className="mb-6">
      <BackButton />
      <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-ink">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-ink-muted print:hidden">{description}</p>
        )}
      </div>
      <div className="flex items-center gap-3">
        {children}
        {actionLabel && actionHref && (
          <Link
            href={actionHref}
            className="flex items-center gap-2 rounded-lg bg-brand-petrol px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark"
          >
            <Plus className="h-4 w-4" />
            {actionLabel}
          </Link>
        )}
      </div>
      </div>
    </div>
  );
}

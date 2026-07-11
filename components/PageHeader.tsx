'use client';

export default function PageHeader({
  section,
  title,
  subtitle,
  action,
}: {
  section: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <div className="text-xs text-muted mb-1">
        HelmAssured <span className="mx-1">/</span> <span className="text-slate-700">{section}</span>
      </div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-[22px] font-semibold tracking-tight text-slate-900">{title}</h1>
          {subtitle && <p className="text-sm text-muted mt-0.5">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}

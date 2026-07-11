export function SkeletonRows({ count = 4 }: { count?: number }) {
  return (
    <div className="animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-4 border-b border-line last:border-0">
          <div className="h-3.5 bg-slate-200 rounded w-2/5 mb-2" />
          <div className="h-3 bg-slate-100 rounded w-3/5" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonCards({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white border border-line rounded-xl p-4">
          <div className="h-2.5 bg-slate-100 rounded w-2/3 mb-3" />
          <div className="h-6 bg-slate-200 rounded w-1/3" />
        </div>
      ))}
    </div>
  );
}

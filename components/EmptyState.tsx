export function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-10 px-4">
      <div className="text-2xl mb-2">◌</div>
      <p className="text-sm text-muted">{message}</p>
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="bg-danger-bg border border-red-200 rounded-lg p-4 text-sm text-red-700">
      ⚠ {message}
    </div>
  );
}

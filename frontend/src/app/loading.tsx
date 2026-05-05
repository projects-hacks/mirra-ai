export default function RootLoading() {
  return (
    <div className="page-loading space-y-4">
      <div className="skeleton-card p-6">
        <div className="shimmer h-4 w-24 rounded-full" />
        <div className="shimmer mt-4 h-10 w-3/4" />
        <div className="shimmer mt-3 h-4 w-full" />
        <div className="shimmer mt-2 h-4 w-5/6" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="skeleton-card p-5">
          <div className="shimmer h-48 w-full rounded-[1.25rem]" />
        </div>
        <div className="skeleton-card p-5">
          <div className="shimmer h-48 w-full rounded-[1.25rem]" />
        </div>
      </div>
    </div>
  );
}

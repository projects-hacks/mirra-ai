export default function AppLoading() {
  return (
    <div className="page-loading space-y-4">
      <div className="skeleton-card p-5">
        <div className="shimmer h-4 w-20 rounded-full" />
        <div className="shimmer mt-4 h-8 w-56" />
        <div className="shimmer mt-3 h-4 w-full" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="skeleton-card p-5">
          <div className="shimmer h-56 w-full rounded-[1.35rem]" />
          <div className="shimmer mt-4 h-4 w-2/5" />
          <div className="shimmer mt-2 h-4 w-4/5" />
        </div>
        <div className="skeleton-card p-5">
          <div className="shimmer h-56 w-full rounded-[1.35rem]" />
          <div className="shimmer mt-4 h-4 w-1/3" />
          <div className="shimmer mt-2 h-4 w-3/4" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="skeleton-card p-5">
          <div className="shimmer h-32 w-full rounded-[1.25rem]" />
        </div>
        <div className="skeleton-card p-5">
          <div className="shimmer h-32 w-full rounded-[1.25rem]" />
        </div>
        <div className="skeleton-card p-5">
          <div className="shimmer h-32 w-full rounded-[1.25rem]" />
        </div>
      </div>
    </div>
  );
}

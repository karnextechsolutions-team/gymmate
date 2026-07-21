export default function ProfileLoading() {
  return (
    <div className="px-5 pt-14 pb-28 animate-pulse">
      {/* Hero skeleton */}
      <div className="card overflow-hidden">
        <div className="bg-white/[0.02] p-6 flex flex-col items-center">
          <div className="h-24 w-24 rounded-full bg-white/10" />
          <div className="h-6 w-36 bg-white/10 rounded-md mt-4" />
          <div className="h-4 w-20 bg-white/10 rounded-md mt-2" />
          <div className="h-3 w-28 bg-white/10 rounded-md mt-3" />
          <div className="h-10 w-32 bg-white/10 rounded-full mt-5" />
        </div>
      </div>

      {/* Metrics skeleton */}
      <div className="mt-6">
        <div className="h-3.5 w-24 bg-white/5 rounded-md mb-3" />
        <div className="grid grid-cols-3 gap-3">
          <div className="h-20 bg-white/5 rounded-2xl" />
          <div className="h-20 bg-white/5 rounded-2xl" />
          <div className="h-20 bg-white/5 rounded-2xl" />
        </div>
      </div>

      {/* Subscription skeleton */}
      <div className="mt-6">
        <div className="h-3.5 w-32 bg-white/5 rounded-md mb-3" />
        <div className="h-32 bg-white/5 rounded-3xl" />
      </div>

      {/* Weight tracker skeleton */}
      <div className="mt-6">
        <div className="h-3.5 w-36 bg-white/5 rounded-md mb-3" />
        <div className="h-12 bg-white/5 rounded-xl mb-4" />
        <div className="h-48 bg-white/5 rounded-3xl" />
      </div>
    </div>
  );
}

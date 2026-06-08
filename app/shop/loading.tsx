export default function ShopLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header skeleton */}
      <div className="bg-[#0D47A1] px-4 pt-4 pb-3">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="w-20 h-8 bg-white/20 rounded-lg animate-pulse" />
          <div className="flex-1 h-9 bg-white/20 rounded-xl animate-pulse" />
          <div className="w-9 h-9 bg-white/20 rounded-xl animate-pulse" />
        </div>
        <div className="flex gap-2">
          {[1,2,3,4].map(i => (
            <div key={i} className="w-16 h-7 bg-white/20 rounded-full animate-pulse" />
          ))}
        </div>
      </div>

      {/* Grid skeleton */}
      <div className="px-3 py-4 max-w-2xl mx-auto">
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl overflow-hidden border border-gray-100">
              <div className="aspect-square bg-gray-200 animate-pulse" />
              <div className="p-3 space-y-2">
                <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
                <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
                <div className="h-3 bg-gray-200 rounded animate-pulse w-1/3" />
                <div className="h-5 bg-gray-200 rounded animate-pulse w-2/3" />
                <div className="h-10 bg-gray-200 rounded-xl animate-pulse mt-1" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

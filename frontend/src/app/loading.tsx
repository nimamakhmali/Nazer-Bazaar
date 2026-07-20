export default function Loading() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="h-16 w-16 rounded-full border-4 border-primary-100
                           border-t-primary-600 animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-6 w-6 rounded-full bg-primary-600 animate-pulse" />
          </div>
        </div>
        <p className="text-sm text-slate-500 animate-pulse">
          در حال بارگذاری...
        </p>
      </div>
    </div>
  );
}
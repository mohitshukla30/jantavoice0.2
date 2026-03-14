export default function ComplaintSkeleton() {
  return (
    <div className="bg-card border border-border rounded-3xl overflow-hidden animate-pulse">
      {/* top accent bar */}
      <div className="h-[3px] w-full bg-secondary" />

      <div className="p-5 space-y-4">
        {/* badges row */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            <div className="h-5 w-20 bg-secondary rounded-full" />
            <div className="h-5 w-16 bg-secondary rounded-full" />
          </div>
          {/* no trending pill placeholder — intentionally omitted */}
        </div>

        {/* title */}
        <div className="space-y-2">
          <div className="h-3.5 bg-secondary rounded-lg w-full" />
          <div className="h-3.5 bg-secondary rounded-lg w-4/5" />
        </div>

        {/* description */}
        <div className="space-y-1.5">
          <div className="h-3 bg-secondary rounded-lg w-full" />
          <div className="h-3 bg-secondary rounded-lg w-3/4" />
        </div>

        {/* location */}
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-secondary rounded-full shrink-0" />
          <div className="h-3 bg-secondary rounded-lg w-2/5" />
        </div>

        {/* footer */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-secondary shrink-0" />
            <div className="space-y-1.5">
              <div className="h-2.5 bg-secondary rounded w-20" />
              <div className="h-2 bg-secondary rounded w-14" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-3 w-8 bg-secondary rounded-lg" />
            <div className="h-3 w-8 bg-secondary rounded-lg" />
            <div className="h-3 w-8 bg-secondary rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
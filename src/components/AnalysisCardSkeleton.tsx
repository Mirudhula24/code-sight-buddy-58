import { Skeleton } from "@/components/ui/skeleton";

const AnalysisCardSkeleton = () => {
  return (
    <div className="gradient-card border border-border rounded-xl overflow-hidden animate-pulse">
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-40 bg-muted" />
              <Skeleton className="h-5 w-20 rounded-full bg-muted" />
            </div>
            <Skeleton className="h-4 w-full max-w-md bg-muted" />
          </div>
          <Skeleton className="h-5 w-5 bg-muted" />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-4 w-20 bg-muted" />
            <Skeleton className="h-4 w-12 bg-muted" />
            <Skeleton className="h-5 w-16 rounded-full bg-muted" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded bg-muted" />
            <Skeleton className="h-8 w-8 rounded bg-muted" />
            <Skeleton className="h-8 w-8 rounded bg-muted" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalysisCardSkeleton;

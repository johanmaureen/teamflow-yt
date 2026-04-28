import { Skeleton } from "@/components/ui/skeleton";

export function ThreadSidebarSkeleton() {
  return (
    <div className="w-120 border-l flex flex-col h-full">
      <div className="border-b h-14 px-4 flex items-center justify-between">
        <div className="flex items-center gap-x-2">
          <Skeleton className="h-4 w-4 rounded-full" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-20 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-4 space-y-4">
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </div>

        <div className="space-y-2">
          <Skeleton className="h-4 w-24 rounded-full" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      </div>

      <div className="border-t p-4">
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    </div>
  );
}

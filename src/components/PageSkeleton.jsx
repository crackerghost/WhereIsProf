import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';

const PageSkeleton = () => {
  return (
    <SkeletonTheme baseColor="#151515" highlightColor="#262626">
      <div className="space-y-6 md:space-y-8 pb-12">
        <div className="space-y-3 max-w-2xl">
          <Skeleton height={44} width={280} borderRadius={12} />
          <Skeleton height={16} width="70%" borderRadius={8} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-4">
              <Skeleton height={22} width="55%" borderRadius={8} />
              <div className="mt-4 space-y-2">
                <Skeleton height={14} borderRadius={6} />
                <Skeleton height={14} width="85%" borderRadius={6} />
                <Skeleton height={14} width="65%" borderRadius={6} />
              </div>
              <div className="mt-5">
                <Skeleton height={96} borderRadius={14} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </SkeletonTheme>
  );
};

export default PageSkeleton;

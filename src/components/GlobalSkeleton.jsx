import { cn } from '../lib/utils';

export const GlobalSkeleton = ({ overlay = false }) => {
  return (
    <div
      className={cn(
        'bg-black',
        overlay ? 'fixed inset-0 z-[200] bg-black/85 backdrop-blur-sm pointer-events-none' : 'min-h-screen'
      )}
    >
      <div className="w-full h-full p-6 md:p-10 animate-pulse">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="h-14 md:h-16 rounded-2xl bg-zinc-900/90 border border-zinc-800" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="h-52 rounded-3xl bg-zinc-900/80 border border-zinc-800 lg:col-span-2" />
            <div className="h-52 rounded-3xl bg-zinc-900/80 border border-zinc-800" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <div className="h-40 rounded-2xl bg-zinc-900/80 border border-zinc-800" />
            <div className="h-40 rounded-2xl bg-zinc-900/80 border border-zinc-800" />
            <div className="h-40 rounded-2xl bg-zinc-900/80 border border-zinc-800" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlobalSkeleton;

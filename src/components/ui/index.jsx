import { cn } from '../../lib/utils';

export const Button = ({ className, variant = 'primary', ...props }) => {
  const variants = {
    primary: 'bg-white text-black hover:bg-zinc-200 border border-white shadow-[0_8px_30px_rgba(255,255,255,0.1)]',
    secondary: 'bg-zinc-900 text-white hover:bg-zinc-800 border border-zinc-800 shadow-[0_8px_20px_rgba(0,0,0,0.35)]',
    outline: 'border border-zinc-700 text-white hover:bg-zinc-900/80',
    danger: 'bg-red-600 text-white hover:bg-red-700 border border-red-500/40 shadow-[0_8px_25px_rgba(220,38,38,0.25)]',
    ghost: 'text-zinc-400 hover:text-white hover:bg-zinc-900/70 border border-transparent',
  };

  return (
    <button
      className={cn(
        'px-4 py-2.5 rounded-xl font-semibold transition-all duration-300 active:scale-[0.98] focus:outline-none focus:ring-1 focus:ring-zinc-500 disabled:opacity-50 disabled:pointer-events-none',
        variants[variant],
        className
      )}
      {...props}
    />
  );
};

export const Card = ({ className, children, ...props }) => {
  return (
    <div
      className={cn(
        'bg-zinc-950/70 rounded-xl border border-zinc-800/60 shadow-[0_12px_30px_rgba(0,0,0,0.35)] overflow-hidden backdrop-blur-sm',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export const Input = ({ className, label, error, ...props }) => {
  return (
    <div className="space-y-1.5 w-full">
      {label && <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 ml-1">{label}</label>}
      <input
        className={cn(
          'w-full px-4 py-2.5 bg-black/80 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-white focus:border-white transition-all duration-300',
          error && 'border-red-500/50 focus:ring-red-500 focus:border-red-500',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
};

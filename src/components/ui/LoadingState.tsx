'use client';

export default function LoadingState() {
  return (
    <div className="flex flex-col gap-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="glass-card rounded-2xl p-5"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          <div className="flex justify-between">
            <div>
              <div
                className="h-4 w-24 rounded-md animate-shimmer"
                style={{
                  background: `linear-gradient(90deg, var(--shimmer-base) 25%, var(--shimmer-highlight) 50%, var(--shimmer-base) 75%)`,
                  backgroundSize: '200% 100%',
                }}
              />
              <div
                className="mt-2 h-3 w-16 rounded-md animate-shimmer"
                style={{
                  background: `linear-gradient(90deg, var(--shimmer-base) 25%, var(--shimmer-highlight) 50%, var(--shimmer-base) 75%)`,
                  backgroundSize: '200% 100%',
                  animationDelay: '0.1s',
                }}
              />
            </div>
            <div>
              <div
                className="h-5 w-20 rounded-md animate-shimmer"
                style={{
                  background: `linear-gradient(90deg, var(--shimmer-base) 25%, var(--shimmer-highlight) 50%, var(--shimmer-base) 75%)`,
                  backgroundSize: '200% 100%',
                  animationDelay: '0.2s',
                }}
              />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-4 gap-3 border-t border-glass-border pt-3">
            {[1, 2, 3, 4].map((j) => (
              <div key={j}>
                <div
                  className="h-2.5 w-8 rounded animate-shimmer"
                  style={{
                    background: `linear-gradient(90deg, var(--shimmer-base) 25%, var(--shimmer-highlight) 50%, var(--shimmer-base) 75%)`,
                    backgroundSize: '200% 100%',
                  }}
                />
                <div
                  className="mt-1.5 h-3 w-12 rounded animate-shimmer"
                  style={{
                    background: `linear-gradient(90deg, var(--shimmer-base) 25%, var(--shimmer-highlight) 50%, var(--shimmer-base) 75%)`,
                    backgroundSize: '200% 100%',
                    animationDelay: '0.15s',
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

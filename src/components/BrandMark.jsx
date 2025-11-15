export default function BrandMark({ size = 80, className = "" }) {
  const dimension = typeof size === "number" ? `${size}px` : size;
  return (
    <div
      className={`flex items-center justify-center rounded-full bg-[#dff5ff] text-[#0c77b7] shadow-inner ${className}`}
      style={{ width: dimension, height: dimension }}
    >
      <span className="text-2xl font-bold tracking-tight" style={{ fontSize: size * 0.35 }}>
        D+
      </span>
    </div>
  );
}

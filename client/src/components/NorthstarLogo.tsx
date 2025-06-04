interface NorthstarLogoProps {
  size?: number;
  className?: string;
  animated?: boolean;
}

export function NorthstarLogo({ size = 48, className = "", animated = false }: NorthstarLogoProps) {
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={animated ? "star-glow" : ""}
      >
        {/* Eight-pointed star matching your design */}
        <path
          d="M50 5 L55.5 35 L85 20 L60.5 45 L95 50 L60.5 55 L85 80 L55.5 65 L50 95 L44.5 65 L15 80 L39.5 55 L5 50 L39.5 45 L15 20 L44.5 35 Z"
          fill="currentColor"
          className="transition-all duration-300"
        />
      </svg>
    </div>
  );
}

export function NorthstarBrand({ size = "large", animated = true }: { size?: "small" | "medium" | "large"; animated?: boolean }) {
  const logoSize = size === "small" ? 32 : size === "medium" ? 48 : 64;
  const textSize = size === "small" ? "text-xl" : size === "medium" ? "text-2xl" : "text-4xl";
  const subtitleSize = size === "small" ? "text-xs" : size === "medium" ? "text-sm" : "text-base";

  return (
    <div className="flex flex-col items-center space-y-4">
      <NorthstarLogo size={logoSize} animated={animated} className="text-white" />
      <div className="text-center">
        <h1 className={`${textSize} font-bold text-white tracking-tight`}>
          Northstar
        </h1>
        {size === "large" && (
          <p className={`${subtitleSize} text-white/80 mt-2 max-w-md leading-relaxed`}>
            Your personal roadmap to achieving meaningful goals.
          </p>
        )}
      </div>
    </div>
  );
}
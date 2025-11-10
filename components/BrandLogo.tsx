import Image from "next/image";
import { cn } from "./ui/utils";

interface BrandLogoProps {
  size?: number;
  className?: string;
  orientation?: "horizontal" | "vertical";
  showWordmark?: boolean;
}

/**
 * Displays the BhukkadBox mascot logo.
 */
export function BrandLogo({
  size = 96,
  className,
  orientation = "horizontal",
  showWordmark = true,
}: BrandLogoProps) {
  const dimension = Math.max(48, size);
  const isVertical = orientation === "vertical";

  return (
    <div
      className={cn(
        "relative flex items-center gap-3",
        isVertical && "flex-col text-center gap-2",
        className,
      )}
    >
      <Image
        src="/logo.png"
        alt="BhukkadBox logo"
        width={dimension}
        height={dimension}
        priority
      />
      {showWordmark ? (
        <span className="text-2xl font-semibold text-slate-900 tracking-tight">
          BhukkadBox
        </span>
      ) : null}
    </div>
  );
}

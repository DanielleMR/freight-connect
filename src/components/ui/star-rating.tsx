import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
  onChange?: (rating: number) => void;
  className?: string;
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
};

export function StarRating({
  rating,
  maxRating = 5,
  size = "md",
  interactive = false,
  onChange,
  className,
}: StarRatingProps) {
  return (
    <div className={cn("flex gap-0.5", className)}>
      {Array.from({ length: maxRating }).map((_, index) => {
        const starValue = index + 1;
        const isFilled = starValue <= rating;

        return (
          <button
            key={index}
            type="button"
            disabled={!interactive}
            onClick={() => interactive && onChange?.(starValue)}
            className={cn(
              "transition-colors",
              interactive && "cursor-pointer hover:scale-110",
              !interactive && "cursor-default"
            )}
          >
            <Star
              className={cn(
                sizeClasses[size],
                isFilled
                  ? "fill-amber-400 text-amber-400"
                  : "fill-transparent text-muted-foreground/40"
              )}
            />
          </button>
        );
      })}
    </div>
  );
}

interface RatingSummaryProps {
  rating: number;
  totalReviews: number;
  size?: "sm" | "md" | "lg";
}

export function RatingSummary({ rating, totalReviews, size = "md" }: RatingSummaryProps) {
  return (
    <div className="flex items-center gap-2">
      <StarRating rating={Math.round(rating)} size={size} />
      <span className="text-sm text-muted-foreground">
        {rating.toFixed(1)} ({totalReviews} {totalReviews === 1 ? "avaliação" : "avaliações"})
      </span>
    </div>
  );
}

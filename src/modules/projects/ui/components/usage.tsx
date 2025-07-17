import { useAuth } from "@clerk/nextjs";

import Link from "next/link";
import { CrownIcon } from "lucide-react";
import { formatDuration, intervalToDuration } from "date-fns";

import { Button } from "@/components/ui/button";
import { useMemo } from "react";

interface Props {
  points: number;
  msBeforeNext: number;
}

export const Usage = ({ points, msBeforeNext }: Props) => {
  const { has } = useAuth();
  const hasProAccess = has?.({ plan: "pro" }) ?? false;
  const hasPremiumAccess = has?.({ plan: "premium" }) ?? false;

  const resetTime = useMemo(() => {
    try {
      const duration = intervalToDuration({
        start: new Date(),
        end: new Date(Date.now() + msBeforeNext),
      });
      return formatDuration(duration, {
        format: ["months", "days", "hours"],
      });
    } catch (error) {
      return "soon";
    }
  }, [msBeforeNext]);

  return (
    <div className="rounded-t-xl bg-background border border-b-0 p-2.5">
      <div className="flex items-center gap-x-2">
        <div>
          <p className="text-sm">
            {points} {hasPremiumAccess ? "" : hasProAccess ? "" : "Free"}{" "}
            Credits Remaining
          </p>
          <p className="text-xs text-muted-foreground">Resets in {resetTime}</p>
        </div>
        {!hasPremiumAccess && !hasProAccess && (
          <Button asChild size="sm" variant="default" className="ml-auto">
            <Link href="/pricing">
              <CrownIcon />
              Upgrade
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
};

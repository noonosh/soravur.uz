"use client";

import { cn } from "@/lib/utils";

interface LogoProps {
  variant?: "icon" | "full" | "full-dark";
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeMap = {
  icon: {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-12 w-12",
    xl: "h-16 w-16",
  },
  full: {
    sm: "h-8",
    md: "h-12",
    lg: "h-16",
    xl: "h-20",
  },
};

export function SoravurLogo({
  variant = "icon",
  size = "md",
  className,
}: LogoProps) {
  const logoSrc =
    variant === "icon"
      ? "/logo/soravur-icon.svg"
      : variant === "full-dark"
      ? "/logo/soravur-logo-dark.svg"
      : "/logo/soravur-logo.svg";

  const sizeClass =
    variant === "icon" ? sizeMap.icon[size] : sizeMap.full[size];

  return (
    <img src={logoSrc} alt="Soravur" className={cn(sizeClass, className)} />
  );
}

// Convenience exports for common use cases
export function SoravurIcon({
  size = "md",
  className,
}: Omit<LogoProps, "variant">) {
  return <SoravurLogo variant="icon" size={size} className={className} />;
}

export function SoravurFullLogo({
  size = "md",
  className,
}: Omit<LogoProps, "variant">) {
  return <SoravurLogo variant="full" size={size} className={className} />;
}






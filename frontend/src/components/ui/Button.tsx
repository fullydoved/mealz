import { type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";

const variants: Record<Variant, string> = {
  primary: "bg-amber-600 text-white hover:bg-amber-700",
  secondary: "bg-stone-700 text-stone-200 hover:bg-stone-600",
  danger: "bg-red-600 text-white hover:bg-red-700",
  ghost: "text-stone-400 hover:bg-stone-800",
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "sm" | "md";
}

export default function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: Props) {
  const sizeClass = size === "sm" ? "px-2 py-1 text-sm" : "px-4 py-2";
  return (
    <button
      className={`rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizeClass} ${className}`}
      {...props}
    />
  );
}

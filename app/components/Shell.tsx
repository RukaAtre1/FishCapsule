"use client";

type Props = {
  children: React.ReactNode;
  className?: string;
  as?: React.ElementType;
};

export default function Shell({ children, className, as: Component = "main" }: Props) {
  const base = "mx-auto w-full max-w-7xl px-6 py-10 lg:px-10";
  return <Component className={className ? `${base} ${className}` : base}>{children}</Component>;
}

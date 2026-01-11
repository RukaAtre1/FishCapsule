"use client";

type SkeletonProps = { className?: string };

export default function Skeleton({ className = "" }: SkeletonProps) {
  return <div className={`skeleton ${className}`} aria-hidden />;
}

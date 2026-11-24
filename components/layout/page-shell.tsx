import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Centred page container with the standard gutters. */
export function Container({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-6xl px-4 sm:px-6", className)}>
      {children}
    </div>
  );
}

export function PageHeader({ title, lead }: { title: string; lead: string }) {
  return (
    <div className="py-8 sm:py-12">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        {title}
      </h1>
      <p className="mt-3 max-w-[70ch] text-lg leading-relaxed text-muted-foreground">
        {lead}
      </p>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  body,
}: {
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed bg-card px-6 py-14 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-secondary text-secondary-foreground [&_svg]:size-6">
        {icon}
      </div>
      <h2 className="mt-4 text-lg font-semibold">{title}</h2>
      <p className="mt-2 max-w-md leading-relaxed text-muted-foreground">
        {body}
      </p>
    </div>
  );
}

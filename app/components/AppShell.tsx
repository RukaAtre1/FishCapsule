"use client";

import type { ComponentProps } from "react";
import Shell from "./Shell";

// Backward-compatible alias that points to the new Shell component.
export default function AppShell(props: ComponentProps<typeof Shell>) {
  return <Shell {...props} />;
}

import Link from "next/link";
import type { ComponentProps } from "react";

export function NavLink(props: ComponentProps<typeof Link>) {
  return <Link prefetch={false} {...props} />;
}

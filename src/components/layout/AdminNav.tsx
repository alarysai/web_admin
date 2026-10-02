"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = { href: string; label: string };

/** Panel sections. Anunciantes is added with task 3.3. */
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Início" },
  { href: "/questionarios", label: "Questionários" },
  { href: "/categorias", label: "Categorias de questionário" },
  { href: "/dicas", label: "Dicas" },
  { href: "/categorias-dicas", label: "Categorias de dicas" },
];

export function isActiveSection(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminNav({ items = NAV_ITEMS }: { items?: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Menu do painel" className="flex flex-col gap-1">
      {items.map((item) => {
        const active = isActiveSection(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-md px-3 py-2 text-sm ${
              active ? "bg-zinc-900 font-medium text-white" : "text-zinc-700 hover:bg-zinc-100"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

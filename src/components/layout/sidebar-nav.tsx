// src/components/layout/sidebar-nav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, ADMIN_NAV_ITEMS } from "@/lib/constants";
import { useAuth } from "@/contexts/auth-context";
import * as Icons from "lucide-react"; // Import all icons

type IconName = keyof typeof Icons;

interface NavItem {
  name: string;
  href: string;
  icon: IconName; // Use IconName type
}

export function SidebarNav() {
  const pathname = usePathname();
  const { isAdminOrMarketingManager } = useAuth();

  const renderNavItem = (item: NavItem) => {
    const IconComponent = Icons[item.icon] as React.ElementType;
    if (!IconComponent) {
      // Fallback if icon name is incorrect, though types should prevent this
      return null; 
    }
    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          "flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
          pathname === item.href
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )}
      >
        <IconComponent className="mr-2 h-5 w-5" />
        {item.name}
      </Link>
    );
  };

  return (
    <nav className="flex flex-col space-y-1 p-2">
      {NAV_ITEMS.map(renderNavItem)}
      {isAdminOrMarketingManager && (
        <>
          <hr className="my-2 border-sidebar-border" />
          <p className="px-3 py-1 text-xs font-semibold text-muted-foreground">Yönetim</p>
          {ADMIN_NAV_ITEMS.map(renderNavItem)}
        </>
      )}
    </nav>
  );
}

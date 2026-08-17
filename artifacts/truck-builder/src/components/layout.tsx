import { Link, useLocation } from "wouter";
import { Truck, Package, Activity, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-card">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="bg-primary text-primary-foreground p-1.5 rounded-md group-hover:bg-primary/90 transition-colors">
                <Truck className="h-5 w-5" />
              </div>
              <span className="font-bold text-lg tracking-tight uppercase">Truck Fit</span>
            </Link>

            <nav className="hidden md:flex items-center gap-1 ml-6">
              <Link
                href="/"
                className={cn(
                  "px-4 py-2 rounded-md text-sm font-medium transition-colors hover:bg-muted hover:text-foreground",
                  location === "/" ? "bg-muted text-foreground" : "text-muted-foreground"
                )}
              >
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Calculator
                </div>
              </Link>
              <Link
                href="/items"
                className={cn(
                  "px-4 py-2 rounded-md text-sm font-medium transition-colors hover:bg-muted hover:text-foreground",
                  location === "/items" ? "bg-muted text-foreground" : "text-muted-foreground"
                )}
              >
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Item Types
                </div>
              </Link>
              <Link
                href="/plans"
                className={cn(
                  "px-4 py-2 rounded-md text-sm font-medium transition-colors hover:bg-muted hover:text-foreground",
                  location === "/plans" ? "bg-muted text-foreground" : "text-muted-foreground"
                )}
              >
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4" />
                  Saved Plans
                </div>
              </Link>
            </nav>
          </div>
        </div>
      </header>
      
      <main className="flex-1 container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}

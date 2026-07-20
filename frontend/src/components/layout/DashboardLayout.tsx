"use client";

import { useUIStore } from "@/store";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { AuthGuard } from "@/components/guard/AuthGuard";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { isMobileSidebarOpen, closeMobileSidebar } = useUIStore();

  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "#f4f6f9" }}>
        {/* Desktop Sidebar */}
        <div className="hidden md:flex flex-shrink-0">
          <Sidebar />
        </div>

        {/* Mobile Sidebar */}
        {isMobileSidebarOpen && (
          <>
            <div
              className="fixed inset-0 z-40 md:hidden"
              style={{ backgroundColor: "rgba(15,35,71,0.5)" }}
              onClick={closeMobileSidebar}
              aria-hidden="true"
            />
            <div className="fixed right-0 top-0 bottom-0 z-50 md:hidden flex-shrink-0">
              <Sidebar />
            </div>
          </>
        )}

        {/* Main */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto">
            <div className="p-4 md:p-6 max-w-screen-2xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
};
import { SessionProvider } from "next-auth/react";
import { BottomTabBar } from "@/components/layout/bottom-tab-bar";
import { DesktopNav } from "@/components/layout/desktop-nav";
import { SiteFooter } from "@/components/layout/site-footer";
import { SegmentProvider } from "@/components/segment/segment-provider";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // SegmentProvider uses useSession(), so it MUST sit inside SessionProvider.
    // SessionProvider is scoped here (not in root layout) to avoid forcing
    // the admin/payload trees into next-auth context.
    <SessionProvider>
      <SegmentProvider>
        <div className="flex min-h-screen flex-col">
          <DesktopNav />

          <main className="flex-1 pb-[72px] md:pb-0">
            <div className="mx-auto max-w-[1280px]">{children}</div>
            <SiteFooter />
          </main>

          <BottomTabBar />
        </div>
      </SegmentProvider>
    </SessionProvider>
  );
}

"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MyInfoTab } from "@/components/profile/my-info-tab";
import { FootProfileTab } from "@/components/profile/foot-profile-tab";
import { OrderHistoryTab } from "@/components/profile/order-history-tab";

interface ProfileTabsProps {
  user: {
    name?: string | null;
    email?: string | null;
  };
}

export function ProfileTabs({ user }: ProfileTabsProps) {
  return (
    <Tabs defaultValue="my-info" className="w-full">
      <TabsList className="w-full">
        <TabsTrigger value="my-info" className="flex-1">
          내 정보
        </TabsTrigger>
        <TabsTrigger value="foot-profile" className="flex-1">
          발 프로필
        </TabsTrigger>
        <TabsTrigger value="order-history" className="flex-1">
          주문 내역
        </TabsTrigger>
      </TabsList>

      <TabsContent value="my-info">
        <MyInfoTab user={user} />
      </TabsContent>

      <TabsContent value="foot-profile">
        <FootProfileTab />
      </TabsContent>

      <TabsContent value="order-history">
        <OrderHistoryTab />
      </TabsContent>
    </Tabs>
  );
}

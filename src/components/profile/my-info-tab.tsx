"use client";

import { signOut } from "next-auth/react";
import { User } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useState } from "react";

interface MyInfoTabProps {
  user: {
    name?: string | null;
    email?: string | null;
  };
}

export function MyInfoTab({ user }: MyInfoTabProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDeleteAccount = () => {
    toast("현재 지원되지 않는 기능입니다");
    setShowDeleteConfirm(false);
  };

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="flex items-center gap-4 p-6">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-[#F8FAFC] text-xl">
              {user.name ? user.name.charAt(0).toUpperCase() : <User className="h-6 w-6" />}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-1">
            <p className="text-lg font-bold">{user.name || "사용자"}</p>
            <p className="text-sm text-[#64748B]">{user.email}</p>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <div className="flex flex-col gap-4">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          로그아웃
        </Button>

        {!showDeleteConfirm ? (
          <Button
            variant="outline"
            className="w-full border-[#DC2626] text-[#DC2626] hover:bg-[#DC2626]/10 hover:text-[#DC2626]"
            onClick={() => setShowDeleteConfirm(true)}
          >
            계정 삭제
          </Button>
        ) : (
          <Card className="border-[#DC2626]">
            <CardContent className="flex flex-col gap-4 p-4">
              <p className="text-sm">
                정말 계정을 삭제하시겠습니까? 모든 데이터가 영구적으로 삭제되며
                복구할 수 없습니다.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  취소
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1 bg-[#DC2626]"
                  onClick={handleDeleteAccount}
                >
                  삭제하기
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

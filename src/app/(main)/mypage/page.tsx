import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ProfileTabs } from "@/components/profile/profile-tabs";

export default async function MyPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="px-4 py-8 md:px-6 lg:px-8">
      <h1 className="mb-6 text-2xl font-bold">마이페이지</h1>
      <ProfileTabs
        user={{
          name: session.user?.name,
          email: session.user?.email,
        }}
      />
    </div>
  );
}

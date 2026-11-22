import { Suspense } from "react";
import { redirect } from "next/navigation";

import { SubscriptionPlaceholder } from "@/components/subscription/SubscriptionPlaceholder";
import { auth } from "@/lib/auth";
import { getCurrentUser } from "@/lib/server-api";

export default async function SubscriptionPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await getCurrentUser(session.user.id);

  if (!user) {
    redirect("/login");
  }

  return (
    <Suspense fallback={<div className="text-center">Загрузка...</div>}>
      <SubscriptionPlaceholder isOnWaitlist={Boolean(user.waitlistJoinedAt)} />
    </Suspense>
  );
}
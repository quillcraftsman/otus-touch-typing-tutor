import { auth } from "@/lib/auth";
import { getCurrentUser } from "@/lib/server-api";
import { LandingPage } from "@/components/landing/LandingPage";

export default async function HomePage() {
  const session = await auth();
  let isOnWaitlist = false;

  if (session?.user?.id) {
    const user = await getCurrentUser(session.user.id);
    isOnWaitlist = Boolean(user?.waitlistJoinedAt);
  }

  return (
    <LandingPage
      isAuthenticated={Boolean(session?.user)}
      isOnWaitlist={isOnWaitlist}
    />
  );
}
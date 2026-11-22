import { Role } from "@/types/role";
import { auth } from "@/lib/auth";

export async function getAuthenticatedUser() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }
  return session.user;
}

export async function requireAdminUser() {
  const sessionUser = await getAuthenticatedUser();
  if (!sessionUser) {
    return null;
  }

  if (sessionUser.role !== Role.ADMIN) {
    return null;
  }

  return sessionUser;
}
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import UserTable from "./UserTable";

async function UserListWrapper() {
  const session = await getServerSession(authOptions);
  const currentUserId = session?.user?.id as string;

  // Fetch ALL users from Prisma
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
  });

  // Pass the data to the interactive table component
  return <UserTable users={users} currentUserId={currentUserId} />;
}

export default function AdminUsersPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Manage Users</h1>
        <p className="text-gray-500 mt-1">View and manage all accounts in the system.</p>
      </div>

      <Suspense fallback={
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center text-gray-500">
          Loading users...
        </div>
      }>
        <UserListWrapper />
      </Suspense>
    </div>
  );
}
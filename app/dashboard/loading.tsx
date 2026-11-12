// app/dashboard/loading.tsx
export default function DashboardLoading() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-500">Loading your dashboard...</p>
      </div>
    </div>
  );
}
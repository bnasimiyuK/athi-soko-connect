import { DollarSign, ArrowUpRight } from "lucide-react";

export default function ProviderEarningsPage() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Earnings</h1>
        <p className="text-gray-500 mt-1">Track your payouts and completed jobs.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-green-500">
          <p className="text-sm font-medium text-gray-500 uppercase">Total Earnings</p>
          <p className="text-4xl font-bold text-gray-800 mt-2">KES 0.00</p>
          <p className="text-sm text-green-600 mt-4 inline-flex items-center gap-1">
            <ArrowUpRight size={16} /> Ready for payout
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Recent Transactions</h2>
        <div className="text-center py-8 text-gray-500">
          No transactions found. Complete a job to get paid.
        </div>
      </div>
    </div>
  );
}
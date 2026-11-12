import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Settings, Save, CheckCircle } from "lucide-react";

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const params = await searchParams;
  const saved = params.saved === "true";

  const supabase = await createClient();
  const { data: settings, error } = await supabase
    .from("billing_settings")
    .select("*")
    .eq("id", 1)
    .single();

  if (error) {
    return <div className="text-red-500 p-8">Error loading settings: {error.message}</div>;
  }

  const saveSettings = async (formData: FormData) => {
    "use server";
    const supabaseServer = await createClient();

    await supabaseServer
      .from("billing_settings")
      .update({
        monthly_fee: parseFloat(formData.get("monthly_fee") as string) || 0,
        due_day_of_month: parseInt(formData.get("due_day_of_month") as string) || 5,
        paybill_number: formData.get("paybill_number") as string,
        paybill_bank: formData.get("paybill_bank") as string,
        paybill_shortcode: formData.get("paybill_shortcode") as string,
        paybill_name: formData.get("paybill_name") as string,
        bank_account: formData.get("bank_account") as string,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);

    revalidatePath("/admin/settings");
    redirect("/admin/settings?saved=true");
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Settings size={24} /> System Settings
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Configure billing and payment details for the estate.
        </p>
      </div>

      {saved && (
        <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-lg flex items-center gap-2">
          <CheckCircle size={20} /> Settings saved successfully.
        </div>
      )}

      <form action={saveSettings} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Billing Configuration</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Fee (KES)</label>
              <input
                type="number"
                step="0.01"
                name="monthly_fee"
                defaultValue={settings.monthly_fee}
                required
                className="w-full border border-gray-300 p-2 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Day of Month</label>
              <input
                type="number"
                min="1"
                max="31"
                name="due_day_of_month"
                defaultValue={settings.due_day_of_month}
                required
                className="w-full border border-gray-300 p-2 rounded-lg"
              />
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">M-Pesa Paybill Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Paybill Number</label>
              <input
                type="text"
                name="paybill_number"
                defaultValue={settings.paybill_number}
                className="w-full border border-gray-300 p-2 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Paybill Shortcode</label>
              <input
                type="text"
                name="paybill_shortcode"
                defaultValue={settings.paybill_shortcode}
                className="w-full border border-gray-300 p-2 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
              <input
                type="text"
                name="paybill_bank"
                defaultValue={settings.paybill_bank}
                className="w-full border border-gray-300 p-2 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account Name</label>
              <input
                type="text"
                name="paybill_name"
                defaultValue={settings.paybill_name}
                className="w-full border border-gray-300 p-2 rounded-lg"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Bank Account Number</label>
              <input
                type="text"
                name="bank_account"
                defaultValue={settings.bank_account}
                className="w-full border border-gray-300 p-2 rounded-lg font-mono"
              />
            </div>
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            className="w-full bg-slate-900 text-white font-bold py-3 rounded-lg hover:bg-slate-800 transition flex items-center justify-center gap-2"
          >
            <Save size={18} /> Save Settings
          </button>
        </div>

        <p className="text-xs text-gray-400 text-center">
          Last updated: {new Date(settings.updated_at).toLocaleString()}
        </p>
      </form>
    </div>
  );
}
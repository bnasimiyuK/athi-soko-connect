import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const stkCallback = body.Body.stkCallback;

    if (stkCallback.ResultCode === 0) {
      const items = stkCallback.CallbackMetadata.Item;
      const receipt = items.find((i: any) => i.Name === "MpesaReceiptNumber")?.Value;
      let phone = items.find((i: any) => i.Name === "PhoneNumber")?.Value?.toString();

      // Format 2547... to 07...
      if (phone && phone.startsWith("254")) phone = "0" + phone.substring(3);

      if (phone) {
        await prisma.user.update({
          where: { phone },
          data: { aheStatus: "APPROVED", mpesaCode: receipt },
        });
      }
    }
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Success" });
  } catch (error) {
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Success" });
  }
}
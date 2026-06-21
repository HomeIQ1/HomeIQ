import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, deleteCmaForUser } from "@/lib/data";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id } = await params;
  const ok = await deleteCmaForUser(user.id, id);
  if (!ok) {
    return NextResponse.json(
      { error: "Record not found or not yours to delete." },
      { status: 404 }
    );
  }
  return NextResponse.json({ ok: true });
}

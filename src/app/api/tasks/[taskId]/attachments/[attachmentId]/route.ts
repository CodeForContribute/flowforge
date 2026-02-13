import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// DELETE - Remove attachment
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ taskId: string; attachmentId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { taskId, attachmentId } = await params;

  const attachment = await prisma.attachment.findFirst({
    where: {
      id: attachmentId,
      taskId,
      task: {
        project: {
          OR: [
            { userId: session.user.id },
            { members: { some: { userId: session.user.id } } },
          ],
        },
      },
    },
  });

  if (!attachment) {
    return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
  }

  await prisma.attachment.delete({
    where: { id: attachmentId },
  });

  return NextResponse.json({ success: true });
}

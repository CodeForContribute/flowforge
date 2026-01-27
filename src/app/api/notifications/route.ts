import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserNotifications, getUnreadNotificationCount, markNotificationsAsRead } from "@/services/notifications";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const includeRead = searchParams.get("includeRead") !== "false";
    const countOnly = searchParams.get("countOnly") === "true";

    if (countOnly) {
      const count = await getUnreadNotificationCount(session.user.id);
      return NextResponse.json({ count });
    }

    const notifications = await getUserNotifications(session.user.id, limit, includeRead);
    const unreadCount = await getUnreadNotificationCount(session.user.id);

    return NextResponse.json({
      notifications,
      unreadCount,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { notificationIds } = body;

    await markNotificationsAsRead(session.user.id, notificationIds);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error marking notifications as read:", error);
    return NextResponse.json(
      { error: "Failed to mark notifications as read" },
      { status: 500 }
    );
  }
}

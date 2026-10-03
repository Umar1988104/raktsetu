import { Bell } from "lucide-react";

export default function NotificationsPage() {
  return (
    <div>
      <div className="page-header">
        <h1>Notifications</h1>
        <p>Stay updated on your requests and donations.</p>
      </div>

      <div className="card">
        <div className="empty-state">
          <div className="emoji">
            <Bell size={30} style={{ margin: "0 auto" }} />
          </div>
          <p>No notifications yet.</p>
          <p style={{ fontSize: "0.82rem", marginTop: 4 }}>
            Real-time alerts (a donor accepting, a request going unanswered, status changes) arrive here once
            push notifications are wired up in the next build.
          </p>
        </div>
      </div>
    </div>
  );
}

import { requireAdmin } from "@/lib/ads/auth";
import { getAuditLogs } from "@/lib/ads/queries";
import { dateTime } from "@/lib/ads/format";

type AuditLogItem = Awaited<ReturnType<typeof getAuditLogs>>[number];

export default async function AuditPage() {
  await requireAdmin();
  const logs = await getAuditLogs();

  return (
    <>
      <header className="ads-header">
        <div>
          <p className="ads-kicker">История изменений</p>
          <h1>Audit log</h1>
          <p>Кто, когда и что поменял в рекламном учёте.</p>
        </div>
      </header>
      <section className="ads-panel">
        <table className="ads-table ads-table-dense">
          <thead><tr><th>Дата</th><th>Пользователь</th><th>Действие</th><th>Сущность</th><th>До</th><th>После</th></tr></thead>
          <tbody>
            {logs.map((log: AuditLogItem) => (
              <tr key={log.id}>
                <td>{dateTime(log.createdAt)}</td>
                <td>{log.actor?.name ?? "system"}</td>
                <td>{log.action}</td>
                <td>{log.entity}:{log.entityId ?? "—"}</td>
                <td><pre className="ads-json">{log.before ?? "—"}</pre></td>
                <td><pre className="ads-json">{log.after ?? "—"}</pre></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

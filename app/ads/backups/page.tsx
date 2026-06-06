import { requireAdmin } from "@/lib/ads/auth";
import { getDashboardBackups } from "@/lib/ads/queries";
import { dateTime } from "@/lib/ads/format";

type BackupItem = Awaited<ReturnType<typeof getDashboardBackups>>[number];

export default async function BackupsPage() {
  await requireAdmin();
  const backups = await getDashboardBackups();

  return (
    <>
      <header className="ads-header">
        <div>
          <p className="ads-kicker">SQLite snapshots</p>
          <h1>Бэкапы</h1>
          <p>Последние 14 snapshot базы. Перед массовым импортом snapshot создаётся автоматически.</p>
        </div>
        <form action="/api/ads/backups" method="post">
          <button className="ads-button ads-button-primary" type="submit">Сделать snapshot</button>
        </form>
      </header>
      <section className="ads-panel">
        <table className="ads-table">
          <thead><tr><th>Дата</th><th>Тип</th><th>Статус</th><th>Файл</th><th>Комментарий</th></tr></thead>
          <tbody>
            {backups.map((backup: BackupItem) => (
              <tr key={backup.id}>
                <td>{dateTime(backup.createdAt)}</td>
                <td>{backup.kind}</td>
                <td><span className="ads-pill">{backup.status}</span></td>
                <td>{backup.filePath}</td>
                <td>{backup.note ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

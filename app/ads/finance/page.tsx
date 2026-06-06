import Link from "next/link";
import { CircleDollarSign, FileText, ReceiptText, Wallet } from "lucide-react";
import { getFinance, getPlacements } from "@/lib/ads/queries";
import { dateOnly, rub } from "@/lib/ads/format";
import { requireUser } from "@/lib/ads/auth";

export default async function FinancePage() {
  await requireUser();
  const { invoices, payments } = await getFinance();
  const placements = await getPlacements();
  const placementsTotal = placements.reduce(
    (sum: number, placement: Awaited<ReturnType<typeof getPlacements>>[number]) => sum + (placement.priceRub ?? 0),
    0,
  );
  const paidTotal = payments
    .filter((payment: Awaited<ReturnType<typeof getFinance>>["payments"][number]) =>
      payment.status === "paid" || payment.status === "оплачено",
    )
    .reduce(
      (sum: number, payment: Awaited<ReturnType<typeof getFinance>>["payments"][number]) => sum + payment.amountRub,
      0,
    );
  const unpaidTotal = placementsTotal - paidTotal;
  const placementsWithoutPayments = placements.filter(
    (placement: Awaited<ReturnType<typeof getPlacements>>[number]) =>
      (placement.priceRub ?? 0) > 0 && placement.payments.length === 0,
  );
  const hasFinancialData = placements.length > 0 || invoices.length > 0 || payments.length > 0;

  return (
    <>
      <header className="ads-header">
        <div>
          <p className="ads-kicker">Финансы</p>
          <h1>Финансы</h1>
          <p>Контроль рекламного бюджета, счетов, оплат и неоплаченных размещений.</p>
        </div>
      </header>

      {!hasFinancialData ? <p className="ads-empty">Финансовых данных пока нет.</p> : null}

      <section className="ads-stats">
        <Metric label="Сумма размещений" value={rub(placementsTotal)} icon={<CircleDollarSign size={18} />} />
        <Metric label="Оплачено" value={rub(paidTotal)} icon={<Wallet size={18} />} />
        <Metric label="Не оплачено" value={rub(unpaidTotal)} icon={<ReceiptText size={18} />} warn={unpaidTotal > 0} />
        <Metric label="Счетов" value={String(invoices.length)} icon={<FileText size={18} />} />
      </section>

      <section className="ads-panel">
        <div className="ads-panel-title"><h2>Не оплачено / требует контроля</h2></div>
        <div className="ads-list">
          {placementsWithoutPayments.map((placement: Awaited<ReturnType<typeof getPlacements>>[number]) => (
            <div className="ads-list-row" key={placement.id}>
              <div>
                <strong>{placement.channel.name}</strong>
                <span>{placement.manager?.name ?? "без менеджера"}</span>
                <span>{dateOnly(placement.plannedAt)} · {rub(placement.priceRub)} · {placement.status}</span>
              </div>
              <div>
                <Link className="ads-button" href={`/ads/channels/${placement.channel.id}`}>
                  Открыть
                </Link>
              </div>
            </div>
          ))}
          {!placementsWithoutPayments.length ? <p className="ads-empty">Финансовых данных пока нет.</p> : null}
        </div>
      </section>

      <section className="ads-grid-two">
        <div className="ads-panel">
          <div className="ads-panel-title"><h2>Счета</h2></div>
          <form className="ads-create-form" action="/api/ads/invoices" method="post" encType="multipart/form-data">
            <input name="number" placeholder="№ счёта" />
            <input name="issuedAt" placeholder="дд.мм.гггг" />
            <input name="contractor" placeholder="контрагент" />
            <input name="amountRub" placeholder="сумма" />
            <select name="status" defaultValue="счёт получен">
              {["ожидаем счёт", "счёт получен", "оплачен", "частично оплачен", "закрыт", "требует проверки"].map((status) => <option key={status}>{status}</option>)}
            </select>
            <input name="file" type="file" accept="application/pdf,image/*" />
            <input name="note" placeholder="комментарий" />
            <button className="ads-button ads-button-primary" type="submit">Добавить счёт</button>
          </form>
          <table className="ads-table">
            <thead><tr><th>№</th><th>Дата</th><th>Контрагент</th><th>Сумма</th><th>Статус</th></tr></thead>
            <tbody>
              {invoices.map((invoice: Awaited<ReturnType<typeof getFinance>>["invoices"][number]) => (
                <tr key={invoice.id}>
                  <td>{invoice.number ?? "—"}</td>
                  <td>{dateOnly(invoice.issuedAt)}</td>
                  <td>{invoice.contractor ?? "—"}</td>
                  <td>{rub(invoice.amountRub)}</td>
                  <td><span className="ads-pill">{invoice.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="ads-panel">
          <div className="ads-panel-title"><h2>Оплаты</h2></div>
          <form className="ads-create-form" action="/api/ads/payments" method="post">
            <input name="amountRub" placeholder="сумма" required />
            <input name="paidAt" placeholder="дд.мм.гггг" />
            <input name="method" placeholder="способ" />
            <select name="status" defaultValue="оплачен">
              {["ожидаем счёт", "счёт получен", "оплачен", "частично оплачен", "закрыт", "требует проверки"].map((status) => <option key={status}>{status}</option>)}
            </select>
            <select name="invoiceId" defaultValue="">
              <option value="">без счёта</option>
              {invoices.map((invoice: Awaited<ReturnType<typeof getFinance>>["invoices"][number]) => <option key={invoice.id} value={invoice.id}>{invoice.number ?? invoice.contractor ?? invoice.id}</option>)}
            </select>
            <select name="placementId" defaultValue="">
              <option value="">без размещения</option>
              {placements.slice(0, 250).map((placement: Awaited<ReturnType<typeof getPlacements>>[number]) => <option key={placement.id} value={placement.id}>{placement.channel.name}</option>)}
            </select>
            <input name="note" placeholder="комментарий" />
            <button className="ads-button ads-button-primary" type="submit">Добавить оплату</button>
          </form>
          <table className="ads-table">
            <thead><tr><th>Дата</th><th>Сумма</th><th>Куда</th><th>Статус</th></tr></thead>
            <tbody>
              {payments.map((payment: Awaited<ReturnType<typeof getFinance>>["payments"][number]) => (
                <tr key={payment.id}>
                  <td>{dateOnly(payment.paidAt)}</td>
                  <td>{rub(payment.amountRub)}</td>
                  <td>{payment.invoice?.number ?? payment.placement?.channel.name ?? "—"}</td>
                  <td><span className="ads-pill">{payment.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function Metric({
  label,
  value,
  icon,
  warn,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  warn?: boolean;
}) {
  return (
    <div className={warn ? "ads-metric ads-metric-warn" : "ads-metric"}>
      <span>{icon}</span>
      <strong>{value}</strong>
      <small>{label}</small>
    </div>
  );
}

import { getFinance, getNetworksForSelect, getPlacements } from "@/lib/ads/queries";
import { dateOnly, rub } from "@/lib/ads/format";
import { requireUser } from "@/lib/ads/auth";

export default async function FinancePage() {
  await requireUser();
  const { invoices, payments } = await getFinance();
  const networks = await getNetworksForSelect();
  const placements = await getPlacements();

  return (
    <>
      <header className="ads-header">
        <div>
          <p className="ads-kicker">Деньги</p>
          <h1>Счета и оплаты</h1>
          <p>Финансовый цикл: счёт, контрагент, сумма, статус, оплата и привязка к сетке/размещению.</p>
        </div>
      </header>
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
              {invoices.map((invoice) => (
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
              {invoices.map((invoice) => <option key={invoice.id} value={invoice.id}>{invoice.number ?? invoice.contractor ?? invoice.id}</option>)}
            </select>
            <select name="networkId" defaultValue="">
              <option value="">без сетки</option>
              {networks.map((network) => <option key={network.id} value={network.id}>{network.platform} · {network.name}</option>)}
            </select>
            <select name="placementId" defaultValue="">
              <option value="">без размещения</option>
              {placements.slice(0, 250).map((placement) => <option key={placement.id} value={placement.id}>{placement.channel.name}</option>)}
            </select>
            <input name="note" placeholder="комментарий" />
            <button className="ads-button ads-button-primary" type="submit">Добавить оплату</button>
          </form>
          <table className="ads-table">
            <thead><tr><th>Дата</th><th>Сумма</th><th>Куда</th><th>Статус</th></tr></thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td>{dateOnly(payment.paidAt)}</td>
                  <td>{rub(payment.amountRub)}</td>
                  <td>{payment.network?.name ?? payment.invoice?.number ?? payment.placement?.channel.name ?? "—"}</td>
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

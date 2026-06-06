import { getCurrentUser } from "@/lib/ads/auth";
import { redirect } from "next/navigation";

export default async function AdsLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/ads");
  const params = await searchParams;

  return (
    <main className="ads-login">
      <form className="ads-login-panel" action="/api/ads/auth/login" method="post">
        <div>
          <p className="ads-kicker">Ad Ledger</p>
          <h1>Вход в рекламный учёт</h1>
          <p>Кабинет для закупок, выходов, сеток, счетов и Telegram-разбора.</p>
        </div>
        <label>
          Email
          <input name="email" type="email" defaultValue="admin@local" autoComplete="email" required />
        </label>
        <label>
          Пароль
          <input name="password" type="password" autoComplete="current-password" required />
        </label>
        {params.error ? <span className="ads-error">Логин или пароль не совпали.</span> : null}
        <button className="ads-button ads-button-primary" type="submit">
          Войти
        </button>
      </form>
    </main>
  );
}

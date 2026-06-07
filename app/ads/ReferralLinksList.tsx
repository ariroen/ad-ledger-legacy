import { dateTime } from "@/lib/ads/format";
import { getReferralHref } from "@/lib/ads/referrals";

type ReferralLinksListProps = {
  links: Array<{
    id: string;
    code: string;
    sourceUrl: string;
    status: string;
    clicksCount: number;
    createdAt: Date;
    placement?: { plannedAt: Date | null } | null;
    events: Array<{
      id: string;
      createdAt: Date;
      userAgent: string | null;
      referrer: string | null;
    }>;
  }>;
  emptyText: string;
};

export function ReferralLinksList({ links, emptyText }: ReferralLinksListProps) {
  if (!links.length) {
    return <p className="ads-empty">{emptyText}</p>;
  }

  return (
    <div className="ads-list">
      {links.map((link) => (
        <div className="ads-list-row" key={link.id}>
          <div>
            <strong>{link.code}</strong>
            <span>{link.status} · переходов: {link.clicksCount} · создана {dateTime(link.createdAt)}</span>
            {link.placement?.plannedAt ? <span>Дата размещения: {dateTime(link.placement.plannedAt)}</span> : null}
            {link.events[0] ? (
              <span>
                Последний переход: {dateTime(link.events[0].createdAt)}
                {link.events[0].referrer ? ` · ${link.events[0].referrer}` : ""}
              </span>
            ) : (
              <span>Переходов пока нет.</span>
            )}
          </div>
          <div className="ads-actions">
            <a className="ads-button" href={getReferralHref(link.code)} target="_blank" rel="noreferrer">
              Открыть redirect
            </a>
            <a className="ads-button" href={link.sourceUrl} target="_blank" rel="noreferrer">
              Исходная ссылка
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}

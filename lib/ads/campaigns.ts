import { prisma } from "./db";

const DEFAULT_CAMPAIGN = {
  name: "Июнь 2026",
  month: 6,
  year: 2026,
  budgetRub: 0,
  status: "active",
  note: null as string | null,
};

export async function ensureCampaignFoundation() {
  let juneCampaign = await prisma.campaign.findUnique({
    where: { name: DEFAULT_CAMPAIGN.name },
  });

  if (!juneCampaign) {
    juneCampaign = await prisma.campaign.create({
      data: DEFAULT_CAMPAIGN,
    });
  }

  await prisma.placement.updateMany({
    where: { campaignId: null },
    data: { campaignId: juneCampaign.id },
  });

  return juneCampaign;
}

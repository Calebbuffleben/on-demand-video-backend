/*
  Set BASIC plan for existing organizations.
  - Creates a Subscription (BASIC) for orgs without one
  - Upgrades planType from FREE -> BASIC for existing subscriptions
  - Does NOT modify PRO/ENTERPRISE plans
  - Leaves subscription status unchanged when updating planType
*/

import { PrismaClient, PlanType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Starting migration: Set BASIC plan for existing organizations');

  const organizations = await prisma.organization.findMany({ select: { id: true, name: true } });
  console.log(`🧾 Found ${organizations.length} organizations`);

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const org of organizations) {
    const sub = await prisma.subscription.findUnique({ where: { organizationId: org.id } });
    if (!sub) {
      await prisma.subscription.create({
        data: {
          organizationId: org.id,
          planType: PlanType.BASIC,
          // Keep default status from schema (INACTIVE) to avoid unintended activation
        },
      });
      created += 1;
      console.log(`✅ Created BASIC subscription for org ${org.id} (${org.name})`);
      continue;
    }

    if (sub.planType === PlanType.FREE) {
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { planType: PlanType.BASIC },
      });
      updated += 1;
      console.log(`⬆️  Updated subscription to BASIC for org ${org.id} (${org.name})`);
    } else {
      skipped += 1;
      console.log(`⏭️  Skipped org ${org.id} (${org.name}) - plan is ${sub.planType}`);
    }
  }

  console.log('🎉 Migration completed');
  console.log({ created, updated, skipped });
}

main()
  .catch((e) => {
    console.error('❌ Migration failed:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });



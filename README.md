This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Hunt Start / Stop

Before using Hunt Status Control, apply
[`supabase/migrations/20261126134500_global_hunt_status.sql`](./supabase/migrations/20261126134500_global_hunt_status.sql)
to Supabase. It creates the single-row status table, enables public reads and
Realtime, and rejects QR scan inserts while the hunt is stopped.

## Team Disqualification

Before using `/admin/disqualify`, apply
[`supabase/migrations/20261126132200_team_disqualification.sql`](./supabase/migrations/20261126132200_team_disqualification.sql)
to the Supabase database. The migration adds the team status/reason fields and
blocks new QR scan inserts for disqualified teams.

## Final Stage (TX-00)

Before enabling the Final Stage, apply
[`supabase/migrations/20261126120000_final_stage_tx00.sql`](./supabase/migrations/20261126120000_final_stage_tx00.sql)
to the Supabase database. It adds finalist eligibility and enforces qualified,
one-time TX-00 scans. Admins can select teams under **Manage Teams**; selected
teams scan TX-00 using `Q8M4Z7KP`. The public leaderboard lists finishers in
chronological order.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
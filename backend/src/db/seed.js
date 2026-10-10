import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { migrate } from './migrate.js';
import { pool, withTransaction } from './pool.js';

// Test data only — no real personal information.
export const DEMO_USER = { fullName: 'Demo User', email: 'demo@example.com', password: 'Demo@1234' };

const day = (offset) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
};

const PROJECTS = [
  {
    name: 'Website Redesign',
    description: 'Refresh the marketing site with a new design system and faster pages.',
    status: 'In Progress',
    start: -14,
    end: 30,
    tasks: [
      ['Audit current pages', 'Inventory every page and note what to keep.', 'Medium', 'Completed', -7],
      ['Design new homepage', 'High-fidelity mockups for desktop and mobile.', 'High', 'In Progress', 3],
      ['Build component library', 'Buttons, forms, cards, navigation.', 'High', 'Pending', 10],
      ['Write launch announcement', 'Short post for the blog and newsletter.', 'Low', 'Pending', 21],
    ],
  },
  {
    name: 'Mobile App Launch',
    description: 'Ship the first Android release and collect early feedback.',
    status: 'In Progress',
    start: -30,
    end: 14,
    tasks: [
      ['Finalize onboarding flow', 'Three screens, skippable.', 'High', 'Completed', -10],
      ['Fix login edge cases', 'Expired tokens and offline messaging.', 'High', 'In Progress', 1],
      ['Prepare store listing', 'Screenshots, description, icon.', 'Medium', 'Pending', 6],
      ['Beta tester outreach', 'Invite 20 testers.', 'Low', 'Pending', -2],
    ],
  },
  {
    name: 'Quarterly Planning',
    description: 'Goals, budget and staffing for next quarter.',
    status: 'Not Started',
    start: 7,
    end: 28,
    tasks: [
      ['Collect team goals', 'One-pagers from each team lead.', 'Medium', 'Pending', 9],
      ['Draft budget', 'First pass for review.', 'High', 'Pending', 14],
    ],
  },
  {
    name: 'Office Move',
    description: 'Logistics for moving to the new office.',
    status: 'Completed',
    start: -60,
    end: -20,
    tasks: [
      ['Book movers', 'Get three quotes.', 'Medium', 'Completed', -50],
      ['Update address everywhere', 'Website, invoices, mailing lists.', 'Low', 'Completed', -25],
    ],
  },
];

export async function seed() {
  await migrate();
  const hash = await bcrypt.hash(DEMO_USER.password, env.bcryptRounds);

  await withTransaction(async (client) => {
    await client.query('DELETE FROM users WHERE lower(email) = $1', [DEMO_USER.email]);
    const { rows } = await client.query(
      'INSERT INTO users (full_name, email, password_hash) VALUES ($1, $2, $3) RETURNING id',
      [DEMO_USER.fullName, DEMO_USER.email, hash],
    );
    const userId = rows[0].id;

    for (const p of PROJECTS) {
      const { rows: pr } = await client.query(
        `INSERT INTO projects (user_id, name, description, status, start_date, end_date)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [userId, p.name, p.description, p.status, day(p.start), day(p.end)],
      );
      for (const [name, description, priority, status, due] of p.tasks) {
        await client.query(
          `INSERT INTO tasks (project_id, name, description, priority, status, due_date)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [pr[0].id, name, description, priority, status, day(due)],
        );
      }
    }
  });

  logger.info(`Seeded demo account: ${DEMO_USER.email} / ${DEMO_USER.password}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seed()
    .then(() => pool.end())
    .catch(async (err) => {
      logger.error(err.message);
      await pool.end();
      process.exit(1);
    });
}

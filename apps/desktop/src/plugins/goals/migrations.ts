/**
 * Migraciones SQLite del plugin Goals.
 */

import type { Migration } from '@core/types'

export const GOALS_MIGRATIONS: Migration[] = [
  {
    version: 1,
    up: `
      CREATE TABLE IF NOT EXISTS goals_objectives (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        period TEXT NOT NULL DEFAULT 'q1',
        year INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        color TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS goals_key_results (
        id TEXT PRIMARY KEY,
        goal_id TEXT NOT NULL,
        name TEXT NOT NULL,
        source TEXT NOT NULL DEFAULT 'manual',
        baseline REAL NOT NULL DEFAULT 0,
        target_value REAL NOT NULL DEFAULT 1,
        current_value REAL NOT NULL DEFAULT 0,
        unit TEXT,
        direction TEXT NOT NULL DEFAULT 'increase',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (goal_id) REFERENCES goals_objectives(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS goals_milestones (
        id TEXT PRIMARY KEY,
        kr_id TEXT NOT NULL,
        value REAL NOT NULL,
        achieved_at TEXT NOT NULL DEFAULT (datetime('now')),
        note TEXT,
        FOREIGN KEY (kr_id) REFERENCES goals_key_results(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_goals_kr_goal ON goals_key_results(goal_id);
      CREATE INDEX IF NOT EXISTS idx_goals_milestones_kr ON goals_milestones(kr_id);
      CREATE INDEX IF NOT EXISTS idx_goals_objectives_year_period ON goals_objectives(year, period);
    `,
  },
]

import { Database, queryFirst, execute } from '../helpers';

export type ApiFeature = 'ocr';

export class ApiUsageRepository {
  constructor(private db: Database) {}

  async getCount(feature: ApiFeature, yearMonth: string): Promise<number> {
    const row = await queryFirst<{ count: number }>(
      this.db,
      'SELECT count FROM api_usage WHERE feature = ? AND year_month = ?',
      [feature, yearMonth]
    );
    return row?.count ?? 0;
  }

  async increment(feature: ApiFeature, yearMonth: string): Promise<number> {
    await execute(
      this.db,
      `INSERT INTO api_usage (feature, year_month, count) VALUES (?, ?, 1)
       ON CONFLICT(feature, year_month) DO UPDATE SET count = count + 1`,
      [feature, yearMonth]
    );
    return this.getCount(feature, yearMonth);
  }
}

export function currentYearMonth(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

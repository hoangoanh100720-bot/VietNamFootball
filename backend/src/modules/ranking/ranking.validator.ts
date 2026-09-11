/** MODULES/RANKING/RANKING.VALIDATOR.TS */
import { z } from 'zod';

export const rankingQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(250).default(50),
});

export type RankingQuery = z.infer<typeof rankingQuerySchema>;

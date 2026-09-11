/** MODULES/AI/AI.VALIDATOR.TS */
import { z } from 'zod';

export const matchIdParamSchema = z.object({
  matchId: z.coerce.number().int().positive('ID trận đấu không hợp lệ'),
});

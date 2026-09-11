/** MODULES/PLAYERS/PLAYERS.VALIDATOR.TS */
import { z } from 'zod';

export const listPlayersSchema = z.object({
  // .optional() = không bắt buộc. Người dùng không lọc thì bỏ trống.
  position: z.enum(['GK', 'DF', 'MF', 'FW']).optional(),

  // Giới hạn 60 ký tự: chuỗi tìm kiếm dài vô hạn chỉ tổ làm chậm database
  search: z.string().trim().min(1).max(60).optional(),

  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(30),
});

export type ListPlayersQuery = z.infer<typeof listPlayersSchema>;

import z from 'zod';
import { paginationQuerySchema } from '../tickets/ticket.schemas';

export const ticketIdParamForCommentsSchema = z.object({
  ticketId: z.string().min(1)
});

export const createCommentSchema = z.object({
  body: z.string().trim().min(1).max(5000)
});

export const listCommentQuerySchema = paginationQuerySchema;

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type ListCommentsQuery = z.infer<typeof listCommentQuerySchema>;

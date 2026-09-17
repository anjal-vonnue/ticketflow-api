import type { AuthUser } from '../../types/auth.js';
import { TicketService } from '../tickets/ticket.service.js';
import { CommnetRepository } from './comment.repository.js';
import type { CreateCommentInput, ListCommentsQuery } from './comment.schema';

const commentRespository = new CommnetRepository();
const ticketService = new TicketService();

export class CommentService {
  async createComment(
    currentUser: AuthUser,
    ticketId: string,
    input: CreateCommentInput
  ) {
    await ticketService.getTicketById(currentUser, ticketId);

    return commentRespository.create({
      ticketId,
      authorId: currentUser.userId,
      body: input.body
    });
  }

  async listComments(
    currentUser: AuthUser,
    ticketId: string,
    query: ListCommentsQuery
  ) {
    await ticketService.getTicketById(currentUser, ticketId);
    const { items, total } = await commentRespository.findManyByTicketId(
      ticketId,
      {
        page: query.page,
        limit: query.limit
      }
    );

    return {
      data: items,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit)
      }
    };
  }
}

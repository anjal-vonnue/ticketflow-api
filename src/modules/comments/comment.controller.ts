import type { Request, Response } from 'express';
import { CommentService } from './comment.service.js';
import type { AuthenticatedRequest } from '../../types/auth.js';
import type {
  CreateCommentInput,
  ListCommentsQuery
} from './comment.schema.js';

const commentService = new CommentService();

function authUser(request: Request) {
  return (request as AuthenticatedRequest).user!;
}

export class CommentController {
  async create(request: Request, response: Response) {
    const comment = await commentService.createComment(
      authUser(request),
      String(request.params.ticketId),
      request.body as CreateCommentInput
    );

    response.status(201).json({ data: comment });
  }

  async list(request: Request, response: Response) {
    const result = await commentService.listComments(
      authUser(request),
      String(request.params.ticketId),
      request.query as unknown as ListCommentsQuery
    );

    response.json(result);
  }
}

export const commentController = new CommentController();

import type { Prisma } from '@prisma/client';
import { prisma } from '../../db/prisma';

const commentInclude = {
  author: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true
    }
  }
} satisfies Prisma.CommentInclude;

export type CommentWithAuthor = Prisma.CommentGetPayload<{
  include: typeof commentInclude;
}>;

type PaginationInput = {
  page: number;
  limit: number;
};

export class CommnetRepository {
  async create(data: Prisma.CommentUncheckedCreateInput) {
    return prisma.comment.create({
      data,
      include: commentInclude
    });
  }

  async findManyByTicketId(ticketId: string, pagination: PaginationInput) {
    const [items, total] = await Promise.all([
      prisma.comment.findMany({
        where: { ticketId },
        include: commentInclude,
        orderBy: { createdAt: 'asc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit
      }),
      prisma.comment.count({ where: { ticketId } })
    ]);

    return { items, total };
  }
}

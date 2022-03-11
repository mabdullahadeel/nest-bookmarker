import { User } from '@prisma/client';

export type SystemUser = Omit<User, 'password_hash'>;

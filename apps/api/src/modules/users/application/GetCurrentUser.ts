import { NotFoundError } from 'shared';
import { UserRepository } from '../infra/UserRepository.js';

export async function GetCurrentUser(userId: string) {
  const user = await UserRepository.findById(userId);
  if (!user) {
    throw new NotFoundError('User not found');
  }
  return user;
}

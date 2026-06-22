import { UserRepository } from '../infra/UserRepository.js';

export async function ListUsers() {
  return UserRepository.findAll();
}

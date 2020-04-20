import { getCustomRepository } from 'typeorm';
import AppError from '../errors/AppError';

import Transactions from '../models/Transaction';
import CreateCategoryService from './CreateCategoryService';
import TransactionsRepository from '../repositories/TransactionsRepository';

interface Request {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

class CreateTransactionService {
  public async execute({
    title,
    type,
    value,
    category,
  }: Request): Promise<Transactions> {
    if (!['income', 'outcome'].includes(type)) {
      throw new AppError('type of transaction is invalid');
    }
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    if (type === 'outcome') {
      const { total } = await transactionsRepository.getBalance();
      if (value > total) {
        throw new AppError('insufficient funds');
      }
    }
    const findOrCreateCategory = new CreateCategoryService();
    const categoryFound = await findOrCreateCategory.execute({
      title: category,
    });
    const transaction = transactionsRepository.create({
      title,
      type,
      value,
      category_id: categoryFound.id,
    });
    await transactionsRepository.save(transaction);
    return transaction;
  }
}

export default CreateTransactionService;

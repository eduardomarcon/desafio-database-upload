import { EntityRepository, Repository } from 'typeorm';

import Transactions from '../models/Transaction';

interface Balance {
  income: number;
  outcome: number;
  total: number;
}

@EntityRepository(Transactions)
class TransactionsRepository extends Repository<Transactions> {
  public async getBalance(): Promise<Balance> {
    const transactionsSum = await this.createQueryBuilder()
      .select('type')
      .addSelect('SUM(value)', 'sum')
      .groupBy('type')
      .getRawMany();
    const incomeSum = transactionsSum.find(t => t.type === 'income');
    const outcomeSum = transactionsSum.find(t => t.type === 'outcome');
    const income = incomeSum ? incomeSum.sum : 0;
    const outcome = outcomeSum ? outcomeSum.sum : 0;
    const total = income - outcome;
    return { income, outcome, total };
  }

  public async getAll(): Promise<Transactions[]> {
    const transactions = await this.createQueryBuilder('t')
      .select(['t.id', 't.title', 't.value', 't.type', 'c.id', 'c.title'])
      .leftJoin('t.category', 'c')
      .where('t.category_id = c.id')
      .getMany();
    return transactions;
  }
}

export default TransactionsRepository;

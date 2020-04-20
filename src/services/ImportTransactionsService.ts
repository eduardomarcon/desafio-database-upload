import path from 'path';
import fs from 'fs';
import csv from 'csv-parse';
import { getCustomRepository, getRepository, In } from 'typeorm';
import uploadConfig from '../config/upload';
import AppError from '../errors/AppError';
import Transaction from '../models/Transaction';
import Category from '../models/Category';
import TransactionsRepository from '../repositories/TransactionsRepository';

interface Request {
  filename: string;
}
interface TransactionParser {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

class ImportTransactionsService {
  async execute({ filename }: Request): Promise<Transaction[]> {
    const categoriesRepository = getRepository(Category);
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const fileImportPath = path.join(uploadConfig.directory, filename);
    const fileImportExists = await fs.promises.stat(fileImportPath);
    if (!fileImportExists) {
      throw new AppError('file not found');
    }
    const transactionsParser: TransactionParser[] = [];
    const categoriesParser: string[] = [];
    const parser = fs.createReadStream(fileImportPath).pipe(
      csv({
        columns: true,
        from_line: 1,
        trim: true,
        skip_lines_with_error: true,
      }),
    );
    parser.on('data', async data => {
      transactionsParser.push(data);
      categoriesParser.push(data.category);
    });
    await new Promise(resolver => parser.on('end', resolver));

    const existenCategories = await categoriesRepository.find({
      where: {
        title: In(categoriesParser),
      },
    });

    const existentCategoriesTitles = existenCategories.map(
      (category: Category) => category.title,
    );

    const addCategoryTitles = categoriesParser
      .filter(category => !existentCategoriesTitles.includes(category))
      .filter((value, index, self) => self.indexOf(value) === index);

    const newCategories = categoriesRepository.create(
      addCategoryTitles.map(title => ({ title })),
    );

    await categoriesRepository.save(newCategories);

    const finalCategories = [...newCategories, ...existenCategories];
    const transactions = transactionsRepository.create(
      transactionsParser.map(transaction => ({
        title: transaction.title,
        type: transaction.type,
        value: transaction.value,
        category: finalCategories.find(
          category => category.title === transaction.category,
        ),
      })),
    );

    await transactionsRepository.save(transactions);
    await fs.promises.unlink(fileImportPath);
    return transactions;
  }
}

export default ImportTransactionsService;

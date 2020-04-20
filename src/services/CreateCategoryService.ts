import { getRepository } from 'typeorm';
import Categories from '../models/Category';

interface Request {
  title: string;
}

class CreateCategoryService {
  public async execute({ title }: Request): Promise<Categories> {
    const categoriesRepository = getRepository(Categories);
    const categoryFound = await categoriesRepository.findOne({
      where: { title },
    });
    if (categoryFound) {
      return categoryFound;
    }
    const category = categoriesRepository.create({
      title,
    });
    await categoriesRepository.save(category);
    return category;
  }
}

export default CreateCategoryService;

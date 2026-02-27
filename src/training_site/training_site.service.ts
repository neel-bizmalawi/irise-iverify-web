/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { TrainingSiteRepositoryService } from './training_site.repository/training_site.repository.service';
import { CreateTrainingSiteDto } from './create-training-site.dto';
import { UpdateTrainingSiteDto } from './update-training-site.dto';
import { TRAINING_SITES_FILTER_SCHEMA } from './training-sites.filter.schema';


@Injectable()
export class TrainingSiteService {


  constructor(private readonly trainingSiteRepo: TrainingSiteRepositoryService,) { }

  async getAll(page: number = 1, limit: number = 100) {
    if (page < 1) page = 1;
    if (limit < 1) limit = 10;

    const totalRecords = await this.trainingSiteRepo.getTotalCount();
    const totalPages = Math.ceil(totalRecords / limit)

    const data = await this.trainingSiteRepo.findAll(page, limit);

    const start =
      totalRecords === 0 ? 0 : (page - 1) * limit + 1;

    const end = Math.min(page * limit, totalRecords);

    return {
      currentPage: page,
      limit: limit,
      start,
      end,
      totalRecords,
      totalPages,
      nextPage: page < totalPages ? page + 1 : null,
      previousPage: page > 1 ? page - 1 : null,
      data,
    };

  }

  async createTraining(dto: CreateTrainingSiteDto, userId: number) {


    const user = await this.trainingSiteRepo.getUserById(userId);

    const username = user.name;

    console.log("user name is",username)
    const data = await this.trainingSiteRepo.insertTraining(dto,username)

    return {
      message: 'Training site created successfully',
    }

  }


  async getTrainingData(trainingId: number) {

    if (!trainingId) {
      throw new BadRequestException("Training id is missing");
    }

    const data = await this.trainingSiteRepo.getTrainingbyID(trainingId);
    return {
      message: "data fetched succesfully"
      , data
    }
  }





  async deleteTraining(trainingId: number) {

    if (!trainingId) {
      throw new BadRequestException("Training id is missing");
    }

    const data = await this.trainingSiteRepo.deleteTrainginId(trainingId);
    return { message: "data deleted successfully" }
  }



  async getDistrict() {
    const data = await this.trainingSiteRepo.getDistrict();

    return {
      message: 'District fetched',
      data
    };
  }


  async getAuthority() {
    const data = await this.trainingSiteRepo.getAuthority();

    return {
      message: 'Authority fetched',
      data
    };
  }

  async updateTrain(trainingId: number, dto: UpdateTrainingSiteDto,userId :number) {

     const user = await this.trainingSiteRepo.getUserById(userId);

    const username = user.name;


    return this.trainingSiteRepo.updateTraining(trainingId, dto,username);
  }


  //       async getFilteredUsers(filters: any[]) {
  //     // 1️⃣ Validate filters
  //     const validatedFilters = filters.map((f) => {
  //       const schema = TRAINING_SITES_FILTER_SCHEMA[f.field];

  //       if (!schema) {
  //         throw new BadRequestException(`Invalid field: ${f.field}`);
  //       }

  //       if (!schema.operators.includes(f.operator)) {
  //         throw new BadRequestException(
  //           `Invalid operator for field ${f.field}`,
  //         );
  //       }

  //       return {
  //         column: schema.column,
  //         type: schema.type,
  //         value: f.value,
  //         operator: f.operator,
  //       };
  //     });

  //     // 2️⃣ Send safe data to repository
  //     return  this.trainingSiteRepo.findWithFilters(validatedFilters);
  //   }


  async getTrainingSites(
    page: number,
    limit: number,
    filters: any[] = [],
  ) {
    if (page < 1) page = 1;
    if (limit < 1) limit = 10;

    // 🔑 MAP FILTERS HERE
    const validatedFilters = filters.map((f) => {
      const schema = TRAINING_SITES_FILTER_SCHEMA[f.field];

      if (!schema) {
        throw new Error(`Invalid filter field: ${f.field}`);
      }

      if (!schema.operators.includes(f.operator)) {
        throw new Error(`Invalid operator for field: ${f.field}`);
      }

      return {
        column: schema.column,
        type: schema.type,
        operator: f.operator,
        value: f.value,
      };
    });



    const totalRecords =
      validatedFilters.length > 0
        ? await this.trainingSiteRepo.getFilteredCount(validatedFilters)
        : await this.trainingSiteRepo.getTotalCount();

    const totalPages = Math.ceil(totalRecords / limit);

    const data =
      validatedFilters.length > 0
        ? await this.trainingSiteRepo.findWithFilters(validatedFilters, page, limit)
        : await this.trainingSiteRepo.findAll(page, limit);

    const start = totalRecords === 0 ? 0 : (page - 1) * limit + 1;
    const end = Math.min(page * limit, totalRecords);

    return {
      currentPage: page,
      limit,
      start,
      end,
      totalRecords,
      totalPages,
      nextPage: page < totalPages ? page + 1 : null,
      previousPage: page > 1 ? page - 1 : null,
      data,
    };
  }


}

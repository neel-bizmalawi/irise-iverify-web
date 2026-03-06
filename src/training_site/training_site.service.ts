/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */
import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { TrainingSiteRepositoryService } from './training_site.repository/training_site.repository.service';
import { CreateTrainingSiteDto } from './create-training-site.dto';
import { UpdateTrainingSiteDto } from './update-training-site.dto';
import { TRAINING_SITES_FILTER_SCHEMA } from './training-sites.filter.schema';
import { SyncTrainingSiteDto } from './sync-training-site.dto';


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

    const data = await this.trainingSiteRepo.insertTraining(dto, username)

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

  async updateTrain(trainingId: number, dto: UpdateTrainingSiteDto, userId: number) {

    const user = await this.trainingSiteRepo.getUserById(userId);

    const username = user.name;


    return this.trainingSiteRepo.updateTraining(trainingId, dto, username);
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



  async syncTrainings(trainings: SyncTrainingSiteDto[], userId: number) {

    const user = await this.trainingSiteRepo.getUserById(userId);

    const username = user.name;

    let syncedCount = 0;
    let skippedCount = 0;
    const failed: any[] = [];


    for (const training of trainings) {

      try {
        // ✅ Skip if already synced
        if (training.offline_id) {
          const exists = await this.trainingSiteRepo.existsByOfflineId(
            training.offline_id,
          );

          if (exists) {
            skippedCount++;
            continue;
          }
        }

        await this.trainingSiteRepo.insertTrainingsync(
          training,
          username,
        );

        syncedCount++;
      }
      catch (error: any) {
        failed.push({
          offline_id: training.offline_id,
          error: error.message,
        })
      }
    }

    const totalTraining =
      await this.trainingSiteRepo.getTotalTrainingCount();

    return {
      success: failed.length === 0,
      syncedCount,
      skippedCount,
      failedCount: failed.length,
      failedRecords: failed,
      totalTraining,
    };

  }

  async getupdateDataCount(dates: Date) {
    try {

      const count = await this.trainingSiteRepo.getUpdatedCountByDate(dates);

      if (count === 0) {
        return {
          message: "no data found",
          data: [],
        }
      }

      return {
        success: true,
        message: "updated data count fetched succesfully",
        data: count,
      }
    } catch (error) {
      console.error("getUserRles error", error)

      throw new InternalServerErrorException("Failed to get updated data count",);
    }
  }


  async getupdateData(dates: Date) {
    try {

      const record = await this.trainingSiteRepo.getUpdatedDataByDate(dates);

      if (!record || record.length === 0) {
        return {
          message: "no data found",
          data: [],
        }
      }

      return {
        success: true,
        message: "updated data  fetched succesfully",
        data: record,
      }
    } catch (error) {
      console.error("getUserRles error", error)

      throw new InternalServerErrorException("Failed to get updated data",);
    }
  }



  async CreateDistrict(district: string, userId: number) {
    try {

      const user = await this.trainingSiteRepo.getUserById(userId);

      if (!user) {
        return {
          success: false,
          message: "User not found",
          data: []
        };
      }

      const username = user.name;

      const insertDistrict = await this.trainingSiteRepo.insertDistrict(district, username);

      return {
        success: true,
        message: "District created successfully",
        data: insertDistrict
      };

    } catch (error) {
      console.error("CreateDistrict error", error);

      throw new InternalServerErrorException(
        "Failed to create district"
      );
    }
  }


   async searchDistrict(search: string) {
    try {

      const record = await this.trainingSiteRepo.getSearchDistrict(search);

      if (!record || record.length === 0) {
        return {
          message: "no District found",
          data: [],
        }
      }

      return {
        success: true,
        message: "City fetched succesfully",
        data: record,
      }
    } catch (error) {
      console.error("searchDistrict error", error)

      throw new InternalServerErrorException("Failed to get updated data",);
    }
  }

    async searchAuthority(search: string) {
    try {

      const record = await this.trainingSiteRepo.getSearchAuthority(search);

      if (!record || record.length === 0) {
        return {
          message: "no Authority found",
          data: [],
        }
      }

      return {
        success: true,
        message: "Authority fetched succesfully",
        data: record,
      }
    } catch (error) {
      console.error("searchAuthority error", error)

      throw new InternalServerErrorException("Failed to get updated data",);
    }
  }

}

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */
import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { TrainingSiteRepositoryService } from './training_site.repository/training_site.repository.service';
import { CreateTrainingSiteDto } from './create-training-site.dto';
import { UpdateTrainingSiteDto } from './update-training-site.dto';
import { TRAINING_SITES_FILTER_SCHEMA } from './training-sites.filter.schema';
import { SyncTrainingSiteDto } from './sync-training-site.dto';
import { DatabaseService } from 'src/database/database.service';
import * as Sentry from "@sentry/node";


@Injectable()
export class TrainingSiteService {


  constructor(private readonly trainingSiteRepo: TrainingSiteRepositoryService, private readonly db: DatabaseService) { }


  async getAll(page: number = 1, limit: number = 100) {

    try {
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
    catch (error) {
      console.error("getAll error", error)
      throw new InternalServerErrorException("Failed to fetch training sites");

    }

  }

  async createTraining(dto: CreateTrainingSiteDto, userId: number) {

    try {

      const data = await this.trainingSiteRepo.insertTraining(dto, userId)

      return {
        message: 'Training site created successfully',
      }
    }
    catch (error) {
      console.error("createTraining error", error)
      throw new InternalServerErrorException("Failed to create sites");

    }
  }


  async getTrainingData(trainingId: number) {

    try {

      if (!trainingId) {
        throw new BadRequestException("Training id is missing");
      }

      const data = await this.trainingSiteRepo.getTrainingbyID(trainingId);
      return {
        message: "data fetched succesfully"
        , data
      }
    }

    catch (error) {
      console.error("getTrainingData error", error)
      throw new InternalServerErrorException("Failed to get training sites by id");

    }
  }





  async deleteTraining(trainingId: number) {

    try {
      if (!trainingId) {
        throw new BadRequestException("Training id is missing");
      }

      const data = await this.trainingSiteRepo.deleteTrainginId(trainingId);
      return { message: "data deleted successfully" }
    }
    catch (error) {
      console.error("deleteTraining error", error)

      throw new InternalServerErrorException("Failed to delete training");

    }
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

  async getCookStove() {
    const data = await this.trainingSiteRepo.getcookstove();

    return {
      message: 'Cookstove fetched',
      data
    };
  }

  async getLang() {
    const data = await this.trainingSiteRepo.getlangs();

    return {
      message: 'languages  fetched',
      data
    };
  }


  async getTraningsites() {
    const data = await this.trainingSiteRepo.getTrainingAllsites();

    return {
      message: 'training sites fetched',
      data
    };
  }

  async updateTrain(trainingId: number, dto: UpdateTrainingSiteDto, userId: number) {

    try {


      return this.trainingSiteRepo.updateTraining(trainingId, dto, userId);
    }

    catch (error) {
      console.error("updateTrain error", error)

      throw new InternalServerErrorException("Failed to update training");

    }

  }



  async getTrainingSites(
    page: number,
    limit: number,
    filters: any[] = [],
  ) {

    try {

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

    catch (error) {
      console.error("getTrainingSites error", error)
      throw new InternalServerErrorException("Failed to getTraining by filter");

    }
  }



  async syncTrainings(trainings: SyncTrainingSiteDto[], userId: number) {

    try {

      let skippedCount = 0;
      const failed: any[] = [];

      const user = await this.trainingSiteRepo.getUserById(userId);

      const createdByUserId = user.adminID ?? userId;

      const offlineids = trainings.map((t) => t.offline_id).filter((id) => id !== null && id !== undefined);
      for (const t of trainings) {
        console.log("Incoming created_date:", t.created_date);
      }

      console.log("offline ids are", offlineids)
      
      // const existingIds = await this.trainingSiteRepo.getExistingOfflineIds(offlineids, connection);
      // const existingSet = new Set(existingIds);

      // console.log("existing ids are", existingIds);
      // console.log("exisitngSet is", existingSet)

      // const newRecords = trainings.filter(training => {
      //   if (training.offline_id && existingSet.has(training.offline_id)) {
      //     skippedCount++;
      //     return false;
      //   }
      //   return true;
      // });

      const newRecords = trainings

      console.log("new Records are", newRecords)

      let syncedCount = 0;
      let mapping: any[] = [];


      if (newRecords.length > 0) {
        console.log("inside newRecords.length > 0");
        const result = await this.trainingSiteRepo.bulkInsertTrainings(
          newRecords,
          createdByUserId,
        );

        syncedCount = result.affectedRows;

        // const offlineIdsnew = newRecords
        //   .map(r => r.offline_id)
        //   .filter((id): id is number => id !== undefined && id !== null);

        // ✅ Fetch inserted rows
        // const insertedRows = await this.trainingSiteRepo.getByOfflineIds(
        //   offlineIdsnew,
        // );

        // mapping = insertedRows.map(row => ({
        //   m_training_point_id: row.m_training_point_id,
        //   training_point_id: row.training_point_id, // DB primary key
        // }));

         mapping = newRecords.map((t, index) => ({
    training_point_id: result.firstId + index,
  }));


      }

      // for (const training of trainings) {

      //   try {
      //     // ✅ Skip if already synced
      //     if (training.offline_id) {
      //       const exists = await this.trainingSiteRepo.existsByOfflineId(
      //         training.offline_id,
      //       );

      //       if (exists) {
      //         skippedCount++;
      //         continue;
      //       }
      //     }

      //     await this.trainingSiteRepo.insertTrainingsync(
      //       training,
      //       username,
      //     );

      //     syncedCount++;
      //   }
      //   catch (error: any) {
      //     failed.push({
      //       offline_id: training.offline_id,
      //       error: error.message,
      //     })
      //   }
      // }

      const totalTraining =
        await this.trainingSiteRepo.getTotalTrainingCount();


      return {
        success: failed.length === 0,
        syncedCount,
        skippedCount,
        failedCount: failed.length,
        failedRecords: failed,
        totalTraining,
        mapping,
      };
    }

    catch (error) {


      console.error("syncTrainings error", error)
      throw new InternalServerErrorException("Failed to sync training data");

    }

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

      console.log("Input date (raw):", dates);
      console.log("ISO format:", dates.toISOString());
      console.log("Locale string:", dates.toString());

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
      Sentry.captureException(error);


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

      console.log("username is", username)

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
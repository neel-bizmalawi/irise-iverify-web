/* eslint-disable prettier/prettier */
import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { BeneficiaryRepositoryService } from './beneficiary.repository/beneficiary.repository.service';
import { CreateBeneficiarydto } from './create-benificiary.dto';
import * as fs from 'fs';
import * as path from 'path';
import { TrainingSiteRepositoryService } from 'src/training_site/training_site.repository/training_site.repository.service';
import { DatabaseService } from 'src/database/database.service';
import { UpdateBeneficiaryDto } from './update-beneficiary-site-dto';
import { BENEFICIARY_FILTER_SCHEMA } from './beneficiary.filter.schema';
// import { v4 as uuid } from 'uuid';
import { v4 as uuidv4 } from 'uuid';
import * as Sentry from '@sentry/node';




@Injectable()
export class BeneficiaryService {

  constructor(private readonly beneficiaryRepo: BeneficiaryRepositoryService, private readonly trainingSiteRepo: TrainingSiteRepositoryService, private readonly db: DatabaseService) { }




  private async saveBeneficiaryFile(
    file: Express.Multer.File | undefined,
    beneficiaryId: number,
    prefix: string,
    folderPath: string
  ): Promise<{ dbPath: string | null; filePath: string | null }> {

    if (!file) {
      return { dbPath: null, filePath: null };
    }

    const allowedTypes = [".jpg", ".jpeg", ".png"];

    const ext = path.extname(file.originalname).toLowerCase();

    if (!allowedTypes.includes(ext)) {
      throw new BadRequestException("Invalid file type");
    }


    const fileName = `${prefix}_${beneficiaryId}_${uuidv4()}${path.extname(file.originalname)}`;
    const filePath = path.join(folderPath, fileName);
    const dbPath = `/${folderPath}/${fileName}`;

    await fs.promises.writeFile(filePath, file.buffer);

    return { dbPath, filePath };
  }

  async createBeneficiary(
    dto: CreateBeneficiarydto,
    nationalId: Express.Multer.File | undefined,
    signature: Express.Multer.File | undefined,
    household_pic: Express.Multer.File | undefined,
    cookstove_pic: Express.Multer.File | undefined,
    userId: number
  ) {

    const connection = await this.db.getConnection();
    await connection.beginTransaction();

    let beneficiaryFolderPath: string | null = null;

    try {

      const beneficiary = await this.beneficiaryRepo.insertDataBeneficiary(dto, userId, connection);

      console.log("beneficiary result is", beneficiary);

      if (!beneficiary) {
        throw new Error('Failed to create Beneficiary');
      }

      const beneficiaryId = beneficiary.insertId;

      // create folder once
      beneficiaryFolderPath = `uploads/beneficiary/${beneficiaryId}`;

      fs.mkdirSync(beneficiaryFolderPath, { recursive: true });

      // save files using helper
      const nationalIdFile = await this.saveBeneficiaryFile(
        nationalId,
        beneficiaryId,
        "beneficiary_national_id",
        beneficiaryFolderPath
      );

      const signatureFile = await this.saveBeneficiaryFile(
        signature,
        beneficiaryId,
        "beneficiary_signature",
        beneficiaryFolderPath
      );

      const householdFile = await this.saveBeneficiaryFile(
        household_pic,
        beneficiaryId,
        "beneficiary_household",
        beneficiaryFolderPath
      );

      const cookstoveFile = await this.saveBeneficiaryFile(
        cookstove_pic,
        beneficiaryId,
        "beneficiary_cookstove_pic",
        beneficiaryFolderPath
      );

      await this.beneficiaryRepo.updateFilesPath(
        beneficiaryId,
        {
          national_id_attachment: nationalIdFile.dbPath,
          national_id_timestamp: nationalIdFile.dbPath ? new Date() : null,

          signature: signatureFile.dbPath,
          signature_timestamp: signatureFile.dbPath ? new Date() : null,

          house_pic: householdFile.dbPath,
          house_pic_timestamp: householdFile.dbPath ? new Date() : null,

          cookstove_pic: cookstoveFile.dbPath,
          cookstove_pic_timestamp: cookstoveFile.dbPath ? new Date() : null
        },
        connection
      );

      await connection.commit();

      return { message: "Beneficiary created successfully" };

    } catch (error) {
      Sentry.captureException(error);

      console.error("createBeneficiary error", error)
      await connection.rollback();

      // delete entire folder
      if (beneficiaryFolderPath && fs.existsSync(beneficiaryFolderPath)) {
        fs.rmSync(beneficiaryFolderPath, { recursive: true, force: true });
      }

      throw error;

    } finally {
      connection.release();
    }
  }

  async getBeneficiaryData(bid: number) {

    try {

      if (!bid) {
        throw new BadRequestException("beneficiary id is missing");
      }

      const data = await this.beneficiaryRepo.getBeneficiaryById(bid);

      if (!data) {
        return {
          success: false,
          message: 'Beneficiary not found',
          statusCode: 404
        };
      }


      return {
        message: "beneficiary fetched succesfully"
        , data
      }
    } catch (error) {
      Sentry.captureException(error);

      console.error("get benficiary data error ", error)
      throw new InternalServerErrorException("Failed to fetch getBeneficiary Data");

    }
  }

  async getBeneficiarylist(
    page: number,
    limit: number,
    filters: any[] = [],
  ) {
    try {

      if (page < 1) page = 1;
      if (limit < 1) limit = 10;

      // 🔑 MAP FILTERS HERE
      const validatedFilters = filters.map((f) => {
        const schema = BENEFICIARY_FILTER_SCHEMA[f.field];

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
          ? await this.beneficiaryRepo.getFilteredCount(validatedFilters)
          : await this.beneficiaryRepo.getTotalCount();

      const totalPages = Math.ceil(totalRecords / limit);

      const data =
        validatedFilters.length > 0
          ? await this.beneficiaryRepo.findWithFilters(validatedFilters, page, limit)
          : await this.beneficiaryRepo.findAll(page, limit);

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
      Sentry.captureException(error);

      console.error("getBeneficiarylist error", error)
      throw new InternalServerErrorException("Failed to fetch Beneficiary list");

    }
  }


  private async replaceBeneficiaryFile(
    file: Express.Multer.File | undefined,
    beneficiaryId: number,
    prefix: string,
    folderPath: string,
    oldFilePath?: string,
    removeFile?: boolean
  ): Promise<{ dbPath?: string | null; filePath?: string | null }> {


    // CASE 1: user removed image
    if (removeFile) {
      if (oldFilePath) {
        // const cleanOldPath = oldFilePath.replace(/^\/+/, '');
        const cleanOldPath = path.resolve(oldFilePath.replace(/^\/+/, ''));

        if (fs.existsSync(cleanOldPath)) {
          await fs.promises.unlink(cleanOldPath);
        }
      }

      return { dbPath: null, filePath: null };
    }

    // case 2:new upload 
    if (file) {
      const fileName = `${prefix}_${beneficiaryId}_${uuidv4()}${path.extname(file.originalname)}`;
      const filePath = path.join(folderPath, fileName);
      const dbPath = `/${folderPath}/${fileName}`;

      // delete old file first
      if (oldFilePath) {
        // const cleanOldPath = oldFilePath.replace(/^\/+/, '');
        const cleanOldPath = path.resolve(oldFilePath.replace(/^\/+/, ''));

        if (fs.existsSync(cleanOldPath))  //Does this file exist on the server?
        {
          await fs.promises.unlink(cleanOldPath); //This deletes the file from the server.
        }
      }

      // write new file
      await fs.promises.writeFile(filePath, file.buffer);

      return { dbPath, filePath };
    }

    // CASE 3: untouched
    return {};
  }


  async updateBeneficiary(
    udto: UpdateBeneficiaryDto,
    nationalId: Express.Multer.File | undefined,
    signature: Express.Multer.File | undefined,
    household_pic: Express.Multer.File | undefined,
    cookstove_pic: Express.Multer.File | undefined,
    bid: number,
    userId: number
  ) {

    const connection = await this.db.getConnection();
    await connection.beginTransaction();

    let uploadedFiles: string[] = [];

    try {

      const beneficiaryId = bid;

      const existingBeneficiary =
        await this.beneficiaryRepo.getBeneficiaryById(beneficiaryId);

      if (!existingBeneficiary) {
        throw new BadRequestException("Beneficiary not found");
      }

      const folderPath = `uploads/beneficiary/${beneficiaryId}`;
      //       const folderPath = path.join(
      //   process.cwd(),
      //   "uploads",
      //   "beneficiary",
      //   String(beneficiaryId)
      // );
      fs.mkdirSync(folderPath, { recursive: true });

      const nationalIdFile = await this.replaceBeneficiaryFile(
        nationalId,
        beneficiaryId,
        "beneficiary_national_id",
        folderPath,
        existingBeneficiary?.national_id_attachment,
        udto.remove_national_id
      );

      const signatureFile = await this.replaceBeneficiaryFile(
        signature,
        beneficiaryId,
        "beneficiary_signature",
        folderPath,
        existingBeneficiary?.signature,
        udto.remove_signature
      );

      const householdFile = await this.replaceBeneficiaryFile(
        household_pic,
        beneficiaryId,
        "beneficiary_household",
        folderPath,
        existingBeneficiary?.house_pic,
        udto.remove_house_pic
      );

      const cookstoveFile = await this.replaceBeneficiaryFile(
        cookstove_pic,
        beneficiaryId,
        "beneficiary_cookstove_pic",
        folderPath,
        existingBeneficiary?.cookstove_pic,
        udto.remove_cookstove_pic
      );

      // store uploaded files for rollback safety
      [
        nationalIdFile.filePath,
        signatureFile.filePath,
        householdFile.filePath,
        cookstoveFile.filePath
      ].forEach(p => {
        if (p) uploadedFiles.push(p);
      });

      const fileUpdates: any = {};

      if (nationalIdFile.dbPath !== undefined) {
        fileUpdates.national_id_attachment = nationalIdFile.dbPath;
        fileUpdates.national_id_timestamp = nationalIdFile.dbPath ? new Date() : null;

      }

      if (signatureFile.dbPath !== undefined) {
        fileUpdates.signature = signatureFile.dbPath;
        fileUpdates.signature_timestamp = signatureFile.dbPath ? new Date() : null;

      }

      if (householdFile.dbPath !== undefined) {
        fileUpdates.house_pic = householdFile.dbPath;
        fileUpdates.house_pic_timestamp = householdFile.dbPath ? new Date() : null;

      }

      if (cookstoveFile.dbPath !== undefined) {
        fileUpdates.cookstove_pic = cookstoveFile.dbPath;
        fileUpdates.cookstove_pic_timestamp = cookstoveFile.dbPath ? new Date() : null;
      }


      await this.beneficiaryRepo.updateBeneficiary(
        beneficiaryId,
        udto,
        fileUpdates,
        connection,
        userId
      );

      await connection.commit();

      return { message: "Beneficiary updated successfully" };

    } catch (error) {
      Sentry.captureException(error);

      await connection.rollback();

      // delete uploaded files
      for (const file of uploadedFiles) {
        if (fs.existsSync(file)) {
          await fs.promises.unlink(file);
        }
      }

      throw error;

    } finally {
      connection.release();
    }
  }



  async deleteBeneficiary(bid: number) {
    try {
      if (!bid) {
        throw new BadRequestException("Beneficiary id is missing");
      }

      const result = await this.beneficiaryRepo.deleteBeneficiaryId(bid);

      // If no rows were deleted
      if (!result || result.affectedRows === 0) {
        throw new BadRequestException("Beneficiary not found or already deleted");
      }

      const folderPath = path.join(
        process.cwd(),
        "uploads",
        "beneficiary",
        String(bid)
      );

      if (fs.existsSync(folderPath)) {
        await fs.promises.rm(folderPath, { recursive: true, force: true });//rmSync means remove
      }

      return { message: "Beneficiary deleted successfully" };
    }
    catch (error) {
      Sentry.captureException(error);

      console.error("deleteBeneficairy error is", error);
      throw new InternalServerErrorException("Failed to Delete Beneficiary");

    }
  }

}

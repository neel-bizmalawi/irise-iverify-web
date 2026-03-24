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


    let beneficiaryFolderPath: string | null = null;
      let beneficiaryId: number | null = null; // 👈 FIX: declare here


    try {

      const beneficiary = await this.beneficiaryRepo.insertDataBeneficiary(dto, userId);


      if (!beneficiary) {
        throw new Error('Failed to create Beneficiary');
      }

       beneficiaryId = beneficiary.insertId;

if (beneficiaryId === null) {
  throw new Error("Invalid beneficiary ID");
}

      // create folder once
      beneficiaryFolderPath = `uploads/beneficiary/${beneficiaryId}`;

      // fs.mkdirSync(beneficiaryFolderPath, { recursive: true });
      await fs.promises.mkdir(beneficiaryFolderPath, { recursive: true });


      // save files using helper
      // const nationalIdFile = await this.saveBeneficiaryFile(
      //   nationalId,
      //   beneficiaryId,
      //   "beneficiary_national_id",
      //   beneficiaryFolderPath
      // );

      // const signatureFile = await this.saveBeneficiaryFile(
      //   signature,
      //   beneficiaryId,
      //   "beneficiary_signature",
      //   beneficiaryFolderPath
      // );

      // const householdFile = await this.saveBeneficiaryFile(
      //   household_pic,
      //   beneficiaryId,
      //   "beneficiary_household",
      //   beneficiaryFolderPath
      // );

      // const cookstoveFile = await this.saveBeneficiaryFile(
      //   cookstove_pic,
      //   beneficiaryId,
      //   "beneficiary_cookstove_pic",
      //   beneficiaryFolderPath
      // );

      // then all files simultaneously

      const [nationalIdFile, signatureFile, householdFile, cookstoveFile] =
  await Promise.all([
    this.saveBeneficiaryFile(nationalId, beneficiaryId, "beneficiary_national_id", beneficiaryFolderPath),
    this.saveBeneficiaryFile(signature,  beneficiaryId, "beneficiary_signature",   beneficiaryFolderPath),
    this.saveBeneficiaryFile(household_pic, beneficiaryId, "beneficiary_household", beneficiaryFolderPath),
    this.saveBeneficiaryFile(cookstove_pic, beneficiaryId, "beneficiary_cookstove_pic", beneficiaryFolderPath),
  ]);

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
      );


      return { message: "Beneficiary created successfully" };

    } catch (error) {
      Sentry.captureException(error);

      console.error("createBeneficiary error", error)

      // delete entire folder
      if (beneficiaryFolderPath && fs.existsSync(beneficiaryFolderPath)) {
        // fs.rmSync(beneficiaryFolderPath, { recursive: true, force: true });
              await fs.promises.rm(beneficiaryFolderPath, { recursive: true, force: true });

      }

       if (beneficiaryId) {
      try {
        await this.beneficiaryRepo.deleteBeneficiaryId(beneficiaryId);
      } catch (deleteError) {
        // log separately — don't let this hide the original error
        Sentry.captureException(deleteError);
        console.error("Failed to cleanup beneficiary record:", beneficiaryId, deleteError);
      }
    }

      throw error;

    } finally {
      console.log("fetch failed")
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
): Promise<{ dbPath?: string | null; filePath?: string | null; oldFileToDelete?: string | null }> {
  //                                                            ↑ return old path instead of deleting immediately

  // CASE 1: user removed image
  if (removeFile) {
    return { 
      dbPath: null, 
      filePath: null, 
      oldFileToDelete: oldFilePath ?? null  // ✅ just return it, don't delete yet
    };
  }

  // CASE 2: new upload
  if (file) {
    const fileName = `${prefix}_${beneficiaryId}_${uuidv4()}${path.extname(file.originalname)}`;
    const filePath = path.join(folderPath, fileName);
    const dbPath = `/${folderPath}/${fileName}`;

    await fs.promises.writeFile(filePath, file.buffer);  // write new file

    return { 
      dbPath, 
      filePath,
      oldFileToDelete: oldFilePath ?? null  // ✅ return old path, delete after DB succeeds
    };
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

  let uploadedFiles: string[] = [];      // new files written
  let oldFilesToDelete: string[] = [];   // old files to delete after DB succeeds

  try {

    // ✅ STEP 1: Fetch existing beneficiary BEFORE any file work
    const existingBeneficiary = await this.beneficiaryRepo.getBeneficiaryById(bid);

    if (!existingBeneficiary) {
      throw new BadRequestException("Beneficiary not found");
    }

    const folderPath = `uploads/beneficiary/${bid}`;
    await fs.promises.mkdir(folderPath, { recursive: true });

    // ✅ STEP 2: Write new files simultaneously — no DB lock
    const [nationalIdFile, signatureFile, householdFile, cookstoveFile] =
      await Promise.all([
        this.replaceBeneficiaryFile(nationalId, bid, "beneficiary_national_id", folderPath, existingBeneficiary?.national_id_attachment, udto.remove_national_id),
        this.replaceBeneficiaryFile(signature, bid, "beneficiary_signature", folderPath, existingBeneficiary?.signature, udto.remove_signature),
        this.replaceBeneficiaryFile(household_pic, bid, "beneficiary_household", folderPath, existingBeneficiary?.house_pic, udto.remove_house_pic),
        this.replaceBeneficiaryFile(cookstove_pic, bid, "beneficiary_cookstove_pic", folderPath, existingBeneficiary?.cookstove_pic, udto.remove_cookstove_pic),
      ]);

    // track new uploaded files for rollback if DB fails
    [nationalIdFile.filePath, signatureFile.filePath, householdFile.filePath, cookstoveFile.filePath]
      .forEach(p => { if (p) uploadedFiles.push(p); });

    // track old files to delete after DB succeeds
    [nationalIdFile.oldFileToDelete, signatureFile.oldFileToDelete, householdFile.oldFileToDelete, cookstoveFile.oldFileToDelete]
      .forEach(p => { if (p) oldFilesToDelete.push(p); });

    // ✅ STEP 3: Build file updates
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

    // ✅ STEP 4: Single DB update — fast, no transaction needed
    await this.beneficiaryRepo.updateBeneficiary(bid, udto, fileUpdates, userId);

    // ✅ STEP 5: DB succeeded — NOW safe to delete old files
    await Promise.all(
      oldFilesToDelete.map(async (oldPath) => {
        const cleanPath = path.resolve(oldPath.replace(/^\/+/, ''));
        if (fs.existsSync(cleanPath)) {
          await fs.promises.unlink(cleanPath);
        }
      })
    );

    return { message: "Beneficiary updated successfully" };

  } catch (error) {
    Sentry.captureException(error);
    console.error("updateBeneficiary error", error);

    // ✅ DB failed — delete newly uploaded files only
    await Promise.all(
      uploadedFiles.map(async (filePath) => {
        if (fs.existsSync(filePath)) {
          await fs.promises.unlink(filePath);
        }
      })
    );
    // old files are untouched ✅ — never deleted since DB didn't succeed

    throw error;
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

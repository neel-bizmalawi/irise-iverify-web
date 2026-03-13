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
import { v4 as uuid } from 'uuid';


@Injectable()
export class BeneficiaryService {

  constructor(private readonly beneficiaryRepo: BeneficiaryRepositoryService, private readonly trainingSiteRepo: TrainingSiteRepositoryService, private readonly db: DatabaseService) { }


  // async createBeneficiary(dto: CreateBeneficiarydto, nationalId: Express.Multer.File | undefined, signature: Express.Multer.File | undefined, household_pic: Express.Multer.File | undefined, cookstove_pic: Express.Multer.File | undefined, userId: number) {

  //   const connection = await this.db.getConnection();   // ✅ START HERE

  //   await connection.beginTransaction();

  //   let nationalIdPath: string | null = null;
  //   let signaturePath: string | null = null;
  //   let householdPath: string | null = null;
  //   let cookstovePath: string | null = null;
  //   let signatureFilePath: string | null = null;
  //   let nationalIdFilePath: string | null = null;
  //    let houseHoldFilePath: string | null = null;
  //   let cookstoveFilePath: string | null = null;



  //   try {

  //     const user = await this.trainingSiteRepo.getUserById(userId);

  //     const username = user.name;
  //     // 1️⃣ create beneficiary first
  //     const beneficiary = await this.beneficiaryRepo.insertDataBeneficiary(dto, username, connection);

  //     if (!beneficiary) {
  //       throw new Error('Failed to create Beneficairy');
  //     }

  //     const beneficiaryId = beneficiary.insertId;



  //     if (nationalId) {

  //       const uploadPath = `uploads/beneficiary/${beneficiaryId}`;
  //       fs.mkdirSync(uploadPath, { recursive: true });

  //       const fileName = `beneficiary_national_id_${beneficiaryId}${path.extname(nationalId.originalname)}`;
  //       const filePath = path.join(uploadPath, fileName); // filesystem
  //       const dbPath = `/${uploadPath}/${fileName}`;      // url

  //       await fs.promises.writeFile(filePath, nationalId.buffer);


  //       nationalIdPath = dbPath; //save in db
  //       nationalIdFilePath = filePath;//use for deletion
  //     }

  //     if (signature) {

  //       const uploadPath = `uploads/beneficiary/${beneficiaryId}`;
  //       fs.mkdirSync(uploadPath, { recursive: true });

  //       const fileName = `beneficiary_signature_${beneficiaryId}${path.extname(signature.originalname)}`;
  //       const filePath = path.join(uploadPath, fileName); // filesystem
  //       const dbPath = `/${uploadPath}/${fileName}`;      // url

  //       await fs.promises.writeFile(filePath, signature.buffer);


  //       signaturePath = dbPath; //save in Db
  //       signatureFilePath = filePath; // use for deletion
  //     }

  //           if (household_pic) {

  //       const uploadPath = `uploads/beneficiary/${beneficiaryId}`;
  //       fs.mkdirSync(uploadPath, { recursive: true });

  //       const fileName = `beneficiary_household_${beneficiaryId}${path.extname(household_pic.originalname)}`;
  //       const filePath = path.join(uploadPath, fileName); // filesystem
  //       const dbPath = `/${uploadPath}/${fileName}`;      // url

  //       await fs.promises.writeFile(filePath, household_pic.buffer);


  //       householdPath = dbPath; //save in Db
  //       houseHoldFilePath = filePath; // use for deletion
  //     }

  //        if (cookstove_pic) {

  //       const uploadPath = `uploads/beneficiary/${beneficiaryId}`;
  //       fs.mkdirSync(uploadPath, { recursive: true });

  //       const fileName = `beneficiary_cookstove_pic_${beneficiaryId}${path.extname(cookstove_pic.originalname)}`;
  //       const filePath = path.join(uploadPath, fileName); // filesystem
  //       const dbPath = `/${uploadPath}/${fileName}`;      // url

  //       await fs.promises.writeFile(filePath, cookstove_pic.buffer);


  //       cookstovePath = dbPath; //save in Db
  //       cookstoveFilePath = filePath; // use for deletion
  //     }

  //     // 2️⃣ update record with file paths
  //     await this.beneficiaryRepo.updateFilesPath(beneficiaryId, {
  //       national_id_attachment: nationalIdPath,
  //       signature: signaturePath,
  //       household_pic:householdPath,
  //       cookstove_pic:cookstovePath
  //     }, connection);

  //     await connection.commit();

  //     return { message: 'Beneficiary created successfully' };
  //   }
  //   catch (error) {

  //     // ❌ rollback if anything fails
  //     await connection.rollback();

  //     // ❗ delete uploaded files
  //     if (nationalIdFilePath && fs.existsSync(nationalIdFilePath)) {
  //       fs.unlinkSync(nationalIdFilePath);
  //     }

  //     if (signatureFilePath && fs.existsSync(signatureFilePath)) {
  //       fs.unlinkSync(signatureFilePath);
  //     }


  //     throw error;

  //   } finally {
  //     connection.release();   // very important
  //   }
  // }

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


    const fileName = `${prefix}_${beneficiaryId}_${uuid()}${path.extname(file.originalname)}`;
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

      const user = await this.trainingSiteRepo.getUserById(userId);
      const username = user.name;

      const beneficiary = await this.beneficiaryRepo.insertDataBeneficiary(dto, username, connection);

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
      const fileName = `${prefix}_${beneficiaryId}_${uuid()}${path.extname(file.originalname)}`;
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

      const user = await this.trainingSiteRepo.getUserById(userId);
      const username = user.name;

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
        username
      );

      await connection.commit();

      return { message: "Beneficiary updated successfully" };

    } catch (error) {

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


  // async updateBeneficiary(udto: UpdateBeneficiaryDto, nationalId: Express.Multer.File | undefined, signature: Express.Multer.File | undefined, household_pic: Express.Multer.File | undefined, cookstove_pic: Express.Multer.File | undefined, bid: number, userId: number) {

  //   const connection = await this.db.getConnection();   // ✅ START HERE

  //   await connection.beginTransaction();

  //   let nationalIdPath: string | null = null;
  //   let signaturePath: string | null = null;
  //   let householdPath: string | null = null;
  //   let cookstovePath: string | null = null;
  //   let signatureFilePath: string | null = null;
  //   let nationalIdFilePath: string | null = null;
  //   let houseHoldFilePath: string | null = null;
  //   let cookstoveFilePath: string | null = null;


  //   try {

  //     const user = await this.trainingSiteRepo.getUserById(userId);

  //     const username = user.name;

  //     const beneficiaryId = bid;

  //     const existingBeneficiary =
  //       await this.beneficiaryRepo.getBeneficiaryById(beneficiaryId);

  //     console.log("exist beneficiary api response is", existingBeneficiary)

  //     if (nationalId) {

  //       const uploadPath = `uploads/beneficiary/${beneficiaryId}`;
  //       fs.mkdirSync(uploadPath, { recursive: true });

  //       const fileName = `beneficiary_national_id_${beneficiaryId}${path.extname(nationalId.originalname)}`;
  //       const filePath = path.join(uploadPath, fileName); // filesystem
  //       const dbPath = `/${uploadPath}/${fileName}`;      // url

  //       await fs.promises.writeFile(filePath, nationalId.buffer);


  //       nationalIdPath = dbPath; //save in db
  //       nationalIdFilePath = filePath;//use for deletion

  //       // ✅ delete old file
  //       if (existingBeneficiary?.national_id_attachment) {
  //         const oldPath = existingBeneficiary.national_id_attachment.replace(/^\/+/, '');


  //         if (fs.existsSync(oldPath)) {
  //           await fs.promises.unlink(oldPath);
  //         }
  //       }
  //     }

  //     if (signature) {

  //       const uploadPath = `uploads/beneficiary/${beneficiaryId}`;
  //       fs.mkdirSync(uploadPath, { recursive: true });

  //       const fileName = `beneficiary_signature_${beneficiaryId}${path.extname(signature.originalname)}`;
  //       const filePath = path.join(uploadPath, fileName); // filesystem
  //       const dbPath = `/${uploadPath}/${fileName}`;      // url

  //       await fs.promises.writeFile(filePath, signature.buffer);


  //       signaturePath = dbPath; //save in Db
  //       signatureFilePath = filePath; // use for deletion

  //       if (existingBeneficiary?.signature) {
  //         const oldPath = existingBeneficiary.signature.replace(/^\/+/, '');

  //         console.log("old path for signature  is", oldPath);

  //         if (fs.existsSync(oldPath)) {
  //           await fs.promises.unlink(oldPath);
  //         }
  //       }
  //     }

  //     if (household_pic) {

  //       const uploadPath = `uploads/beneficiary/${beneficiaryId}`;
  //       fs.mkdirSync(uploadPath, { recursive: true });

  //       const fileName = `beneficiary_household_${beneficiaryId}${path.extname(household_pic.originalname)}`;
  //       const filePath = path.join(uploadPath, fileName); // filesystem
  //       const dbPath = `/${uploadPath}/${fileName}`;      // url

  //       await fs.promises.writeFile(filePath, household_pic.buffer);


  //       householdPath = dbPath; //save in Db
  //       houseHoldFilePath = filePath; // use for deletion

  //       if (existingBeneficiary?.house_pic) {
  //         const oldPath = existingBeneficiary.house_pic.replace(/^\/+/, '');


  //         if (fs.existsSync(oldPath)) {
  //           await fs.promises.unlink(oldPath);
  //         }
  //       }
  //     }

  //     if (cookstove_pic) {

  //       const uploadPath = `uploads/beneficiary/${beneficiaryId}`;
  //       fs.mkdirSync(uploadPath, { recursive: true });

  //       const fileName = `beneficiary_cookstove_pic_${beneficiaryId}${path.extname(cookstove_pic.originalname)}`;
  //       const filePath = path.join(uploadPath, fileName); // filesystem
  //       const dbPath = `/${uploadPath}/${fileName}`;      // url

  //       await fs.promises.writeFile(filePath, cookstove_pic.buffer);


  //       cookstovePath = dbPath; //save in Db
  //       cookstoveFilePath = filePath; // use for deletion

  //       if (existingBeneficiary?.cookstove_pic) {
  //         const oldPath = existingBeneficiary.cookstove_pic.replace(/^\/+/, '');


  //         if (fs.existsSync(oldPath)) {
  //           await fs.promises.unlink(oldPath);
  //         }
  //       }
  //     }



  //     await this.beneficiaryRepo.updateBeneficiary(
  //       beneficiaryId,
  //       udto,
  //       {
  //         national_id_attachment: nationalIdPath,
  //         signature: signaturePath,
  //         house_pic: householdPath,
  //         cookstove_pic: cookstovePath,
  //       },
  //       connection,
  //       username
  //     );

  //     await connection.commit();

  //     return { message: 'Beneficiary updated successfully' };
  //   }
  //   catch (error) {

  //     // ❌ rollback if anything fails
  //     await connection.rollback();

  //     // ❗ delete uploaded files
  //     if (nationalIdFilePath && fs.existsSync(nationalIdFilePath)) {
  //       await fs.promises.unlink(nationalIdFilePath);
  //     }

  //     if (signatureFilePath && fs.existsSync(signatureFilePath)) {
  //       await fs.promises.unlink(signatureFilePath);
  //     }

  //     if (houseHoldFilePath && fs.existsSync(houseHoldFilePath)) {
  //       await fs.promises.unlink(houseHoldFilePath);
  //     }

  //     if (cookstoveFilePath && fs.existsSync(cookstoveFilePath)) {
  //       await fs.promises.unlink(cookstoveFilePath);
  //     }


  //     throw error;

  //   } finally {
  //     connection.release();   // very important
  //   }

  // }

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
      console.error("deleteBeneficairy error is", error);
      throw new InternalServerErrorException("Failed to Delete Beneficiary");

    }
  }

}

/* eslint-disable prettier/prettier */
import { BadRequestException, HttpException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { AuditRepository } from './repository/audit.repository/audit.repository';
import { TrainingSiteRepositoryService } from 'src/training_site/training_site.repository/training_site.repository.service';
import { DatabaseService } from 'src/database/database.service';
import { CreateAuditDto } from './createAudit.dto';
import * as fs from 'fs';
import * as path from 'path';
// import { v4 as uuid } from 'uuid';
import { v4 as uuidv4 } from 'uuid';
import * as Sentry from '@sentry/node';
import { AUDIT_FILTER_SCHEMA } from './audit.filter.schema';
import { updateAuditDto } from './updateAudit.dto';


@Injectable()
export class AuditService {
  constructor(private readonly auditRepo: AuditRepository, private readonly trainingSiteRepo: TrainingSiteRepositoryService, private readonly db: DatabaseService) { }



  private async saveAuditFile(
    file: Express.Multer.File | undefined,
    AuditId: number,
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

    const fileName = `${prefix}_${AuditId}_${uuidv4()}${path.extname(file.originalname)}`;
    const filePath = path.join(folderPath, fileName);
    const dbPath = `/${folderPath}/${fileName}`;

    await fs.promises.writeFile(filePath, file.buffer);

    return { dbPath, filePath };
  }

  async CreateAuditing(
    dto: CreateAuditDto,
    cookstoveFile: Express.Multer.File | undefined,
    cookstoveareaFile: Express.Multer.File | undefined,
    userId: number
  ) {

    let auditFolderPath: string | null = null;
    let AuditId: number | null = null; // 👈 FIX: declare here

    try {

      const timezone = await this.auditRepo.getUserTimezone(userId);

      const Audit = await this.auditRepo.insertDataAudit(dto, userId, timezone);

      if (!Audit) {
        throw new Error('Failed to create Audit');
      }

      AuditId = Audit.insertId;

      if (AuditId === null) {
        throw new Error("Invalid beneficiary ID");
      }

      // create folder once
      auditFolderPath = `uploads/audit/${AuditId}`;

      // fs.mkdirSync(auditFolderPath, { recursive: true });

      await fs.promises.mkdir(auditFolderPath, { recursive: true });



      const [cookstoveFilesPath, cookstoveAreaFilesPath] =
        await Promise.all([
          this.saveAuditFile(cookstoveFile, AuditId, "cookstove", auditFolderPath),
          this.saveAuditFile(cookstoveareaFile, AuditId, "cookstove_area", auditFolderPath),
        ]);


      await this.auditRepo.updateFilesPath(
        AuditId,
        {
          photo_path_cook_stove: cookstoveFilesPath.dbPath,
          // national_id_timestamp: cookstoveFilesPath.dbPath ? new Date() : null,

          photo_path_cook_stove_area: cookstoveAreaFilesPath.dbPath,
          // signature_timestamp: cookstoveAreaFilesPath.dbPath ? new Date() : null,
        }
      );


      return { message: "Audits Created Successfully" };

    } catch (error) {

      console.error("error in audit service is", error)
      // delete entire folder
      if (auditFolderPath && fs.existsSync(auditFolderPath)) {
        await fs.promises.rm(auditFolderPath, { recursive: true, force: true });
      }

      if (AuditId) {
        try {
          await this.auditRepo.deleteAuditId(AuditId);
        } catch (deleteError) {
          // log separately — don't let this hide the original error
          Sentry.captureException(deleteError);
          console.error("Failed to cleanup audit record:", AuditId, deleteError);
        }
      }

      throw error;

    }
  }


  private async replaceBeneficiaryFile(
    file: Express.Multer.File | undefined,
    auditId: number,
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
      const fileName = `${prefix}_${auditId}_${uuidv4()}${path.extname(file.originalname)}`;
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



  async updateAudit(udto: updateAuditDto, cookstoveFile: Express.Multer.File | undefined,
    cookstoveareaFile: Express.Multer.File | undefined,
    aid: number,
    userId: number) {

    let uploadedFiles: string[] = [];      // new files written
    let oldFilesToDelete: string[] = [];   // old files to delete after DB 

    try {

      const exisitingAudit = await this.auditRepo.getAuditById(aid);

      if (!exisitingAudit) {
        throw new BadRequestException("Auditing not found");
      }


      const folderPath = `uploads/audit/${aid}`;
      await fs.promises.mkdir(folderPath, { recursive: true });


      const [cookstoveFilepath, cookstove_areaFilepath] =
        await Promise.all([
          this.replaceBeneficiaryFile(cookstoveFile, aid, "cookstove", folderPath, exisitingAudit?.photo_path_cook_stove, udto.remove_cookstove),
          this.replaceBeneficiaryFile(cookstoveareaFile, aid, "beneficiary_signature", folderPath, exisitingAudit?.photo_path_cook_stove_area, udto.remove_cookstove_area),
        ]);


      // track new uploaded files for rollback if DB fails
      [cookstoveFilepath.filePath, cookstove_areaFilepath.filePath]
        .forEach(p => { if (p) uploadedFiles.push(p); });

      // track old files to delete after DB succeeds
      [cookstoveFilepath.oldFileToDelete, cookstove_areaFilepath.oldFileToDelete]
        .forEach(p => { if (p) oldFilesToDelete.push(p); });

      const fileUpdates: any = {};

      if (cookstoveFilepath.dbPath !== undefined) {
        fileUpdates.photo_path_cook_stove = cookstoveFilepath.dbPath;

      }

      if (cookstove_areaFilepath.dbPath !== undefined) {
        fileUpdates.photo_path_cook_stove_area = cookstove_areaFilepath.dbPath;

      }

  

      await this.auditRepo.updateAudits(aid, udto, fileUpdates, userId);

      await Promise.all(
        oldFilesToDelete.map(async (oldPath) => {
          const cleanPath = path.resolve(oldPath.replace(/^\/+/, ''));
          if (fs.existsSync(cleanPath)) {
            await fs.promises.unlink(cleanPath);
          }
        })
      );

      return { message: "Monitoring updated successfully" };

    }
    catch (error) {
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


  async getMonitorings(
    page: number,
    limit: number,
    filters: any[] = [],
  ) {

    try {
      if (page < 1) page = 1;
      if (limit < 1) limit = 10;

      // 🔑 MAP FILTERS HERE
      const validatedFilters = filters.map((f) => {
        const schema = AUDIT_FILTER_SCHEMA[f.field];

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
          ? await this.auditRepo.getFilteredCount(validatedFilters)
          : await this.auditRepo.getTotalCount();

      const totalPages = Math.ceil(totalRecords / limit);

      const data =
        validatedFilters.length > 0
          ? await this.auditRepo.findWithFilters(validatedFilters, page, limit)
          : await this.auditRepo.findAll(page, limit);

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
      console.error("getMonitorings error is", error);
      if (error instanceof HttpException) {
        throw error; // keep original error
      }

      throw new InternalServerErrorException("Failed to Delete monitorings");
    }

  }


  async deleteAudit(aid: number) {
    try {
      if (!aid) {
        throw new BadRequestException("Audit id is missing");
      }

      const result = await this.auditRepo.deleteAuditId(aid);

      // If no rows were deleted
      if (!result || result.affectedRows === 0) {
        throw new BadRequestException("Audit not found or already deleted");
      }

      const folderPath = path.join(
        process.cwd(),
        "uploads",
        "audit",
        String(aid)
      );

      if (fs.existsSync(folderPath)) {
        await fs.promises.rm(folderPath, { recursive: true, force: true });//rmSync means remove
      }

      return { message: "Audits deleted successfully" };
    }
    catch (error) {
      console.error("Delete Audit Error is", error)
      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException("Failed to Delete Audti");

    }
  }


  async syncAudits(
    dto: CreateAuditDto,
    cookstoveFile: Express.Multer.File | undefined,
    cookstoveareaFile: Express.Multer.File | undefined,
    userId: number,
  ) {
    try {

      if (dto.audit_id) {


        await this.updateAudit(
          dto,                  // UpdateBeneficiaryDto fields
          cookstoveFile,
          cookstoveareaFile,
          dto.audit_id,
          userId,
        );

        return {
          success: true,
          action: 'updated',
          audit_id: dto.audit_id,
          message: 'Audit updated successfully',
        };
      }

      // CREATE — no beneficiary_id

      const result = await this.CreateAuditing(
        dto,
        cookstoveFile,
        cookstoveareaFile,
        userId,
      );

      return {
        success: true,
        action: 'created',
        message: 'Audit created successfully',
      };

    } catch (error) {
      Sentry.captureException(error);
      console.error('syncBeneficiary error', error);
      throw new InternalServerErrorException('Failed to sync beneficiary');
    }
  }


  async getupdateData(dates: Date) {
    try {

      console.log("Input date (raw):", dates);
      console.log("ISO format:", dates.toISOString());
      console.log("Locale string:", dates.toString());

      const record = await this.auditRepo.getUpdatedDataByDate(dates);

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


}

/* eslint-disable prettier/prettier */
import { BadRequestException, HttpException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { AuditRepository } from './repository/audit.repository/audit.repository';
import { TrainingSiteRepositoryService } from 'src/training_site/training_site.repository/training_site.repository.service';
import { DatabaseService } from 'src/database/database.service';
import { CreateAuditDto } from './createAudit.dto';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuid } from 'uuid';
import { AUDIT_FILTER_SCHEMA } from './audit.filter.schema';


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

    const fileName = `${prefix}_${AuditId}_${uuid()}${path.extname(file.originalname)}`;
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

    const connection = await this.db.getConnection();
    await connection.beginTransaction();

    let auditFolderPath: string | null = null;



    try {

      const user = await this.trainingSiteRepo.getUserById(userId);
      const username = user.name;

      const Audit = await this.auditRepo.insertDataAudit(dto, username, connection);

      if (!Audit) {
        throw new Error('Failed to create Audit');
      }

      const AuditId = Audit.insertId;

      // create folder once
      auditFolderPath = `uploads/audit/${AuditId}`;

      fs.mkdirSync(auditFolderPath, { recursive: true });

      // save files using helper
      const cookstoveFilesPath = await this.saveAuditFile(
        cookstoveFile,
        AuditId,
        "cookstove",
        auditFolderPath
      );

      const cookstoveAreaFilesPath = await this.saveAuditFile(
        cookstoveareaFile,
        AuditId,
        "cookstove_area",
        auditFolderPath
      );

      await this.auditRepo.updateFilesPath(
        AuditId,
        {
          photo_path_cook_stove: cookstoveFilesPath.dbPath,
          // national_id_timestamp: cookstoveFilesPath.dbPath ? new Date() : null,

          photo_path_cook_stove_area: cookstoveAreaFilesPath.dbPath,
          // signature_timestamp: cookstoveAreaFilesPath.dbPath ? new Date() : null,
        },
        connection
      );

      await connection.commit();

      return { message: "Audits Created Successfully" };

    } catch (error) {

      await connection.rollback();

      // delete entire folder
      if (auditFolderPath && fs.existsSync(auditFolderPath)) {
        fs.rmSync(auditFolderPath, { recursive: true, force: true });
      }

      throw error;

    } finally {
      connection.release();
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
}

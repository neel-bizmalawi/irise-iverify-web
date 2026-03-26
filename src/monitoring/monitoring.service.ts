/* eslint-disable prettier/prettier */
import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { MonitoringRepositoryService } from './monitoring.repository/monitoring.repository/monitoring.repository.service';
import { CreateMonitoringDto } from './createmonitoring.dto';
import { TrainingSiteRepositoryService } from 'src/training_site/training_site.repository/training_site.repository.service';
import { DatabaseService } from 'src/database/database.service';
import * as fs from 'fs';
import * as path from 'path';
// import { v4 as uuid } from 'uuid';
import { v4 as uuidv4 } from 'uuid';
import * as Sentry from '@sentry/node';


import { MONITORING_FILTER_SCHEMA } from './monitoring.filter.schema';
import { UpdateMonitoringdto } from './updatemonitoring.dto';


@Injectable()
export class MonitoringService {

    constructor(private readonly monitorServiceRepo: MonitoringRepositoryService, private readonly trainingSiteRepo: TrainingSiteRepositoryService, private readonly db: DatabaseService) {

    }

    private async saveMonitoringFile(
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

    async CreateMonitoring(dto: CreateMonitoringDto, cookstove_photo: Express.Multer.File | undefined,
        userId: number) {



        let MoniToringFolderPath: string | null = null;


        try {

            const timezone = await this.monitorServiceRepo.getUserTimezone(userId);


            const monitoring = await this.monitorServiceRepo.insertMonitoring(dto, userId, timezone);


            if (!monitoring) {
                throw new Error('Failed to create Monitoring');
            }

            const monitoringId = monitoring.insertId;



            // create folder once
            MoniToringFolderPath = `uploads/monitoring/${monitoringId}`;

            // fs.mkdirSync(MoniToringFolderPath, { recursive: true });
            await fs.promises.mkdir(MoniToringFolderPath, { recursive: true });


            // save files using helper
            const monitoringIdFile = await this.saveMonitoringFile(
                cookstove_photo,
                monitoringId,
                "Monitoring_cookstove",
                MoniToringFolderPath
            );

            await this.monitorServiceRepo.updateFilesPath(
                monitoringId,
                {
                    photo_path: monitoringIdFile.dbPath,

                },
            );


            return { message: "Monitoring site created successfully" };

        }
        catch (error) {
            console.error("error is ", error)
            
            // delete entire folder
            if (MoniToringFolderPath && fs.existsSync(MoniToringFolderPath)) {
                fs.rmSync(MoniToringFolderPath, { recursive: true, force: true });
            }

            throw error;

        }
    }


    private async replaceBeneficiaryFile(
        file: Express.Multer.File | undefined,
        monitoringId: number,
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
            const fileName = `${prefix}_${monitoringId}_${uuidv4()}${path.extname(file.originalname)}`;
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

    async UpdateMonitoring(udto: UpdateMonitoringdto, cookstove_photo: Express.Multer.File | undefined,
        mid: number,
        userId: number) {

        let uploadedFiles: string[] = [];      // new files written
        let oldFilesToDelete: string[] = [];   // old files to delete after DB 

        try {

            const exisitingMonitoring = await this.monitorServiceRepo.getMonitoringById(mid);

            if (!exisitingMonitoring) {
                throw new BadRequestException("Monitoring not found");
            }


            const folderPath = `uploads/monitoring/${mid}`;
            await fs.promises.mkdir(folderPath, { recursive: true });




            // save files using helper
            const monitoringIdFile = await this.replaceBeneficiaryFile(
                cookstove_photo,
                mid,
                "Monitoring_cookstove",
                folderPath,
                exisitingMonitoring?.photo_path,
                udto.remove_cookstove_img
            );


            // track new uploaded files for rollback if DB fails
            [monitoringIdFile.filePath]
                .forEach(p => { if (p) uploadedFiles.push(p); });

            // track old files to delete after DB succeeds
            [monitoringIdFile.oldFileToDelete]
                .forEach(p => { if (p) oldFilesToDelete.push(p); });

            const fileUpdates: any = {};

            if (monitoringIdFile.dbPath !== undefined) {
                fileUpdates.photo_path = monitoringIdFile.dbPath;

            }

            await this.monitorServiceRepo.updateMonitoring(mid, udto, fileUpdates, userId);

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
                const schema = MONITORING_FILTER_SCHEMA[f.field];

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
                    ? await this.monitorServiceRepo.getFilteredCount(validatedFilters)
                    : await this.monitorServiceRepo.getTotalCount();

            const totalPages = Math.ceil(totalRecords / limit);

            const data =
                validatedFilters.length > 0
                    ? await this.monitorServiceRepo.findWithFilters(validatedFilters, page, limit)
                    : await this.monitorServiceRepo.findAll(page, limit);

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
            console.error("getMonitorings error is", error)
            throw new InternalServerErrorException("failed to get monitoring data")
        }
    }




    async deleteMonitroing(mid: number) {

        try {
            if (!mid) {
                throw new BadRequestException("Monitoring id is missing");
            }

            const result = await this.monitorServiceRepo.deleteMonitoringbyId(mid);

            // If no rows were deleted
            if (!result || result.affectedRows === 0) {
                throw new BadRequestException("Beneficiary not found or already deleted");
            }

            const folderPath = path.join(
                process.cwd(),
                "uploads",
                "monitoring",
                String(mid)
            );

            if (fs.existsSync(folderPath)) {
                await fs.promises.rm(folderPath, { recursive: true, force: true });//rmSync means remove
            }

            return { message: "Monitorings deleted successfully" };
        }
        catch (error) {
            console.error("delete monitoring error", error);
            throw error;
        }
    }



    async syncMonitorings(
        dto: CreateMonitoringDto,
        cookstove_pic: Express.Multer.File | undefined,
        userId: number,
    ) {
        try {

            if (dto.monitoring_id) {


                await this.UpdateMonitoring(
                    dto,                  // UpdateBeneficiaryDto fields
                    cookstove_pic,
                    dto.monitoring_id,
                    userId,
                );

                return {
                    success: true,
                    action: 'updated',
                    monitoring_id: dto.monitoring_id,
                    message: 'Monitoring updated successfully',
                };
            }

            // CREATE — no beneficiary_id
            console.log(`Syncing create for new beneficiary`);

            const result = await this.CreateMonitoring(
                dto,
                cookstove_pic,
                userId,
            );

            return {
                success: true,
                action: 'created',
                message: 'Monitoring created successfully',
            };

        } catch (error) {
            Sentry.captureException(error);
            console.error('syncBeneficiary error', error);
            throw new InternalServerErrorException('Failed to sync beneficiary');
        }
    }
}

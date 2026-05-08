/* eslint-disable prettier/prettier */
import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
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
import { DateTime } from 'luxon';


@Injectable()
export class MonitoringService {

    constructor(private readonly monitorServiceRepo: MonitoringRepositoryService, private readonly trainingSiteRepo: TrainingSiteRepositoryService, private readonly db: DatabaseService) {

    }


    private formatCreateDate(date: any, timezone: string): string | null {
        if (!date) return null;

        return (typeof date === 'string'
            ? DateTime.fromISO(date)
            : DateTime.fromJSDate(date)
        )
            .setZone(timezone)
            .toFormat("yyyy-MM-dd HH:mm:ss");
    }

    private formatDateForDB(date: any): string | null {
        if (!date) return null;

        return (typeof date === 'string'
            ? DateTime.fromISO(date)
            : DateTime.fromJSDate(date)
        )
            .toUTC()
            .toFormat("yyyy-MM-dd HH:mm:ss");
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

    private processMonitoringChanges(dto: CreateMonitoringDto, beneficiary: any) {
        const EPSILON = 0.000001;

        console.log("beneficiary is", beneficiary)
        const result = {
            isDeviceChanged: false,
            isLatChanged: false,
            isLongChanged: false,
            updatePayload: {} as any,
        };

        const oldDeviceSerial = beneficiary.device_serial_no;
        const oldLat = beneficiary.latitude;
        const oldLong = beneficiary.longitude;



        // 🔹 DEVICE SERIAL
        if (dto.new_device_serial_no !== undefined) {
            dto.device_serial_no = oldDeviceSerial;

            if (dto.new_device_serial_no !== oldDeviceSerial && dto.new_device_serial_no.trim() !== '') {
                result.isDeviceChanged = true;
                result.updatePayload.device_serial_number = dto.new_device_serial_no;
            } else {
                dto.new_device_serial_no = undefined;
            }
        }

        // 🔹 LATITUDE
        if (dto.new_gps_lat !== undefined) {
            dto.old_gps_lat = oldLat;

            if (Math.abs(dto.new_gps_lat - oldLat) > EPSILON) {
                result.isLatChanged = true;
                result.updatePayload.latitude = dto.new_gps_lat;
            } else {
                dto.new_gps_lat = undefined;
            }
        }

        // 🔹 LONGITUDE
        if (dto.new_gps_lng !== undefined) {
            dto.old_gps_lng = oldLong;

            if (Math.abs(dto.new_gps_lng - oldLong) > EPSILON) {
                result.isLongChanged = true;
                result.updatePayload.longitude = dto.new_gps_lng;
            } else {
                dto.new_gps_lng = undefined;
            }
        }

        return {
            ...result,
            isAnyChanged:
                result.isDeviceChanged ||
                result.isLatChanged ||
                result.isLongChanged,
        };
    }

    private processMonitoringChangesUpdate(udto: UpdateMonitoringdto, beneficiary: any) {
        const EPSILON = 0.000001;

        const result = {
            isDeviceChanged: false,
            isLatChanged: false,
            isLongChanged: false,
            updatePayload: {} as any,
        };

        const oldDeviceSerial = beneficiary.device_serial_no;
        const oldLat = beneficiary.latitude;
        const oldLong = beneficiary.longitude;

        console.log(oldDeviceSerial);
        console.log(oldLat);
        console.log(oldLong);

        // 🔹 DEVICE SERIAL
        if (udto.new_device_serial_no !== undefined) {

            if (udto.new_device_serial_no !== oldDeviceSerial && udto.new_device_serial_no.trim() !== '') {
                result.isDeviceChanged = true;
                result.updatePayload.device_serial_number = udto.new_device_serial_no;
                udto.device_serial_no = oldDeviceSerial;

            } else {
                udto.new_device_serial_no = undefined;
            }
        }

        // 🔹 LATITUDE
        if (udto.new_gps_lat !== undefined) {

            if (Math.abs(udto.new_gps_lat - oldLat) > EPSILON) {
                result.isLatChanged = true;
                result.updatePayload.latitude = udto.new_gps_lat;
                udto.old_gps_lat = oldLat;

            } else {
                udto.new_gps_lat = undefined;
            }
        }

        // 🔹 LONGITUDE
        if (udto.new_gps_lng !== undefined) {

            if (Math.abs(udto.new_gps_lng - oldLong) > EPSILON) {
                result.isLongChanged = true;
                result.updatePayload.longitude = udto.new_gps_lng;
                udto.old_gps_lng = oldLong;

            } else {
                udto.new_gps_lng = undefined;
            }
        }

        return {
            ...result,
            isAnyChanged:
                result.isDeviceChanged ||
                result.isLatChanged ||
                result.isLongChanged,
        };
    }

    async CreateMonitoring(dto: CreateMonitoringDto, cookstove_photo: Express.Multer.File | undefined,
        userId: number) {


        let MoniToringFolderPath: string | null = null;
        let monitoringId: number | null = null;


        try {

            const timezone = await this.monitorServiceRepo.getUserTimezone(userId);



            const beneficiary = await this.monitorServiceRepo.getBeneficiaryById(
                dto.beneficiary_id
            );

            if (!beneficiary) {
                throw new NotFoundException("Beneficiary not found");
            }

            if (beneficiary.status !== null && beneficiary.status !== 'active') {
                throw new NotFoundException("Beneficiary not found");
            }

            const { isAnyChanged, updatePayload } =
                this.processMonitoringChanges(dto, beneficiary);

            const preparedDto = { ...dto };

            if (preparedDto.beneficiary_id) {
                preparedDto.user_id = preparedDto.beneficiary_id;
            }

            if (preparedDto.created_date) {
                preparedDto.created_date = this.formatCreateDate(preparedDto.created_date, timezone);
            } else {
                preparedDto.created_date = DateTime.now()
                    .setZone(timezone)
                    .toFormat("yyyy-MM-dd HH:mm:ss");
            }

            const DATE_FIELDS: (keyof CreateMonitoringDto)[] = ['visit_at'];

            DATE_FIELDS.forEach(field => {
                if (preparedDto[field]) {
                    preparedDto[field] = this.formatDateForDB(preparedDto[field] as any);
                }
            });

            let modified_date: string;

            if (dto.modified_date) {
                const raw = dto.modified_date;
                modified_date = (typeof raw === 'string'
                    ? DateTime.fromISO(raw)
                    : DateTime.fromJSDate(raw as Date)
                )
                    .toUTC()
                    .toFormat("yyyy-MM-dd HH:mm:ss");
            } else {
                modified_date = DateTime.utc().toFormat("yyyy-MM-dd HH:mm:ss");
            }

            const server_time = DateTime.utc().toFormat("yyyy-MM-dd HH:mm:ss");

            console.log("updated payload is", updatePayload);

            const monitoring = await this.db.transaction(async (conn) => {
                const result = await this.monitorServiceRepo.insertMonitoring(preparedDto, userId, conn);

                if (!result) throw new Error("Failed to create monitoring");

                if (isAnyChanged && Object.keys(updatePayload).length > 0) {
                    await this.monitorServiceRepo.updateBeneficiaryDeviceAndLocationCreate(
                        dto.beneficiary_id,
                        {
                            ...updatePayload,
                            modified_date,
                            server_time
                        },
                        userId,
                        conn
                    );
                }
                return result;
            })

            monitoringId = monitoring?.[0]?.insertId;
            if (!monitoringId) {
                throw new Error("Failed to retrieve monitoring ID");
            }



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



            return { message: "Monitoring site created successfully" ,
                monitoring_id:monitoringId
            };

        }
        catch (error) {

            Sentry.captureException(error);

            // delete entire folder
            if (MoniToringFolderPath && fs.existsSync(MoniToringFolderPath)) {
                // fs.rmSync(MoniToringFolderPath, { recursive: true, force: true });
                await fs.promises.rm(MoniToringFolderPath, { recursive: true, force: true });
            }

            if (monitoringId) {
                await this.monitorServiceRepo.deleteMonitoringbyId(monitoringId)
                    .catch((e) => console.error("Failed to clean up monitoring row:", e));
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

            const beneficiary = await this.monitorServiceRepo.getBeneficiaryById(
                udto.beneficiary_id
            );

            if (!exisitingMonitoring) {
                throw new BadRequestException("Monitoring not found");
            }

            const { isAnyChanged, updatePayload } =
                this.processMonitoringChangesUpdate(udto, beneficiary);

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

            let modified_date: string;

            if (udto.modified_date) {
                const raw = udto.modified_date;
                modified_date = (typeof raw === 'string'
                    ? DateTime.fromISO(raw)
                    : DateTime.fromJSDate(raw as Date)
                )
                    .toUTC()
                    .toFormat("yyyy-MM-dd HH:mm:ss");
            } else {
                modified_date = DateTime.utc().toFormat("yyyy-MM-dd HH:mm:ss");
            }

            const server_time = DateTime.utc().toFormat("yyyy-MM-dd HH:mm:ss");



            const monitoring = await this.db.transaction(async (conn) => {
                const result = await this.monitorServiceRepo.updateMonitoring(mid, { ...udto, modified_date, server_time }, fileUpdates, userId, conn);

                if (!result) throw new Error("Failed to update monitoring");

                if (isAnyChanged && Object.keys(updatePayload).length > 0) {
                    await this.monitorServiceRepo.updateBeneficiaryDeviceAndLocationCreate(
                        udto.beneficiary_id,
                        {
                            ...updatePayload,
                            modified_date,
                            server_time
                        },
                        userId,
                        conn
                    );
                }
                return result;
            })

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

            console.error("updateBeneficiary error", error);
            Sentry.captureException(error);


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
            Sentry.captureException(error);

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
            Sentry.captureException(error);

            console.error("delete monitoring error", error);
            throw error;
        }
    }

    async setStausMonitoring(mid: number) {

        try {
            if (!mid) {
                throw new BadRequestException("Monitoring id is missing");
            }

            const result = await this.monitorServiceRepo.setStatusbyId(mid);

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
            Sentry.captureException(error);

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
                monitoring_id:result.monitoring_id
            };

        } catch (error) {
            Sentry.captureException(error);

            console.error('syncBeneficiary error', error);
            throw error
        }
    }



    async getupdateData(dates: Date) {
        try {

            console.log("Input date (raw):", dates);
            console.log("ISO format:", dates.toISOString());
            console.log("Locale string:", dates.toString());

            const record = await this.monitorServiceRepo.getUpdatedDataByDate(dates);

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
}

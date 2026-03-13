/* eslint-disable prettier/prettier */
import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { MonitoringRepositoryService } from './monitoring.repository/monitoring.repository/monitoring.repository.service';
import { CreateMonitoringDto } from './createmonitoring.dto';
import { TrainingSiteRepositoryService } from 'src/training_site/training_site.repository/training_site.repository.service';
import { DatabaseService } from 'src/database/database.service';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuid } from 'uuid';
import { MONITORING_FILTER_SCHEMA } from './monitoring.filter.schema';


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


        const fileName = `${prefix}_${beneficiaryId}_${uuid()}${path.extname(file.originalname)}`;
        const filePath = path.join(folderPath, fileName);
        const dbPath = `/${folderPath}/${fileName}`;

        await fs.promises.writeFile(filePath, file.buffer);

        return { dbPath, filePath };
    }

    async CreateMonitoring(dto: CreateMonitoringDto, cookstove_photo: Express.Multer.File | undefined,
        userId: number) {

        const connection = await this.db.getConnection();
        await connection.beginTransaction();

        let MoniToringFolderPath: string | null = null;


        try {

            const user = await this.trainingSiteRepo.getUserById(userId);

            const username = user.name;

            const monitoring = await this.monitorServiceRepo.insertMonitoring(dto, username, connection);


            if (!monitoring) {
                throw new Error('Failed to create Monitoring');
            }

            const monitoringId = monitoring.insertId;



            // create folder once
            MoniToringFolderPath = `uploads/monitoring/${monitoringId}`;

            fs.mkdirSync(MoniToringFolderPath, { recursive: true });

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
                connection
            );

            await connection.commit();

            return { message: "Monitoring site created successfully" };

        }
     catch (error) {
        console.error("error is ",error)
     
           await connection.rollback();
     
           // delete entire folder
           if (MoniToringFolderPath && fs.existsSync(MoniToringFolderPath)) {
             fs.rmSync(MoniToringFolderPath, { recursive: true, force: true });
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
            try{
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
        catch(error)
        {
            console.error("getMonitorings error is",error)
            throw new InternalServerErrorException("failed to get monitoring data")
        }
        }




         async deleteMonitroing(mid: number) {
        
            try{
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
        catch(error){
            console.error("delete monitoring error",error);
            throw error;
        }
          }
}

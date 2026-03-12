/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { ConflictException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { OPERATOR_SQL } from 'src/filters/operator.map';
import { CreateMonitoringDto } from 'src/monitoring/createmonitoring.dto';

@Injectable()
export class MonitoringRepositoryService {

    constructor(private readonly db: DatabaseService) {

    }

    async insertMonitoring(
        data: CreateMonitoringDto,
        username: string,
        connection
    ) {
        try {

            const payload = {
                ...data,
                created_by: username
            };


            // convert undefined → null
            Object.keys(payload).forEach(key => {
                if (payload[key] === undefined) {
                    payload[key] = null;
                }
            });

            const columns = Object.keys(payload).join(", ");
            const placeholders = Object.keys(payload).map(() => "?").join(", ");
            const values = Object.values(payload);

            const [result] = await connection.query(
                `INSERT INTO monitoring_data (${columns}) VALUES (${placeholders})`,
                values
            );



            return result;

        } catch (error: any) {

            console.error("❌ insertBeneficiary DB error:", error);

            if (error.code === "ER_DUP_ENTRY") {

                throw new ConflictException("Duplicate value detected");
            }

            if (error.code === "ER_NO_REFERENCED_ROW_2") {
                throw new ConflictException("Invalid foreign key reference");
            }

            throw new InternalServerErrorException(
                "Failed to create beneficiary"
            );
        }
    }



    async updateFilesPath(monitoringId: number, files: any, connection) {
        try {
            const fields: string[] = [];
            const values: any[] = [];

            Object.keys(files).forEach((key) => {
                if (files[key] !== undefined) {
                    fields.push(`${key} = ?`);
                    values.push(files[key]);
                }
            });

            if (fields.length === 0) {
                return;
            }

            const sql = `
      UPDATE monitoring_data
      SET ${fields.join(', ')}
      WHERE monitoring_id = ?
    `;

            values.push(monitoringId);

            const [result] = await connection.query(sql, values);

            return result;

        } catch (error) {

            console.error("UpdateFilepath error", error);

            throw new InternalServerErrorException(
                'Failed to update beneficiary file paths'
            );
        }
    }


    async getFilteredCount(filters: any[]) {
        const where: string[] = [];
        const values: any[] = [];

        filters.forEach((f) => {
            let value = f.value;

            // EMPTY
            if (f.operator === 'isEmpty') {
                where.push(`(${f.column} IS NULL OR ${f.column} = '')`);
                return;
            }

            // NOT EMPTY
            if (f.operator === 'is_not_empty') {
                where.push(`(${f.column} IS NOT NULL AND ${f.column} != '')`);
                return;
            }

            // DATE
            if (f.type === 'date') {
                const startOfDay = `${f.value} 00:00:00`;
                const endOfDay = `${f.value} 23:59:59`;

                if (f.operator === 'equals') {
                    where.push(`(${f.column} BETWEEN ? AND ?)`);
                    values.push(startOfDay, endOfDay);
                    return;
                }

                if (f.operator === 'before') {
                    where.push(`${f.column} < ?`);
                    values.push(startOfDay);
                    return;
                }

                if (f.operator === 'after') {
                    where.push(`${f.column} > ?`);
                    values.push(endOfDay);
                    return;
                }
            }

            // LIKE
            if (f.operator === 'contains') value = `%${value}%`;
            if (f.operator === 'starts_with') value = `${value}%`;
            if (f.operator === 'ends_with') value = `%${value}`;

            if (f.type === 'number') value = Number(value);

            where.push(`${f.column} ${OPERATOR_SQL[f.operator]} ?`);
            values.push(value);
        });

        const sql = `
            SELECT COUNT(*) as total
            FROM monitoring_data md
            ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
          `;

        const [[result]] = await this.db.query(sql, values);
        return result.total;
    }

    async getTotalCount(): Promise<number> {
        const [rows]: any = await this.db.query('select count(*) as total from monitoring_data',);
        return rows[0].total;
    }


    async findWithFilters(filters: any[], page: number, limit: number) {
        const where: string[] = [];
        const values: any[] = [];

        filters.forEach((f) => {
            let value = f.value;

            if (f.operator === 'isEmpty') {
                where.push(`(${f.column} IS NULL OR ${f.column} = '')`);
                return;
            }

            if (f.operator === 'is_not_empty') {
                where.push(`(${f.column} IS NOT NULL AND ${f.column} != '')`);
                return;
            }

            if (f.type === 'date') {
                const startOfDay = `${f.value} 00:00:00`;
                const endOfDay = `${f.value} 23:59:59`;

                if (f.operator === 'equals') {
                    where.push(`(${f.column} BETWEEN ? AND ?)`);
                    values.push(startOfDay, endOfDay);
                    return;
                }

                if (f.operator === 'before') {
                    where.push(`${f.column} < ?`);
                    values.push(startOfDay);
                    return;
                }

                if (f.operator === 'after') {
                    where.push(`${f.column} > ?`);
                    values.push(endOfDay);
                    return;
                }
            }

            if (f.operator === 'contains') value = `%${value}%`;
            if (f.operator === 'starts_with') value = `${value}%`;
            if (f.operator === 'ends_with') value = `%${value}`;
            if (f.type === 'number') value = Number(value);

            where.push(`${f.column} ${OPERATOR_SQL[f.operator]} ?`);
            values.push(value);
        });

        const safeLimit = Math.max(1, Number(limit));
        const safeOffset = Math.max(0, Number((page - 1) * limit));

        const sql = `
            SELECT md.*
            FROM monitoring_data md
            ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
            ORDER BY md.monitoring_id DESC
            LIMIT ${safeLimit} OFFSET ${safeOffset}
          `;

        const [rows] = await this.db.query(sql, values);
        return rows;
    }


    async findAll(page: number, limit: number) {
        const safeLimit = Number(limit);
        const safeOffset = Number((page - 1) * limit);

        if (isNaN(safeLimit) || isNaN(safeOffset)) {
            throw new Error('Invalid pagination parameters');
        }

        const sql = `
  SELECT *
  FROM monitoring_data
  ORDER BY monitoring_id DESC
  LIMIT ${safeLimit} OFFSET ${safeOffset}
`;

        const [rows] = await this.db.query(sql);
        return rows;
    }

     async deleteMonitoringbyId(mid: number) {
    const [rows] = await this.db.query(
      'delete FROM monitoring_data WHERE monitoring_id = ? LIMIT 1',
      [mid]
    );
    return rows;
  }

}

/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { ConflictException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { OPERATOR_SQL } from 'src/filters/operator.map';
import { CreateMonitoringDto } from 'src/monitoring/createmonitoring.dto';
import * as Sentry from '@sentry/node';
import { DateTime } from 'luxon';

@Injectable()
export class MonitoringRepositoryService {

    constructor(private readonly db: DatabaseService) {

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




    async getUserTimezone(userId: number): Promise<string> {
        const result: any = await this.db.query(
            `SELECT timezone FROM ab_admin WHERE adminID = ? LIMIT 1`,
            [userId]
        );
        return result?.[0]?.timezone || 'UTC';
    }

    async getMonitoringById(mid: number) {
        try {
            const rows = await this.db.query(
                'SELECT * FROM monitoring_data WHERE monitoring_id = ? LIMIT 1',
                [mid]
            );
            return rows[0];
        }
        catch (error) {
            Sentry.captureException(error);
            console.error("getBeneficiaryById error", error)
        }
    }


    async insertMonitoring(
        data: CreateMonitoringDto,
        userId: number,
        timezone: string,
    ) {
        try {

            const payload: any = {
                ...data,
                created_by: userId
            };

            if (payload.created_date) {
                payload.created_date = this.formatCreateDate(payload.created_date, timezone);

            }
            else {
                payload.created_date = DateTime.now()
                    .setZone(timezone)
                    .toFormat("yyyy-MM-dd HH:mm:ss");
            }

            delete payload.remove_cookstove_img;

            // convert undefined → null
            Object.keys(payload).forEach(key => {
                if (payload[key] === undefined) {
                    payload[key] = null;
                }
            });

            const columns = Object.keys(payload).join(", ");
            const placeholders = Object.keys(payload).map(() => "?").join(", ");
            const values = Object.values(payload);

            const result = await this.db.query(
                `INSERT INTO monitoring_data (${columns}) VALUES (${placeholders})`,
                values
            );



            return result;

        } catch (error: any) {

            console.error("❌ insertMonitroing DB error:", error);


            if (error.code === "ER_NO_REFERENCED_ROW_2") {
                throw new ConflictException("Invalid foreign key reference");
            }

            throw new InternalServerErrorException(
                "Failed to create monitoring"
            );
        }
    }



    async updateFilesPath(monitoringId: number, files: any) {
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

            const result = await this.db.query(sql, values);

            return result;

        } catch (error) {

            console.error("UpdateFilepath error", error);

            throw new InternalServerErrorException(
                'Failed to update beneficiary file paths'
            );
        }
    }


    async updateMonitoring(
        monitoringId: number,
        dto: any,
        filePaths: any,
        userid: number,
    ) {

        // merge dto + file paths
        try {

            const updateData = {
                ...dto,
                ...filePaths,
            };

            // ❗ remove flags (not DB columns)
            delete updateData.remove_cookstove_img;

            console.log("updated Data is", updateData);

            // remove undefined
            const filteredData = Object.fromEntries(
                Object.entries(updateData).filter(([_, value]) => value !== undefined),
            );

            let modified_date: string;
            if (filteredData.modified_date) {
                const raw = filteredData.modified_date;
                modified_date = (typeof raw === 'string'
                    ? DateTime.fromISO(raw)
                    : DateTime.fromJSDate(raw as Date)
                )
                    .toUTC()                           // ✅ convert to UTC
                    .toFormat("yyyy-MM-dd HH:mm:ss"); // ✅ MySQL format
            } else {
                // No modified_date sent → generate fresh in UTC
                modified_date = DateTime.utc()
                    .toFormat("yyyy-MM-dd HH:mm:ss"); // ✅ current UTC time
            }

            console.log(`modified_date (UTC): ${modified_date}`);

            const { modified_date: _, ...restDto } = filteredData;



            const fields = Object.keys(restDto);

            if (!fields.length && !modified_date) {
                return { message: 'Nothing to update' };
            }

            let setClause = fields.map((f) => `${f} = ?`).join(', ');
            const values = Object.values(restDto);

            // 7. Always set modified_date (local timezone, not NOW())
            setClause += `${setClause ? ', ' : ''}modified_date = ?`;
            values.push(modified_date);

            // 8. Always set modified_by
            setClause += `, modified_by = ?`;
            values.push(userid);


            const sql = `
        UPDATE monitoring_data
        SET ${setClause}
        WHERE monitoring_id = ?
      `;

            await this.db.query(sql, [...values, monitoringId]);

            return { message: 'Monitoring updated successfully' };

        }
        catch (error) {
            Sentry.captureException(error);

            console.error("updateMonitoring error is", error)


            if (error.code === "ER_NO_REFERENCED_ROW_2") {
                throw new ConflictException("Invalid foreign key reference");
            }

            throw new InternalServerErrorException(
                "Failed to modify Monitoring"
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
            LEFT JOIN ab_admin a ON md.created_by = a.adminID
            LEFT JOIN ab_admin a2 ON md.modified_by = a2.adminID
            ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
          `;

        const result = await this.db.query(sql, values);
        return result[0]?.total ?? 0;
    }

    async getTotalCount(): Promise<number> {
        const rows: any = await this.db.query('select count(*) as total from monitoring_data',);
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
            SELECT md.*,
            a.name AS created_by_name,
            a2.name AS modified_by_name
            FROM monitoring_data md
            LEFT JOIN ab_admin a ON md.created_by = a.adminID
            LEFT JOIN ab_admin a2 ON md.modified_by = a2.adminID
            ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
            ORDER BY md.monitoring_id DESC
            LIMIT ${safeLimit} OFFSET ${safeOffset}
          `;

        const rows = await this.db.query(sql, values);
        return rows;
    }


    async findAll(page: number, limit: number) {
        const safeLimit = Number(limit);
        const safeOffset = Number((page - 1) * limit);

        if (isNaN(safeLimit) || isNaN(safeOffset)) {
            throw new Error('Invalid pagination parameters');
        }

        const sql = `
  SELECT
  md.*,
  a.name AS created_by_name,
  a2.name AS modified_by_name
  FROM monitoring_data md
 LEFT JOIN ab_admin a ON md.created_by = a.adminID
 LEFT JOIN ab_admin a2 ON md.modified_by = a2.adminID
  ORDER BY monitoring_id DESC
  LIMIT ${safeLimit} OFFSET ${safeOffset}
`;

        const rows = await this.db.query(sql);
        return rows;
    }

    async deleteMonitoringbyId(mid: number) {
        try {
            const [rows] = await this.db.query(
                'delete FROM monitoring_data WHERE monitoring_id = ? LIMIT 1',
                [mid]
            );
            return rows;
        }
        catch (error) {
            console.error("delete monitoring repository error", error)
            throw new InternalServerErrorException("failed to delte monitoring in repo");
        }
    }

}

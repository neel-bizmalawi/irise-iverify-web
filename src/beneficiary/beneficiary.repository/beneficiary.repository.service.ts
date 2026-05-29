/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */
import { ConflictException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CreateBeneficiarydto } from '../create-benificiary.dto';
import { OPERATOR_SQL } from 'src/filters/operator.map';
import { UpdateBeneficiaryDto } from '../update-beneficiary-site-dto';
import * as Sentry from '@sentry/node';
import { DateTime } from 'luxon';



@Injectable()
export class BeneficiaryRepositoryService {
  constructor(private readonly db: DatabaseService) { }


  private formatDateForDB(date: any): string | null {
    if (!date) return null;

    return (typeof date === 'string'
      ? DateTime.fromISO(date)
      : DateTime.fromJSDate(date)
    )
      .toUTC()
      .toFormat("yyyy-MM-dd HH:mm:ss");
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

  async insertDataBeneficiary(
    data: CreateBeneficiarydto,
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

      if (payload.distribution_date) {
        payload.distribution_date = this.formatDateForDB(payload.distribution_date);

      }

      // ❗ remove flags (not DB columns)
      delete payload.remove_national_id;
      delete payload.remove_signature;
      delete payload.remove_house_pic;
      delete payload.remove_cookstove_pic;

      //remove timestamps
      delete payload.national_id_timestamp;
      delete payload.signature_timestamp;
      delete payload.house_pic_timestamp;
      delete payload.cookstove_pic_timestamp;


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
        `INSERT INTO beneficiaries (${columns}) VALUES (${placeholders})`,
        values
      );

      return result;

    } catch (error: any) {


      console.error("❌ insertBeneficiary DB error:", error);

      if (error.code === "ER_DUP_ENTRY") {

        const duplicateValue = error.sqlMessage.match(/Duplicate entry '(.+?)'/)?.[1];
        const key = error.sqlMessage.match(/for key '(.+?)'/)?.[1];

        if (key?.includes("nunique")) {
          throw new ConflictException(`National ID ${duplicateValue} already exists`);
        }

        if (key?.includes("dunique")) {
          throw new ConflictException(`Device serial number already exists`);
        }

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

  async updateFilesPath(beneficiaryId: number, files: any) {
    try {

      const sql = `
      UPDATE beneficiaries
      SET 
        national_id_attachment = ?, 
        national_id_timestamp = ?,
        signature = ?,
        signature_timestamp = ?,
        house_pic = ?,
        house_pic_timestamp = ?,
        cookstove_pic = ?,
        cookstove_pic_timestamp = ?
      WHERE beneficiary_id = ?
    `;

      const values = [
        files.national_id_attachment ?? null,
        files.national_id_timestamp ?? null,
        files.signature ?? null,
        files.signature_timestamp ?? null,
        files.house_pic ?? null,
        files.house_pic_timestamp ?? null,
        files.cookstove_pic ?? null,
        files.cookstove_pic_timestamp ?? null,
        beneficiaryId
      ];

      const result = await this.db.query(sql, values);
      return result;

    } catch (error) {
      Sentry.captureException(error);
      console.error("UpdateFilepath error", error);
      throw new InternalServerErrorException('Failed to update beneficiary file paths');
    }
  }


  async getBeneficiaryById(bid: number) {
    try {
      const rows = await this.db.query(
        `SELECT bf.*, tr.training_site AS training_site_name, d.district_name AS district_name
 FROM beneficiaries bf
 LEFT JOIN training_sites tr
 ON tr.training_point_id = bf.training_site
 LEFT JOIN ab_district d
 ON tr.district = d.district_id
 WHERE beneficiary_id = ? LIMIT 1`,
        [bid]
      );
      return rows[0];
    }
    catch (error) {
      Sentry.captureException(error);
      console.error("getBeneficiaryById error", error)
    }
  }


  async getTotalCount(): Promise<number> {
    try {
      const rows: any = await this.db.query(
        `
  SELECT COUNT(*) as total
  FROM beneficiaries
  WHERE (status IS NULL OR status = 'active')
  `
      ); return rows[0].total;
    }
    catch (error) {
      Sentry.captureException(error);

      console.error("getTotalCount error is", error)
      throw error;
    }
  }


  async getMissingNId(): Promise<number> {

    try {
      const rows: any = await this.db.query(
        `
SELECT COUNT(*) AS missingNidCount
FROM beneficiaries
WHERE (national_id IS NULL OR national_id = '')
  AND (status IS NULL OR status = 'active');
  `
      );

      return rows[0].missingNidCount;
    }
    catch (error) {
      Sentry.captureException(error);

      console.error("getMssingNID error is", error)
      throw error;
    }
  }

  async getHouseHoldCounts(): Promise<number> {

    try {
      const rows: any = await this.db.query(
        `
SELECT COUNT(*) AS distributedCount
FROM beneficiaries
WHERE distribution_date IS NOT NULL
  AND (status IS NULL OR status = 'active');
  `
      );

      return rows[0].distributedCount;
    }
    catch (error) {
      Sentry.captureException(error);

      console.error("get total household error is", error)
      throw error;
    }
  }


  async getFilteredCount(filters: any[]) {
    try {
      const where: string[] = [`(bf.status IS NULL OR bf.status = 'active')`];
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
      FROM beneficiaries bf
        LEFT JOIN training_sites tr
ON tr.training_point_id = bf.training_site
      LEFT JOIN ab_admin a ON bf.created_by = a.adminID
      LEFT JOIN ab_admin a2 ON bf.modified_by = a2.adminID
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    `;

      const result = await this.db.query(sql, values);
      return result[0]?.total ?? 0;
    }
    catch (error) {
      Sentry.captureException(error);

      console.error("getFilteredCount is", error)
    }
  }


  async findWithFilters(filters: any[], page: number, limit: number) {
    try {
      const where: string[] = [`(bf.status IS NULL OR bf.status = 'active')`];
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
        SELECT bf.*,
         bf.training_site AS training_site_id,
         tr.training_site AS training_site,
         CASE
          WHEN CAST(bf.latitude AS CHAR) REGEXP '^-?[0-9]+(\\.[0-9]+)?$'
          AND CAST(bf.latitude AS DOUBLE) BETWEEN -90 AND 90
          THEN CAST(bf.latitude AS DOUBLE)
          ELSE NULL
         END AS latitude,
         CASE
          WHEN CAST(bf.longitude AS CHAR) REGEXP '^-?[0-9]+(\\.[0-9]+)?$'
          AND CAST(bf.longitude AS DOUBLE) BETWEEN -180 AND 180
          THEN CAST(bf.longitude AS DOUBLE)
          ELSE NULL
         END AS longitude,
         cb.customer_id AS adminID,
         cb.customer_id AS customer_id,
         tr.training_site AS training_site_name,
         d.district_name AS district_name,
      a.name AS created_by_name,
        a2.name AS modified_by_name
        FROM beneficiaries bf
        LEFT JOIN training_sites tr
ON tr.training_point_id = bf.training_site
        LEFT JOIN ab_district d
ON tr.district = d.district_id
        LEFT JOIN customer_beneficiaries cb
ON cb.beneficiary_id = bf.beneficiary_id
AND (cb.status IS NULL OR cb.status = 'active')
           LEFT JOIN ab_admin a ON bf.created_by = a.adminID
      LEFT JOIN ab_admin a2 ON bf.modified_by = a2.adminID
        ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
        ORDER BY bf.beneficiary_id DESC
        LIMIT ${safeLimit} OFFSET ${safeOffset}
      `;

      const rows = await this.db.query(sql, values);
      return rows;
    }
    catch (error) {
      Sentry.captureException(error);

      console.error("FindWithFilters error is", error)
    }
  }


  async findAll(page: number, limit: number) {
    try {
      const safeLimit = Number(limit);
      const safeOffset = Number((page - 1) * limit);

      if (isNaN(safeLimit) || isNaN(safeOffset)) {
        throw new Error('Invalid pagination parameters');
      }

      const sql = `
      SELECT bf.*,
        bf.training_site AS training_site_id,
        tr.training_site AS training_site,
        CASE
          WHEN CAST(bf.latitude AS CHAR) REGEXP '^-?[0-9]+(\\.[0-9]+)?$'
          AND CAST(bf.latitude AS DOUBLE) BETWEEN -90 AND 90
          THEN CAST(bf.latitude AS DOUBLE)
          ELSE NULL
        END AS latitude,
        CASE
          WHEN CAST(bf.longitude AS CHAR) REGEXP '^-?[0-9]+(\\.[0-9]+)?$'
          AND CAST(bf.longitude AS DOUBLE) BETWEEN -180 AND 180
          THEN CAST(bf.longitude AS DOUBLE)
          ELSE NULL
        END AS longitude,
        cb.customer_id AS adminID,
        cb.customer_id AS customer_id,
        tr.training_site AS training_site_name,
        d.district_name AS district_name,
      a.name AS created_by_name,
        a2.name AS modified_by_name
      FROM beneficiaries bf
      
       LEFT JOIN training_sites tr
ON tr.training_point_id = bf.training_site
       LEFT JOIN ab_district d
ON tr.district = d.district_id
       LEFT JOIN customer_beneficiaries cb
ON cb.beneficiary_id = bf.beneficiary_id
AND (cb.status IS NULL OR cb.status = 'active')
       LEFT JOIN ab_admin a ON bf.created_by = a.adminID
      LEFT JOIN ab_admin a2 ON bf.modified_by = a2.adminID
        WHERE (bf.status IS NULL OR bf.status = 'active')

      ORDER BY beneficiary_id DESC
      LIMIT ${safeLimit} OFFSET ${safeOffset}
    `;

      const rows = await this.db.query(sql);
      return rows;
    }
    catch (error) {
      Sentry.captureException(error);

      console.error("findAll is", error)
    }
  }




  async updateBeneficiary(
    beneficiaryId: number,
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
      delete updateData.remove_national_id;
      delete updateData.remove_signature;
      delete updateData.remove_house_pic;
      delete updateData.remove_cookstove_pic;
      console.log("updated Data is", updateData);

      // remove undefined
      const filteredData = Object.fromEntries(
        Object.entries(updateData).filter(([_, value]) => value !== undefined),//filter updatedData dont take keys only take values where value is not undefined
      );

      console.log("filtered Data is", filteredData);

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

      const server_time = DateTime.utc().toFormat("yyyy-MM-dd HH:mm:ss");



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

      // 9. Always set server_time
      setClause += `, server_time = ?`;
      values.push(server_time);

      const sql = `
    UPDATE beneficiaries
    SET ${setClause}
    WHERE beneficiary_id = ?
  `;

      await this.db.query(sql, [...values, beneficiaryId]);

      return { message: 'Beneficiary updated successfully' };

    }
    catch (error) {

      console.error("updateBeneficiary error is", error)
      if (error.code === "ER_DUP_ENTRY") {

        const msg = error.sqlMessage;

        if (msg?.includes("nunique")) {
          throw new ConflictException("National ID already exists");
        }

        if (msg?.includes("dunique")) {
          throw new ConflictException("Device serial number already exists");
        }

        throw new ConflictException("Duplicate value detected");
      }

      if (error.code === "ER_NO_REFERENCED_ROW_2") {
        throw new ConflictException("Invalid foreign key reference");
      }

      throw new InternalServerErrorException(
        "Failed to update beneficiary"
      );
    }

  }

  async deleteBeneficiaryId(bid: number) {
    try {
      const rows = await this.db.query(
        'update beneficiaries set status = ? where beneficiary_id = ? LIMIT 1',
        ['inactive', bid]
      );
      return rows;
    }
    catch (error) {
      Sentry.captureException(error);

      console.error("getFilteredCount is", error)
    }
  }


  async deleteBenebyId(bid: number) {
    try {
      const [rows] = await this.db.query(
        'delete FROM beneficiaries WHERE beneficiary_id = ? LIMIT 1',
        [bid]
      );
      return rows;
    }
    catch (error) {
      Sentry.captureException(error);

      console.error("delete monitoring repository error", error)
      throw new InternalServerErrorException("failed to delte monitoring in repo");
    }
  }


  async getUpdatedDataByDate(date: Date) {

    try {

      const rows: any = await this.db.query(
        // `
        //   SELECT *
        //   FROM beneficiaries
        //   WHERE server_time > ?
        //   OR modified_date > ?
        //   `,
        `
    SELECT *
    FROM beneficiaries
    WHERE (status IS NULL OR status = 'active')
    AND (
      server_time > ?
      OR modified_date > ?
    )
  `,
        [date, date],
      );

      return rows;

    } catch (error) {
      Sentry.captureException(error);
      console.error('getUpdatedDataByDate error', error);
      throw error;
    }
  }

}

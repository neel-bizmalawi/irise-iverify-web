/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */

import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CreateTrainingSiteDto } from '../create-training-site.dto';
import { UpdateTrainingSiteDto } from '../update-training-site.dto';
import { OPERATOR_SQL } from 'src/filters/operator.map';
import { SyncTrainingSiteDto } from '../sync-training-site.dto';
import * as Sentry from '@sentry/node';
import { DateTime } from 'luxon';

@Injectable()
export class TrainingSiteRepositoryService {
  constructor(private readonly db: DatabaseService) { }

  private async execute(
    sql: string,
    params: any[] = [],
    connection?: any,
  ): Promise<any> {
    if (connection) {
      const [rows] = await connection.query(sql, params);
      return rows;
    }

    return this.db.query(sql, params);
  }

  async getTotalCount(): Promise<number> {
    const rows: any = await this.db.query(
      `SELECT COUNT(*) AS total FROM training_sites  WHERE (status IS NULL OR status = 'active')
`,
    );
    return rows[0]?.total ?? 0;
  }

  async getByOfflineIds(offlineIds: number[]) {
    const sql = `
    SELECT training_point_id, m_training_point_id
    FROM training_sites
    WHERE offline_id IN (?)
  `;

    const rows = await this.db.query(sql, [offlineIds]);
    return rows;
  }

  async getFilteredCount(filters: any[]): Promise<number> {

    const where: string[] = [`(ts.status IS NULL OR ts.status = 'active')`];
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

    const sql = `
      SELECT COUNT(*) AS total
      FROM training_sites ts
      LEFT JOIN ab_admin a ON ts.created_by = a.adminID
      LEFT JOIN ab_admin a2 ON ts.modified_by = a2.adminID
       LEFT JOIN ab_district d
ON ts.district = d.district_id

LEFT JOIN ab_traditional_authority ta
ON ts.traditional_authority = ta.authority_id
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    `;

    const rows: any = await this.db.query(sql, values);
    return rows[0]?.total ?? 0;
  }

  async findWithFilters(filters: any[], page: number, limit: number) {
    try {
      const where: string[] = [`(ts.status IS NULL OR ts.status = 'active')`];
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
      SELECT
        ts.*,
         d.district_name AS district_name,
  ta.authority_name AS traditional_authority_name,

        a.name AS created_by_name,
        a2.name AS modified_by_name
      FROM training_sites ts
       LEFT JOIN ab_district d
ON ts.district = d.district_id

LEFT JOIN ab_traditional_authority ta
ON ts.traditional_authority = ta.authority_id

      LEFT JOIN ab_admin a ON ts.created_by = a.adminID
      LEFT JOIN ab_admin a2 ON ts.modified_by = a2.adminID
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY ts.training_point_id DESC
      LIMIT ${safeLimit} OFFSET ${safeOffset}
    `;

      const rows: any = await this.db.query(sql, values);
      return rows;
    }
    catch (error) {
      Sentry.captureException(error);
      console.error("findAll error is", error);
    }
  }

  async findAll(page: number, limit: number) {
    const safeLimit = Math.max(1, Number(limit));
    const safeOffset = Math.max(0, Number((page - 1) * limit));

    if (isNaN(safeLimit) || isNaN(safeOffset)) {
      throw new InternalServerErrorException('Invalid pagination parameters');
    }

    const sql = `
      SELECT
        ts.*,
         d.district_name AS district_name,
  ta.authority_name AS traditional_authority_name,
        a.name AS created_by_name,
        a2.name AS modified_by_name
      FROM training_sites ts
      LEFT JOIN ab_district d
ON ts.district = d.district_id

LEFT JOIN ab_traditional_authority ta
ON ts.traditional_authority = ta.authority_id

      LEFT JOIN ab_admin a ON ts.created_by = a.adminID
      LEFT JOIN ab_admin a2 ON ts.modified_by = a2.adminID
              WHERE (ts.status IS NULL OR ts.status = 'active')

      ORDER BY ts.training_point_id DESC
      LIMIT ${safeLimit} OFFSET ${safeOffset}
    `;

    const rows: any = await this.db.query(sql);
    return rows;
  }

  async getTrainingbyID(training_id: number) {
    const rows: any = await this.db.query(
      `SELECT ts.* ,
         d.district_name AS district_name,
  ta.authority_name AS traditional_authority_name FROM training_sites ts

   LEFT JOIN ab_district d
ON ts.district = d.district_id

LEFT JOIN ab_traditional_authority ta
ON ts.traditional_authority = ta.authority_id

 WHERE ts.training_point_id = ? LIMIT 1`,
      [training_id],
    );
    return rows;
  }

  async deleteTrainginId(training_id: number) {
    try {
      const result: any = await this.db.query(
        'update training_sites set status = ? WHERE training_point_id = ? LIMIT 1',
        ['inactive', training_id],
      );
      return result;

    } catch (error) {
      Sentry.captureException(error);
      console.error('deleteTrainingId error:', error);
      throw new InternalServerErrorException('failed to delete training site');
    }
  }

  async getDistrict() {
    try {
      const rows: any = await this.db.query('SELECT * FROM ab_district');
      return rows;
    }
    catch (error) {
      Sentry.captureException(error);

      console.error("get District error", error)
    }
  }


   async getTAuth() {
    try {
      const rows: any = await this.db.query('SELECT * FROM ab_traditional_authority');
      return rows;
    }
    catch (error) {
      Sentry.captureException(error);

      console.error("get District error", error)
    }
  }

  async getAuthority(dist_id) {
    try {
      const rows: any = await this.db.query(
        `SELECT * FROM ab_traditional_authority where district_id = ${dist_id}`,
      );
      return rows;
    }
    catch (error) {
      Sentry.captureException(error);

      console.error("get authority error", error)
    }
  }

  async getcookstove() {
    const rows: any = await this.db.query(
      'SELECT cookstove_name FROM cookstove_methods',
    );
    return rows;
  }

  async getlangs() {
    const rows: any = await this.db.query('SELECT lang_name FROM languages');
    return rows;
  }

  async getTrainingAllsites() {
    const rows: any = await this.db.query('SELECT training_site FROM training_sites');
    return rows;
  }

  // ✅ ALWAYS THROW ERRORS (no silent failure)
  async getUserById(userId: number) {
    try {
      const rows: any = await this.db.query(
        'SELECT * FROM ab_admin WHERE adminID = ? LIMIT 1',
        [userId],
      );

      if (!rows || rows.length === 0) {
        throw new NotFoundException(`User with id ${userId} not found`);
      }

      return rows[0];
    } catch (error) {
      Sentry.captureException(error);
      console.error('getUserById error:', error);
      throw error; // 🚨 critical
    }
  }


  async getUserTimezone(userId: number): Promise<string> {
    const result: any = await this.db.query(
      `SELECT timezone FROM ab_admin WHERE adminID = ? LIMIT 1`,
      [userId]
    );
    return result?.[0]?.timezone || 'UTC';
  }

  // ✅ SAFE INSERT
  async insertTraining(data: CreateTrainingSiteDto, userid: number) {
    try {

      const timezone = await this.getUserTimezone(userid);

      // 2. Generate created_date in user's local time, stored as UTC-aware ISO string
      const created_date = DateTime.now()
        .setZone(timezone)
        .toFormat("yyyy-MM-dd HH:mm:ss");

      console.log(`User timezone: ${timezone} → created_date UTC: ${created_date}`);

      console.log('Insert training payload:', data);

      const {
        training_site,
        district,
        gvh_name,
        village_head_name,
        traditional_authority,
        cookstoves_count,
        house_holds_count,
        house_hold_radius,
        road_access,
        total_people,
        latitude,
        longitude,

      } = data;

      const result: any = await this.db.query(
        `
        INSERT INTO training_sites (
          training_site,
          district,
          gvh_name,
          village_head_name,
          traditional_authority,
          cookstoves_count,
          house_holds_count,
          house_hold_radius,
          road_access,
          total_people,
          latitude,
          longitude,
          created_date,
          created_by
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?, ?)
        `,
        [
          training_site ?? null,
          district ?? null,
          gvh_name ?? null,
          village_head_name ?? null,
          traditional_authority ?? null,
          cookstoves_count ?? null,
          house_holds_count ?? null,
          house_hold_radius ?? null,
          road_access ?? null,
          total_people ?? null,
          latitude ?? null,
          longitude ?? null,
          created_date ?? null,
          userid ?? null,
        ],
      );

      console.log('Insert success:', result);

      return result;
    } catch (error: any) {
      Sentry.captureException(error);
      console.error('❌ insertTraining error:', error);

      if (error.code === 'ER_DUP_ENTRY') {
        throw new ConflictException('Training site already exists');
      }

      if (error.code === 'ER_NO_REFERENCED_ROW_2') {
        throw new ConflictException('Invalid user reference');
      }

      throw new InternalServerErrorException(
        'Failed to create training site',
      );
    }
  }

  // ✅ SAFE BULK INSERT
  async bulkInsertTrainings(
    data: SyncTrainingSiteDto[],
    createdByUserId: number,
  ) {
    try {
      // 1. Fetch user's timezone once
      const timezone = await this.getUserTimezone(createdByUserId);
      console.log(`Bulk insert timezone: ${timezone}`);

      const values = data.map((t) => {

        // 2. Convert created_date to user's local timezone format
        let created_date: string;

        if (t.created_date) {
          const raw = t.created_date;

          // Handle both string and Date object safely
          created_date = (typeof raw === 'string'
            ? DateTime.fromISO(raw)              // if string → fromISO
            : DateTime.fromJSDate(raw as Date)   // if Date object → fromJSDate
          )
            .setZone(timezone)
            .toFormat("yyyy-MM-dd HH:mm:ss");

          console.log(`Parsed created_date: ${created_date}`);
        } else {
          // No date sent → generate fresh in user's local timezone
          created_date = DateTime.now()
            .setZone(timezone)
            .toFormat("yyyy-MM-dd HH:mm:ss");
        }

        console.log(`created_date for offline_id ${t.offline_id}: ${created_date}`);

        return [
          t.offline_id ?? null,
          t.m_training_point_id ?? null,
          t.training_site ?? null,
          t.district ?? null,
          t.gvh_name ?? null,
          t.village_head_name ?? null,
          t.traditional_authority ?? null,
          t.cookstoves_count ?? null,
          t.house_holds_count ?? null,
          t.house_hold_radius ?? null,
          t.road_access ?? null,
          t.total_people ?? null,
          t.latitude ?? null,
          t.longitude ?? null,
          t.conduct_training_date ?? null,
          t.number_of_people_present ?? null,
          createdByUserId ?? null,
          created_date,   // ✅ properly formatted local time
          t.s_is_sync ?? 0,
        ];
      });

      const sql = `
      INSERT INTO training_sites (
        offline_id, m_training_point_id, training_site,
        district, gvh_name, village_head_name,
        traditional_authority, cookstoves_count, house_holds_count,
        house_hold_radius, road_access, total_people,
        latitude, longitude, conduct_training_date,
        number_of_people_present, created_by, created_date, s_is_sync
      )
      VALUES ?
    `;

      const result = await this.db.bulkQuery(sql, [values]);

      return {
        affectedRows: result.affectedRows,
        firstId: result.insertId,
      };

    } catch (error: any) {
      Sentry.captureException(error);
      console.error('❌ bulkInsert error:', error);
      throw new InternalServerErrorException('Bulk insert failed');
    }
  }

  // ✅ FIXED (no silent failure)
  async getExistingOfflineIds(offlineIds: number[], connection?: any) {

    try {

      if (!offlineIds.length) return [];

      const placeholders = offlineIds.map(() => '?').join(',');

      const rows: any = await this.execute(
        `SELECT DISTINCT offline_id FROM training_sites WHERE offline_id IN (${placeholders})`,
        offlineIds,
        connection,
      );

      return rows.map((r: any) => r.offline_id);
    }

    catch (error) {
      Sentry.captureException(error);
      console.error('getExistingOfflineIds error:', error);
      throw error; // 🚨 critical
    }
  }


  // ✅ SAFE UPDATE
  async updateTraining(
    id: number,
    dto: UpdateTrainingSiteDto,
    userid: number,
  ) {
    try {
      // 1. Fetch user's timezone
      const timezone = await this.getUserTimezone(userid);
      console.log(`Update timezone: ${timezone}`);

      const filteredDto = Object.fromEntries(
        Object.entries(dto).filter(([_, value]) => value !== undefined),
      );


      // 3. Convert conduct_training_date if present
      if (filteredDto.conduct_training_date) {
        const raw = filteredDto.conduct_training_date;
        filteredDto.conduct_training_date = (typeof raw === 'string'
          ? DateTime.fromISO(raw)   //if string
          : DateTime.fromJSDate(raw as Date)   // if Date object
        )
          .setZone(timezone)
          .toFormat("yyyy-MM-dd HH:mm:ss");

        console.log(`conduct_training_date converted: ${filteredDto.conduct_training_date}`);
      }

      // 4. Convert modified_date if present, else generate fresh in user's timezone
      let modified_date: string;
      if (filteredDto.modified_date) {
        const raw = filteredDto.modified_date;
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

      const server_time = DateTime.utc().toFormat("yyyy-MM-dd HH:mm:ss");
      console.log(`server_time (UTC): ${server_time}`);

      // 5. Remove modified_date from restDto (handle separately)
      const { modified_date: _, ...restDto } = filteredDto;

      const fields = Object.keys(restDto);

      if (!fields.length && !modified_date) {
        return { message: 'Nothing to update' };
      }

      // 6. Build dynamic SET clause
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
      UPDATE training_sites
      SET ${setClause}
      WHERE training_point_id = ?
    `;

      await this.db.query(sql, [...values, id]);

      return { message: 'Training site updated successfully' };

    } catch (error) {
      Sentry.captureException(error);
      console.error('updateTraining error:', error);
      throw new InternalServerErrorException('Failed to update training');
    }
  }

  async getTotalTrainingCount(): Promise<number> {
    try {
      const rows: any = await this.db.query(
        'SELECT COUNT(*) AS total FROM training_sites',
        [],
      );

      return rows[0]?.total ?? 0;
    } catch (error: any) {
      Sentry.captureException(error);
      throw new InternalServerErrorException({
        message: 'Bulk insert failed',
        error: error.message || error,
      });
    }
  }

  async getUpdatedCountByDate(date: Date): Promise<number> {
    try {
      const rows: any = await this.db.query(
        `
        SELECT COUNT(*) AS total
        FROM training_sites
        WHERE server_time > ?
        OR modified_date > ?
        `,
        [date, date],
      );

      return rows[0]?.total ?? 0;
    } catch (error) {
      Sentry.captureException(error);
      console.error('getUpdatedCountByDate error', error);
      throw error;
    }
  }

  async getUpdatedDataByDate(date: Date) {

    try {

      const rows: any = await this.db.query(
        // `
        // SELECT *
        // FROM training_sites
        // WHERE server_time > ?
        // OR modified_date > ?
        // `,
        `
    SELECT *
    FROM training_sites
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

  async insertDistrict(district: string, username: string) {
    try {
      const result: any = await this.db.query(
        `
        INSERT INTO ab_district (
          district_name,
          created_by
        )
        VALUES (?, ?)
        `,
        [district ?? null, username ?? null],
      );

      return result;
    } catch (error) {
      console.error('insertDistrict error', error);
      throw error;
    }
  }

  async getSearchDistrict(search: string) {
    try {
      const rows: any = await this.db.query(
        'SELECT * FROM ab_district WHERE district_name LIKE ?',
        [`%${search}%`],
      );

      return rows;
    } catch (error) {
      console.error('getSearchDistrict error', error);
      throw error;
    }
  }

  async getSearchAuthority(search: string) {
    try {
      const rows: any = await this.db.query(
        'SELECT * FROM ab_traditional_authority WHERE authority_name LIKE ?',
        [`%${search}%`],
      );

      return rows;
    } catch (error) {
      console.error('getSearchAuthority error', error);
      throw error;
    }
  }
}
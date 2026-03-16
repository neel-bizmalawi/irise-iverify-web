/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */
import { ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CreateTrainingSiteDto } from '../create-training-site.dto';
import { UpdateTrainingSiteDto } from '../update-training-site.dto';
import { OPERATOR_SQL } from 'src/filters/operator.map';
import { SyncTrainingSiteDto } from '../sync-training-site.dto';
import * as Sentry from "@sentry/node";


@Injectable()
export class TrainingSiteRepositoryService {
  private readonly LIMIT = 100;

  constructor(private readonly db: DatabaseService) { }

  async getTotalCount(): Promise<number> {
    const [rows]: any = await this.db.query('select count(*) as total from training_sites',);
    return rows[0].total;
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
  FROM training_sites ts
  LEFT JOIN ab_admin a ON ts.created_by = a.adminID
  LEFT JOIN ab_admin a2 ON ts.modified_by = a2.adminID
  ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
`;

    const [[result]] = await this.db.query(sql, values);
    return result.total;
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

    //   const sql = `
    //   SELECT ts.*
    //   FROM training_sites ts
    //   ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    //   ORDER BY ts.training_point_id DESC
    //   LIMIT ${safeLimit} OFFSET ${safeOffset}
    // `;

const sql = `
  SELECT 
    ts.*,
    a.name AS created_by_name,
    a2.name AS modified_by_name
  FROM training_sites ts
  LEFT JOIN ab_admin a ON ts.created_by = a.adminID
  LEFT JOIN ab_admin a2 ON ts.modified_by = a2.adminID
  ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
  ORDER BY ts.training_point_id DESC
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

    //     const sql = `
    //   SELECT *
    //   FROM training_sites
    //   ORDER BY training_point_id DESC
    //   LIMIT ${safeLimit} OFFSET ${safeOffset}
    // `;

    const sql = `
    SELECT 
      ts.*,
      a.name AS created_by_name,
      a2.name AS modified_by_name
    FROM training_sites ts
    LEFT JOIN ab_admin a ON ts.created_by = a.adminID
    LEFT JOIN ab_admin a2 ON ts.modified_by = a2.adminID
    ORDER BY ts.training_point_id DESC
    LIMIT ${safeLimit} OFFSET ${safeOffset}
  `;

    const [rows] = await this.db.query(sql);
    return rows;
  }

  async getTrainingbyID(training_id: number) {
    const [rows] = await this.db.query(
      'SELECT * FROM training_sites WHERE training_point_id = ? LIMIT 1',
      [training_id]
    );
    return rows;
  }

  async getUserById(userId: number) {
    try {
      console.log("inside serivce of user getUserById")
      const [rows] = await this.db.query(
        'SELECT * FROM ab_admin WHERE adminID = ? LIMIT 1',
        [userId]
      );
      if (!rows || rows.length === 0) {
        throw new NotFoundException(`User with id ${userId} not found`);
      }

      return rows[0]; // return single user, not array
    }
    catch (error) {
      Sentry.captureException(error);
      console.error("getUserById error is", error)
    }

  }


  async deleteTrainginId(training_id: number) {
    try {
      const [rows] = await this.db.query(
        'delete FROM training_sites WHERE training_point_id = ? LIMIT 1',
        [training_id]
      );
      return rows;
    }
    catch (error) {
      Sentry.captureException(error);
      console.error("deleteTrainingId error is", error)
      throw new InternalServerErrorException("failed to delete training site")

    }
  }


  async getDistrict() {

    const [rows] = await this.db.query(
      `SELECT * from ab_district`
    );

    return rows;
  }


  async getAuthority() {

    const [rows] = await this.db.query(
      `SELECT * from ab_traditional_authority`
    );

    return rows;
  }

  async getcookstove() {

    const [rows] = await this.db.query(
      `SELECT cookstove_name from cookstove_methods`
    );

    return rows;
  }

  async getlangs() {

    const [rows] = await this.db.query(
      `SELECT lang_name from languages`
    );

    return rows;
  }

  async getTrainingAllsites() {

    const [rows] = await this.db.query(
      `SELECT training_site from training_sites`
    );

    return rows;
  }

  async insertTraining(data: CreateTrainingSiteDto, userid: number) {


    try {
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


      const [result] = await this.db.query(

        `
    INSERT INTO training_sites
    (
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
      created_by
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?)
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
          latitude ?? null,   // ✅ FIX
          longitude ?? null,  // ✅ FIX
          userid ?? null,
        ],
      );


      return result;
    }
    catch (error: any) {

      console.error('❌ insertTraining DB error:', error);

      if (error.code === 'ER_DUP_ENTRY') {
        throw new ConflictException('Training site already exists');
      }

      // Foreign key constraint (created_by user missing)
      if (error.code === 'ER_NO_REFERENCED_ROW_2') {
        throw new ConflictException('Invalid user reference');
      }

      // Fallback
      throw new InternalServerErrorException(
        'Failed to create training site',
      );
    }
  }

  // async insertTrainingsync(data: SyncTrainingSiteDto, username: string) {

  //   try {
  //     const {
  //       offline_id,
  //       training_site,
  //       district,
  //       gvh_name,
  //       village_head_name,
  //       traditional_authority,
  //       cookstoves_count,
  //       house_holds_count,
  //       house_hold_radius,
  //       road_access,
  //       total_people,
  //       latitude,
  //       longitude,
  //       created_date,
  //     } = data;

  //     const [result] = await this.db.query(

  //       `
  //   INSERT INTO training_sites
  //   (
  //         offline_id,
  //     training_site,
  //     district,
  //     gvh_name,
  //     village_head_name,
  //     traditional_authority,
  //     cookstoves_count,
  //     house_holds_count,
  //     house_hold_radius,
  //     road_access,
  //     total_people,
  //     latitude,
  //     longitude,
  //     created_by,
  //     created_date
  //   )
  //   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?,?,?)
  //   `,
  //       [
  //         offline_id ?? null,
  //         training_site ?? null,
  //         district ?? null,
  //         gvh_name ?? null,
  //         village_head_name ?? null,
  //         traditional_authority ?? null,
  //         cookstoves_count ?? null,
  //         house_holds_count ?? null,
  //         house_hold_radius ?? null,
  //         road_access ?? null,
  //         total_people ?? null,
  //         latitude ?? null,   // ✅ FIX
  //         longitude ?? null,  // ✅ FIX
  //         username ?? null,
  //         created_date ?? null,
  //       ],
  //     );

  //     return result;
  //   }
  //   catch (error: any) {

  //     console.error('❌ insertTraining DB error:', error);

  //     if (error.code === 'ER_DUP_ENTRY') {
  //       throw new ConflictException('Training site already exists');
  //     }

  //     // Foreign key constraint (created_by user missing)
  //     if (error.code === 'ER_NO_REFERENCED_ROW_2') {
  //       throw new ConflictException('Invalid user reference');
  //     }

  //     // Fallback
  //     throw new InternalServerErrorException(
  //       'Failed to create training site',
  //     );
  //   }


  // }

  async bulkInsertTrainings(data: SyncTrainingSiteDto[], username: string, connection) {
    try {


      const values = data.map(t => [
        t.offline_id ?? null,
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
        username ?? null,
        t.created_date ?? new Date(),  // Default to current date if null
      ]);


      const [result]: any = await connection.query(
        `
      INSERT INTO training_sites
      (
        offline_id,
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
        created_by,
        created_date
      )
      VALUES ?
      `,
        [values],
      );

      return result.affectedRows;

    } catch (error: any) {
      Sentry.captureException(error);

      console.error("❌ bulkInsertTrainings error:", {
        message: error.message,
        code: error.code,
        sqlMessage: error.sqlMessage,
        sqlState: error.sqlState,
        errno: error.errno,
        sql: error.sql,  // If available
      });

      throw new InternalServerErrorException({
        message: "Failed to bulk insert trainings",
        error: error.message || error.sqlMessage || error || "Unknown error",
      });
    }
  }


  async getExistingOfflineIds(offlineIds: number[], connection) {
    try {
      if (!offlineIds.length) return [];
      const placeholders = offlineIds.map(() => '?').join(',');

      const [rows]: any = await connection.query(
        `SELECT DISTINCT offline_id FROM training_sites WHERE offline_id IN (${placeholders})`,
        offlineIds
      );

      return rows.map((r: any) => r.offline_id);
    }
    catch (error) {
      Sentry.captureException(error);
      console.error("get ExistingOfflineIds error", error)

    }
  }


  async updateTraining(
    id: number,
    dto: UpdateTrainingSiteDto,
    userid: number,

  ) {

    // 🔥 Remove undefined fields
    try {
      const filteredDto = Object.fromEntries(
        Object.entries(dto).filter(([_, value]) => value !== undefined),
      );

      const fields = Object.keys(filteredDto);

      if (!fields.length) {
        return { message: 'Nothing to update' };
      }

      const setClause = fields
        .map((field) => `${field} = ?`)
        .join(', ');

      // 🔥 Convert remaining values (safe)
      const values = Object.values(filteredDto);

      const sql = `
    UPDATE training_sites
    SET ${setClause}, modified_date = NOW(),modified_by=?
    WHERE training_point_id= ?
  `;

      await this.db.query(sql, [...values, userid, id]);

      return { message: 'Training site updated successfully' };
    }
    catch (error) {
      Sentry.captureException(error);

      console.error("update error", error)
      throw new InternalServerErrorException("Failed to update training");


    }
  }

  async existsByOfflineId(offlineId: string): Promise<boolean> {
    const [rows]: any = await this.db.query(
      'SELECT training_point_id FROM training_sites WHERE offline_id = ?',
      [offlineId],
    );

    return rows.length > 0;
  }

  async getTotalTrainingCount(connection): Promise<number> {
    try {
      const [rows]: any = await connection.query(
        'SELECT COUNT(*) as total FROM training_sites',
      );

      return rows[0].total;
    }
    catch (error: any) {
      Sentry.captureException(error);

      throw new InternalServerErrorException({
        message: "Bulk insert failed",
        error: error.message || error,
      });
    }
  }

  async getUpdatedCountByDate(date: Date): Promise<number> {
    try {
      const [rows]: any = await this.db.query(
        `
      SELECT COUNT(*) AS total
      FROM training_sites
      WHERE server_time > ?
      OR modified_date > ?
      `,
        [date, date],
      );

      return rows[0].total;
    } catch (error) {
      Sentry.captureException(error);

      console.error('getUpdatedCountByDate error', error);
      throw error;
    }
  }


  async getUpdatedDataByDate(date: Date) {
    try {
      const [rows]: any = await this.db.query(
        `
      SELECT *
      FROM training_sites
      WHERE server_time > ?
      OR modified_date > ?
      `,
        [date, date],
      );

      return rows
    } catch (error) {
      Sentry.captureException(error);

      console.error('getUpdatedDataByDate error', error);
      throw error;
    }
  }


  async insertDistrict(district: string, username: string) {
    try {

      const [result] = await this.db.query(
        `
      INSERT INTO ab_district
      (
        district_name,
        created_by
      )
      VALUES (?, ?)
      `,
        [
          district ?? null,
          username ?? null,
        ],
      );

      return result;

    } catch (error) {
      console.error('insertDistrict error', error);
      throw error;
    }
  }


  async getSearchDistrict(search: string) {
    try {
      const [rows]: any = await this.db.query(
        `
   select * from ab_district where district_name like?
      `,
        [`%${search}%`],
      );

      return rows
    } catch (error) {
      console.error('getSearchDistrict error', error);
      throw error;
    }
  }

  async getSearchAuthority(search: string) {
    try {
      const [rows]: any = await this.db.query(
        `
   select * from ab_traditional_authority where authority_name like?
      `,
        [`%${search}%`],
      );

      return rows
    } catch (error) {
      console.error('getSearchAuthority error', error);
      throw error;
    }
  }
}

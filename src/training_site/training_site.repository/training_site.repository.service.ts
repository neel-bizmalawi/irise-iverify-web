/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */
import { ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CreateTrainingSiteDto } from '../create-training-site.dto';
import { UpdateTrainingSiteDto } from '../update-training-site.dto';
import { OPERATOR_SQL } from 'src/filters/operator.map';

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
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
  `;

    const [[result]] = await this.db.query(sql, values);
    return result.total;
  }

  // async findWithFilters(filters: any[]) {

  //   const where: string[] = [];
  //   const values: any[] = [];

  //   filters.forEach((f) => {
  //     let value = f.value;

  //     // Transform value safely
  //     if (f.operator === 'contains') value = `%${value}%`;
  //     if (f.operator === 'starts_with') value = `${value}%`;
  //     if (f.operator === 'ends_with') value = `%${value}`;
  //     if (f.type === 'number') value = Number(value);

  //     where.push(`${f.column} ${OPERATOR_SQL[f.operator]} ?`);
  //     values.push(value);
  //   });

  //   const sql = `
  //     SELECT ts.*
  //     FROM training_sites  ts
  //     ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
  //     ORDER BY ts.created_date DESC
  //   `;

  //   const [rows] = await this.db.query(sql, values)
  //   return rows;

  // }

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
    SELECT ts.*
    FROM training_sites ts
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY ts.training_point_id DESC
    LIMIT ${safeLimit} OFFSET ${safeOffset}
  `;

  const [rows] = await this.db.query(sql, values);
  return rows;
}

  // async findAll(page: number, limit: number) {
  //   const offset = (page - 1) * limit;

  //   const [rows] = await this.db.query(
  //     `SELECT * from training_sites order by training_point_id desc limit ? offset ?`,
  //     [limit, offset],
  //   );

  //   return rows;
  // }
  async findAll(page: number, limit: number) {
    const safeLimit = Number(limit);
    const safeOffset = Number((page - 1) * limit);

    if (isNaN(safeLimit) || isNaN(safeOffset)) {
      throw new Error('Invalid pagination parameters');
    }
    console.log("page Limit set ", safeLimit);
    console.log("page Limit set 2", safeOffset);
    const sql = `
  SELECT *
  FROM training_sites
  ORDER BY training_point_id DESC
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
    const [rows] = await this.db.query(
      'SELECT * FROM users WHERE id = ? LIMIT 1',
      [userId]
    );
    if (!rows || rows.length === 0) {
      throw new NotFoundException(`User with id ${userId} not found`);
    }

    return rows[0]; // return single user, not array

  }


  async deleteTrainginId(training_id: number) {
    const [rows] = await this.db.query(
      'delete FROM training_sites WHERE training_point_id = ? LIMIT 1',
      [training_id]
    );
    return rows;
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

  async insertTraining(data: CreateTrainingSiteDto, username: string) {

    console.log("username is ", username)

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
          training_site,
          district,
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
          username ?? null,
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




  async updateTraining(
    id: number,
    dto: UpdateTrainingSiteDto,
    username: string,

  ) {

    // 🔥 Remove undefined fields
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
    WHERE training_point_id = ?
  `;

    await this.db.query(sql, [...values, username, id]);

    return { message: 'Training site updated successfully' };
  }
}

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
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

      if (f.operator === 'contains') value = `%${value}%`;
      if (f.operator === 'starts_with') value = `${value}%`;
      if (f.operator === 'ends_with') value = `%${value}`;
      if (f.type === 'number') value = Number(value);

      where.push(`${f.column} ${OPERATOR_SQL[f.operator]} ?`);
      values.push(value);
    });

    const offset = (page - 1) * limit;

    const sql = `
    SELECT ts.*
    FROM training_sites ts
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY ts.training_point_id DESC
    LIMIT ? OFFSET ?
  `;

    values.push(limit, offset);

    const [rows] = await this.db.query(sql, values);
    return rows;
  }

  async findAll(page: number, limit: number) {
    const offset = (page - 1) * limit;

    const [rows] = await this.db.query(
      `SELECT * from training_sites order by training_point_id desc limit ? offset ?`,
      [limit, offset],
    );

    return rows;
  }

  async getTrainingbyID(training_id: number) {
    const [rows] = await this.db.query(
      'SELECT * FROM training_sites WHERE training_point_id = ? LIMIT 1',
      [training_id]
    );
    return rows;
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

  async insertTraining(data: CreateTrainingSiteDto) {
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
      longitude
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      ],
    );

    return result;
  }


  async updateTraining(
    id: number,
    dto: UpdateTrainingSiteDto,
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
    SET ${setClause}, modified_date = NOW()
    WHERE training_point_id = ?
  `;

    await this.db.query(sql, [...values, id]);

    return { message: 'Training site updated successfully' };
  }
}

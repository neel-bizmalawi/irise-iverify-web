/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CreateUserDto } from '../user.dto';
import * as bcrypt from 'bcrypt';
import { UpdateUserDto } from '../updateuser.dto';
import { OPERATOR_SQL } from 'src/filters/operator.map';


@Injectable()
export class UserRepositoryService {
  constructor(private readonly db: DatabaseService) { }

  async insertUser(data: CreateUserDto, username: string) {

    try {
      const { name, user_name, email, password, role, user_setting, status, mobile_number } = data;

      // 🔐 Hash password
      const hashedPassword = password ? await bcrypt.hash(password, 10) : null;




      const [result] = await this.db.query(
        `
     INSERT INTO ab_admin
    (
      name,
      user_name,
      email,
      password,
      role,
      user_setting,
      status,
      mobile_number,
      created_by
    )
    VALUES (?, ?, ?, ?, ?, ?, ?,?,?)
    `,
        [
          name ?? null,
          user_name ?? null,
          email ?? null,
          hashedPassword ?? null,
          role ?? null,
          user_setting ?? null,
          status ?? null,
          mobile_number ?? null,
          username ?? null,
        ],
      );

      return result;

    } catch (error) {
      console.error('❌ insertUser DB error:', error);
      throw error;

    }
  }

  async UpdateById(AID: number, dto: UpdateUserDto, username: string) {

    console.log("AID IS", AID);
    console.log("Username is", username)

    const filteredDto = Object.fromEntries(  //This converts the array of pairs back into an object.
      Object.entries(dto).filter(([_, value]) => value !== undefined), // converts dto object to array of key value pair
    );

    const fields = Object.keys(filteredDto);

    // 🔐 If password exists → hash it
    if (filteredDto.password) {
      filteredDto.password = await bcrypt.hash(filteredDto.password, 10);
    }

    if (!fields.length) {
      return { message: 'Nothing to update' };
    }

    const setClause = fields
      .map((field) => `${field} = ?`)
      .join(', ');

    // 🔥 Convert remaining values (safe)
    console.log("set clause is", setClause)
    const values = Object.values(filteredDto);

    const sql = `
    UPDATE ab_admin
    SET ${setClause}, modified_date = NOW(),modified_by=?
    WHERE adminID = ?
  `;

    const [result]: any = await this.db.query(
      sql,
      [...values, username, AID],
    );

    return result; // 👈 IMPORTANT
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
        FROM ab_admin us
        ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      `;

    const [[result]] = await this.db.query(sql, values);
    return result.total;
  }

  async getTotalCount(): Promise<number> {
    const [rows]: any = await this.db.query('select count(*) as total from ab_admin',);
    return rows[0].total;
  }

  async findAll(page: number, limit: number) {
    const safeLimit = Number(limit);
    const safeOffset = Number((page - 1) * limit);

    if (isNaN(safeLimit) || isNaN(safeOffset)) {
      throw new Error('Invalid pagination parameters');
    }

    const sql = `
  SELECT *
  FROM ab_admin
  ORDER BY adminID DESC
  LIMIT ${safeLimit} OFFSET ${safeOffset}
`;

    const [rows] = await this.db.query(sql);
    return rows;
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
      SELECT us.*
      FROM ab_admin us
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY us.adminID DESC
      LIMIT ${safeLimit} OFFSET ${safeOffset}
    `;

    const [rows] = await this.db.query(sql, values);
    return rows;
  }


  async getUsersByid(userid: number) {
    const [rows] = await this.db.query(
      'SELECT * FROM ab_admin WHERE adminID = ? LIMIT 1',
      [userid]
    );
    return rows;
  }

  async deleteUserId(userId: number) {
    const [rows] = await this.db.query(
      'delete FROM ab_admin WHERE adminID = ? LIMIT 1',
      [userId]
    );
    return rows;
  }


  async getRoles() {
    try {
      const [rows] = await this.db.query("select role_id, role_name, status from roles");
      return rows;
    }
    catch (error) {
      console.error("getRoles DB error is" + error);
      throw error;
    }
  }

  async getAlluser() {
    try {
      const rows = await this.db.query("select name from ab_admin");
      return rows;
    }
    catch (error) {
      console.error("getRoles DB error is" + error);
      throw error;
    }
  }
}

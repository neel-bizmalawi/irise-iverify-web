/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */
import { ConflictException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CreateCustomerDto } from '../customer.dto';
import { UpdateCustomerDto } from '../updatecustomer.dto';
import { OPERATOR_SQL } from 'src/filters/operator.map';
import * as bcrypt from 'bcrypt';
import * as Sentry from '@sentry/node';

@Injectable()
export class CustomerRepositoryService {
  constructor(private readonly db: DatabaseService) { }

  private readonly tableName = 'ab_customer';
  private readonly primaryKey = 'customerID';

  async insertCustomer(data: CreateCustomerDto, userId: number) {
    try {
      const { name, user_name, email, password, role, user_setting, status, mobile_number, timezone } = data;
      const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

      const result = await this.db.query(
        `
     INSERT INTO ${this.tableName}
    (
      name,
      user_name,
      email,
      password,
      role,
      user_setting,
      status,
      mobile_number,
      timezone,
      created_by
    )
    VALUES (?, ?, ?, ?, ?, ?, ?,?,?,?)
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
          timezone ?? null,
          userId ?? null,
        ],
      );

      return result;
    } catch (error) {
      Sentry.captureException(error);
      console.error("Create customer error is", error)

      if (error.code === "ER_DUP_ENTRY") {
        const msg = error.sqlMessage;

        if (msg.includes("unique_email")) {
          throw new ConflictException("Email ID already exists");
        }

        throw new ConflictException("Duplicate value detected");
      }

      throw new InternalServerErrorException(
        "Failed to create customer"
      );
    }
  }

  async UpdateById(customerId: number, dto: UpdateCustomerDto, userId: number) {
    const filteredDto = Object.fromEntries(
      Object.entries(dto).filter(([_, value]) => value !== undefined),
    );

    const fields = Object.keys(filteredDto);

    if (filteredDto.password) {
      filteredDto.password = await bcrypt.hash(filteredDto.password, 10);
    }

    if (!fields.length) {
      return { message: 'Nothing to update' };
    }

    const setClause = fields
      .map((field) => `${field} = ?`)
      .join(', ');

    const values = Object.values(filteredDto);

    const sql = `
    UPDATE ${this.tableName}
    SET ${setClause}, modified_date = NOW(), modified_by = ?
    WHERE ${this.primaryKey} = ?
  `;

    const result: any = await this.db.query(
      sql,
      [...values, userId, customerId],
    );

    return result;
  }

  async getFilteredCount(filters: any[]) {
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

    const sql = `
    SELECT COUNT(*) as total
    FROM ${this.tableName} cs
    LEFT JOIN ab_admin creator 
    ON cs.created_by = creator.adminID
    LEFT JOIN ab_admin modifier 
    ON cs.modified_by = modifier.adminID
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      `;

    const result = await this.db.query(sql, values);
    return result[0]?.total ?? 0;
  }

  async getTotalCount(): Promise<number> {
    const rows: any = await this.db.query(`select count(*) as total from ${this.tableName}`);
    return rows[0].total;
  }

  async findAll(page: number, limit: number) {
    const safeLimit = Number(limit);
    const safeOffset = Number((page - 1) * limit);

    if (isNaN(safeLimit) || isNaN(safeOffset)) {
      throw new Error('Invalid pagination parameters');
    }

    const sql = `
  SELECT cs.*,
  creator.name AS created_by_name,
  modifier.name AS modified_by_name
  FROM ${this.tableName} cs
  LEFT JOIN ab_admin creator 
  ON cs.created_by = creator.adminID
  LEFT JOIN ab_admin modifier 
  ON cs.modified_by = modifier.adminID
  ORDER BY ${this.primaryKey} DESC
  LIMIT ${safeLimit} OFFSET ${safeOffset}
`;

    const rows = await this.db.query(sql);
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
      SELECT cs.*,
       creator.name AS created_by_name,
       modifier.name AS modified_by_name
      FROM ${this.tableName} cs
      LEFT JOIN ab_admin creator 
      ON cs.created_by = creator.adminID
      LEFT JOIN ab_admin modifier 
      ON cs.modified_by = modifier.adminID
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY cs.${this.primaryKey} DESC
      LIMIT ${safeLimit} OFFSET ${safeOffset}
    `;

    const rows = await this.db.query(sql, values);
    return rows;
  }

  async getCustomersByid(customerId: number) {
    const rows = await this.db.query(
      `SELECT * FROM ${this.tableName} WHERE ${this.primaryKey} = ? LIMIT 1`,
      [customerId]
    );
    return rows;
  }

  async deleteCustomerId(customerId: number) {
    const rows:any = await this.db.query(
      `update ${this.tableName} set status = ? where ${this.primaryKey} = ? LIMIT 1`,
      ['inactive', customerId]
    );
    return rows;
  }

  async getRoles() {
    try {
      const rows = await this.db.query("select role_id, role_name, status from roles");
      return rows;
    }
    catch (error) {
      console.error("getRoles DB error is" + error);
      throw error;
    }
  }

  async getAllCustomer() {
    try {
      const rows = await this.db.query(`select name from ${this.tableName}`);
      return rows;
    }
    catch (error) {
      console.error("getAllCustomer DB error is" + error);
      throw error;
    }
  }
}

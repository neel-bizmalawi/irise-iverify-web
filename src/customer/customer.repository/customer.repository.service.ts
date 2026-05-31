/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */
import { ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CreateCustomerDto } from '../customer.dto';
import { UpdateCustomerDto } from '../updatecustomer.dto';
import { OPERATOR_SQL } from 'src/filters/operator.map';
import * as bcrypt from 'bcrypt';
import * as Sentry from '@sentry/node';

@Injectable()
export class CustomerRepositoryService {
  constructor(private readonly db: DatabaseService) { }

  private readonly tableName = 'ab_admin';
  private readonly primaryKey = 'adminID';
  private readonly mappingTableName = 'customer_beneficiaries';

  async getUserById(userId: number) {
    const rows: any = await this.db.query(
      `
      SELECT adminID, name, email, role, status
      FROM ${this.tableName}
      WHERE ${this.primaryKey} = ?
      LIMIT 1
      `,
      [userId],
    );

    return rows[0] ?? null;
  }

  async insertCustomer(data: CreateCustomerDto, userId: number) {
    try {
      const { name, user_name, email, password, user_setting, status, mobile_number, timezone, beneficiary_count } = data;
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
      beneficiary_count,
      created_by
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
        [
          name ?? null,
          user_name ?? null,
          email ?? null,
          hashedPassword ?? null,
          'customer',
          user_setting ?? null,
          status ?? null,
          mobile_number ?? null,
          timezone ?? null,
          beneficiary_count ?? null,
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

    if (Object.prototype.hasOwnProperty.call(filteredDto, 'role')) {
      filteredDto.role = 'customer';
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
    WHERE ${this.primaryKey} = ? AND role = 'customer'
  `;

    const result: any = await this.db.query(
      sql,
      [...values, userId, customerId],
    );

    return result;
  }

  async getAssignedCount(customerId: number): Promise<number> {
    const rows: any = await this.db.query(
      `
      SELECT COUNT(*) AS total
      FROM ${this.mappingTableName}
      WHERE customer_id = ?
      AND (status IS NULL OR status = 'active')
      `,
      [customerId],
    );

    return rows[0]?.total ?? 0;
  }

  private assignmentSummarySelect() {
    return `
      COALESCE(assignments.assigned_beneficiary_count, 0) AS assigned_beneficiary_count,
      GREATEST(COALESCE(cs.beneficiary_count, 0) - COALESCE(assignments.assigned_beneficiary_count, 0), 0) AS remaining_beneficiary_count,
      GREATEST(COALESCE(assignments.assigned_beneficiary_count, 0) - COALESCE(cs.beneficiary_count, 0), 0) AS excess_beneficiary_count,
      CASE
        WHEN COALESCE(cs.beneficiary_count, 0) > COALESCE(assignments.assigned_beneficiary_count, 0)
        THEN true
        ELSE false
      END AS can_assign_beneficiaries,
      CASE
        WHEN COALESCE(cs.beneficiary_count, 0) != COALESCE(assignments.assigned_beneficiary_count, 0)
        THEN true
        ELSE false
      END AS can_update_beneficiaries
    `;
  }

  private assignmentSummaryJoin() {
    return `
      LEFT JOIN (
        SELECT customer_id, COUNT(*) AS assigned_beneficiary_count
        FROM ${this.mappingTableName}
        WHERE status IS NULL OR status = 'active'
        GROUP BY customer_id
      ) assignments ON assignments.customer_id = cs.${this.primaryKey}
    `;
  }

  async updateRandomBeneficiaries(customerId: number, userId: number) {
    return this.db.transaction(async (conn) => {
      const [customerRows]: any = await conn.query(
        `
        SELECT ${this.primaryKey}, beneficiary_count
        FROM ${this.tableName}
        WHERE ${this.primaryKey} = ?
        AND role = 'customer'
        LIMIT 1
        FOR UPDATE
        `,
        [customerId],
      );

      if (!customerRows || customerRows.length === 0) {
        throw new NotFoundException('Customer not found');
      }

      const beneficiaryCount = Number(customerRows[0].beneficiary_count ?? 0);

      const [assignedRows]: any = await conn.query(
        `
        SELECT COUNT(*) AS total
        FROM ${this.mappingTableName}
        WHERE customer_id = ?
        AND (status IS NULL OR status = 'active')
        `,
        [customerId],
      );

      const assignedCount = Number(assignedRows[0]?.total ?? 0);
      const difference = beneficiaryCount - assignedCount;

      if (difference === 0) {
        return {
          assignedNow: 0,
          unassignedNow: 0,
          assignedCount,
          beneficiaryCount,
          remainingToAssign: 0,
          excessBeneficiaryCount: 0,
        };
      }

      if (difference < 0) {
        const unassignCount = Math.abs(difference);
        const [mappingRows]: any = await conn.query(
          `
          SELECT id
          FROM ${this.mappingTableName}
          WHERE customer_id = ?
          AND (status IS NULL OR status = 'active')
          ORDER BY RAND()
          LIMIT ${unassignCount}
          `,
          [customerId],
        );

        const mappingIds = mappingRows.map((row) => row.id);

        if (mappingIds.length) {
          await conn.query(
            `
            DELETE FROM ${this.mappingTableName}
            WHERE id IN (?)
            `,
            [mappingIds],
          );
        }

        const newAssignedCount = assignedCount - mappingIds.length;

        return {
          assignedNow: 0,
          unassignedNow: mappingIds.length,
          assignedCount: newAssignedCount,
          beneficiaryCount,
          remainingToAssign: Math.max(beneficiaryCount - newAssignedCount, 0),
          excessBeneficiaryCount: Math.max(newAssignedCount - beneficiaryCount, 0),
        };
      }

      const safeLimit = Math.max(0, Number(difference));
      const [beneficiaryRows]: any = await conn.query(
        `
        SELECT b.beneficiary_id
        FROM beneficiaries b
        WHERE (b.status IS NULL OR b.status = 'active')
        AND NOT EXISTS (
          SELECT 1
          FROM ${this.mappingTableName} cb
          WHERE cb.beneficiary_id = b.beneficiary_id
          AND (cb.status IS NULL OR cb.status = 'active')
        )
        ORDER BY RAND()
        LIMIT ${safeLimit}
        `,
      );

      if (!beneficiaryRows || beneficiaryRows.length < difference) {
        throw new ConflictException('Not enough unassigned beneficiaries available');
      }

      const values = beneficiaryRows.map((row) => [
        customerId,
        row.beneficiary_id,
        'active',
        userId ?? null,
        userId ?? null,
      ]);

      await conn.query(
        `
        INSERT INTO ${this.mappingTableName}
        (customer_id, beneficiary_id, status, created_by, modified_by)
        VALUES ?
        ON DUPLICATE KEY UPDATE
          customer_id = VALUES(customer_id),
          status = VALUES(status),
          modified_by = VALUES(modified_by),
          modified_date = NOW()
        `,
        [values],
      );

      return {
        assignedNow: beneficiaryRows.length,
        unassignedNow: 0,
        assignedCount: assignedCount + beneficiaryRows.length,
        beneficiaryCount,
        remainingToAssign: beneficiaryCount - (assignedCount + beneficiaryRows.length),
        excessBeneficiaryCount: 0,
      };
    });
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
    WHERE cs.role = 'customer'
    ${where.length ? 'AND ' + where.join(' AND ') : ''}
      `;

    const result = await this.db.query(sql, values);
    return result[0]?.total ?? 0;
  }

  async getTotalCount(): Promise<number> {
    const rows: any = await this.db.query(`select count(*) as total from ${this.tableName} where role = ?`, ['customer']);
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
  ${this.assignmentSummarySelect()},
  creator.name AS created_by_name,
  modifier.name AS modified_by_name
  FROM ${this.tableName} cs
  ${this.assignmentSummaryJoin()}
  LEFT JOIN ab_admin creator 
  ON cs.created_by = creator.adminID
  LEFT JOIN ab_admin modifier 
  ON cs.modified_by = modifier.adminID
  WHERE cs.role = 'customer'
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
       ${this.assignmentSummarySelect()},
       creator.name AS created_by_name,
       modifier.name AS modified_by_name
      FROM ${this.tableName} cs
      ${this.assignmentSummaryJoin()}
      LEFT JOIN ab_admin creator 
      ON cs.created_by = creator.adminID
      LEFT JOIN ab_admin modifier 
      ON cs.modified_by = modifier.adminID
      WHERE cs.role = 'customer'
      ${where.length ? 'AND ' + where.join(' AND ') : ''}
      ORDER BY cs.${this.primaryKey} DESC
      LIMIT ${safeLimit} OFFSET ${safeOffset}
    `;

    const rows = await this.db.query(sql, values);
    return rows;
  }

  async getCustomersByid(customerId: number) {
    const rows = await this.db.query(
      `
      SELECT cs.*,
      ${this.assignmentSummarySelect()}
      FROM ${this.tableName} cs
      ${this.assignmentSummaryJoin()}
      WHERE cs.${this.primaryKey} = ?
      AND cs.role = ?
      LIMIT 1
      `,
      [customerId, 'customer']
    );
    return rows;
  }

  async getAssignedBeneficiaries(customerId: number, page: number, limit: number) {
    const safeLimit = Math.max(1, Number(limit));
    const safeOffset = Math.max(0, Number((page - 1) * limit));

    const rows = await this.db.query(
      `
      SELECT
        cb.*,
        bf.first_name,
        bf.last_name,
        bf.mobile_no,
        bf.national_id,
        bf.training_site,
        tr.training_site AS training_site_name
      FROM ${this.mappingTableName} cb
      LEFT JOIN beneficiaries bf
      ON bf.beneficiary_id = cb.beneficiary_id
      LEFT JOIN training_sites tr
      ON tr.training_point_id = bf.training_site
      WHERE cb.customer_id = ?
      AND (cb.status IS NULL OR cb.status = 'active')
      ORDER BY cb.id DESC
      LIMIT ${safeLimit} OFFSET ${safeOffset}
      `,
      [customerId],
    );

    return rows;
  }

  async getAssignedBeneficiariesTotal(customerId: number): Promise<number> {
    const rows: any = await this.db.query(
      `
      SELECT COUNT(*) AS total
      FROM ${this.mappingTableName}
      WHERE customer_id = ?
      AND (status IS NULL OR status = 'active')
      `,
      [customerId],
    );

    return rows[0]?.total ?? 0;
  }

  async deleteCustomerId(customerId: number) {
    const rows:any = await this.db.query(
      `update ${this.tableName} set status = ? where ${this.primaryKey} = ? AND role = ? LIMIT 1`,
      ['inactive', customerId, 'customer']
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
      const rows = await this.db.query(
        `
        SELECT
          cs.${this.primaryKey},
          cs.name,
          cs.beneficiary_count,
          ${this.assignmentSummarySelect()}
        FROM ${this.tableName} cs
        ${this.assignmentSummaryJoin()}
        WHERE cs.role = ?
        ORDER BY cs.name ASC
        `,
        ['customer'],
      );
      return rows;
    }
    catch (error) {
      console.error("getAllCustomer DB error is" + error);
      throw error;
    }
  }

  private validCoordinateWhere(alias = 'bf') {
    return `
      AND CAST(${alias}.latitude AS CHAR) REGEXP '^-?[0-9]+(\\.[0-9]+)?$'
      AND CAST(${alias}.longitude AS CHAR) REGEXP '^-?[0-9]+(\\.[0-9]+)?$'
      AND CAST(${alias}.latitude AS DOUBLE) BETWEEN -90 AND 90
      AND CAST(${alias}.longitude AS DOUBLE) BETWEEN -180 AND 180
    `;
  }

  private dashboardFromWhere(customerId?: number | null, includeAllBeneficiaries = false) {
    const scopedFromWhere = `
      FROM ${this.mappingTableName} cb
      INNER JOIN beneficiaries bf
      ON bf.beneficiary_id = cb.beneficiary_id
      WHERE (cb.status IS NULL OR cb.status = 'active')
      AND (bf.status IS NULL OR bf.status = 'active')
      ${customerId ? 'AND cb.customer_id = ?' : ''}
    `;
    const allFrom = `
      FROM beneficiaries bf
      WHERE (bf.status IS NULL OR bf.status = 'active')
    `;
    const fromClause = includeAllBeneficiaries ? allFrom : scopedFromWhere;
    const values = !includeAllBeneficiaries && customerId ? [customerId] : [];

    return { fromClause, values };
  }

  private mapFromWhere(customerId: number) {
    return `
      FROM ${this.mappingTableName} cb
      INNER JOIN beneficiaries bf
      ON bf.beneficiary_id = cb.beneficiary_id
      LEFT JOIN training_sites tr
      ON tr.training_point_id = bf.training_site
      WHERE (cb.status IS NULL OR cb.status = 'active')
      AND (bf.status IS NULL OR bf.status = 'active')
      AND cb.customer_id = ?
    `;
  }

  async getDashboardSummary(customerId?: number | null, includeAllBeneficiaries = false) {
    const { fromClause, values } = this.dashboardFromWhere(customerId, includeAllBeneficiaries);

    const aggregateRows: any = await this.db.query(
      `
      SELECT
        COUNT(DISTINCT bf.beneficiary_id) AS totalCookstovesDeployed,
        COALESCE(SUM(COALESCE(bf.females_below_18, 0)), 0) AS girlsBelow18,
        COALESCE(SUM(COALESCE(bf.males_below_18, 0)), 0) AS boysBelow18,
        COALESCE(SUM(COALESCE(bf.females_above_18, 0)), 0) AS adultWomen18Plus,
        COALESCE(SUM(COALESCE(bf.males_above_18, 0)), 0) AS adultMen18Plus
      ${fromClause}
      `,
      values,
    );

    const mapLocationCountRows: any = await this.db.query(
      `
      SELECT COUNT(DISTINCT bf.beneficiary_id) AS total
      ${fromClause}
      ${this.validCoordinateWhere('bf')}
      `,
      values,
    );

    const monthRows: any = await this.db.query(
      `
      SELECT
        DATE_FORMAT(COALESCE(bf.distribution_date, bf.created_date), '%Y-%m') AS month,
        COUNT(DISTINCT bf.beneficiary_id) AS beneficiaryCount
      ${fromClause}
      AND COALESCE(bf.distribution_date, bf.created_date) >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 4 MONTH), '%Y-%m-01')
      GROUP BY DATE_FORMAT(COALESCE(bf.distribution_date, bf.created_date), '%Y-%m')
      ORDER BY month ASC
      `,
      values,
    );

    return {
      aggregate: aggregateRows[0] ?? {},
      mapLocationCount: mapLocationCountRows[0]?.total ?? 0,
      carbonCreditsByMonth: monthRows,
    };
  }

  async getMapTotalInBounds(customerId: number, bounds: any): Promise<number> {
    const rows: any = await this.db.query(
      `
      SELECT COUNT(DISTINCT bf.beneficiary_id) AS total
      ${this.mapFromWhere(customerId)}
      ${this.validCoordinateWhere('bf')}
      AND CAST(bf.latitude AS DOUBLE) BETWEEN ? AND ?
      AND CAST(bf.longitude AS DOUBLE) BETWEEN ? AND ?
      `,
      [customerId, bounds.south, bounds.north, bounds.west, bounds.east],
    );

    return Number(rows[0]?.total ?? 0);
  }

  async getMapClusters(customerId: number, bounds: any, gridSize: number) {
    const rows = await this.db.query(
      `
      SELECT
        AVG(CAST(bf.latitude AS DOUBLE)) AS latitude,
        AVG(CAST(bf.longitude AS DOUBLE)) AS longitude,
        COUNT(DISTINCT bf.beneficiary_id) AS count
      ${this.mapFromWhere(customerId)}
      ${this.validCoordinateWhere('bf')}
      AND CAST(bf.latitude AS DOUBLE) BETWEEN ? AND ?
      AND CAST(bf.longitude AS DOUBLE) BETWEEN ? AND ?
      GROUP BY
        FLOOR(CAST(bf.latitude AS DOUBLE) / ?),
        FLOOR(CAST(bf.longitude AS DOUBLE) / ?)
      ORDER BY count DESC
      LIMIT 1000
      `,
      [customerId, bounds.south, bounds.north, bounds.west, bounds.east, gridSize, gridSize],
    );

    return rows;
  }

  async getMapPoints(customerId: number, bounds: any, limit: number) {
    const safeLimit = Math.min(Math.max(1, Number(limit)), 1000);
    const rows = await this.db.query(
      `
      SELECT
        bf.beneficiary_id,
        bf.first_name,
        bf.last_name,
        tr.training_site AS training_site_name,
        bf.mobile_no,
        CAST(bf.latitude AS DOUBLE) AS latitude,
        CAST(bf.longitude AS DOUBLE) AS longitude
      ${this.mapFromWhere(customerId)}
      ${this.validCoordinateWhere('bf')}
      AND CAST(bf.latitude AS DOUBLE) BETWEEN ? AND ?
      AND CAST(bf.longitude AS DOUBLE) BETWEEN ? AND ?
      ORDER BY bf.beneficiary_id DESC
      LIMIT ${safeLimit}
      `,
      [customerId, bounds.south, bounds.north, bounds.west, bounds.east],
    );

    return rows;
  }
}

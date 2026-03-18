/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */
import { ConflictException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CreateBeneficiarydto } from '../create-benificiary.dto';
import { OPERATOR_SQL } from 'src/filters/operator.map';
import { UpdateBeneficiaryDto } from '../update-beneficiary-site-dto';
import * as Sentry from '@sentry/node';



@Injectable()
export class BeneficiaryRepositoryService {
  constructor(private readonly db: DatabaseService) { }

  //   async insertDataBeneficiary(data: CreateBeneficiarydto, username: string, connection) {
  //     try {
  //       const {
  //         training_site,
  //         first_name,
  //         last_name,
  //         mobile_no,
  //         other_cookstove,
  //         females_above_18,
  //         females_below_18,
  //         males_below_18,
  //         males_above_18,
  //         cooking_method,
  //         district_name,
  //         national_id,
  //         national_id_attachment,
  //         house_pic,
  //         cookstove_pic,
  //         signature,
  //         emp_id,
  //         language,
  //         read_doc,
  //         understood_doc,
  //         emp_sign,
  //         read_to_you,
  //         stove_status_delivery,
  //         no_other_cook_stove_present,
  //         primary_residence_confirmation,
  //         cookstove_pic_timestamp,
  //         house_pic_timestamp,
  //         national_id_timestamp,
  //         signature_timestamp,
  //         device_serial_no,
  //         latitude,
  //         longitude,
  //         geo_address,
  //         created_by,
  //         modified_by,
  //         status,
  //         s_is_sync
  //       } = data;

  //       const [result] = await connection.query(

  //         `
  //             INSERT INTO beneficiaries
  //             (
  //               training_site,
  //                 first_name,
  //                 last_name,
  //                 mobile_no,
  //                 other_cookstove,
  //                 females_above_18,
  //                 females_below_18,
  //                 males_below_18,
  //                 males_above_18,
  //                 cooking_method,
  //                 district_name,
  //                 national_id,
  //                 national_id_attachment,
  //                 house_pic,
  //                 cookstove_pic,
  //                 signature,
  //                 emp_id,
  //                 language,
  //                 read_doc,
  //                 understood_doc,
  //                 emp_sign,
  //                 read_to_you,
  //                 stove_status_delivery,
  //                 no_other_cook_stove_present,
  //                 primary_residence_confirmation,
  //                 cookstove_pic_timestamp,
  //                 house_pic_timestamp,
  //                 national_id_timestamp,
  //                 signature_timestamp,
  //                 device_serial_no,
  //                 latitude,
  //                 longitude,
  //                 geo_address,
  //                 created_by,
  //                 modified_by,
  //                 status,
  //                 s_is_sync
  //             )
  // VALUES (?, ?, ?, ?, ?, ?, ?, ?,?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  //         [
  //           training_site ?? null,
  //           first_name ?? null,
  //           last_name ?? null,
  //           mobile_no ?? null,
  //           other_cookstove ?? null,
  //           females_above_18 ?? null,
  //           females_below_18 ?? null,
  //           males_below_18 ?? null,
  //           males_above_18 ?? null,
  //           cooking_method ?? null,
  //           district_name ?? null,
  //           national_id ?? null,
  //           national_id_attachment ?? null,
  //           house_pic ?? null,
  //           cookstove_pic ?? null,
  //           signature ?? null,
  //           emp_id ?? null,
  //           language ?? null,
  //           read_doc ?? null,
  //           understood_doc ?? null,
  //           emp_sign ?? null,
  //           read_to_you ?? null,
  //           stove_status_delivery ?? null,
  //           no_other_cook_stove_present ?? null,
  //           primary_residence_confirmation ?? null,
  //           cookstove_pic_timestamp ?? null,
  //           house_pic_timestamp ?? null,
  //           national_id_timestamp ?? null,
  //           signature_timestamp ?? null,
  //           device_serial_no ?? null,
  //           latitude ?? null,
  //           longitude ?? null,
  //           geo_address ?? null,
  //           username ?? null,
  //           modified_by ?? null,
  //           status ?? null,
  //           s_is_sync ?? null
  //         ],
  //       );


  //       return result;
  //     }
  //     catch (error: any) {

  //       console.error('❌ insertTraining DB error:', error);

  //       if (error.code === 'ER_DUP_ENTRY') {
  //         throw new ConflictException('Training site already exists');
  //       }

  //       // Foreign key constraint (created_by user missing)
  //       if (error.code === 'ER_NO_REFERENCED_ROW_2') {
  //         throw new ConflictException('Invalid user reference');
  //       }

  //       // Fallback
  //       throw new InternalServerErrorException(
  //         'Failed to create training site',
  //       );
  //     }
  //   }

  async insertDataBeneficiary(
    data: CreateBeneficiarydto,
    userId: number,
    connection
  ) {
    try {

      const payload = {
        ...data,
        created_by: userId
      };

      // ❗ remove flags (not DB columns)
      delete payload.remove_national_id;
      delete payload.remove_signature;
      delete payload.remove_house_pic;
      delete payload.remove_cookstove_pic;

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
        `INSERT INTO beneficiaries (${columns}) VALUES (${placeholders})`,
        values
      );

      return result;

    } catch (error: any) {

      Sentry.captureException(error);

      console.error("❌ insertBeneficiary DB error:", error);

      if (error.code === "ER_DUP_ENTRY") {

        const duplicateValue = error.sqlMessage.match(/Duplicate entry '(.+?)'/)?.[1];
        const key = error.sqlMessage.match(/for key '(.+?)'/)?.[1];

        if (key === "nunique") {
          throw new ConflictException(`National ID ${duplicateValue} already exists`);
        }

        if (key === "device_serial_no") {
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

  async updateFilesPath(beneficiaryId: number, files: any, connection) {

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

      const [result] = await connection.query(sql, values);

      return result;

    } catch (error) {
      Sentry.captureException(error);

      console.error("UpdateFilepath error", error);

      throw new InternalServerErrorException(
        'Failed to update beneficiary file paths'
      );
    }
  }




  async getBeneficiaryById(bid: number) {
    try {
      const rows = await this.db.query(
        'SELECT * FROM beneficiaries WHERE beneficiary_id = ? LIMIT 1',
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
      const rows: any = await this.db.query('select count(*) as total from beneficiaries',);
      return rows[0].total;
    }
    catch (error) {
      Sentry.captureException(error);

      console.error("getTotalCount error is", error)
      throw error;
    }
  }

  async getFilteredCount(filters: any[]) {
    try {
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
      FROM beneficiaries bf
      LEFT JOIN ab_admin a ON bf.created_by = a.adminID
      LEFT JOIN ab_admin a2 ON bf.modified_by = a2.adminID
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    `;

      const result = await this.db.query(sql, values);
      return result.total;
    }
    catch (error) {
      Sentry.captureException(error);

      console.error("getFilteredCount is", error)
    }
  }


  async findWithFilters(filters: any[], page: number, limit: number) {
    try {
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
        SELECT bf.*,
            a.name AS created_by_name,
        a2.name AS modified_by_name
        FROM beneficiaries bf
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
      a.name AS created_by_name,
        a2.name AS modified_by_name
      FROM beneficiaries bf
       LEFT JOIN ab_admin a ON bf.created_by = a.adminID
      LEFT JOIN ab_admin a2 ON bf.modified_by = a2.adminID
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
    connection: any,
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
        Object.entries(updateData).filter(([_, value]) => value !== undefined),
      );

      const fields = Object.keys(filteredData);

      if (!fields.length) {
        return { message: 'Nothing to update' };
      }

      const setClause = fields.map(field => `${field} = ?`).join(', ');
      const values = Object.values(filteredData);

      const sql = `
    UPDATE beneficiaries
    SET ${setClause},
        modified_date = NOW(),
        modified_by = ?
    WHERE beneficiary_id = ?
  `;

      await connection.query(sql, [...values, userid, beneficiaryId]);
    }
    catch (error) {
      Sentry.captureException(error);

      console.error("updateBeneficiary error is", error)
      if (error.code === "ER_DUP_ENTRY") {

        const msg = error.sqlMessage;

        if (msg.includes("national_id")) {
          throw new ConflictException("National ID already exists");
        }

        if (msg.includes("device_serial_no")) {
          throw new ConflictException("Device serial number already exists");
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

  async deleteBeneficiaryId(bid: number) {
    try {
      const [rows] = await this.db.query(
        'delete FROM beneficiaries WHERE beneficiary_id = ? LIMIT 1',
        [bid]
      );
      return rows;
    }
    catch (error) {
      Sentry.captureException(error);

      console.error("getFilteredCount is", error)
    }
  }

}


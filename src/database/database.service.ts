/* eslint-disable @typescript-eslint/require-await */

import { Injectable } from '@nestjs/common';
import * as mysql from 'mysql2/promise';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DatabaseService {
  private pool;

  constructor(private config: ConfigService) {
    this.pool = mysql.createPool({
    host: config.get('DB_HOST'),
      user: config.get('DB_USER'),
      password: config.get('DB_PASSWORD'),
      database: config.get('DB_NAME'),
    });
  }

  query(sql: string, params: any[] = []) {
    return this.pool.execute(sql, params);
  }

  async getConnection() {
    return this.pool.getConnection();
  }
}

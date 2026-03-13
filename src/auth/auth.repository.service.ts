/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */import { Injectable } from "@nestjs/common";
import { DatabaseService } from "src/database/database.service";


@Injectable()
export class AuthRepositoryService {

    constructor(private readonly db: DatabaseService) { }

    async loginemail(email: string) {

        const [rows]: any = await this.db.query(
            'SELECT adminID, email ,name,password FROM ab_admin WHERE email = ? or user_name =? LIMIT 1',
            [email,email]
        );

        return rows;
    }

    async blacklistToken(data) {

  const query = `
    INSERT INTO token_blacklist (token, expires_at)
    VALUES (?, ?)
  `;

  await this.db.query(query, [data.token, data.expires_at]);
}

async isTokenBlacklisted(token: string): Promise<boolean> {

  const query = `
    SELECT id FROM token_blacklist
    WHERE token = ?
    LIMIT 1
  `;

  const [rows] = await this.db.query(query, [token]);

  return rows.length > 0;
}


async deleteExpiredTokens() {
  const query = `
    DELETE FROM token_blacklist
    WHERE expires_at < NOW()
  `;

  await this.db.query(query);
}


}

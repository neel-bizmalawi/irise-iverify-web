/* eslint-disable prettier/prettier */
import { Injectable } from "@nestjs/common";
import { DatabaseService } from "src/database/database.service";


@Injectable()
export class AuthRepositoryService {

    constructor(private readonly db: DatabaseService) { }

    async loginemail(email: string) {

        const [rows]: any = await this.db.query(
            'SELECT id, email ,name,password FROM users WHERE email = ? LIMIT 1',
            [email],
        );

        return rows;
    }
}
/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CreateBeneficiarydto } from '../create-benificiary.dto';

@Injectable()
export class BeneficiaryRepositoryService {
    constructor(private readonly db:DatabaseService){ }

    async insertBeneficiary(data:CreateBeneficiarydto)
    {
        
    }
}

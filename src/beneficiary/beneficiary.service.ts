/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { BeneficiaryRepositoryService } from './beneficiary.repository/beneficiary.repository.service';
import { CreateBeneficiarydto } from './create-benificiary.dto';

@Injectable()
export class BeneficiaryService {

    constructor(private readonly beneficiaryRepo:BeneficiaryRepositoryService){}

    async CreateBeneficiaryService(dto:CreateBeneficiarydto){

        const data= await this.beneficiaryRepo.insertBeneficiary(dto);
    }

}

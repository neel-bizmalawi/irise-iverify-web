/* eslint-disable prettier/prettier */
import { Body, Controller, Post } from '@nestjs/common';
import { BeneficiaryService } from './beneficiary.service';
import { CreateBeneficiarydto } from './create-benificiary.dto';

@Controller('beneficiary')
export class BeneficiaryController {

    constructor(private readonly beneficiaryservice:BeneficiaryService)
    {
        
    }

    @Post('create_beneficiary')
    async CreateBeneficiary(@Body() dto:CreateBeneficiarydto)
    {
        return this.beneficiaryservice.CreateBeneficiaryService(dto);
    }
}

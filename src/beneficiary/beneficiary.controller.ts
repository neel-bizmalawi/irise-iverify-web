/* eslint-disable prettier/prettier */
import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { BeneficiaryService } from './beneficiary.service';
import { CreateBeneficiarydto } from './create-benificiary.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('beneficiary')
export class BeneficiaryController {

    constructor(private readonly beneficiaryservice:BeneficiaryService)
    {
        
    }

    @Post('create_beneficiary')
   @UseGuards(AuthGuard('jwt'))
    
    async CreateBeneficiary(@Body() dto:CreateBeneficiarydto)
    {
        return this.beneficiaryservice.CreateBeneficiaryService(dto);
    }
}

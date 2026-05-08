/* eslint-disable prettier/prettier */
import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, Req, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { BeneficiaryService } from './beneficiary.service';
import { CreateBeneficiarydto } from './create-benificiary.dto';
import { AuthGuard } from '@nestjs/passport';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { UpdateBeneficiaryDto } from './update-beneficiary-site-dto';

@Controller('beneficiary')
export class BeneficiaryController {

    constructor(private readonly beneficiaryservice: BeneficiaryService) {

    }

    @Post('create_beneficiary')
    @UseGuards(AuthGuard('jwt'))
    @UseInterceptors(
        FileFieldsInterceptor([ //basically for processing file on server
            { name: 'national_id_attachment', maxCount: 1 },
            { name: 'signature', maxCount: 1 },
            { name: 'house_pic', maxCount: 1 },
            { name: 'cookstove_pic', maxCount: 1 },
        ]),
    )
    async createBeneficiary(
        @Body() createBeneficiaryDto: CreateBeneficiarydto,
        @Req() req: any,
        @UploadedFiles()
        files: {
            national_id_attachment?: Express.Multer.File[];
            signature?: Express.Multer.File[];
            house_pic?: Express.Multer.File[];
            cookstove_pic?: Express.Multer.File[];
        },
    ) {
        const nationalIdFile = files?.national_id_attachment?.[0];
        const signatureFile = files?.signature?.[0];
        const housholdFile = files?.house_pic?.[0];
        const cookstoveFile = files?.cookstove_pic?.[0];
        const userId = req.user.userId;

        return this.beneficiaryservice.createBeneficiary(
            createBeneficiaryDto,
            nationalIdFile,
            signatureFile,
            housholdFile,
            cookstoveFile,
            userId,
        );
    }


    @Put('update-beneficiary/:id')
    @UseGuards(AuthGuard('jwt'))
    @UseInterceptors(
        FileFieldsInterceptor([
            { name: 'national_id_attachment', maxCount: 1 },
            { name: 'signature', maxCount: 1 },
            { name: 'house_pic', maxCount: 1 },
            { name: 'cookstove_pic', maxCount: 1 },
        ]),
    )
    async updateBeneficiary(
        @Body() udto: UpdateBeneficiaryDto,
        @Param('id') id: string,
        @Req() req: any,
        @UploadedFiles()
        files: {
            national_id_attachment?: Express.Multer.File[];
            signature?: Express.Multer.File[];
            house_pic?: Express.Multer.File[];
            cookstove_pic?: Express.Multer.File[];
        },
    ) {
        const nationalIdFile = files?.national_id_attachment?.[0];
        const signatureFile = files?.signature?.[0];
        const housholdFile = files?.house_pic?.[0];
        const cookstoveFile = files?.cookstove_pic?.[0];

        const userId = req.user.userId;

        return this.beneficiaryservice.updateBeneficiary(
            udto,
            nationalIdFile,
            signatureFile,
            housholdFile,
            cookstoveFile,
            Number(id),
            userId,
        );
    }

    @Get('get_beneficiary/:id')
    async getBeneficiaryData(
        @Param('id', ParseIntPipe) id: number) {
        return this.beneficiaryservice.getBeneficiaryData(id)
    }

    @Get('get_miss_natinoID')
    async getMissNationId() {
        return this.beneficiaryservice.getMissingNID()
    }

    @Get('get_household_count')
    async getHouseHoldCount() {
        return this.beneficiaryservice.getHouseHoldCount()
    }


    @Post('list')
    async getBeneficiary(
        @Query('page') page = '1',
        @Query('limit') limit = '10',
        @Body('filters') filters: any[] = [],
    ) {
        return this.beneficiaryservice.getBeneficiarylist(
            Number(page),
            Number(limit),
            filters,
        );
    }


    @Delete('delete_beneficiary/:id')
    async deleteBeneficiary(@Param('id', ParseIntPipe) id: number,) {

        return this.beneficiaryservice.deleteBeneficiary(id)
    }


    @Post('Beneficiary_data')
    async getupdatedataBeneficiary(@Body('date') date: string) {
        return this.beneficiaryservice.getupdateData(new Date(date));
    }


    @Post('bene_sync')
    @UseGuards(AuthGuard('jwt'))
    @UseInterceptors(
        FileFieldsInterceptor([
            { name: 'national_id_attachment', maxCount: 1 },
            { name: 'signature', maxCount: 1 },
            { name: 'house_pic', maxCount: 1 },
            { name: 'cookstove_pic', maxCount: 1 },
        ]),
    )
    async syncBeneficiary(
        @Body() sdto: CreateBeneficiarydto,
        @Req() req: any,
        @UploadedFiles()
        files: {
            national_id_attachment?: Express.Multer.File[];
            signature?: Express.Multer.File[];
            house_pic?: Express.Multer.File[];
            cookstove_pic?: Express.Multer.File[];
        },
    ) {
        const nationalIdFile = files?.national_id_attachment?.[0];
        const signatureFile = files?.signature?.[0];
        const householdFile = files?.house_pic?.[0];
        const cookstoveFile = files?.cookstove_pic?.[0];
        const userId = req.user.userId;

        return this.beneficiaryservice.syncBeneficiary(
            sdto,
            nationalIdFile,
            signatureFile,
            householdFile,
            cookstoveFile,
            userId,
        );
    }

}

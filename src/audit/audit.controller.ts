/* eslint-disable prettier/prettier */
import { Body, Controller, Delete, Param, ParseIntPipe, Post, Put, Query, Req, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { AuditService } from './audit.service';
import { CreateAuditDto } from './createAudit.dto';
import { updateAuditDto } from './updateAudit.dto';

@Controller('audit')
export class AuditController {
    constructor(private readonly auditService: AuditService) {

    }

    @Post('create_audit')
    @UseGuards(AuthGuard('jwt'))
    @UseInterceptors(
        FileFieldsInterceptor([ //basically for processing file on server
            { name: 'cook_stove_img', maxCount: 1 },
            { name: 'cook_stove_area_img', maxCount: 1 },

        ]),
    )
    async CreateAudit(@Body() dto: CreateAuditDto, @Req() req: any, @UploadedFiles()
    files: {
        cook_stove_img?: Express.Multer.File[];
        cook_stove_area_img?: Express.Multer.File[];

    }) {
        try {
            const cookstoveFile = files?.cook_stove_img?.[0];
            const cookstoveareaFile = files?.cook_stove_area_img?.[0];

            const userId = req.user.userId;
            const result = await this.auditService.CreateAuditing(dto, cookstoveFile, cookstoveareaFile, userId);
            return result;
        }
        catch (error) {
            console.error("Create Audit controlelr Error", error)
        }
    }

    @Post('update_audit/:id')
    @UseGuards(AuthGuard('jwt'))
    @UseInterceptors(
        FileFieldsInterceptor([ //basically for processing file on server
            { name: 'cook_stove_img', maxCount: 1 },
            { name: 'cook_stove_area_img', maxCount: 1 },
        ]),
    )
    async updateAudit(@Body() udto: updateAuditDto, @Param('id') id: string, @Req() req: any, @UploadedFiles()
    files: {
        cook_stove_img?: Express.Multer.File[];
        cook_stove_area_img?: Express.Multer.File[];

    },) {
        const cookstoveFile = files?.cook_stove_img?.[0];
        const cookstoveareaFile = files?.cook_stove_area_img?.[0];

        const userId = req.user.userId;
        return this.auditService.updateAudit(udto, cookstoveFile, cookstoveareaFile, Number(id), userId);
    }


    @Post('list')
    async getTrainingSites(
        @Query('page') page = '1',
        @Query('limit') limit = '10',
        @Body('filters') filters: any[] = [],
    ) {
        return this.auditService.getMonitorings(
            Number(page),
            Number(limit),
            filters,
        );
    }

    @Delete('delete/:id')
    async deleteAudit(@Param('id', ParseIntPipe) id: number,) {

        return this.auditService.deleteAudit(id)
    }


    @Post('audit_sync')
    @UseGuards(AuthGuard('jwt'))
    @UseInterceptors(
        FileFieldsInterceptor([
            { name: 'cook_stove_img', maxCount: 1 },
            { name: 'cook_stove_area_img', maxCount: 1 },]),
    )
    async syncAudit(
        @Body() sdto: CreateAuditDto,
        @Req() req: any,
        @UploadedFiles()
        files: {
            cook_stove_img?: Express.Multer.File[];
            cook_stove_area_img?: Express.Multer.File[];
        },
    ) {
        const cookstoveFile = files?.cook_stove_img?.[0];
        const cookstoveareaFile = files?.cook_stove_area_img?.[0];

        const userId = req.user.userId;

        return this.auditService.syncAudits(
            sdto,
            cookstoveFile,
            cookstoveareaFile,
            userId,
        );
    }


    @Post('audit_data')
    async getUpdatedAudit(@Body('date') date: string) {
        return this.auditService.getupdateData(new Date(date));
    }

          @Put('ustatus/:id')
        async setStatus(@Param('id', ParseIntPipe) id: number,) {
    
            return this.auditService.setStausAudit(id)
        }
}

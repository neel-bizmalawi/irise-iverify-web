/* eslint-disable prettier/prettier */
import { Body, Controller, Delete, Param, ParseIntPipe, Post, Query, Req, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { MonitoringService } from './monitoring.service';
import { AuthGuard } from '@nestjs/passport';
import { CreateMonitoringDto } from './createmonitoring.dto';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { UpdateMonitoringdto } from './updatemonitoring.dto';

@Controller('monitoring')
export class MonitoringController {

    constructor(private readonly monitorService: MonitoringService) {

    }

    @Post('create_monitoring')
    @UseGuards(AuthGuard('jwt'))
    @UseInterceptors(
        FileFieldsInterceptor([ //basically for processing file on server
            { name: 'photo_path', maxCount: 1 },
        ]),
    )
    async CreateMonitoring(@Body() dto: CreateMonitoringDto, @Req() req: any, @UploadedFiles()
    files: {
        photo_path?: Express.Multer.File[];
    }) {
        const cookstove_photo = files?.photo_path?.[0];

        const userId = req.user.userId;
        return this.monitorService.CreateMonitoring(dto, cookstove_photo, userId);
    }


    @Post('update-monitoring/:id')
    @UseGuards(AuthGuard('jwt'))
    @UseInterceptors(
        FileFieldsInterceptor([ //basically for processing file on server
            { name: 'photo_path', maxCount: 1 },
        ]),
    )
    async updateMonitoring(@Body() udto: UpdateMonitoringdto, @Param('id') id: string,@Req() req: any, @UploadedFiles()
        files: {
            photo_path?: Express.Multer.File[];
        },) {
        const cookstove_photo = files?.photo_path?.[0];

        const userId = req.user.userId;
        return this.monitorService.UpdateMonitoring(udto, cookstove_photo,Number(id), userId);
    }


    @Post('list')
    async getTrainingSites(
        @Query('page') page = '1',
        @Query('limit') limit = '10',
        @Body('filters') filters: any[] = [],
    ) {
        return this.monitorService.getMonitorings(
            Number(page),
            Number(limit),
            filters,
        );
    }


    @Delete('delete/:id')
    async deleteMonitoring(@Param('id', ParseIntPipe) id: number,) {

        return this.monitorService.deleteMonitroing(id)
    }
}

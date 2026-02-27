/* eslint-disable prettier/prettier */
import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { TrainingSiteService } from './training_site.service';
import { CreateTrainingSiteDto } from './create-training-site.dto';
import { AuthGuard } from '@nestjs/passport';
import type { Response, Request } from 'express';


@Controller('training-site')
export class TrainingSiteController {
    constructor(private readonly TrainingSiteService: TrainingSiteService) {
        console.log("UserController loaded");

    }

    @Get('training_set')
    async fetchAll(
        @Query('page') page: string,
        @Query('limit') limit: string,
    ) {
        const pageNumber = Number(page) || 1;
        const limitNumber = Number(limit) || 100;
        return this.TrainingSiteService.getAll(pageNumber, limitNumber);
    }

    @Get('district_slug')
    async fetchDistrict() {

        return this.TrainingSiteService.getDistrict();
    }

    @Get('authority_slug')
    async fetchAuthority() {

        return this.TrainingSiteService.getAuthority();
    }

    @Post('create_training')
    @UseGuards(AuthGuard('jwt'))
    async CreateTraining(@Body() dto: CreateTrainingSiteDto, @Req() req: any,) {
        const userId = req.user.userId;
        console.log("user id is", userId)
        return this.TrainingSiteService.createTraining(dto, userId);
    }

    @Put('Update_Trainig/:id')
    @UseGuards(AuthGuard('jwt'))
    async updateTraining(
        @Param('id') id: string,
        @Body() dto: CreateTrainingSiteDto,@Req() req: any,) {
                    const userId = req.user.userId;

        return this.TrainingSiteService.updateTrain(
            Number(id),
            dto,
            Number(userId),
        );
    }

    @Get('get_training/:id')
    async getTrainingData(
        @Param('id', ParseIntPipe) id: number) {
        return this.TrainingSiteService.getTrainingData(id)
    }



    @Delete('delete_training/:id')
    async deleteTrainingData(@Param('id', ParseIntPipe) id: number,) {

        return this.TrainingSiteService.deleteTraining(id)
    }





    // @Post('filter')
    // async  filterUsers(@Body('filters') filters:any[]){
    //     return this.TrainingSiteService.getFilteredUsers(filters);
    // }


    @Post('list')
    async getTrainingSites(
        @Query('page') page = '1',
        @Query('limit') limit = '10',
        @Body('filters') filters: any[] = [],
    ) {
        return this.TrainingSiteService.getTrainingSites(
            Number(page),
            Number(limit),
            filters,
        );
    }
}

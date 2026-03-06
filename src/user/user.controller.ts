/* eslint-disable prettier/prettier */
import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './user.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('user')
export class UserController {

    constructor(private readonly userService: UserService) {

    }

    @Post('create_user')
    @UseGuards(AuthGuard('jwt'))
    async CreateUser(@Body() dto: CreateUserDto, @Req() req: any,) {
        const userId = req.user.userId;
        console.log("userid is", userId);
        return this.userService.CreateUser(dto, userId);
    }

    @Get('getAllUsers')
    async getAllusers()
    {
        return this.userService.getAll();
    }

    @Put('update_user/:id')
    @UseGuards(AuthGuard('jwt'))
    async UpdateUser(
        @Param('id') id: number,
        @Body() dto: CreateUserDto, @Req() req: any,) {
        console.log("param id is", id);
        const userId = req.user.userId;
        console.log("userid is", userId);
        return this.userService.UpdateUser(id, dto, userId);
    }


    @Get('list')
    async getTrainingSites(
        @Query('page') page = '1',
        @Query('limit') limit = '10',
        @Body('filters') filters: any[] = [],
    ) {
        return this.userService.getUsers(
            Number(page),
            Number(limit),
            filters,
        );
    }



    @Get('get_user/:id')
    async getTrainingData(
        @Param('id', ParseIntPipe) id: number) {
        return this.userService.getUserById(id)
    }


    @Delete('delete_user/:id')
    async deleteTrainingData(@Param('id', ParseIntPipe) id: number,) {

        return this.userService.deleteUser(id)
    }

    @Get('get_role')
    async getUserRole()
    {
        return this.userService.getUserRoles();
    }
}

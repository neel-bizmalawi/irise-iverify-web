/* eslint-disable prettier/prettier */
import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { CreateUserDto } from './user.dto';
import { UserRepositoryService } from './user.repository/user.repository.service';
import { TrainingSiteRepositoryService } from 'src/training_site/training_site.repository/training_site.repository.service';
import { TRAINING_SITES_FILTER_SCHEMA } from 'src/training_site/training-sites.filter.schema';

@Injectable()
export class UserService {

    constructor(private readonly userRepo: UserRepositoryService, private readonly trainingSiteRepo: TrainingSiteRepositoryService) {

    }

    async CreateUser(dto: CreateUserDto, userId: number) {

        const user = await this.trainingSiteRepo.getUserById(userId);

        const username = user.name;

        console.log("user name20 is", username)

        try {
            const result: any = await this.userRepo.insertUser(dto, username);

            // 3️⃣ Check success
            if (result && result.affectedRows === 1) {
                return {
                    success: true,
                    message: 'User added successfully',
                    userId: result.insertId,
                };
            }

            throw new InternalServerErrorException("Failed to add user");
        }
        catch (error) {
            console.error("CreateUser error", error)

            throw new InternalServerErrorException(
                'Failed to add user',
            )
        }
    }






    async UpdateUser(adminId: number, dto: CreateUserDto, userId: number) {

        const user = await this.trainingSiteRepo.getUserById(userId);

        const username = user.name;


        try {
            const result: any = await this.userRepo.UpdateById(adminId, dto, username);


            if (result && result.affectedRows === 1) {
                console.log("inside result block of if")
                return {
                    success: true,
                    message: 'User Updated successfully',
                };
            }

            throw new InternalServerErrorException("Failed to update user");
        }
        catch (error) {
            console.error("CreateUser error", error)
            console.log("error is inside catch", error);

            throw new InternalServerErrorException(
                'Failed to update user',
            )
        }
    }


    async getUsers(
        page: number,
        limit: number,
        filters: any[] = [],
    ) {

        if (page < 1) page = 1;
        if (limit < 1) limit = 10;

        // 🔑 MAP FILTERS HERE
        const validatedFilters = filters.map((f) => {
            const schema = TRAINING_SITES_FILTER_SCHEMA[f.field];

            if (!schema) {
                throw new Error(`Invalid filter field: ${f.field}`);
            }

            if (!schema.operators.includes(f.operator)) {
                throw new Error(`Invalid operator for field: ${f.field}`);
            }

            return {
                column: schema.column,
                type: schema.type,
                operator: f.operator,
                value: f.value,
            };
        });



        const totalRecords =
            validatedFilters.length > 0
                ? await this.userRepo.getFilteredCount(validatedFilters)
                : await this.userRepo.getTotalCount();

        const totalPages = Math.ceil(totalRecords / limit);

        const data =
            validatedFilters.length > 0
                ? await this.userRepo.findWithFilters(validatedFilters, page, limit)
                : await this.userRepo.findAll(page, limit);

        const start = totalRecords === 0 ? 0 : (page - 1) * limit + 1;
        const end = Math.min(page * limit, totalRecords);

        return {
            currentPage: page,
            limit,
            start,
            end,
            totalRecords,
            totalPages,
            nextPage: page < totalPages ? page + 1 : null,
            previousPage: page > 1 ? page - 1 : null,
            data,
        };
    }


    async getUserById(userId: number) {

        if (!userId) {
            throw new BadRequestException("User id is missing");
        }

        const data = await this.userRepo.getUsersByid(userId);
        return {
            message: "data fetched succesfully"
            , data
        }
    }

    async deleteUser(userId: number) {

        if (!userId) {
            throw new BadRequestException("User id is missing");
        }

        const data = await this.userRepo.deleteUserId(userId);
        return { message: "data deleted successfully" }
    }

    async getUserRoles() {
        try {
            const roles=await this.userRepo.getRoles();

            if(!roles || roles.length===0)
            {
                return {
                    success:false,
                    message:"no roles found",
                    data:[],
                }
            }

            return{
                success:true,
                message:"roles fetched succesfully",
                data : roles,
            }
        } catch (error) {
            console.error("getUserRles error",error)

            throw new InternalServerErrorException("Failed to fetch roles",);
        }
    }

        async getAll() {
        try {
            const users = await this.userRepo.getAlluser();

            if(!users || users.length===0)
            {
                return {
                    success:false,
                    message:"no users found",
                    data:[],
                }
            }

            return{
                success:true,
                message:"user fetched succesfully",
                data : users,
            }
        } catch (error) {
            console.error("getUserRles error",error)

            throw new InternalServerErrorException("Failed to fetch roles",);
        }
    }
}

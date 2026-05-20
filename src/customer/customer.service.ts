/* eslint-disable prettier/prettier */
import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateCustomerDto } from './customer.dto';
import { UpdateCustomerDto } from './updatecustomer.dto';
import { CustomerRepositoryService } from './customer.repository/customer.repository.service';
import { CUSTOMER_FILTER_SCHEMA } from './customer.filter.schema';

@Injectable()
export class CustomerService {

    constructor(private readonly customerRepo: CustomerRepositoryService) {

    }

    async CreateCustomer(dto: CreateCustomerDto, userId: number) {
        try {
            const result: any = await this.customerRepo.insertCustomer(dto, userId);

            if (result && result.affectedRows === 1) {
                return {
                    success: true,
                    message: 'Customer added successfully',
                    customerId: result.insertId,
                };
            }

            throw new InternalServerErrorException("Failed to add customer");
        }
        catch (error) {
            console.error("CreateCustomer error", error)
            throw error;
        }
    }

    async UpdateCustomer(customerId: number, dto: UpdateCustomerDto, userId: number) {
        try {
            const result: any = await this.customerRepo.UpdateById(customerId, dto, userId);

            if (result && result.affectedRows === 1) {
                return {
                    success: true,
                    message: 'Customer Updated successfully',
                };
            }

            throw new InternalServerErrorException("Failed to update customer");
        }
        catch (error) {
            console.error("UpdateCustomer error", error)

            throw error;
        }
    }

    async getCustomers(
        page: number,
        limit: number,
        filters: any[] = [],
    ) {
        try {
            if (page < 1) page = 1;
            if (limit < 1) limit = 10;

            const validatedFilters = filters.map((f) => {
                const schema = CUSTOMER_FILTER_SCHEMA[f.field];

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
                    ? await this.customerRepo.getFilteredCount(validatedFilters)
                    : await this.customerRepo.getTotalCount();

            const totalPages = Math.ceil(totalRecords / limit);

            const data =
                validatedFilters.length > 0
                    ? await this.customerRepo.findWithFilters(validatedFilters, page, limit)
                    : await this.customerRepo.findAll(page, limit);

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
        catch (error) {
            console.error("get customer error is", error);
            throw new InternalServerErrorException("failed to get customer list",);
        }
    }

    async getCustomerById(customerId: number) {
        if (!customerId) {
            throw new BadRequestException("Customer id is missing");
        }

        const data = await this.customerRepo.getCustomersByid(customerId);
        return {
            message: "data fetched succesfully",
            data
        }
    }

    async updateBeneficiaries(customerId: number, userId: number) {
        try {
            if (!customerId) {
                throw new BadRequestException("Customer id is missing");
            }

            const customer = await this.customerRepo.getCustomersByid(customerId);

            if (!customer || customer.length === 0) {
                throw new NotFoundException("Customer not found");
            }

            const result = await this.customerRepo.updateRandomBeneficiaries(customerId, userId);

            const changedNow = result.assignedNow + result.unassignedNow;

            return {
                success: changedNow > 0,
                message: changedNow > 0
                    ? 'Beneficiaries updated successfully'
                    : 'Beneficiaries already up to date',
                assignedNow: result.assignedNow,
                unassignedNow: result.unassignedNow,
                assigned_beneficiary_count: result.assignedCount,
                beneficiary_count: result.beneficiaryCount,
                remaining_beneficiary_count: result.remainingToAssign,
                excess_beneficiary_count: result.excessBeneficiaryCount,
                can_assign_beneficiaries: result.remainingToAssign > 0,
                can_update_beneficiaries: result.remainingToAssign > 0 || result.excessBeneficiaryCount > 0,
            }
        } catch (error) {
            console.error("updateBeneficiaries error", error);
            throw error;
        }
    }

    async assignBeneficiaries(customerId: number, userId: number) {
        return this.updateBeneficiaries(customerId, userId);
    }

    async getAssignedBeneficiaries(customerId: number, page: number, limit: number) {
        try {
            if (!customerId) {
                throw new BadRequestException("Customer id is missing");
            }

            if (page < 1) page = 1;
            if (limit < 1) limit = 10;

            const customer = await this.customerRepo.getCustomersByid(customerId);

            if (!customer || customer.length === 0) {
                throw new NotFoundException("Customer not found");
            }

            const totalRecords = await this.customerRepo.getAssignedBeneficiariesTotal(customerId);
            const totalPages = Math.ceil(totalRecords / limit);
            const data = await this.customerRepo.getAssignedBeneficiaries(customerId, page, limit);

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
        } catch (error) {
            console.error("getAssignedBeneficiaries error", error);
            throw error;
        }
    }

    async deleteCustomer(customerId: number) {
        try {
            if (!customerId) {
                throw new BadRequestException("Customer id is missing");
            }

            await this.customerRepo.deleteCustomerId(customerId);
            return { message: "data deleted successfully" }
        }
        catch (error) {
            console.error("failed to delete customer", error);
            throw new InternalServerErrorException("failed to delete customer",);
        }
    }

    async getCustomerRoles() {
        try {
            const roles = await this.customerRepo.getRoles();

            if (!roles || roles.length === 0) {
                return {
                    success: false,
                    message: "no roles found",
                    data: [],
                }
            }

            return {
                success: true,
                message: "roles fetched succesfully",
                data: roles,
            }
        } catch (error) {
            console.error("getCustomerRoles error", error)

            throw new InternalServerErrorException("Failed to fetch roles",);
        }
    }

    async getAll() {
        try {
            const customers = await this.customerRepo.getAllCustomer();

            if (!customers || customers.length === 0) {
                return {
                    success: false,
                    message: "no customers found",
                    data: [],
                }
            }

            return {
                success: true,
                message: "customer fetched succesfully",
                data: customers,
            }
        } catch (error) {
            console.error("getAllCustomer error", error)

            throw new InternalServerErrorException("Failed to get all customers",);
        }
    }
}

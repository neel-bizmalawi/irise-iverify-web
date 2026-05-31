/* eslint-disable prettier/prettier */
import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateCustomerDto } from './customer.dto';
import { UpdateCustomerDto } from './updatecustomer.dto';
import { CustomerRepositoryService } from './customer.repository/customer.repository.service';
import { CUSTOMER_FILTER_SCHEMA } from './customer.filter.schema';

@Injectable()
export class CustomerService {
    private readonly carbonCreditPerCookstove = 8.6688;

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

    private getLastFiveMonths() {
        const months: string[] = [];
        const date = new Date();
        date.setDate(1);

        for (let i = 4; i >= 0; i--) {
            const monthDate = new Date(date.getFullYear(), date.getMonth() - i, 1);
            const month = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
            months.push(month);
        }

        return months;
    }

    async getDashboardSummary(userId: number, customerId?: number) {
        try {
            if (!userId) {
                throw new BadRequestException("User id is missing");
            }

            const user = await this.customerRepo.getUserById(userId);

            if (!user) {
                throw new NotFoundException("User not found");
            }

            const userRole = String(user.role ?? '').toLowerCase();
            const effectiveCustomerId = userRole === 'customer'
                ? Number(user.adminID)
                : customerId ? Number(customerId) : null;
            const includeAllBeneficiaries = userRole !== 'customer' && !effectiveCustomerId;

            const result = await this.customerRepo.getDashboardSummary(effectiveCustomerId, includeAllBeneficiaries);
            const aggregate = result.aggregate;

            const totalCookstovesDeployed = Number(aggregate.totalCookstovesDeployed ?? 0);
            const girlsBelow18 = Number(aggregate.girlsBelow18 ?? 0);
            const boysBelow18 = Number(aggregate.boysBelow18 ?? 0);
            const adultWomen18Plus = Number(aggregate.adultWomen18Plus ?? 0);
            const adultMen18Plus = Number(aggregate.adultMen18Plus ?? 0);
            const totalCarbonCredits = Number((totalCookstovesDeployed * this.carbonCreditPerCookstove).toFixed(4));

            const creditsByMonthMap = new Map<string, number>(
                result.carbonCreditsByMonth.map((row) => [
                    row.month,
                    Number(row.beneficiaryCount ?? 0),
                ]),
            );

            const carbonCreditsByMonth = this.getLastFiveMonths().map((month) => {
                const beneficiaryCount = creditsByMonthMap.get(month) ?? 0;

                return {
                    month,
                    beneficiaryCount,
                    credits: Number((beneficiaryCount * this.carbonCreditPerCookstove).toFixed(4)),
                    carbonCredits: Number((beneficiaryCount * this.carbonCreditPerCookstove).toFixed(4)),
                };
            });
            const deployedLast3Months = carbonCreditsByMonth
                .slice(-3)
                .reduce((total, row) => total + row.beneficiaryCount, 0);

            return {
                scope: {
                    role: user.role,
                    customer_id: effectiveCustomerId,
                    includesAllBeneficiaries: includeAllBeneficiaries,
                },
                totalCookstovesDeployed,
                deployedLast3Months,
                totalCarbonCredits,
                estimatedTco2eReduction: totalCarbonCredits,
                verifiedHouseholds: totalCookstovesDeployed,
                mapLocationCount: Number(result.mapLocationCount ?? 0),
                totalPeopleImpacted: girlsBelow18 + boysBelow18 + adultWomen18Plus + adultMen18Plus,
                gender: {
                    girlsBelow18,
                    boysBelow18,
                    adultWomen18Plus,
                    adultMen18Plus,
                },
                carbonCreditsByMonth,
            };
        } catch (error) {
            console.error("getDashboardSummary error", error);
            throw error;
        }
    }

    private getClusterGridSize(zoom: number) {
        if (zoom < 5) return 1;
        if (zoom < 8) return 0.5;
        return 0.1;
    }

    async getMapLocations(userId: number, query: any) {
        try {
            if (!userId) {
                throw new BadRequestException("User id is missing");
            }

            const user = await this.customerRepo.getUserById(userId);

            if (!user) {
                throw new NotFoundException("User not found");
            }

            const userRole = String(user.role ?? '').toLowerCase();
            const effectiveCustomerId = userRole === 'customer'
                ? Number(user.adminID)
                : query.customer_id ? Number(query.customer_id) : null;

            if (!effectiveCustomerId) {
                return {
                    mode: "none",
                    totalInBounds: 0,
                    returned: 0,
                    isLimited: false,
                    message: "Select a customer to view beneficiary locations",
                    clusters: [],
                    points: [],
                };
            }

            const bounds = {
                north: Number(query.north),
                south: Number(query.south),
                east: Number(query.east),
                west: Number(query.west),
            };
            const zoom = Number(query.zoom);

            if (
                [bounds.north, bounds.south, bounds.east, bounds.west, zoom].some((value) => Number.isNaN(value)) ||
                bounds.south > bounds.north ||
                bounds.west > bounds.east
            ) {
                throw new BadRequestException("Invalid map bounds or zoom");
            }

            const totalInBounds = await this.customerRepo.getMapTotalInBounds(effectiveCustomerId, bounds);

            if (zoom < 11) {
                const clusters: any = await this.customerRepo.getMapClusters(
                    effectiveCustomerId,
                    bounds,
                    this.getClusterGridSize(zoom),
                );

                return {
                    mode: "clusters",
                    totalInBounds,
                    returned: clusters.length,
                    isLimited: clusters.length >= 1000,
                    clusters: clusters.map((cluster) => ({
                        latitude: Number(cluster.latitude),
                        longitude: Number(cluster.longitude),
                        count: Number(cluster.count),
                    })),
                    points: [],
                };
            }

            const pointLimit = query.limit ? Number(query.limit) : 1000;
            const points: any = await this.customerRepo.getMapPoints(effectiveCustomerId, bounds, pointLimit);

            return {
                mode: "points",
                totalInBounds,
                returned: points.length,
                isLimited: totalInBounds > points.length,
                clusters: [],
                points: points.map((point) => ({
                    beneficiary_id: point.beneficiary_id,
                    first_name: point.first_name,
                    last_name: point.last_name,
                    training_site_name: point.training_site_name,
                    mobile_no: point.mobile_no,
                    latitude: Number(point.latitude),
                    longitude: Number(point.longitude),
                })),
            };
        } catch (error) {
            console.error("getMapLocations error", error);
            throw error;
        }
    }
}

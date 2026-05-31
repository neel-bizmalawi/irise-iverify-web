/* eslint-disable prettier/prettier */
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CustomerService } from './customer.service';
import { CreateCustomerDto } from './customer.dto';
import { UpdateCustomerDto } from './updatecustomer.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller(['customer', 'api/customer'])
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Post('create_customer')
  @UseGuards(AuthGuard('jwt'))
  async CreateCustomer(@Body() dto: CreateCustomerDto, @Req() req: any) {
    const userId = req.user.userId;
    return this.customerService.CreateCustomer(dto, userId);
  }

  @Get('getAllCustomers')
  async getAllCustomers() {
    return this.customerService.getAll();
  }

  @Get('dashboard-summary')
  @UseGuards(AuthGuard('jwt'))
  async getDashboardSummary(
    @Req() req: any,
    @Query('customer_id') customerId?: string,
  ) {
    const userId = req.user.userId;
    return this.customerService.getDashboardSummary(
      userId,
      customerId ? Number(customerId) : undefined,
    );
  }

  @Get('map-locations')
  @UseGuards(AuthGuard('jwt'))
  async getMapLocations(
    @Req() req: any,
    @Query() query: any,
  ) {
    const userId = req.user.userId;
    return this.customerService.getMapLocations(userId, query);
  }

  @Put('update_customer/:id')
  @UseGuards(AuthGuard('jwt'))
  async UpdateCustomer(
    @Param('id') id: number,
    @Body() dto: UpdateCustomerDto,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.customerService.UpdateCustomer(id, dto, userId);
  }

  @Post('list')
  async getCustomers(
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Body('filters') filters: any[] = [],
  ) {
    return this.customerService.getCustomers(
      Number(page),
      Number(limit),
      filters,
    );
  }

  @Get('get_customer/:id')
  async getCustomerData(@Param('id', ParseIntPipe) id: number) {
    return this.customerService.getCustomerById(id);
  }

  @Post('update-beneficiaries/:id')
  @UseGuards(AuthGuard('jwt'))
  async updateBeneficiaries(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.customerService.updateBeneficiaries(id, userId);
  }

  @Post('assign-beneficiaries/:id')
  @UseGuards(AuthGuard('jwt'))
  async assignBeneficiaries(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.customerService.updateBeneficiaries(id, userId);
  }

  @Get('assigned-beneficiaries/:id')
  async getAssignedBeneficiaries(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    return this.customerService.getAssignedBeneficiaries(
      id,
      Number(page),
      Number(limit),
    );
  }

  @Delete('delete_customer/:id')
  async deleteCustomerData(@Param('id', ParseIntPipe) id: number) {
    return this.customerService.deleteCustomer(id);
  }

  @Get('get_role')
  async getCustomerRole() {
    return this.customerService.getCustomerRoles();
  }
}

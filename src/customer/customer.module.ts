import { Module } from '@nestjs/common';
import { CustomerController } from './customer.controller';
import { CustomerService } from './customer.service';
import { CustomerRepositoryService } from './customer.repository/customer.repository.service';

@Module({
  controllers: [CustomerController],
  providers: [CustomerService, CustomerRepositoryService],
  exports: [CustomerRepositoryService],
})
export class CustomerModule {}

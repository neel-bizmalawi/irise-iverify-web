import { Module } from '@nestjs/common';

import { UserService } from './user.service';
import { UserRepositoryService } from './user.repository/user.repository.service';
import { UserController } from './user.controller';
import { TrainingSiteModule } from 'src/training_site/training_site.module';

@Module({
  imports: [TrainingSiteModule],
  controllers: [UserController],
  providers: [UserService, UserRepositoryService],
  exports: [UserRepositoryService], // export if other modules might use the repository
})
export class UserModule {}

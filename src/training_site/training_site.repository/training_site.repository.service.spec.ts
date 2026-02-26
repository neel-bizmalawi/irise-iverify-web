import { Test, TestingModule } from '@nestjs/testing';
import { TrainingSiteRepositoryService } from './training_site.repository.service';

describe('TrainingSiteRepositoryService', () => {
  let service: TrainingSiteRepositoryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TrainingSiteRepositoryService],
    }).compile();

    service = module.get<TrainingSiteRepositoryService>(TrainingSiteRepositoryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

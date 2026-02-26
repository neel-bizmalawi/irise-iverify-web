import { Test, TestingModule } from '@nestjs/testing';
import { TrainingSiteService } from './training_site.service';

describe('TrainingSiteService', () => {
  let service: TrainingSiteService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TrainingSiteService],
    }).compile();

    service = module.get<TrainingSiteService>(TrainingSiteService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

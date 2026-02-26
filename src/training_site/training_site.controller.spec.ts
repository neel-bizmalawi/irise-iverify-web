import { Test, TestingModule } from '@nestjs/testing';
import { TrainingSiteController } from './training_site.controller';

describe('TrainingSiteController', () => {
  let controller: TrainingSiteController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TrainingSiteController],
    }).compile();

    controller = module.get<TrainingSiteController>(TrainingSiteController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

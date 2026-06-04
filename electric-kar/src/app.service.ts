import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      status: 'ok',
      service: 'electric-kar',
      timestamp: new Date().toISOString(),
    };
  }
}

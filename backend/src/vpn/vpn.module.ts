import { Module } from '@nestjs/common';
import { VpnService } from './vpn.service';

@Module({
  providers: [VpnService],
  exports: [VpnService],
})
export class VpnModule {}

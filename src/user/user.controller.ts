import { Controller, Get, UseGuards } from '@nestjs/common';
import { getUser } from 'src/auth/decorators';
import { JwtAuthGuard } from 'src/auth/guards';
import { SystemUser } from './interfaces';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UserController {
  @Get('me')
  getMe(@getUser() user: SystemUser) {
    return user;
  }
}

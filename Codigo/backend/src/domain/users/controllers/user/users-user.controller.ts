import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../../../application/auth/decorators/current-user.decorator';
import { Roles } from '../../../../application/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../../application/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../application/auth/guards/roles.guard';
import { CreateUserDto, GetMeQueryDto } from '../../dto';
import { UsersService } from '../../services';

@Controller(['user/usuarios', 'api/user/usuarios'])
@ApiTags('Users - User')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersUserController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE, UserRole.CUSTOMER)
  @ApiOperation({ summary: 'Obter perfil do usuário autenticado' })
  async getMe(
    @CurrentUser() currentUser: { id: string; role: UserRole; email?: string },
    @Query() query: GetMeQueryDto,
  ) {
    return this.usersService.getUserProfileByEmailOrIdentity(currentUser, query.email);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: 'Cadastrar usuário comum na gestão administrativa' })
  async createUser(
    @Body() payload: CreateUserDto,
    @CurrentUser() currentUser: { id: string; role: UserRole; email?: string },
  ) {
    return this.usersService.createRegularUser(payload, currentUser);
  }
}

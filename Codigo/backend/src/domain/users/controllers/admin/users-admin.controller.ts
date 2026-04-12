import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../../../application/auth/decorators/current-user.decorator';
import { Roles } from '../../../../application/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../../application/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../application/auth/guards/roles.guard';
import {
  CreateAdminUserDto,
  ListUsersQueryDto,
  UpdateUserDto,
  UsersChartQueryDto,
  UsersKpiQueryDto,
} from '../../dto';
import { UsersService } from '../../services';

@Controller(['admin/usuarios', 'api/admin/usuarios'])
@ApiTags('Users - Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersAdminController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: 'Listar usuários para gestão admin' })
  async listUsers(@Query() query: ListUsersQueryDto) {
    return this.usersService.listUsers(query);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Cadastrar usuário administrador' })
  async createAdminUser(
    @Body() payload: CreateAdminUserDto,
    @CurrentUser() currentUser: { id: string; role: UserRole; email?: string },
  ) {
    return this.usersService.createAdminUser(payload, currentUser);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: 'Atualizar usuário da gestão admin' })
  async updateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() payload: UpdateUserDto,
    @CurrentUser() currentUser: { id: string; role: UserRole; email?: string },
  ) {
    return this.usersService.updateUser(id, payload, currentUser);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Excluir usuário' })
  async deleteUser(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: { id: string; role: UserRole; email?: string },
  ) {
    return this.usersService.deleteUser(id, currentUser);
  }

  @Get('kpis')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: 'KPIs da gestão de usuários' })
  async getKpis(@Query() query: UsersKpiQueryDto) {
    return this.usersService.getKpis(query.periodoDias ?? 30);
  }

  @Get('chart/new-users')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: 'Gráfico de novos usuários por período' })
  async getNewUsersChart(@Query() query: UsersChartQueryDto) {
    return this.usersService.getNewUsersChart(query.period ?? 'month');
  }

  @Get('summary')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: 'Resumo da gestão de usuários' })
  async getSummary() {
    return this.usersService.getSummary();
  }
}

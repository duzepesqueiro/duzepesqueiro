import { CanActivate, ExecutionContext, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { UserRole } from '@prisma/client';
import { ExportController } from '../src/application/export/export.controller';
import { ExportService } from '../src/application/export/export.service';
import { JwtAuthGuard } from '../src/application/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/application/auth/guards/roles.guard';

class MockJwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const roleHeader = req.headers['x-test-role'];
    const role =
      typeof roleHeader === 'string' && roleHeader.trim().length > 0
        ? roleHeader.trim().toUpperCase()
        : 'CUSTOMER';

    req.user = { id: 'test-user', role };
    return true;
  }
}

describe('ExportController (RBAC) (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const exportServiceMock: Partial<ExportService> = {
      listResources: () => [{ key: 'events' }] as any,
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ExportController],
      providers: [
        RolesGuard,
        { provide: JwtAuthGuard, useClass: MockJwtAuthGuard },
        { provide: ExportService, useValue: exportServiceMock },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('bloqueia CUSTOMER (403)', async () => {
    await request(app.getHttpServer())
      .get('/api/admin/export/events/csv/manifest')
      .set('x-test-role', UserRole.CUSTOMER)
      .expect(403);
  });

  it('permite ADMIN (200)', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/admin/export/events/csv/manifest')
      .set('x-test-role', UserRole.ADMIN)
      .expect(200);

    expect(Array.isArray(response.body?.files)).toBe(true);
    expect(response.body.files.length).toBeGreaterThan(0);
  });
});


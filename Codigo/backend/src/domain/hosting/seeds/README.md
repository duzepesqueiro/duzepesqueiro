# Hosting Module - Guia de Endpoints para Postman

## Variáveis recomendadas no Postman

- `baseUrl`: `http://localhost:3000`
- `adminToken`: token JWT de usuário `ADMIN`
- `managerToken`: token JWT de usuário `MANAGER`
- `employeeToken`: token JWT de usuário `EMPLOYEE`
- `customerToken`: token JWT de usuário `CUSTOMER`
- `chaleId`: `a1f0d5b4-1111-4f0c-9f11-111111111111`
- `reservaId`: `b2a1c6d7-2222-4a7c-9b22-222222222222`
- `bloqueioId`: `c3b2d7e8-3333-4a8b-9c33-333333333333`
- `regraPrecoId`: `d4c3e8f9-4444-4a9b-9d44-444444444444`
- `avaliacaoId`: `e5d4f9a1-5555-4aa0-9e55-555555555555`
- `hospedeId`: `f6e5a1b2-6666-4ab1-9f66-666666666666`

## Massa base sugerida para testes

```json
{
  "admin": {
    "id": "11111111-aaaa-4b8e-9c01-111111111111",
    "email": "admin.hosting@teste.com",
    "role": "ADMIN"
  },
  "manager": {
    "id": "22222222-bbbb-4b8e-9c02-222222222222",
    "email": "manager.hosting@teste.com",
    "role": "MANAGER"
  },
  "employee": {
    "id": "33333333-cccc-4b8e-9c03-333333333333",
    "email": "employee.hosting@teste.com",
    "role": "EMPLOYEE"
  },
  "customer": {
    "id": "44444444-dddd-4b8e-9c04-444444444444",
    "email": "cliente.hosting@teste.com",
    "role": "CUSTOMER"
  },
  "chales": [
    {
      "id": "a1f0d5b4-1111-4f0c-9f11-111111111111",
      "code": "CH-001",
      "name": "Chalé Lago Azul",
      "unitType": "STANDARD",
      "status": "AVAILABLE",
      "basePrice": 280,
      "maxGuests": 4
    },
    {
      "id": "a1f0d5b4-1111-4f0c-9f11-222222222222",
      "code": "CH-002",
      "name": "Chalé Serra Premium",
      "unitType": "LUXURY",
      "status": "RESERVED",
      "basePrice": 460,
      "maxGuests": 6
    }
  ],
  "reservaPendente": {
    "id": "b2a1c6d7-2222-4a7c-9b22-222222222222",
    "code": "RES-1001",
    "chaletId": "a1f0d5b4-1111-4f0c-9f11-111111111111",
    "userId": "44444444-dddd-4b8e-9c04-444444444444",
    "status": "PENDING",
    "paymentStatus": "PENDING",
    "guestName": "Cliente Teste",
    "guestEmail": "cliente.hosting@teste.com",
    "checkInDate": "2026-05-15",
    "checkOutDate": "2026-05-18",
    "adults": 2,
    "children": 1
  },
  "regraPreco": {
    "id": "d4c3e8f9-4444-4a9b-9d44-444444444444",
    "name": "Alta temporada",
    "adjustmentType": "PERCENTAGE",
    "adjustmentValue": 20,
    "isActive": true
  }
}
```

## Carga de dados de exemplo para testes (SQL)

```sql
INSERT INTO hosting_chalets (
  id, codigo, nome, descricao, tipo_unidade, status, preco_base, capacidade_maxima, is_active, created_at
)
VALUES
('a1f0d5b4-1111-4f0c-9f11-111111111111','CH-001','Chalé Lago Azul','Vista para lago','STANDARD','AVAILABLE',280,4,true,NOW()),
('a1f0d5b4-1111-4f0c-9f11-222222222222','CH-002','Chalé Serra Premium','Com hidro','LUXURY','RESERVED',460,6,true,NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO hosting_pricing_rules (
  id, chale_id, nome, descricao, tipo_ajuste, valor_ajuste, prioridade, is_active, created_at
)
VALUES
('d4c3e8f9-4444-4a9b-9d44-444444444444','a1f0d5b4-1111-4f0c-9f11-111111111111','Alta temporada','Ajuste verão','PERCENTAGE',20,100,true,NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO hosting_reservations (
  id, codigo, chale_id, user_id, status, origem, nome_hospede, email_hospede, telefone_hospede,
  data_checkin, data_checkout, qtd_adultos, qtd_criancas, valor_base, valor_desconto, valor_acrescimo,
  valor_total, status_pagamento, created_at
)
VALUES
('b2a1c6d7-2222-4a7c-9b22-222222222222','RES-1001','a1f0d5b4-1111-4f0c-9f11-111111111111','44444444-dddd-4b8e-9c04-444444444444',
 'PENDING','ONLINE','Cliente Teste','cliente.hosting@teste.com','+55 31 98888-0001',
 '2026-05-15','2026-05-18',2,1,840,0,0,840,'PENDING',NOW() - INTERVAL '45 minutes')
ON CONFLICT (id) DO NOTHING;

INSERT INTO hosting_chalet_blocks (
  id, chale_id, data_inicio, data_fim, motivo, is_active, created_at
)
VALUES
('c3b2d7e8-3333-4a8b-9c33-333333333333','a1f0d5b4-1111-4f0c-9f11-222222222222','2026-05-20','2026-05-22','MAINTENANCE',true,NOW())
ON CONFLICT (id) DO NOTHING;
```

## 1) Autenticação (obter token)

### POST `{{baseUrl}}/auth/login`

Headers:

```json
{
  "Content-Type": "application/json"
}
```

Body exemplo ADMIN:

```json
{
  "email": "admin.hosting@teste.com",
  "password": "Senha@123"
}
```

Resposta esperada:

```json
{
  "accessToken": "jwt-token",
  "refreshToken": "jwt-refresh-token",
  "user": {
    "id": "11111111-aaaa-4b8e-9c01-111111111111",
    "role": "ADMIN"
  }
}
```

## 2) Endpoints de Chalés

### GET `{{baseUrl}}/api/chales`

Query opcional:
- `capacidadeAdultos`
- `capacidadeCriancas`
- `tipo`
- `checkin`
- `checkout`

### GET `{{baseUrl}}/api/chales/disponibilidade?chaleId={{chaleId}}&checkin=2026-05-15&checkout=2026-05-18`

### GET `{{baseUrl}}/api/chales/{{chaleId}}`

### GET `{{baseUrl}}/api/chales/{{chaleId}}/avaliacoes`

### POST `{{baseUrl}}/api/chales` (ADMIN)

Headers:

```json
{
  "Authorization": "Bearer {{adminToken}}",
  "Content-Type": "application/json"
}
```

Body:

```json
{
  "code": "CH-003",
  "name": "Chalé Jardim",
  "description": "Próximo ao lago",
  "unitType": "STANDARD",
  "status": "AVAILABLE",
  "basePrice": 320,
  "maxGuests": 4,
  "isActive": true
}
```

### PUT `{{baseUrl}}/api/chales/{{chaleId}}` (ADMIN)

```json
{
  "basePrice": 350,
  "maxGuests": 5
}
```

### PATCH `{{baseUrl}}/api/chales/{{chaleId}}/status` (ADMIN/EMPLOYEE)

```json
{
  "status": "RESERVED"
}
```

### POST `{{baseUrl}}/api/chales/{{chaleId}}/imagens` (ADMIN)

```json
{
  "url": "https://cdn.teste.com/chales/ch-001-frente.jpg",
  "isPrimary": true
}
```

### DELETE `{{baseUrl}}/api/chales/{{chaleId}}/imagens/{{imgId}}` (ADMIN)

### DELETE `{{baseUrl}}/api/chales/{{chaleId}}` (ADMIN)

---

## 3) Endpoints de Reservas

### GET `{{baseUrl}}/api/reservas` (ADMIN/MANAGER/EMPLOYEE)

Query:
- `status` (csv, ex.: `PENDING,CONFIRMED`)
- `chaleId`
- `dataCheckin`
- `dataCheckout`
- `search`
- `page`
- `limit`

### GET `{{baseUrl}}/api/reservas/minhas` (CUSTOMER)

### GET `{{baseUrl}}/api/reservas/{{reservaId}}`

### GET `{{baseUrl}}/api/reservas/codigo/RES-1001`

### POST `{{baseUrl}}/api/reservas` (CUSTOMER)

```json
{
  "chaletId": "a1f0d5b4-1111-4f0c-9f11-111111111111",
  "guestName": "Cliente Teste",
  "guestEmail": "cliente.hosting@teste.com",
  "guestPhone": "+55 31 98888-0001",
  "checkInDate": "2026-05-15",
  "checkOutDate": "2026-05-18",
  "adults": 2,
  "children": 1,
  "paymentMethod": "PIX"
}
```

### POST `{{baseUrl}}/api/reservas/manual` (ADMIN/MANAGER/EMPLOYEE)

```json
{
  "chaletId": "a1f0d5b4-1111-4f0c-9f11-111111111111",
  "guestName": "Reserva Manual",
  "guestEmail": "manual@teste.com",
  "checkInDate": "2026-05-20",
  "checkOutDate": "2026-05-22",
  "adults": 2,
  "children": 0,
  "status": "CONFIRMED",
  "paymentStatus": "PENDING"
}
```

### PUT `{{baseUrl}}/api/reservas/{{reservaId}}`

```json
{
  "adults": 3,
  "children": 0,
  "notes": "Cliente solicitou cama extra"
}
```

### POST `{{baseUrl}}/api/reservas/{{reservaId}}/checkin` (ADMIN/MANAGER/EMPLOYEE)

### POST `{{baseUrl}}/api/reservas/{{reservaId}}/checkout` (ADMIN/MANAGER/EMPLOYEE)

### POST `{{baseUrl}}/api/reservas/{{reservaId}}/cancelar`

```json
{
  "motivo": "Solicitação do cliente"
}
```

### POST `{{baseUrl}}/api/reservas/{{reservaId}}/no-show` (ADMIN/MANAGER/EMPLOYEE)

### GET `{{baseUrl}}/api/reservas/{{reservaId}}/voucher`

### POST `{{baseUrl}}/api/reservas/{{reservaId}}/voucher/enviar`

```json
{
  "canal": "email"
}
```

### POST `{{baseUrl}}/api/reservas/{{reservaId}}/hospedes`

```json
{
  "name": "Hóspede Secundário",
  "cpf": "12345678909",
  "phone": "+55 31 97777-0002",
  "email": "acompanhante@teste.com",
  "isPrimary": false
}
```

### DELETE `{{baseUrl}}/api/reservas/{{reservaId}}/hospedes/{{hospedeId}}`

### GET `{{baseUrl}}/api/reservas/{{reservaId}}/calculo?numAdultos=2&numCriancas=1`

### GET `{{baseUrl}}/api/reservas/{{reservaId}}/disponibilidade`

---

## 4) Endpoints de Bloqueios

### GET `{{baseUrl}}/api/bloqueios` (ADMIN/MANAGER/EMPLOYEE)

Query opcional:
- `chaleId`
- `isActive`
- `reason`
- `dataInicioFrom`
- `dataFimTo`

### GET `{{baseUrl}}/api/bloqueios/{{bloqueioId}}`

### GET `{{baseUrl}}/api/bloqueios/chale/{{chaleId}}`

### POST `{{baseUrl}}/api/bloqueios` (ADMIN/MANAGER/EMPLOYEE)

```json
{
  "chaletId": "a1f0d5b4-1111-4f0c-9f11-111111111111",
  "dataInicio": "2026-05-25",
  "dataFim": "2026-05-27",
  "reason": "MAINTENANCE",
  "isActive": true
}
```

### PUT `{{baseUrl}}/api/bloqueios/{{bloqueioId}}` (ADMIN)

```json
{
  "dataFim": "2026-05-28",
  "isActive": true
}
```

### DELETE `{{baseUrl}}/api/bloqueios/{{bloqueioId}}` (ADMIN)

---

## 5) Endpoints de Regras de Preço

### GET `{{baseUrl}}/api/precos/regras` (ADMIN)

### GET `{{baseUrl}}/api/precos/regras/{{regraPrecoId}}` (ADMIN)

### POST `{{baseUrl}}/api/precos/regras` (ADMIN)

```json
{
  "chaletId": "a1f0d5b4-1111-4f0c-9f11-111111111111",
  "name": "Feriado Nacional",
  "description": "Ajuste especial de feriado",
  "adjustmentType": "PERCENTAGE",
  "adjustmentValue": 15,
  "priority": 120,
  "isActive": true,
  "startDate": "2026-09-05",
  "endDate": "2026-09-10"
}
```

### PUT `{{baseUrl}}/api/precos/regras/{{regraPrecoId}}` (ADMIN)

```json
{
  "adjustmentValue": 18,
  "priority": 130
}
```

### PATCH `{{baseUrl}}/api/precos/regras/{{regraPrecoId}}/toggle` (ADMIN)

```json
{
  "isActive": false
}
```

### DELETE `{{baseUrl}}/api/precos/regras/{{regraPrecoId}}` (ADMIN)

### GET `{{baseUrl}}/api/precos/simulacao?data=2026-07-20` (ADMIN)

### GET `{{baseUrl}}/api/precos/chale/{{chaleId}}` (ADMIN)

---

## 6) Endpoints de Avaliações

### GET `{{baseUrl}}/api/avaliacoes/chale/{{chaleId}}`

Query opcional:
- `page`
- `limit`

### GET `{{baseUrl}}/api/avaliacoes/reserva/{{reservaId}}`

### GET `{{baseUrl}}/api/avaliacoes/{{avaliacaoId}}`

### POST `{{baseUrl}}/api/avaliacoes` (CUSTOMER)

```json
{
  "reservationId": "{{reservaId}}",
  "chaletId": "{{chaleId}}",
  "rating": 5,
  "comment": "Excelente experiência!"
}
```

### PUT `{{baseUrl}}/api/avaliacoes/{{avaliacaoId}}` (CUSTOMER)

```json
{
  "rating": 4,
  "comment": "Revisando para 4 estrelas."
}
```

### DELETE `{{baseUrl}}/api/avaliacoes/{{avaliacaoId}}` (ADMIN)

---

## 7) Endpoints de Dashboard de Hospedagem

### GET `{{baseUrl}}/api/dashboard/hospedagem/kpis?periodo=mes&dataReferencia=2026-06-15`

### GET `{{baseUrl}}/api/dashboard/hospedagem/mapa?periodo=mes&chaleId={{chaleId}}&dataReferencia=2026-06-15`

### GET `{{baseUrl}}/api/dashboard/hospedagem/receita?periodo=mes&dataReferencia=2026-06-15`

### GET `{{baseUrl}}/api/dashboard/hospedagem/reservas?periodo=mes&dataReferencia=2026-06-15`

---

## 8) Jobs e Schedules (validação funcional)

- `HospedagemKPICalculationJob`
  - execução diária na virada do dia
  - grava métricas em `hosting_kpis`
- `ReservationNotificationJob`
  - agenda/processa notificações de confirmação e lembretes
- `AbandonedReservationCleanupJob`
  - execução horária
  - lembra pagamento após 30 min
  - cancela pendências >24h e libera chalé reservado sem reservas ativas

Para validar rapidamente:
- criar reserva `PENDING` sem `paidAt`
- ajustar `createdAt` no banco para mais de 30 min e depois >24h
- aguardar ciclo do job ou reiniciar aplicação para disparar execução inicial
- consultar `hosting_notification_logs` e `hosting_reservations`

---

## 9) Checklist de cobertura do domínio hosting

- Chalés: listagem, disponibilidade, detalhe, CRUD admin, status, imagens.
- Reservas: listagem geral/minhas, detalhe, por código, criação online/manual, atualização, check-in/out, cancelamento, no-show, voucher, hóspedes, cálculo e disponibilidade.
- Bloqueios: listagem geral/chalé, detalhe, criação, atualização, remoção.
- Preços: regras (CRUD + toggle), simulação, listagem por chalé.
- Avaliações: listagem por chalé, detalhe por reserva/id, criar/atualizar/remover.
- Dashboard: KPIs, mapa de ocupação, receita e estatísticas de reservas.
- Jobs: KPI diário, notificações agendadas e limpeza de reservas abandonadas.

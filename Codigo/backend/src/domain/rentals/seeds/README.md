# Rentals Module - Guia de Endpoints para Postman

## Variáveis recomendadas no Postman

- `baseUrl`: `http://localhost:3000`
- `adminToken`: token JWT de usuário ADMIN
- `managerToken`: token JWT de usuário MANAGER
- `employeeToken`: token JWT de usuário EMPLOYEE
- `customerToken`: token JWT de usuário CUSTOMER
- `rentalId`: `f09f7a7c-52af-4e41-9a35-b3fefbfe18a1`
- `bookingId`: `95d2afec-7a84-4f6d-9c54-a87d09b2d35f`
- `productIdRental`: `4fcd58b9-2f4e-4d68-9d57-4e4b2ffabca2`
- `customerId`: `baf5acc6-9b9f-40d0-983f-be2cc143f6fd`
- `paymentId`: `128439201`

## Massa base sugerida para testes

```json
{
  "admin": {
    "id": "96fb5b4d-2a73-4f64-9bc3-c69eab16f260",
    "email": "admin.rentals@teste.com",
    "role": "ADMIN"
  },
  "manager": {
    "id": "dcf9a046-9ea8-4d8a-95d4-49f9342572c3",
    "email": "manager.rentals@teste.com",
    "role": "MANAGER"
  },
  "employee": {
    "id": "6a60dfd7-6ef1-4e4f-8ddb-e3f48fa49d21",
    "email": "employee.rentals@teste.com",
    "role": "EMPLOYEE"
  },
  "customer": {
    "id": "baf5acc6-9b9f-40d0-983f-be2cc143f6fd",
    "email": "customer.rentals@teste.com",
    "role": "CUSTOMER"
  },
  "productRental": {
    "id": "4fcd58b9-2f4e-4d68-9d57-4e4b2ffabca2",
    "name": "Vara de Carbono X",
    "status": "RENTAL",
    "category": "RENTAL_EQUIPMENT",
    "stockQuantity": 15,
    "quality": "GOOD",
    "unitPrice": 35
  },
  "rental": {
    "id": "f09f7a7c-52af-4e41-9a35-b3fefbfe18a1",
    "userId": "baf5acc6-9b9f-40d0-983f-be2cc143f6fd",
    "origin": "ONLINE",
    "paymentStatus": "PENDING",
    "periodType": "DAILY",
    "periodValue": 2,
    "rentalDate": "2026-04-10",
    "returnDate": "2026-04-12",
    "totalAmount": 70
  },
  "booking": {
    "id": "95d2afec-7a84-4f6d-9c54-a87d09b2d35f",
    "rentalId": "f09f7a7c-52af-4e41-9a35-b3fefbfe18a1",
    "productId": "4fcd58b9-2f4e-4d68-9d57-4e4b2ffabca2",
    "quantity": 1,
    "unitPrice": 35,
    "subtotal": 70,
    "status": "PENDING"
  }
}
```

## 1) Autenticação

### POST `{{baseUrl}}/auth/login`

Body:

```json
{
  "email": "admin.rentals@teste.com",
  "password": "Senha@123"
}
```

Repita para manager, employee e customer e salve os tokens.

## 2) Endpoints ADMIN - Rentals

> Base: `{{baseUrl}}/admin/rentals`

### POST `/`

Headers:

```json
{
  "Authorization": "Bearer {{adminToken}}",
  "Content-Type": "multipart/form-data"
}
```

Body (form-data):

```json
{
  "userId": "{{customerId}}",
  "origin": "ONLINE",
  "rentalDate": "2026-04-10",
  "returnDate": "2026-04-12",
  "periodType": "DAILY",
  "periodValue": 2,
  "totalAmount": 70,
  "paymentStatus": "PENDING",
  "notes": "Reserva administrativa",
  "images": "<até 5 arquivos jpg|jpeg|png|webp>"
}
```

### GET `/`

Exemplo:

`{{baseUrl}}/admin/rentals?userId={{customerId}}&status=PENDING&origin=ONLINE&rentalDateFrom=2026-04-01&rentalDateTo=2026-04-30&page=1&limit=20`

### GET `/:id`

`{{baseUrl}}/admin/rentals/{{rentalId}}`

### PATCH `/:id`

`{{baseUrl}}/admin/rentals/{{rentalId}}`

Body:

```json
{
  "notes": "Atualizado via painel admin",
  "totalAmount": 75
}
```

### DELETE `/:id`

`{{baseUrl}}/admin/rentals/{{rentalId}}`

### POST `/:id/restore`

`{{baseUrl}}/admin/rentals/{{rentalId}}/restore`

### PATCH `/:id/status`

`{{baseUrl}}/admin/rentals/{{rentalId}}/status`

Body:

```json
{
  "status": "ACTIVE"
}
```

### POST `/:id/images`

`{{baseUrl}}/admin/rentals/{{rentalId}}/images`

Body (form-data):

```json
{
  "images": "<até 5 arquivos jpg|jpeg|png|webp>"
}
```

### GET `/:id/bookings`

`{{baseUrl}}/admin/rentals/{{rentalId}}/bookings`

### POST `/:id/inspection`

`{{baseUrl}}/admin/rentals/{{rentalId}}/inspection`

Body:

```json
{
  "condition": "GOOD"
}
```

### GET `/report/availability`

`{{baseUrl}}/admin/rentals/report/availability?startDate=2026-04-01&endDate=2026-04-30`

### GET `/report/condition`

`{{baseUrl}}/admin/rentals/report/condition`

## 3) Endpoints ADMIN - KPI Rentals

> Base: `{{baseUrl}}/admin/rentals/kpi`

### GET `/metrics`

`{{baseUrl}}/admin/rentals/kpi/metrics?startDate=2026-04-01&endDate=2026-04-30`

### GET `/revenue`

`{{baseUrl}}/admin/rentals/kpi/revenue?startDate=2026-04-01&endDate=2026-04-30`

### GET `/utilization`

`{{baseUrl}}/admin/rentals/kpi/utilization?equipmentId={{productIdRental}}`

### GET `/popular`

`{{baseUrl}}/admin/rentals/kpi/popular?limit=10`

### GET `/cancellation`

`{{baseUrl}}/admin/rentals/kpi/cancellation`

### GET `/comparison`

`{{baseUrl}}/admin/rentals/kpi/comparison?currentStartDate=2026-04-01&currentEndDate=2026-04-30&previousStartDate=2026-03-01&previousEndDate=2026-03-31`

## 4) Endpoints USER - Catálogo de Rentals

> Base: `{{baseUrl}}/rentals`

### GET `/`

`{{baseUrl}}/rentals?status=ACTIVE`

### GET `/search`

`{{baseUrl}}/rentals/search?q=vara`

### GET `/categories`

`{{baseUrl}}/rentals/categories`

### GET `/:id`

`{{baseUrl}}/rentals/{{rentalId}}`

### GET `/:id/availability`

`{{baseUrl}}/rentals/{{rentalId}}/availability?startDate=2026-04-10&endDate=2026-04-12`

## 5) Endpoints USER - Bookings

> Base: `{{baseUrl}}/rentals/bookings`

### POST `/`

Headers:

```json
{
  "Authorization": "Bearer {{customerToken}}",
  "Content-Type": "application/json"
}
```

Body:

```json
{
  "productId": "{{productIdRental}}",
  "rentalDate": "2026-04-10",
  "returnDate": "2026-04-12",
  "periodType": "DAILY",
  "periodValue": 2,
  "quantity": 1,
  "unitPrice": 35,
  "notes": "Reserva via app"
}
```

### GET `/`

`{{baseUrl}}/rentals/bookings`

### GET `/:id`

`{{baseUrl}}/rentals/bookings/{{bookingId}}`

### PATCH `/:id/cancel`

`{{baseUrl}}/rentals/bookings/{{bookingId}}/cancel`

### PATCH `/:id/extend`

`{{baseUrl}}/rentals/bookings/{{bookingId}}/extend`

Body:

```json
{
  "newEndDate": "2026-04-15"
}
```

### GET `/:id/payment`

`{{baseUrl}}/rentals/bookings/{{bookingId}}/payment`

### POST `/:id/return`

`{{baseUrl}}/rentals/bookings/{{bookingId}}/return`

## 6) Webhook de pagamento (integração rental)

> O webhook global de pagamentos atualiza o domínio de aluguel via eventos `RENTAL_PAID` e `RENTAL_CANCELLED`.

### POST `{{baseUrl}}/payments/webhook/mercadopago`

Body exemplo:

```json
{
  "type": "payment",
  "data": {
    "id": "128439201"
  }
}
```

## 7) Permissões por role

- `ADMIN`: acesso total ao módulo de aluguel.
- `MANAGER`: gerenciamento de aluguéis e consultas de relatório/KPI.
- `EMPLOYEE`: operações operacionais (ex.: devolução), consulta de aluguéis.
- `CUSTOMER`: criação e gestão das próprias reservas.

## 8) Checklist de cobertura do domínio rentals

- Admin Rentals: create, list, get by id, update, soft delete, restore.
- Admin Rentals: update status, upload images, list bookings, inspection.
- Admin Reports: availability e condition.
- Admin KPI: metrics, revenue, utilization, popular, cancellation, comparison.
- User Rentals: list available, search, categories, details, availability.
- User Bookings: create, list, details, cancel, extend, payment status, return.
- Payment Webhook: sincronização de status de pagamento no aluguel.

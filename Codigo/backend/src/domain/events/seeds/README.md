# Events Module - Guia de Endpoints para Postman

## Variáveis recomendadas no Postman

- `baseUrl`: `http://localhost:3000`
- `jwtToken`: token de usuário comum
- `adminToken`: token de usuário admin
- `eventId`: `7e92f4af-06a3-497e-82c3-faf0fcd49527`
- `registrationId`: `8747733d-20f8-4d1f-ac53-84fe95f47fcb`
- `paymentId`: `128439201`
- `orderId`: `event_7e92f4af-06a3-497e-82c3-faf0fcd49527`
- `year`: `2026`
- `month`: `7`

## Massa base sugerida para testes

```json
{
  "user": {
    "id": "baf5acc6-9b9f-40d0-983f-be2cc143f6fd",
    "username": "usuario.eventos",
    "email": "usuario.eventos@teste.com"
  },
  "admin": {
    "id": "96fb5b4d-2a73-4f64-9bc3-c69eab16f260",
    "username": "admin.eventos",
    "email": "admin.eventos@teste.com"
  },
  "eventPaid": {
    "id": "7e92f4af-06a3-497e-82c3-faf0fcd49527",
    "title": "Torneio de Pesca 2026",
    "status": "UPCOMING",
    "totalSlots": 120,
    "availableSlots": 75,
    "isPaid": true,
    "price": 75.9
  },
  "eventFree": {
    "id": "6cf72816-e7f8-4c7d-b8cf-42c1fefbecc7",
    "title": "Workshop de Iscas Naturais",
    "status": "SCHEDULED",
    "totalSlots": 50,
    "availableSlots": 50,
    "isPaid": false,
    "price": null
  },
  "registration": {
    "id": "8747733d-20f8-4d1f-ac53-84fe95f47fcb",
    "userId": "baf5acc6-9b9f-40d0-983f-be2cc143f6fd",
    "eventId": "7e92f4af-06a3-497e-82c3-faf0fcd49527",
    "status": "PAID",
    "paymentStatus": "PAID",
    "orderId": "event_7e92f4af-06a3-497e-82c3-faf0fcd49527"
  }
}
```

## 1) Autenticação da API (obter JWT da aplicação)

### POST `{{baseUrl}}/auth/login`

Headers:

```json
{
  "Content-Type": "application/json"
}
```

Body:

```json
{
  "email": "usuario.eventos@teste.com",
  "password": "Senha@123"
}
```

Resposta esperada:

```json
{
  "accessToken": "jwt-user-token",
  "refreshToken": "jwt-refresh-token",
  "user": {
    "id": "baf5acc6-9b9f-40d0-983f-be2cc143f6fd",
    "role": "CUSTOMER"
  }
}
```

### POST `{{baseUrl}}/auth/login` (admin)

Body:

```json
{
  "email": "admin.eventos@teste.com",
  "password": "Senha@123"
}
```

Resposta esperada:

```json
{
  "accessToken": "jwt-admin-token",
  "refreshToken": "jwt-refresh-token",
  "user": {
    "id": "96fb5b4d-2a73-4f64-9bc3-c69eab16f260",
    "role": "ADMIN"
  }
}
```

## 2) Endpoints públicos de eventos (Events - User)

### GET `{{baseUrl}}/events?page=1&limit=10&name=torneio&status=UPCOMING`

Headers:

```json
{}
```

Resposta esperada:

```json
{
  "items": [
    {
      "id": "7e92f4af-06a3-497e-82c3-faf0fcd49527",
      "title": "Torneio de Pesca 2026",
      "imageUrl": "https://cdn.example.com/events/evento-1.webp",
      "location": "Lago Azul - Setor Norte",
      "eventDate": "2026-08-18T00:00:00.000Z",
      "eventTime": "08:30",
      "status": "UPCOMING",
      "isPaid": true,
      "price": 75.9,
      "availableSlots": 75,
      "totalSlots": 120
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 10
}
```

### GET `{{baseUrl}}/events/{{eventId}}`

Resposta esperada:

```json
{
  "id": "7e92f4af-06a3-497e-82c3-faf0fcd49527",
  "title": "Torneio de Pesca 2026",
  "imageUrl": "https://cdn.example.com/events/evento-1.webp",
  "location": "Lago Azul - Setor Norte",
  "eventDate": "2026-08-18T00:00:00.000Z",
  "eventTime": "08:30",
  "status": "UPCOMING",
  "isPaid": true,
  "price": 75.9,
  "availableSlots": 75,
  "totalSlots": 120
}
```

### GET `{{baseUrl}}/events/status/UPCOMING`

Resposta esperada:

```json
[
  {
    "id": "7e92f4af-06a3-497e-82c3-faf0fcd49527",
    "title": "Torneio de Pesca 2026",
    "status": "UPCOMING",
    "availableSlots": 75,
    "totalSlots": 120
  }
]
```

### GET `{{baseUrl}}/events/{{eventId}}/registration-status`

Headers:

```json
{
  "Authorization": "Bearer {{jwtToken}}"
}
```

Resposta esperada:

```json
{
  "isRegistered": true,
  "registration": {
    "id": "8747733d-20f8-4d1f-ac53-84fe95f47fcb",
    "status": "PAID",
    "paymentStatus": "PAID",
    "orderId": "event_7e92f4af-06a3-497e-82c3-faf0fcd49527"
  }
}
```

## 3) Inscrições em eventos (Events - Registrations)

### POST `{{baseUrl}}/events/registrations`

Headers:

```json
{
  "Authorization": "Bearer {{jwtToken}}",
  "Content-Type": "application/json"
}
```

Body:

```json
{
  "eventId": "6cf72816-e7f8-4c7d-b8cf-42c1fefbecc7"
}
```

Resposta esperada:

```json
{
  "id": "1b95ac4e-21b0-48e2-8ea7-c4f779f88df1",
  "userId": "baf5acc6-9b9f-40d0-983f-be2cc143f6fd",
  "eventId": "6cf72816-e7f8-4c7d-b8cf-42c1fefbecc7",
  "status": "PENDING",
  "paymentStatus": "PENDING",
  "registeredAt": "2026-03-25T02:10:00.000Z"
}
```

### GET `{{baseUrl}}/events/registrations`

Headers:

```json
{
  "Authorization": "Bearer {{jwtToken}}"
}
```

Resposta esperada:

```json
[
  {
    "registrationId": "8747733d-20f8-4d1f-ac53-84fe95f47fcb",
    "status": "PAID",
    "paymentStatus": "PAID",
    "orderId": "event_7e92f4af-06a3-497e-82c3-faf0fcd49527",
    "registeredAt": "2026-03-24T14:20:00.000Z",
    "event": {
      "id": "7e92f4af-06a3-497e-82c3-faf0fcd49527",
      "title": "Torneio de Pesca 2026",
      "status": "UPCOMING"
    }
  }
]
```

### GET `{{baseUrl}}/events/registrations/{{registrationId}}`

Resposta esperada:

```json
{
  "id": "8747733d-20f8-4d1f-ac53-84fe95f47fcb",
  "userId": "baf5acc6-9b9f-40d0-983f-be2cc143f6fd",
  "eventId": "7e92f4af-06a3-497e-82c3-faf0fcd49527",
  "status": "PAID",
  "paymentStatus": "PAID",
  "orderId": "event_7e92f4af-06a3-497e-82c3-faf0fcd49527"
}
```

### DELETE `{{baseUrl}}/events/registrations/{{registrationId}}`

Headers:

```json
{
  "Authorization": "Bearer {{jwtToken}}"
}
```

Resposta esperada:

```json
{
  "message": "Inscrição cancelada com sucesso"
}
```

## 4) Pagamentos de eventos (Events - Payments)

### POST `{{baseUrl}}/events/payments/initiate`

Headers:

```json
{
  "Authorization": "Bearer {{jwtToken}}",
  "Content-Type": "application/json"
}
```

Body:

```json
{
  "eventId": "7e92f4af-06a3-497e-82c3-faf0fcd49527"
}
```

Resposta esperada:

```json
{
  "paymentId": "128439201",
  "checkoutUrl": "https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=123",
  "amount": 75.9,
  "currency": "BRL",
  "expiresAt": "2026-03-25T03:15:00.000Z"
}
```

### POST `{{baseUrl}}/events/payments/webhook`

Headers:

```json
{
  "Content-Type": "application/json"
}
```

Body:

```json
{
  "paymentId": "128439201",
  "status": "PAID",
  "orderId": "event_7e92f4af-06a3-497e-82c3-faf0fcd49527",
  "amount": 75.9,
  "paidAt": "2026-03-25T02:30:00.000Z",
  "signature": "hmac_sha256_signature"
}
```

Resposta esperada:

```json
{
  "received": true
}
```

### GET `{{baseUrl}}/events/payments/{{registrationId}}/status`

Headers:

```json
{
  "Authorization": "Bearer {{jwtToken}}"
}
```

Resposta esperada:

```json
{
  "registrationId": "8747733d-20f8-4d1f-ac53-84fe95f47fcb",
  "status": "PAID",
  "paymentStatus": "PAID",
  "orderId": "event_7e92f4af-06a3-497e-82c3-faf0fcd49527",
  "paymentId": "128439201",
  "amount": 75.9,
  "paidAt": "2026-03-25T02:30:00.000Z"
}
```

### POST `{{baseUrl}}/events/payments/{{registrationId}}/refund`

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
  "reason": "Cancelamento por solicitação do cliente"
}
```

Resposta esperada:

```json
{
  "message": "Reembolso processado com sucesso"
}
```

## 5) Administração de eventos (Events - Admin)

### POST `{{baseUrl}}/admin/events`

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
  "title": "Torneio de Pesca Noturno",
  "description": "Evento noturno com disputa por maior captura.",
  "rules": "Obrigatório lanterna e colete. Proibido rede.",
  "location": "Lago Azul - Pier 3",
  "totalSlots": 150,
  "eventDate": "2026-09-20",
  "eventTime": "19:30",
  "price": 120,
  "isPaid": true,
  "image": "<arquivo .jpg|.jpeg|.png|.webp|.gif opcional>"
}
```

Resposta esperada:

```json
{
  "id": "9f07c290-51aa-4f7f-91a4-5e9fa0c34f1d",
  "title": "Torneio de Pesca Noturno",
  "totalSlots": 150,
  "availableSlots": 150,
  "status": "SCHEDULED",
  "isPaid": true,
  "price": 120
}
```

### GET `{{baseUrl}}/admin/events?page=1&limit=20&status=SCHEDULED&title=torneio`

Headers:

```json
{
  "Authorization": "Bearer {{adminToken}}"
}
```

Resposta esperada:

```json
{
  "items": [
    {
      "id": "9f07c290-51aa-4f7f-91a4-5e9fa0c34f1d",
      "title": "Torneio de Pesca Noturno",
      "status": "SCHEDULED"
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 20
}
```

### GET `{{baseUrl}}/admin/events/{{eventId}}`

Resposta esperada:

```json
{
  "id": "7e92f4af-06a3-497e-82c3-faf0fcd49527",
  "title": "Torneio de Pesca 2026",
  "description": "Evento de pesca esportiva com premiações.",
  "rules": "Chegar 30 minutos antes. Proibido redes.",
  "location": "Lago Azul - Setor Norte",
  "status": "UPCOMING",
  "totalSlots": 120,
  "availableSlots": 75,
  "isPaid": true,
  "price": 75.9
}
```

### PATCH `{{baseUrl}}/admin/events/{{eventId}}`

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
  "title": "Torneio de Pesca 2026 - Edição Premium",
  "location": "Lago Azul - Setor Norte Premium",
  "totalSlots": 140,
  "price": 89.9,
  "status": "UPCOMING",
  "image": "<arquivo opcional>"
}
```

Resposta esperada:

```json
{
  "id": "7e92f4af-06a3-497e-82c3-faf0fcd49527",
  "title": "Torneio de Pesca 2026 - Edição Premium",
  "totalSlots": 140,
  "availableSlots": 75,
  "price": 89.9,
  "status": "UPCOMING"
}
```

### DELETE `{{baseUrl}}/admin/events/{{eventId}}`

Resposta esperada:

```json
{
  "message": "Evento excluído com sucesso"
}
```

### POST `{{baseUrl}}/admin/events/{{eventId}}/restore`

Resposta esperada:

```json
{
  "id": "7e92f4af-06a3-497e-82c3-faf0fcd49527",
  "status": "UPCOMING"
}
```

### GET `{{baseUrl}}/admin/events/{{eventId}}/participants`

Resposta esperada:

```json
[
  {
    "id": "8747733d-20f8-4d1f-ac53-84fe95f47fcb",
    "userId": "baf5acc6-9b9f-40d0-983f-be2cc143f6fd",
    "eventId": "7e92f4af-06a3-497e-82c3-faf0fcd49527",
    "status": "PAID",
    "paymentStatus": "PAID"
  }
]
```

### PATCH `{{baseUrl}}/admin/events/{{eventId}}/status`

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
  "status": "IN_PROGRESS"
}
```

Resposta esperada:

```json
{
  "id": "7e92f4af-06a3-497e-82c3-faf0fcd49527",
  "status": "IN_PROGRESS"
}
```

### POST `{{baseUrl}}/admin/events/{{eventId}}/image`

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
  "image": "<arquivo obrigatório .jpg|.jpeg|.png|.webp|.gif>"
}
```

Resposta esperada:

```json
{
  "id": "7e92f4af-06a3-497e-82c3-faf0fcd49527",
  "imageUrl": "https://cdn.example.com/events/evento-atualizado.webp",
  "imageKey": "events/evento-atualizado.webp"
}
```

## 6) KPIs de eventos (Events - KPIs)

### GET `{{baseUrl}}/admin/events/kpis?month={{month}}&year={{year}}`

Headers:

```json
{
  "Authorization": "Bearer {{adminToken}}"
}
```

Resposta esperada:

```json
{
  "activeEvents": {
    "value": 25,
    "previousValue": 20,
    "percentageChange": 25,
    "changeType": "increase",
    "goal": 30,
    "goalPercentage": 83.3,
    "goalStatus": "in_progress"
  },
  "registeredParticipants": {
    "value": 412,
    "previousValue": 380,
    "percentageChange": 8.4,
    "changeType": "increase",
    "goal": 450,
    "goalPercentage": 91.5,
    "goalStatus": "in_progress"
  },
  "registrationPercentage": {
    "value": 72.5,
    "previousValue": 68.1,
    "percentageChange": 6.5,
    "changeType": "increase",
    "goal": 75,
    "goalPercentage": 96.6,
    "goalStatus": "in_progress"
  },
  "soldOutEvents": {
    "value": 6,
    "previousValue": 4,
    "percentageChange": 50,
    "changeType": "increase",
    "goal": 8,
    "goalPercentage": 75,
    "goalStatus": "in_progress"
  }
}
```

### GET `{{baseUrl}}/admin/events/kpis/active-events?month={{month}}&year={{year}}`

Resposta esperada:

```json
{
  "value": 25,
  "previousValue": 20,
  "percentageChange": 25,
  "changeType": "increase",
  "goal": 30,
  "goalPercentage": 83.3,
  "goalStatus": "in_progress"
}
```

### GET `{{baseUrl}}/admin/events/kpis/registered-participants?month={{month}}&year={{year}}`

Resposta esperada:

```json
{
  "value": 412,
  "previousValue": 380,
  "percentageChange": 8.4,
  "changeType": "increase",
  "goal": 450,
  "goalPercentage": 91.5,
  "goalStatus": "in_progress"
}
```

### GET `{{baseUrl}}/admin/events/kpis/registration-percentage?month={{month}}&year={{year}}`

Resposta esperada:

```json
{
  "value": 72.5,
  "previousValue": 68.1,
  "percentageChange": 6.5,
  "changeType": "increase",
  "goal": 75,
  "goalPercentage": 96.6,
  "goalStatus": "in_progress"
}
```

### GET `{{baseUrl}}/admin/events/kpis/sold-out-events?month={{month}}&year={{year}}`

Resposta esperada:

```json
{
  "value": 6,
  "previousValue": 4,
  "percentageChange": 50,
  "changeType": "increase",
  "goal": 8,
  "goalPercentage": 75,
  "goalStatus": "in_progress"
}
```

### POST `{{baseUrl}}/admin/events/kpis/goals`

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
  "kpiType": "REGISTERED_PARTICIPANTS",
  "targetValue": 500,
  "month": 7,
  "year": 2026
}
```

Resposta esperada:

```json
{
  "id": "956dc9c8-f2c5-4ca9-aa83-ec06487f3274",
  "kpiType": "REGISTERED_PARTICIPANTS",
  "targetValue": 500,
  "month": 7,
  "year": 2026,
  "createdAt": "2026-03-25T02:40:00.000Z",
  "updatedAt": "2026-03-25T02:40:00.000Z"
}
```

## 7) Gráficos de eventos (Events - Charts)

### GET `{{baseUrl}}/admin/events/charts/monthly?year={{year}}`

Headers:

```json
{
  "Authorization": "Bearer {{adminToken}}"
}
```

Resposta esperada:

```json
{
  "months": ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul"],
  "participants": [40, 52, 61, 55, 70, 80, 92],
  "events": [3, 4, 4, 5, 6, 6, 7],
  "totalParticipants": 450,
  "totalEvents": 35
}
```

### GET `{{baseUrl}}/admin/events/charts/yearly?startYear=2024&endYear=2026`

Resposta esperada:

```json
{
  "years": [2024, 2025, 2026],
  "participants": [780, 1060, 1240],
  "events": [42, 55, 64],
  "totalParticipants": 3080,
  "totalEvents": 161
}
```

### GET `{{baseUrl}}/admin/events/charts/status-distribution?month={{month}}&year={{year}}`

Resposta esperada:

```json
{
  "scheduled": 8,
  "inProgress": 2,
  "completed": 15,
  "cancelled": 1,
  "upcoming": 4
}
```

### GET `{{baseUrl}}/admin/events/charts/trend?months=6`

Resposta esperada:

```json
{
  "labels": ["Fev", "Mar", "Abr", "Mai", "Jun", "Jul"],
  "values": [35, 41, 44, 56, 63, 72],
  "movingAverage": [35, 38, 40, 47, 54, 63],
  "trend": "upward"
}
```

### GET `{{baseUrl}}/admin/events/charts/top-events?limit=5&month={{month}}&year={{year}}`

Resposta esperada:

```json
[
  {
    "eventId": "7e92f4af-06a3-497e-82c3-faf0fcd49527",
    "title": "Torneio de Pesca 2026",
    "participants": 112,
    "totalSlots": 120,
    "availableSlots": 8,
    "occupancyPercentage": 93.3
  }
]
```

## 8) Fluxo recomendado ponta-a-ponta (happy path)

1. Criar/obter `jwtToken` de usuário e `adminToken`.
2. Listar eventos públicos (`GET /events`) e pegar `eventId` de um evento pago.
3. Iniciar pagamento (`POST /events/payments/initiate`).
4. Processar webhook de aprovação (`POST /events/payments/webhook`).
5. Confirmar status (`GET /events/payments/:registrationId/status`).
6. Validar participante no admin (`GET /admin/events/:id/participants`).
7. Consultar impacto em KPI/chart (`GET /admin/events/kpis` e `GET /admin/events/charts/*`).

## 9) Erros comuns esperados

- `400`: payload inválido, UUID inválido, assinatura de webhook inválida.
- `401`: ausência de token JWT em rotas protegidas.
- `403`: usuário sem perfil ADMIN em rotas administrativas.
- `404`: evento/inscrição não encontrado.
- `409`: conflito de inscrição, vagas esgotadas, reembolso inválido para status atual.

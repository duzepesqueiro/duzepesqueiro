# Payment Module - Guia de Endpoints para Postman

## Variáveis recomendadas no Postman

- `baseUrl`: `http://localhost:3000`
- `jwtToken`: token de usuário comum
- `adminToken`: token de usuário admin
- `mpPublicKey`: `MERCADOPAGO_PUBLIC_KEY`
- `mpClientId`: `MERCADOPAGO_CLIENT_ID`
- `mpClientSecret`: `MERCADOPAGO_CLIENT_SECRET`
- `mpWebhookSecret`: `MERCADOPAGO_WEBHOOK_SECRET`
- `externalPaymentId`: id externo do pagamento retornado pelo Mercado Pago
- `requestId`: uuid único para webhook (ex.: `{{$guid}}`)

## 1) Autenticação da API (obter JWT da aplicação)

### POST `{{baseUrl}}/auth/register`

Headers:

```json
{
  "Content-Type": "application/json"
}
```

Body:

```json
{
  "username": "joaosilva",
  "email": "usuario@teste.com",
  "password": "Senha@123",
  "fullName": "João Silva",
  "phone": "11999999999",
  "document": "12345678900"
}
```

Resposta esperada:
- `user`
- `requiresEmailConfirmation`
- `confirmationToken`

### POST `{{baseUrl}}/auth/confirm-email`

Headers:

```json
{
  "Content-Type": "application/json"
}
```

Body:

```json
{
  "token": "123456"
}
```

Observação:
- o código de confirmação de e-mail é numérico e possui exatamente 6 dígitos.

Resposta esperada:
- `user`
- `accessToken`
- `refreshToken`

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
  "email": "usuario@teste.com",
  "password": "Senha@123"
}
```

Resposta esperada:
- `accessToken` para usar como `Bearer {{jwtToken}}`
- `refreshToken`

## 2) Autenticação Mercado Pago (OAuth Client Credentials)

### POST `https://api.mercadopago.com/oauth/token`

Headers:

```json
{
  "Content-Type": "application/json"
}
```

Body:

```json
{
  "grant_type": "client_credentials",
  "client_id": "{{mpClientId}}",
  "client_secret": "{{mpClientSecret}}"
}
```

Resposta esperada:
- `access_token`
- `token_type`
- `expires_in`

## 2.1) Gerar token de cartão no Mercado Pago (sem frontend)

### POST `https://api.mercadopago.com/v1/card_tokens`

Headers:

```json
{
  "Authorization": "Bearer {{mpPublicKey}}",
  "Content-Type": "application/json"
}
```

Body:

```json
{
  "card_number": "5031433215406351",
  "expiration_month": 11,
  "expiration_year": 2030,
  "security_code": "123",
  "cardholder": {
    "name": "APRO",
    "identification": {
      "type": "CPF",
      "number": "19119119100"
    }
  }
}
```

Resposta esperada:
- `id` (use este valor como `token` no endpoint `POST /payments`)

## 3) Criar pagamento

### POST `{{baseUrl}}/payments`

Headers:

```json
{
  "Authorization": "Bearer {{jwtToken}}",
  "Content-Type": "application/json"
}
```

Body (estrutura completa):

```json
{
  "domain": "sales",
  "entityId": "order-123",
  "transactionAmount": 1000,
  "installments": 1,
  "paymentMethodId": "pix",
  "description": "Pagamento do pedido 123",
  "externalReference": "sales_order-123",
  "notificationUrl": "https://seu-dominio.com/payments/webhook/mercadopago",
  "metadata": {
    "source": "postman",
    "traceId": "abc-123"
  },
  "payer": {
    "email": "cliente@teste.com",
    "firstName": "Maria",
    "lastName": "Silva",
    "identification": {
      "type": "CPF",
      "number": "12345678901"
    },
    "phone": {
      "areaCode": "11",
      "number": "999999999"
    },
    "address": {
      "zipCode": "01001-000",
      "streetName": "Rua Exemplo",
      "streetNumber": 100
    }
  },
  "items": [
    {
      "id": "item-001",
      "title": "Produto Exemplo",
      "description": "Descrição do item",
      "categoryId": "electronics",
      "quantity": 1,
      "unitPrice": 1000
    }
  ]
}
```

Observação:
- para `paymentMethodId: "pix"` não envie `token`;
- `token` é obrigatório para qualquer método que não seja `pix`;
- no endereço do payer envie apenas `zipCode`, `streetName` e `streetNumber`;
- com validação `forbidNonWhitelisted`, qualquer campo fora do DTO retorna `400`.

Exemplo para cartão (`master`):

```json
{
  "domain": "sales",
  "entityId": "order-124",
  "transactionAmount": 1200,
  "installments": 3,
  "paymentMethodId": "master",
  "token": "TOKEN_GERADO_EM_/v1/card_tokens",
  "description": "Pagamento com cartão do pedido 124",
  "externalReference": "sales_order-124",
  "payer": {
    "email": "cleverson.github@gmail.com",
    "firstName": "Cleverson",
    "lastName": "Resende",
    "identification": {
      "type": "CPF",
      "number": "19119119100"
    },
    "phone": {
      "areaCode": "33",
      "number": "999373400"
    },
    "address": {
      "zipCode": "01001-000",
      "streetName": "Rua Exemplo",
      "streetNumber": 100
    }
  },
  "items": [
    {
      "id": "item-001",
      "title": "Produto Exemplo",
      "quantity": 1,
      "unitPrice": 1200
    }
  ]
}
```

Fluxo recomendado para teste com cartão:
- gere o token em `POST /v1/card_tokens`;
- use o token no `POST /payments`;
- para Mastercard de teste use `paymentMethodId: "master"`;
- `cardholder.name: "APRO"` tende a aprovação e `"OTHE"` tende a recusa em cenários de teste.

## 4) Buscar pagamentos

### GET `{{baseUrl}}/payments/search`

Headers:

```json
{
  "Authorization": "Bearer {{jwtToken}}"
}
```

Query params (todos opcionais):

```json
{
  "sort": "date_created",
  "criteria": "desc",
  "range": "date_created",
  "beginDate": "2026-03-01T00:00:00.000Z",
  "endDate": "2026-03-22T23:59:59.999Z",
  "status": "pending",
  "externalReference": "sales_order-123",
  "collectorId": "123456",
  "payerId": "payer_001",
  "domain": "sales",
  "entityId": "order-123",
  "limit": 30,
  "offset": 0,
  "fetchAllPages": false
}
```

## 5) Obter pagamento por ID externo

### GET `{{baseUrl}}/payments/{{externalPaymentId}}`

Headers:

```json
{
  "Authorization": "Bearer {{jwtToken}}"
}
```

Body: vazio

## 6) Obter pagamento por referência externa

### GET `{{baseUrl}}/payments/reference/sales_order-123`

Headers:

```json
{
  "Authorization": "Bearer {{jwtToken}}"
}
```

Body: vazio

## 7) Atualizar pagamento (admin)

### PUT `{{baseUrl}}/payments/{{externalPaymentId}}`

Headers:

```json
{
  "Authorization": "Bearer {{adminToken}}",
  "Content-Type": "application/json"
}
```

Body (campos atualizáveis):

```json
{
  "capture": false,
  "status": "cancelled",
  "transactionAmount": 1000,
  "dateOfExpiration": "2026-03-30T23:59:59.000Z"
}
```

## 8) Capturar pagamento autorizado (admin)

### POST `{{baseUrl}}/payments/{{externalPaymentId}}/capture`

Headers:

```json
{
  "Authorization": "Bearer {{adminToken}}"
}
```

Body: vazio

## 9) Cancelar pagamento

### POST `{{baseUrl}}/payments/{{externalPaymentId}}/cancel`

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
  "reason": "Cancelamento solicitado pelo cliente"
}
```

## 10) Webhook Mercado Pago

### POST `{{baseUrl}}/payments/webhook/mercadopago`

Headers:

```json
{
  "x-signature": "assinatura_hmac_sha256_do_payload",
  "x-request-id": "{{requestId}}",
  "Content-Type": "application/json"
}
```

Body:

```json
{
  "action": "payment.updated",
  "type": "payment",
  "dateCreated": "2026-03-22T17:00:00.000Z",
  "data": {
    "id": "123456789"
  }
}
```

## 11) Health check do módulo

### GET `{{baseUrl}}/payments/health`

Headers:

```json
{}
```

Body: vazio

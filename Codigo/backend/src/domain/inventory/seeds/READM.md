# Inventory Module - Guia de Endpoints para Postman

## Variáveis recomendadas no Postman

- `baseUrl`: `http://localhost:3000`
- `adminToken`: token JWT de usuário ADMIN
- `productIdSale`: `3b2f0933-8f2d-4f8c-b84a-ec6ac31fca11`
- `productIdRental`: `4fcd58b9-2f4e-4d68-9d57-4e4b2ffabca2`
- `supplierId`: `7e115f38-70fc-4e52-971b-0f33977fa420`
- `purchaseOrderId`: `c4d8782f-c6e5-472e-a8fe-f8ca84de3802`
- `purchaseOrderItemId`: `98c5eb98-f15e-4e0d-8104-61331316e8fb`

## Massa base sugerida para testes

```json
{
  "admin": {
    "id": "96fb5b4d-2a73-4f64-9bc3-c69eab16f260",
    "email": "admin.inventory@teste.com",
    "role": "ADMIN"
  },
  "supplier": {
    "id": "7e115f38-70fc-4e52-971b-0f33977fa420",
    "name": "Fornecedor Rio Azul",
    "cnpj": "11222333000181",
    "rating": 5,
    "phone": "+55 11 99999-1111",
    "email": "fornecedor@rioazul.com"
  },
  "productSale": {
    "id": "3b2f0933-8f2d-4f8c-b84a-ec6ac31fca11",
    "sku": "FD-00021",
    "name": "Isca Premium 500g",
    "status": "SALE",
    "category": "FOOD",
    "unitMeasure": "UNIT",
    "stockQuantity": 120,
    "minimumLimit": 30,
    "costPrice": 9.5,
    "salePrice": 18.9
  },
  "productRental": {
    "id": "4fcd58b9-2f4e-4d68-9d57-4e4b2ffabca2",
    "sku": "RE-00009",
    "name": "Vara de Carbono X",
    "status": "RENTAL",
    "category": "RENTAL_EQUIPMENT",
    "unitMeasure": "UNIT",
    "stockQuantity": 15,
    "minimumLimit": 4,
    "costPrice": 180,
    "salePrice": 35
  },
  "purchaseOrder": {
    "id": "c4d8782f-c6e5-472e-a8fe-f8ca84de3802",
    "supplierId": "7e115f38-70fc-4e52-971b-0f33977fa420",
    "status": "PENDING",
    "deliveryStatus": "PENDING",
    "totalAmount": 950
  }
}
```

## 1) Autenticação (obter token ADMIN)

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
  "email": "admin.inventory@teste.com",
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

## 2) Endpoints ADMIN - Produtos

### POST `{{baseUrl}}/products`

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
  "name": "Isca Premium 500g",
  "status": "SALE",
  "category": "FOOD",
  "unitMeasure": "UNIT",
  "stockQuantity": 120,
  "minimumLimit": 30,
  "suggestedQuantity": 80,
  "costPrice": 9.5,
  "salePrice": 18.9,
  "location": "Loja principal",
  "supplierId": "7e115f38-70fc-4e52-971b-0f33977fa420",
  "turnoverRate": "HIGH"
}
```

Resposta esperada:

```json
{
  "id": "3b2f0933-8f2d-4f8c-b84a-ec6ac31fca11",
  "sku": "FD-00021",
  "name": "Isca Premium 500g",
  "status": "SALE",
  "category": "FOOD",
  "stockQuantity": 120,
  "costPrice": 9.5,
  "salePrice": 18.9
}
```

### GET `{{baseUrl}}/products?page=1&limit=10&search=isca&status=SALE`

Resposta esperada:

```json
{
  "items": [
    {
      "id": "3b2f0933-8f2d-4f8c-b84a-ec6ac31fca11",
      "sku": "FD-00021",
      "name": "Isca Premium 500g",
      "category": "FOOD",
      "status": "SALE",
      "stockQuantity": 120,
      "minimumLimit": 30,
      "salePrice": 18.9,
      "supplierName": "Fornecedor Rio Azul",
      "isLowStock": false
    }
  ],
  "total": 1,
  "page": 1,
  "itemsPerPage": 10,
  "totalPages": 1
}
```

### GET `{{baseUrl}}/products/{{productIdSale}}`

Resposta esperada:

```json
{
  "id": "3b2f0933-8f2d-4f8c-b84a-ec6ac31fca11",
  "sku": "FD-00021",
  "name": "Isca Premium 500g",
  "status": "SALE",
  "category": "FOOD",
  "unitMeasure": "UNIT",
  "stockQuantity": 120,
  "minimumLimit": 30,
  "suggestedQuantity": 80,
  "costPrice": 9.5,
  "salePrice": 18.9,
  "supplier": {
    "id": "7e115f38-70fc-4e52-971b-0f33977fa420",
    "name": "Fornecedor Rio Azul"
  }
}
```

### GET `{{baseUrl}}/products/sku/FD-00021`

Resposta esperada: mesmo payload de `GET /products/:id`.

### PATCH `{{baseUrl}}/products/{{productIdSale}}`

Body:

```json
{
  "salePrice": 19.9,
  "minimumLimit": 25
}
```

Resposta esperada:

```json
{
  "id": "3b2f0933-8f2d-4f8c-b84a-ec6ac31fca11",
  "salePrice": 19.9,
  "minimumLimit": 25
}
```

### DELETE `{{baseUrl}}/products/{{productIdSale}}`

Resposta esperada: `204 No Content`.

### POST `{{baseUrl}}/products/{{productIdSale}}/stock`

Body:

```json
{
  "quantity": 15,
  "movementType": "INBOUND",
  "movementReason": "PURCHASE",
  "note": "Entrada por reposição semanal"
}
```

Resposta esperada:

```json
{
  "id": "34ca8443-cbb6-4d2e-bf50-6f7083f02ad6",
  "productId": "3b2f0933-8f2d-4f8c-b84a-ec6ac31fca11",
  "movementType": "INBOUND",
  "movementReason": "PURCHASE",
  "quantity": 15,
  "previousBalance": 120,
  "nextBalance": 135
}
```

### GET `{{baseUrl}}/products/{{productIdSale}}/kardex?page=1&limit=10`

Resposta esperada:

```json
{
  "items": [
    {
      "id": "34ca8443-cbb6-4d2e-bf50-6f7083f02ad6",
      "movementType": "INBOUND",
      "movementReason": "PURCHASE",
      "quantity": 15,
      "previousBalance": 120,
      "nextBalance": 135
    }
  ],
  "total": 1,
  "page": 1,
  "itemsPerPage": 10,
  "totalPages": 1
}
```

## 3) Endpoints ADMIN - Fornecedores

### POST `{{baseUrl}}/suppliers`

Body:

```json
{
  "name": "Fornecedor Rio Azul",
  "cnpj": "11222333000181",
  "rating": 5,
  "phone": "+55 11 99999-1111",
  "email": "fornecedor@rioazul.com",
  "address": "Av. das Águas, 100 - SP"
}
```

Resposta esperada:

```json
{
  "id": "7e115f38-70fc-4e52-971b-0f33977fa420",
  "name": "Fornecedor Rio Azul",
  "cnpj": "11222333000181",
  "rating": 5,
  "totalOrders": 0
}
```

### GET `{{baseUrl}}/suppliers?page=1&limit=10&search=rio`

Resposta esperada:

```json
{
  "items": [
    {
      "id": "7e115f38-70fc-4e52-971b-0f33977fa420",
      "name": "Fornecedor Rio Azul",
      "cnpj": "11222333000181",
      "rating": 5
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10,
  "totalPages": 1
}
```

### GET `{{baseUrl}}/suppliers/{{supplierId}}`

Resposta esperada:

```json
{
  "id": "7e115f38-70fc-4e52-971b-0f33977fa420",
  "name": "Fornecedor Rio Azul",
  "cnpj": "11222333000181",
  "rating": 5,
  "totalOrders": 3,
  "totalPurchasedUnits": 520
}
```

### GET `{{baseUrl}}/suppliers/{{supplierId}}/products?page=1&limit=10`

Resposta esperada: mesmo formato de `ProductListResponseDto`.

### PATCH `{{baseUrl}}/suppliers/{{supplierId}}`

Body:

```json
{
  "rating": 4,
  "phone": "+55 11 98888-2222"
}
```

Resposta esperada:

```json
{
  "id": "7e115f38-70fc-4e52-971b-0f33977fa420",
  "rating": 4,
  "phone": "+55 11 98888-2222"
}
```

### DELETE `{{baseUrl}}/suppliers/{{supplierId}}`

Resposta esperada: `204 No Content`.

### POST `{{baseUrl}}/suppliers/validate-cnpj`

Body:

```json
{
  "cnpj": "11222333000181"
}
```

Resposta esperada:

```json
{
  "valid": true
}
```

## 4) Endpoints ADMIN - Ordens de Compra

### POST `{{baseUrl}}/purchase-orders`

Body:

```json
{
  "supplierId": "7e115f38-70fc-4e52-971b-0f33977fa420",
  "priority": "HIGH",
  "expectedDeliveryDate": "2026-04-10T00:00:00.000Z",
  "note": "Reposição de itens sazonais",
  "items": [
    {
      "productId": "3b2f0933-8f2d-4f8c-b84a-ec6ac31fca11",
      "quantity": 80,
      "unitPrice": 9.5
    }
  ]
}
```

Resposta esperada:

```json
{
  "id": "c4d8782f-c6e5-472e-a8fe-f8ca84de3802",
  "supplierId": "7e115f38-70fc-4e52-971b-0f33977fa420",
  "status": "PENDING",
  "deliveryStatus": "PENDING",
  "totalAmount": 760
}
```

### GET `{{baseUrl}}/purchase-orders?page=1&limit=10&status=PENDING`

Resposta esperada:

```json
{
  "items": [
    {
      "id": "c4d8782f-c6e5-472e-a8fe-f8ca84de3802",
      "status": "PENDING",
      "deliveryStatus": "PENDING",
      "totalAmount": 760
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10,
  "totalPages": 1
}
```

### GET `{{baseUrl}}/purchase-orders/suggestions`

Resposta esperada:

```json
{
  "generatedAt": "2026-03-28T20:00:00.000Z",
  "totalSuggestions": 2,
  "items": [
    {
      "productId": "3b2f0933-8f2d-4f8c-b84a-ec6ac31fca11",
      "sku": "FD-00021",
      "suggestedQuantity": 80
    }
  ]
}
```

### GET `{{baseUrl}}/purchase-orders/{{purchaseOrderId}}`

Resposta esperada:

```json
{
  "id": "c4d8782f-c6e5-472e-a8fe-f8ca84de3802",
  "status": "PENDING",
  "deliveryStatus": "PENDING",
  "items": [
    {
      "id": "98c5eb98-f15e-4e0d-8104-61331316e8fb",
      "productId": "3b2f0933-8f2d-4f8c-b84a-ec6ac31fca11",
      "quantity": 80,
      "receivedQuantity": 0
    }
  ]
}
```

### PATCH `{{baseUrl}}/purchase-orders/{{purchaseOrderId}}/status`

Body:

```json
{
  "status": "APPROVED",
  "deliveryStatus": "IN_TRANSIT"
}
```

Resposta esperada:

```json
{
  "id": "c4d8782f-c6e5-472e-a8fe-f8ca84de3802",
  "status": "APPROVED",
  "deliveryStatus": "IN_TRANSIT"
}
```

### POST `{{baseUrl}}/purchase-orders/{{purchaseOrderId}}/receive`

Body:

```json
{
  "items": [
    {
      "itemId": "98c5eb98-f15e-4e0d-8104-61331316e8fb",
      "receivedQuantity": 80
    }
  ],
  "note": "Recebimento completo no almoxarifado"
}
```

Resposta esperada (ordem atualizada + estoque e kardex ajustados automaticamente):

```json
{
  "id": "c4d8782f-c6e5-472e-a8fe-f8ca84de3802",
  "status": "RECEIVED",
  "deliveryStatus": "DELIVERED",
  "items": [
    {
      "id": "98c5eb98-f15e-4e0d-8104-61331316e8fb",
      "quantity": 80,
      "receivedQuantity": 80
    }
  ]
}
```

### POST `{{baseUrl}}/purchase-orders/{{purchaseOrderId}}/cancel`

Resposta esperada: `204 No Content`.

## 5) Endpoints ADMIN - Inventário de Aluguel

### GET `{{baseUrl}}/rental-inventory?page=1&limit=10`

Resposta esperada:

```json
{
  "items": [
    {
      "productId": "4fcd58b9-2f4e-4d68-9d57-4e4b2ffabca2",
      "productName": "Vara de Carbono X",
      "productSku": "RE-00009",
      "stockQuantity": 15,
      "quality": "GOOD"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10,
  "totalPages": 1
}
```

### GET `{{baseUrl}}/rental-inventory/quality/GOOD?page=1&limit=10`

Resposta esperada: mesmo formato de listagem paginada.

### GET `{{baseUrl}}/rental-inventory/product/{{productIdRental}}`

Resposta esperada:

```json
{
  "productId": "4fcd58b9-2f4e-4d68-9d57-4e4b2ffabca2",
  "productName": "Vara de Carbono X",
  "productSku": "RE-00009",
  "stockQuantity": 15,
  "quality": "GOOD",
  "lastInspectionAt": "2026-03-20T15:10:00.000Z"
}
```

### POST `{{baseUrl}}/rental-inventory/inspection/{{productIdRental}}`

Body:

```json
{
  "newQuality": "MEDIUM",
  "note": "Pequenos arranhões identificados"
}
```

Resposta esperada:

```json
{
  "productId": "4fcd58b9-2f4e-4d68-9d57-4e4b2ffabca2",
  "quality": "MEDIUM",
  "note": "Pequenos arranhões identificados"
}
```

### GET `{{baseUrl}}/rental-inventory/report/quality?page=1&limit=50`

Resposta esperada:

```json
{
  "generatedAt": "2026-03-28T20:05:00.000Z",
  "summary": {
    "totalItems": 1,
    "good": 0,
    "medium": 1,
    "bad": 0
  },
  "items": [
    {
      "productId": "4fcd58b9-2f4e-4d68-9d57-4e4b2ffabca2",
      "quality": "MEDIUM"
    }
  ]
}
```

## 6) Endpoints ADMIN - KPIs

### GET `{{baseUrl}}/kpis/dashboard`

Resposta esperada:

```json
{
  "totalStockValue": { "totalValue": 12450.5, "percentageVariation": 4.8 },
  "stockTurnover": { "annualTurnover": 3.2, "percentageVariation": 1.1 },
  "stockout": { "stockoutPercentage": 2.6, "stockoutCount": 3 },
  "lowStock": { "totalLowStockItems": 5 },
  "agedStock": { "agedStockValue": 980.0 }
}
```

### GET `{{baseUrl}}/kpis/total-value`

```json
{
  "totalValue": 12450.5,
  "percentageVariation": 4.8
}
```

### GET `{{baseUrl}}/kpis/turnover`

```json
{
  "annualTurnover": 3.2,
  "percentageVariation": 1.1
}
```

### GET `{{baseUrl}}/kpis/stockout`

```json
{
  "stockoutPercentage": 2.6,
  "stockoutCount": 3
}
```

### GET `{{baseUrl}}/kpis/low-stock`

```json
{
  "totalLowStockItems": 5,
  "items": [
    {
      "productId": "3b2f0933-8f2d-4f8c-b84a-ec6ac31fca11",
      "sku": "FD-00021"
    }
  ]
}
```

### GET `{{baseUrl}}/kpis/aged?days=90`

```json
{
  "agedStockValue": 980.0,
  "daysThreshold": 90
}
```

### GET `{{baseUrl}}/kpis/history/TOTAL_STOCK_VALUE?startDate=2026-01-01&endDate=2026-03-31`

```json
[
  {
    "referenceDate": "2026-01-31T00:00:00.000Z",
    "value": 11400.2,
    "variation": 1.4
  },
  {
    "referenceDate": "2026-02-28T00:00:00.000Z",
    "value": 12450.5,
    "variation": 4.8
  }
]
```

### POST `{{baseUrl}}/kpis/recalculate`

Resposta esperada:

```json
{
  "message": "KPI recalculation started"
}
```

## 7) Endpoints USER - Produtos para vitrine

> Estes endpoints são públicos e retornam apenas dados mínimos para frontend de usuário.

### GET `{{baseUrl}}/user/products/sale?page=1&limit=12&search=isca`

Resposta esperada:

```json
{
  "items": [
    {
      "id": "3b2f0933-8f2d-4f8c-b84a-ec6ac31fca11",
      "sku": "FD-00021",
      "name": "Isca Premium 500g",
      "status": "SALE",
      "category": "FOOD",
      "unitMeasure": "UNIT",
      "salePrice": 18.9,
      "stockQuantity": 120
    }
  ],
  "total": 1,
  "page": 1,
  "itemsPerPage": 12,
  "totalPages": 1
}
```

### GET `{{baseUrl}}/user/products/rental?page=1&limit=12`

Resposta esperada: mesmo formato, com `status: "RENTAL"`.

### GET `{{baseUrl}}/user/products/hosting?page=1&limit=12`

Resposta esperada: mesmo formato, com `status: "HOSTING"`.

### GET `{{baseUrl}}/user/products/event?page=1&limit=12`

Resposta esperada: mesmo formato, com `status: "EVENT"`.

## 8) Checklist de cobertura do domínio inventory

- Admin Products: create, list, get by id, get by sku, update, delete, stock adjust, kardex.
- Admin Suppliers: create, list, get, list products, update, delete, validate cnpj.
- Admin Purchase Orders: create, list, suggestions, get, update status, receive, cancel.
- Admin Rental Inventory: list, list by quality, get by product, inspection, report.
- Admin KPIs: dashboard, total value, turnover, stockout, low stock, aged, history, recalculate.
- User Products: sale, rental, hosting, event (todas paginadas).

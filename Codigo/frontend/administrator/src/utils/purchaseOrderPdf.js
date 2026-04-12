// Util para gerar PDF de Ordem de Compra sem dependências externas
// Abre uma janela de impressão com HTML formatado; o usuário pode salvar como PDF.

const safeText = (v) => (v == null ? '' : String(v));

export function generatePurchaseOrderPDF(items = [], meta = {}) {
  const win = window.open('', '_blank');
  if (!win) {
    alert('Não foi possível abrir a janela de impressão. Verifique pop-ups.');
    return;
  }

  const date = new Date();
  const formattedDate = date.toLocaleString();
  const supplierName = safeText(meta.supplier || 'Fornecedor');
  const companyName = safeText(meta.company || 'DuZe Pesqueiro');
  const requester = safeText(meta.requester || 'usuario@duze.local');

  const rowsHtml = (Array.isArray(items) ? items : []).map((item, idx) => {
    const name = safeText(item?.product ?? item?.name);
    const supplier = safeText(item?.supplier);
    const qty = Number(item?.orderQuantity ?? item?.reorderQty ?? item?.suggestedQuantity ?? item?.qty ?? item?.quantity ?? 1) || 1;
    return `
      <tr>
        <td>${idx + 1}</td>
        <td>${name}</td>
        <td>${supplier}</td>
        <td style="text-align:right;">${qty}</td>
        <td><div style="border-bottom:1px dashed #bbb; height:18px;"></div></td>
        <td><div style="border-bottom:1px dashed #bbb; height:18px;"></div></td>
      </tr>
    `;
  }).join('');

  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Orçamento de Compra</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 24px; }
          h1 { font-size: 20px; margin: 0 0 8px; }
          .meta { margin-bottom: 16px; font-size: 12px; color: #333; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ddd; padding: 8px; font-size: 12px; }
          th { background: #f4f4f4; text-align: left; }
          .supplier-fill { margin-top: 20px; border: 1px solid #ddd; border-radius: 6px; padding: 12px; }
          .supplier-fill h2 { margin: 0 0 10px; font-size: 14px; }
          .supplier-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
          .field { border: 1px solid #ddd; border-radius: 4px; padding: 8px; min-height: 52px; }
          .field-label { font-size: 11px; color: #555; margin-bottom: 6px; font-weight: 600; }
          .field-line { border-bottom: 1px dashed #bbb; height: 18px; }
          .footer { margin-top: 24px; font-size: 11px; color: #555; }
          .sign { margin-top: 32px; display: flex; gap: 48px; }
          .sign div { width: 200px; border-top: 1px solid #000; padding-top: 8px; text-align: center; }
          @media print { .print-hide { display: none; } }
        </style>
      </head>
      <body>
        <h1>Orçamento de Compra</h1>
        <div class="meta">
          <div><strong>Empresa:</strong> ${companyName}</div>
          <div><strong>Fornecedor:</strong> ${supplierName}</div>
          <div><strong>Data:</strong> ${formattedDate}</div>
          <div><strong>Solicitante:</strong> ${requester}</div>
        </div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Produto</th>
              <th>Fornecedor</th>
              <th>Qtd</th>
              <th>Preço Unit.</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
        <div class="supplier-fill">
          <h2>Preenchimento do Fornecedor</h2>
          <div class="supplier-grid">
            <div class="field">
              <div class="field-label">Valor Final da Mercadoria (R$)</div>
              <div class="field-line"></div>
            </div>
            <div class="field">
              <div class="field-label">Frete (R$)</div>
              <div class="field-line"></div>
            </div>
            <div class="field">
              <div class="field-label">Prazo de Entrega</div>
              <div class="field-line"></div>
            </div>
            <div class="field">
              <div class="field-label">Assinatura e Carimbo do Fornecedor</div>
              <div class="field-line"></div>
            </div>
          </div>
        </div>
        <div class="sign">
          <div>Assinatura do Solicitante</div>
          <div>Assinatura do Fornecedor</div>
        </div>
        <div class="footer">
          Documento gerado automaticamente pelo Sistema de Estoque.
        </div>
        <button class="print-hide" onclick="window.print()">Imprimir / Salvar PDF</button>
      </body>
    </html>
  `;

  win.document.write(html);
  win.document.close();
}

export default generatePurchaseOrderPDF;

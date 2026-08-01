# Envio de vendas para a Utmify - correção completa

## O que a doc permite (resumo preciso)

A Utmify só aceita **pedidos** em `POST https://api.utmify.com.br/api-credentials/orders` com header `x-api-token`. Não existe endpoint de "clique em botão" ou "modal aberto" - isso é papel do pixel/UTM script no navegador.

Statuses aceitos: `waiting_payment`, `paid`, `refused`, `refunded`, `chargedback`.
Métodos: `pix`, `credit_card`, `boleto`, `paypal`, `free_price`.

Regras que hoje quebram o rastreio:
- `createdAt` deve ser **o mesmo** em todos os envios do mesmo `orderId` (UTC 0, `YYYY-MM-DD HH:MM:SS`).
- `orderId` deve ser **idêntico** entre "gerado" e "pago".
- `approvedDate` só preenchido quando pago.
- `customer.ip` opcional mas recomendado (hoje mandamos `0.0.0.0`).
- `userCommissionInCents` nunca 0.

Tradução do que você pediu:
- "quem gerou / modal de pix gerado" = `waiting_payment` no momento em que o QR Code é criado.
- "quem comprou" = `paid` quando o PIX/cartão confirma.
- "botão clicado" = pixel + UTMs no front (não vira pedido); o equivalente rastreável no servidor é o `waiting_payment`.

## Diagnóstico do que está errado hoje

1. **Cartão não envia nada** no momento da cobrança. `createCardPayment` não chama a Utmify: aprovado só é reportado se o cliente ficar com o modal aberto e a licença for emitida; recusado nunca vira `refused`.
2. **PIX pago depende do navegador.** O `paid` só sai dentro de `issueLicense`, chamado pelo modal. Se o cliente fecha a aba, paga depois, ou a emissão de licença falha, a Utmify nunca recebe a venda - é exatamente o sintoma "o modal de pagamento não envia direito".
3. **`createdAt` divergente.** O `waiting_payment` usa a hora do servidor; o `paid` usa uma data reconstruída no cliente (e no cartão usa `now`). Datas diferentes para o mesmo pedido = pedido rejeitado/duplicado no dashboard.
4. **`orderId` pode divergir.** No `waiting_payment` há fallback `HYRO-<timestamp>` quando o gateway não retorna id; o `paid` sempre usa `paymentId`.
5. **IP fixo `0.0.0.0`** em todos os pedidos, prejudicando o match de atribuição.
6. **Tracking incompleto.** `getUtms()` lê só os 7 parâmetros da URL na sessão; se o clique veio com `xcod`, `fbclid`/`gclid` ou os valores gravados pelo próprio script da Utmify, nada é aproveitado.
7. **Sem idempotência.** Nada impede reenvio duplicado de `paid`.

## Plano de correção

### 1. Fonte única de verdade no servidor
Usar a tabela `hyro_payment_events` (já gravada em PIX e cartão) como registro do pedido: guardar `utmify_order_id`, `utmify_created_at` (ISO fixo do momento da criação), `tracking`, `customer_ip` e flags `utmify_waiting_sent` / `utmify_paid_sent` / `utmify_refused_sent`. SQL idempotente com `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` será entregue para rodar no Supabase.

### 2. Módulo central `utmify-dispatch.server.ts`
Uma função `dispatchUtmify(orderId, status)` que:
- lê o pedido salvo (valor, cliente, tracking, IP, createdAt original);
- monta o payload exatamente no formato da doc;
- respeita a flag de idempotência (não reenvia o mesmo status);
- registra o resultado em `hyro_utmify_log` (já existente, aparece no painel `/utmify`).

Todos os pontos de envio passam a chamar essa função - fim das montagens duplicadas em `checkout.functions.ts` e `hyro-license.functions.ts`.

### 3. Pontos de envio
| Evento | Onde | Status |
|---|---|---|
| PIX gerado (QR na tela) | `createPixCharge` | `waiting_payment` |
| PIX confirmado | `getPixStatus` (polling, no servidor) | `paid` |
| PIX expirado/cancelado | `getPixStatus` | `refused` |
| Cartão criado e aprovado | `createCardPayment` | `waiting_payment` + `paid` |
| Cartão em análise | `createCardPayment` | `waiting_payment` |
| Cartão recusado | `createCardPayment` | `refused` |

O envio do `paid` sai de `issueLicense` (fica só como rede de segurança idempotente), então a venda é reportada mesmo que o cliente feche o modal ou a licença falhe.

### 4. IP e tracking reais
- IP capturado no servidor com `getRequestIP({ xForwardedFor: true })` no momento da criação do pedido e reaproveitado nos envios seguintes.
- `getUtms()` ampliado: além dos 7 campos, lê os valores persistidos pelo script da Utmify (localStorage/cookie) e faz fallback de `src`/`sck` a partir de `xcod`, `fbclid`, `gclid` e `document.referrer`, sempre preservando o primeiro toque da sessão.

### 5. Verificação
- Painel `/utmify` passa a listar cada envio com status HTTP e payload resumido.
- Teste ao vivo: gerar um PIX real de teste, conferir `waiting_payment` no dashboard, confirmar pagamento e ver o mesmo `orderId` virar `paid` sem duplicar.

## Detalhes técnicos
Arquivos tocados: `src/lib/utmify-dispatch.server.ts` (novo), `src/lib/utmify.server.ts`, `src/lib/checkout.functions.ts`, `src/lib/mercadopago.functions.ts`, `src/lib/hyro-license.functions.ts`, `src/lib/hyro-payments-log.server.ts`, `src/lib/utm-tracker.ts`, `src/routes/utmify.tsx`. Mais um bloco SQL idempotente para as novas colunas. Nenhuma mudança de layout ou de fluxo visual do checkout.

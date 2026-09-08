# Abastecimento Particular — Gerentes

Sistema React + Vite + TypeScript + Firebase para controlar o reembolso de abastecimento
particular dos gerentes (quando usam veículo próprio no lugar da camionete da empresa).

## Regra de negócio

- Toda semana, o km rodado pela camionete de cada gerente no fim de semana anterior é importado
  automaticamente do relatório **Rota** exportado do rastreador (aba "RESUMO").
- Valor devido ao gerente = **(km rodado ÷ km/L exigido) × preço do diesel**. Os dois parâmetros
  são editáveis em **Parâmetros** (preço do diesel é atualizado manualmente pelo usuário; km/L
  exigido tem 10 como padrão). Cada semana importada "congela" os parâmetros vigentes na época —
  mudar o preço depois não recalcula semanas antigas.
- Se o gerente marca **"uso empresa"** numa semana (estava a trabalho, não abastecimento
  particular), aquele km fica registrado mas não gera valor devido nem entra na conta corrente.
- A **conta corrente** de cada gerente é o acumulado de (valor devido calculado) − (valor
  efetivamente pago/reembolsado a ele). O campo "comprovante" é só o valor que o gerente
  informou ter gasto (referência/conferência), não entra direto na conta corrente.
- Nenhum dado histórico é sobrescrito: cada semana importada vira um registro próprio,
  identificado pela data de início do período (sábado).

## Fluxo semanal

1. Toda segunda-feira, exporte do rastreador o relatório de **Rota** referente ao fim de semana
   anterior (arquivo `.xls`, precisa ter a aba "RESUMO").
2. Em **Importar semana**, envie o arquivo — o sistema lê o km percorrido de cada placa
   automaticamente e cria os lançamentos da semana.
3. Em **Lançamentos**, para cada gerente: marque "uso empresa" se for o caso, preencha o valor do
   comprovante que ele mandou e o valor pago (quando o reembolso for efetuado).
4. Acompanhe o saldo em aberto no **Dashboard** e no detalhe por gerente em **Conta corrente**.
5. Em **Grade de placas**, gere a grade com o desenho das placas Mercosul de todas as camionetes
   ativas (imprimir/salvar como PDF com Ctrl+P) para enviar no grupo de gerentes.

## Rodando localmente

```bash
npm install
npm run dev
```

Sem um `.env.local` preenchido, o app roda em **modo local**: pula o login e guarda os dados no
`localStorage` do navegador (não compartilhado entre máquinas/pessoas) — bom pra testar. Para uso
real da empresa (dados compartilhados, histórico seguro), configure o Firebase abaixo.

## Cadastro inicial de veículos

Em **Cadastro**, com a lista vazia, aparece um botão pra carregar os 39 gerentes/camionetes
extraídos da Base de Placas (filtro por `FUNCAO CONDUTOR = GERENTE`). Depois disso, o cadastro é
todo editável pela própria tela (adicionar, editar, desativar).

## Publicando no Firebase (produção)

Mesmo passo a passo do sistema de frota (`agroquima-frota/README.md`):

1. Criar um projeto em [console.firebase.google.com](https://console.firebase.google.com).
2. Ativar **Authentication** (método e-mail/senha) e **Firestore**. Cada usuário precisa ter a
   conta criada manualmente em Authentication > Usuários.
3. Em Configurações do projeto > Seus apps, criar um app Web e copiar as chaves pro `.env.local`
   (copie o `.env.example` como base).
4. Instalar a CLI do Firebase, logar e publicar as regras:
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase use <project-id> --alias default
   firebase deploy --only firestore:rules
   ```
5. Publicar o app: `npm run deploy` (equivale a `npm run build && firebase deploy --only hosting,firestore:rules`).

## Segurança dos dados

- `.env.local` nunca entra no Git (já está no `.gitignore`).
- Todas as coleções do Firestore exigem login (`request.auth != null` — ver `firestore.rules`).
- O repositório GitHub deve ser **privado**.

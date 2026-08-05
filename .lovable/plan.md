## Objetivo
Adicionar a coluna **"Data fim"** ao lado de **"Data"** no grupo **Colheita** da tela de Rastreabilidade (`/lotes`), para permitir registrar o intervalo de colheita (ex.: `07/05/25` → `08/05/25`), igual à planilha original.

## Escopo
Alteração apenas de UI/planilha editável. Nenhuma mudança de banco (o campo `data_colheita_fim` já existe na tabela `lotes`).

## Mudanças
Arquivo único: `src/routes/lotes.tsx`

1. Na definição de `columns` do `EditableGrid`, dentro do grupo Colheita:
   - Renomear o label atual `"Data"` → `"Data início"` (mantém `data_colheita_inicio`).
   - Inserir logo em seguida uma nova coluna:
     ```
     { key: "data_colheita_fim", label: "Data fim", type: "date",
       width: 150, accessor: (r) => r.data_colheita_fim ?? "" }
     ```
2. Atualizar o array `groups`: alterar o span do grupo **Colheita** de `6` para `7`.

## Fora de escopo
- Não altera schema do banco.
- Não altera Kanban, Vendas nem lógica de status automático (`status` continua derivando de `data_colheita_inicio`).
- Não mexe em outros grupos/colunas.

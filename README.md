# NJTransportes

Sistema local para cadastro de usuários e motoristas da NJTransportes.

## Como iniciar

1. Instale o Node.js LTS (versão 18 ou superior), caso ainda não esteja instalado.
2. Copie `.env.example` e renomeie a cópia para `.env`.
3. No `.env`, substitua `[YOUR-PASSWORD]` pela senha do banco de dados no Supabase.
4. Dê dois cliques em `iniciar_sistema.bat`.
5. Abra `http://localhost:3000` no navegador.

Também é possível iniciar pelo terminal, dentro desta pasta:

```powershell
npm start
```

Para parar o servidor, use `Ctrl+C` na janela que o iniciou.

## Dados

Usuários, motoristas e veículos são armazenados no banco PostgreSQL do Supabase. Não envie o arquivo `.env` para outras pessoas nem o publique em repositórios.

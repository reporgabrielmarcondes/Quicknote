# Quicknote

Node.js + Express + PostgreSQL (Render). Front-end em HTML, CSS e JavaScript.

## Deploy no Render
1. Suba esta pasta para um repositório no GitHub.
2. No Render: New > Blueprint > selecione o repositório (usa o render.yaml).
3. O Render cria o banco PostgreSQL e o serviço web. A tabela é criada automaticamente.

## Local
DATABASE_URL=postgres://... npm install && npm start

## PWA e ícones
- `public/manifest.webmanifest` e `public/sw.js` tornam o app instalável (HTTPS no Render já atende o requisito).
- Logotipo em vetor: `public/icons/icon.svg` (principal), `icon-maskable.svg` e `favicon.svg`.

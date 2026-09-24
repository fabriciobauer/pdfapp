# pdfapp — gerador de material em PDF para imóveis

Ferramenta interna criada para a equipe comercial de uma imobiliária: o corretor digita o código do imóvel, escolhe as fotos e recebe na hora um PDF pronto para enviar ao cliente.

> *Internal tool for a real estate agency: type a property code, pick the photos and download a ready-to-share PDF.*

## Como funciona

1. **Busca** — o front-end consulta o back-end pelo código do imóvel; o back-end lê os dados e as fotos no banco MySQL do site.
2. **Seleção** — o corretor marca quais fotos entram no material.
3. **PDF** — o back-end baixa as imagens escolhidas e monta o PDF com [pdf-lib](https://pdf-lib.js.org/), uma foto por página, e devolve o arquivo para download.

## Stack

| Parte | Tecnologias |
|---|---|
| Front-end | React 18 (Create React App), Axios |
| Back-end | Node.js, Express, MySQL (`mysql2`), pdf-lib |

## Estrutura

```
backend/   API Express: busca de imóvel/fotos e geração do PDF
frontend/  Interface React usada pelos corretores
```

## Rodando localmente

Pré-requisitos: Node.js 18+ e um banco MySQL com as tabelas de imóveis e fotos.

```bash
# back-end (porta 3001)
cd backend
cp .env.example .env   # preencha com os dados do seu banco
npm install
node server.js

# front-end (porta 3000)
cd ../frontend
npm install
npm start
```

## Endpoints

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/imovel/:codigo/fotos` | Dados do imóvel e lista de fotos |
| `POST` | `/gerar-pdf` | Recebe `{ imagensSelecionadas: string[] }` e devolve o PDF |
| `POST` | `/login` | Autenticação dos usuários da ferramenta |

## Autor

**Fabricio Bauer Chaves Junior** — [github.com/fabriciobauer](https://github.com/fabriciobauer)

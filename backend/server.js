require('dotenv').config();

const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');
const { PDFDocument } = require('pdf-lib');
const axios = require('axios');

const app = express();

app.use(cors());
app.use(bodyParser.json());

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
});

db.connect((err) => {
  if (err) {
    console.error('Erro ao conectar ao banco de dados:', err);
  } else {
    console.log('Conectado ao banco de dados MySQL');
  }
});

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type'],
}));

// Rota de login
app.post('/login', (req, res) => {
  const { username, senha } = req.body;

  // Query para verificar o usuário no banco de dados com hash de senha
  const query = 'SELECT id, username FROM usuarios WHERE username = ? AND senha = PASSWORD(?)';

  db.query(query, [username, senha], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    if (results.length === 0) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const user = results[0];

    // Retornar apenas os dados do usuário, sem token
    res.json({ user });
  });
});

// Rota para buscar o imóvel e fotos (sem verificação de token)
app.get('/imovel/:codigo/fotos', (req, res) => {
  const codigo = req.params.codigo;

  // Validação simples do código: só permitir caracteres alfanuméricos
  if (!/^[A-Za-z0-9]+$/.test(codigo)) {
    return res.status(400).json({ error: 'Código de imóvel inválido' });
  }

  // Query preparada com placeholder para evitar injeção SQL
  const queryImovel = 'SELECT * FROM view_imoveis WHERE codigo = ?';

  db.query(queryImovel, [codigo], (err, imovelResult) => {
    if (err) return res.status(500).json({ error: 'Erro ao buscar imóvel' });

    if (imovelResult.length === 0) return res.status(404).json({ message: 'Imóvel não encontrado' });

    const imovel = imovelResult[0];
    const queryFotos = 'SELECT * FROM tb_imoveis_fotos WHERE imovel = ?';

    db.query(queryFotos, [imovel.id], (err, fotosResult) => {
      if (err) return res.status(500).json({ error: 'Erro ao buscar fotos' });

      // Retornar os dados do imóvel e as fotos
      res.json({ codigo: imovel.codigo, imovel, fotos: fotosResult });
    });
  });
});

// Rota para gerar o PDF com as imagens selecionadas (sem verificação de token)
app.post('/gerar-pdf', async (req, res) => {
  const { imagensSelecionadas } = req.body;

  // Verificar se as imagens foram enviadas
  if (!imagensSelecionadas || imagensSelecionadas.length === 0) {
    return res.status(400).json({ error: 'Nenhuma imagem foi selecionada.' });
  }

  try {
    const pdfDoc = await PDFDocument.create();

    for (let i = 0; i < imagensSelecionadas.length; i++) {
      const imgUrl = imagensSelecionadas[i];
      const imgResponse = await axios.get(imgUrl, { responseType: 'arraybuffer' });
      const imgBytes = imgResponse.data;

      let img;
      // Verificar se a imagem é JPG ou PNG
      if (imgUrl.endsWith('.jpg') || imgUrl.endsWith('.jpeg')) {
        img = await pdfDoc.embedJpg(imgBytes);
      } else if (imgUrl.endsWith('.png')) {
        img = await pdfDoc.embedPng(imgBytes);
      } else {
        throw new Error('Formato de imagem não suportado. Apenas JPG e PNG são permitidos.');
      }

      // Adicionar a imagem a uma nova página no PDF
      const page = pdfDoc.addPage([img.width, img.height]);
      page.drawImage(img, {
        x: 0,
        y: 0,
        width: img.width,
        height: img.height,
      });
    }

    // Salvar o PDF gerado
    const pdfBytes = await pdfDoc.save();

    // Definir os cabeçalhos para o envio correto do PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=imovel.pdf');

    // Enviar o PDF como Buffer para o cliente
    res.send(Buffer.from(pdfBytes));
  } catch (error) {
    console.error('Erro ao gerar o PDF:', error);
    res.status(500).json({ error: 'Erro ao gerar o PDF' });
  }
});

const PORT = 3001;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

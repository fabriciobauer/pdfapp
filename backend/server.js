require('dotenv').config();

const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');
const { PDFDocument } = require('pdf-lib');
const axios = require('axios');
const jwt = require('jsonwebtoken'); // Para gerar e verificar tokens JWT

const app = express();

app.use(bodyParser.json());

// Configuração do CORS para permitir o acesso do front-end específico
const corsOptions = {
  origin: '*', // Altere para o domínio correto do front-end
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Conectar ao banco de dados MySQL
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

// Função para gerar token JWT
const gerarToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: '72h', // O token expira em 72 horas
  });
};

// Middleware para verificar o token JWT
const verificarToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Pega o token da string "Bearer <token>"

  if (!token) {
    return res.status(403).json({ error: 'Token não fornecido' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Token inválido ou expirado' });
    }

    req.userId = decoded.id; // Armazena o ID do usuário no request
    next();
  });
};

// Rota de login (Geração do token JWT)
app.post('/login', (req, res) => {
  const { username, senha } = req.body; // Agora usando username e senha

  // Query para verificar o usuário no banco de dados com hash de senha
  const query = 'SELECT id, username FROM usuarios WHERE username = ? AND senha = PASSWORD(?)';

  db.query(query, [username, senha], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    if (results.length === 0) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const user = results[0];
    const token = gerarToken(user.id); // Gerar um token para o usuário

    // Retornar o token JWT e os dados do usuário
    res.json({ token, user });
  });
});

// Rota protegida para buscar o imóvel e fotos com validação
app.get('/imovel/:codigo/fotos', verificarToken, (req, res) => {
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

// Rota protegida para gerar o PDF com as imagens selecionadas
app.post('/gerar-pdf', verificarToken, async (req, res) => {
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

const PORT = process.env.PORT || 3001; 

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

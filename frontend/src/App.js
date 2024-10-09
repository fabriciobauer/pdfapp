import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import logonoble from './logonoble.svg';
import './App.css'; 

function App() {
  const [codigoImovel, setCodigoImovel] = useState('');
  const [imovel, setImovel] = useState(null);
  const [fotos, setFotos] = useState([]);
  const [imagensSelecionadas, setImagensSelecionadas] = useState([]);
  const [descricaoEditavel, setDescricaoEditavel] = useState('');
  const [nomePDF, setNomePDF] = useState('');
  const textareaRef = useRef(null);

  // Função para ajustar a altura da textarea automaticamente
  const ajustarAlturaTextarea = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  // Função para buscar o imóvel e suas fotos pelo código (sem uso de token)
  const buscarImovel = async () => {
    try {
      const response = await axios.get(`http://192.168.0.66:3001/imovel/${codigoImovel}/fotos`);
      setImovel(response.data.imovel);
      setFotos(response.data.fotos);
      setDescricaoEditavel(response.data.imovel.descricao);
      setImagensSelecionadas([]);
    } catch (error) {
      alert('Erro ao buscar dados do imóvel.');
      console.error('Erro ao buscar dados do imóvel:', error);
    }
  };

  // Função para alternar a seleção de uma imagem
  const selecionarImagem = (foto) => {
    if (imagensSelecionadas.includes(foto)) {
      setImagensSelecionadas(imagensSelecionadas.filter((img) => img !== foto));
    } else {
      setImagensSelecionadas([...imagensSelecionadas, foto]);
    }
  };

  // Função para gerar o PDF com as imagens selecionadas (sem uso de token)
  const gerarPDF = async () => {
    try {
      const response = await axios.post('http://192.168.0.66:3001/gerar-pdf', {
        imagensSelecionadas,
      }, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${nomePDF || 'imovel'}.pdf`);
      document.body.appendChild(link);
      link.click();
    } catch (error) {
      console.error('Erro ao gerar o PDF:', error);
      alert('Erro ao gerar o PDF.');
    }
  };

  // Função para copiar a descrição para a área de transferência
  const copiarDescricao = () => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(descricaoEditavel)
        .then(() => {
          alert('Texto copiado para a área de transferência!');
        })
        .catch(err => {
          console.error('Erro ao copiar o texto:', err);
          alert('Não foi possível copiar o texto. Por favor, tente novamente.');
        });
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = descricaoEditavel;
      textarea.style.position = 'absolute';
      textarea.style.left = '-9999px'; 
      document.body.appendChild(textarea);
      textarea.select();
      try {
        const sucesso = document.execCommand('copy');
        if (sucesso) {
          alert('Texto copiado para a área de transferência!');
        } else {
          alert('Não foi possível copiar o texto. Por favor, tente novamente.');
        }
      } catch (err) {
        console.error('Erro ao copiar o texto:', err);
        alert('Não foi possível copiar o texto. Por favor, tente novamente.');
      }
      document.body.removeChild(textarea);
    }
  };

  useEffect(() => {
    ajustarAlturaTextarea();
  }, [descricaoEditavel]);

  return (
    <div className="box">
      {/* Cabeçalho com banner */}
      <div className="banner">
        <a
          href="https://www.nobleimoveis.com.br/busca/cidade/Torres/0/"
          title="Noble Imóveis"
          target="_blank"
          rel="noopener noreferrer"
        >
          <img src={logonoble} alt="Noble Imóveis" style={{ width: '100%', height: 'auto' }} />
        </a>
      </div>

      <h1>Buscar Imóvel pelo Código</h1>
      <input
        type="text"
        value={codigoImovel}
        onChange={(e) => setCodigoImovel(e.target.value)}
        placeholder="Ex. NB04940149"
        style={{ padding: '10px', marginBottom: '10px', borderRadius: '5px', width: '100%' }}
      />
      <button onClick={buscarImovel} style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '5px' }}>
        Buscar Imóvel
      </button>

      {imovel ? (
        <div className="container">
          <h2>{imovel.nome}</h2>
          <textarea
            ref={textareaRef}
            value={descricaoEditavel}
            onChange={(e) => setDescricaoEditavel(e.target.value)}
            rows="1"
            style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '10px' }}
          />
          <button onClick={copiarDescricao} style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '5px' }}>
            Copiar Descrição
          </button>

          <h3>Fotos:</h3>
          <ul>
            {fotos.map((foto, index) => (
              <li key={index}>
                <img
                  src={foto.foto}
                  alt={`Foto ${index + 1}`}
                  style={{
                    border: imagensSelecionadas.includes(foto.foto) ? '3px solid green' : '1px solid gray',
                    width: '100%',
                    marginBottom: '10px',
                  }}
                  onClick={() => selecionarImagem(foto.foto)}
                />
              </li>
            ))}
          </ul>

          <input
            type="text"
            value={nomePDF}
            onChange={(e) => setNomePDF(e.target.value)}
            placeholder="Digite o nome do arquivo PDF"
            style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '5px' }}
          />
          <button onClick={gerarPDF} disabled={imagensSelecionadas.length === 0} style={{ width: '100%', padding: '10px', borderRadius: '5px' }}>
            Gerar PDF
          </button>
        </div>
      ) : (
        <p></p>
      )}
    </div>
  );
}

export default App;

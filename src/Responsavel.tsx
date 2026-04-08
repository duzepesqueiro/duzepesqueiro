import React, { useState } from 'react';
import logoImage from './logo.png'; 

export const Responsavel = () => {
  const [formData, setFormData] = useState({ email: '', cpf: '', telefone: '', placa: '' });
  const [emailErro, setEmailErro] = useState(false);

  const maskCPF = (v: string) => v.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4").substring(0, 14);
  const maskTel = (v: string) => v.replace(/\D/g, '').replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3").substring(0, 15);

  const validarEmail = (email: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    setEmailErro(!regex.test(email) && email.length > 0);
  };

  return (
    <div className="container-tela">
    

      <div className="card-duze">
        <div className="card-header">
          <h2 className="titulo-sessao">Responsável</h2>
          <div className="detalhe-amarelo"></div>
        </div>

        <div className="form-espacamento">
          <div className="input-group">
            <label className="label-custom">Nome Completo</label>
            <input type="text" className="input-custom" placeholder="Digite seu nome" />
          </div>

          <div className="input-group">
            <label className="label-custom">E-mail</label>
            <input 
              type="email" 
              value={formData.email}
              onChange={(e) => {
                setFormData({...formData, email: e.target.value});
                validarEmail(e.target.value);
              }}
              className={`input-custom ${emailErro ? 'input-erro' : ''}`}
              placeholder="exemplo@puc.com"
            />
            {emailErro && <p className="msg-erro">E-mail inválido</p>}
          </div>

          <div className="grid-inputs">
            <div className="input-group">
              <label className="label-custom">Telefone</label>
              <input 
                value={formData.telefone}
                onChange={(e) => setFormData({...formData, telefone: maskTel(e.target.value)})}
                className="input-custom"
                placeholder="(00) 00000-0000"
              />
            </div>
            <div className="input-group">
              <label className="label-custom">CPF</label>
              <input 
                value={formData.cpf}
                onChange={(e) => setFormData({...formData, cpf: maskCPF(e.target.value)})}
                className="input-custom"
                placeholder="000.000.000-00"
              />
            </div>
          </div>

          <div className="input-group">
            <label className="label-custom">Placa do Veículo (Opcional)</label>
            <input 
              type="text" 
              maxLength={7}
              onChange={(e) => setFormData({...formData, placa: e.target.value.toUpperCase()})}
              className="input-custom uppercase"
              placeholder="ABC1D23"
            />
          </div>
        </div>

        <div className="card-footer">
          <button className="btn-voltar">Voltar</button>
          <button 
            disabled={emailErro || !formData.email || !formData.cpf}
            className="btn-duze"
          >
            Avançar
          </button>
        </div>
      </div>
    </div>
  );
};
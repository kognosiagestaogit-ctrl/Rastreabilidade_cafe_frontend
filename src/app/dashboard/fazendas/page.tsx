"use client";

import React, { useState } from 'react';
import { Plus, Pencil, Trash2, MapPin } from 'lucide-react';
import styles from './fazendas.module.css';

// Tipo que define a estrutura de uma Fazenda
type Fazenda = {
  id: string;
  nome: string;
  cidade: string;
  area: number;
};

// Dados iniciais (Mock)
const mockFazendas: Fazenda[] = [
  { id: '1', nome: 'Fazenda Pedra Negra', cidade: 'Belo Horizonte - MG', area: 500 },
  { id: '2', nome: 'Fazenda Boa Vista', cidade: 'Uberaba - MG', area: 1200 },
  { id: '3', nome: 'Sítio Recanto Feliz', cidade: 'Campinas - SP', area: 50 },
];

export default function FazendasPage() {
  const [fazendas, setFazendas] = useState<Fazenda[]>(mockFazendas);
  
  // Estado para controlar o formulário
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Estado dos campos do formulário
  const [formData, setFormData] = useState({ nome: '', cidade: '', area: '' });

  // Abre o formulário para criar uma nova fazenda
  const handleNovaFazenda = () => {
    setEditingId(null);
    setFormData({ nome: '', cidade: '', area: '' });
    setIsFormVisible(true);
  };

  // Abre o formulário para editar uma fazenda existente
  const handleEditarFazenda = (fazenda: Fazenda) => {
    setEditingId(fazenda.id);
    setFormData({ 
      nome: fazenda.nome, 
      cidade: fazenda.cidade, 
      area: fazenda.area.toString() 
    });
    setIsFormVisible(true);
  };

  // Salva (Cria ou Edita) a fazenda
  const handleSalvar = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingId) {
      // Editar
      setFazendas(fazendas.map(f => 
        f.id === editingId 
          ? { ...f, nome: formData.nome, cidade: formData.cidade, area: Number(formData.area) }
          : f
      ));
    } else {
      // Criar nova
      const novaFazenda: Fazenda = {
        id: Date.now().toString(), // Gera um ID temporário único
        nome: formData.nome,
        cidade: formData.cidade,
        area: Number(formData.area),
      };
      setFazendas([...fazendas, novaFazenda]);
    }
    
    setIsFormVisible(false);
  };

  // Remove a fazenda
  const handleApagar = (id: string) => {
    if (window.confirm("Tem certeza que deseja apagar esta fazenda?")) {
      setFazendas(fazendas.filter(f => f.id !== id));
    }
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.header}>
        <h1 className={styles.title}>Minhas Fazendas</h1>
        {!isFormVisible && (
          <button className={styles.addButton} onClick={handleNovaFazenda}>
            <Plus size={20} />
            Nova Fazenda
          </button>
        )}
      </div>

      {isFormVisible && (
        <div className={styles.formContainer}>
          <h3>{editingId ? "Editar Fazenda" : "Nova Fazenda"}</h3>
          <form onSubmit={handleSalvar}>
            <div className={styles.formGroup}>
              <label>Nome da Fazenda</label>
              <input 
                type="text" 
                required 
                value={formData.nome}
                onChange={e => setFormData({...formData, nome: e.target.value})}
                placeholder="Ex: Fazenda Pedra Negra"
              />
            </div>
            <div className={styles.formGroup}>
              <label>Cidade / Estado</label>
              <input 
                type="text" 
                required 
                value={formData.cidade}
                onChange={e => setFormData({...formData, cidade: e.target.value})}
                placeholder="Ex: Belo Horizonte - MG"
              />
            </div>
            <div className={styles.formGroup}>
              <label>Área (Hectares)</label>
              <input 
                type="number" 
                required 
                min="0"
                step="0.01"
                value={formData.area}
                onChange={e => setFormData({...formData, area: e.target.value})}
                placeholder="Ex: 500"
              />
            </div>
            <div className={styles.formActions}>
              <button type="button" className={styles.cancelButton} onClick={() => setIsFormVisible(false)}>
                Cancelar
              </button>
              <button type="submit" className={styles.saveButton}>
                Salvar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Localização</th>
              <th>Área (ha)</th>
              <th style={{ width: '120px', textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {fazendas.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', color: '#888', padding: '40px' }}>
                  Nenhuma fazenda cadastrada.
                </td>
              </tr>
            ) : (
              fazendas.map(fazenda => (
                <tr key={fazenda.id}>
                  <td className={styles.fw500}>{fazenda.nome}</td>
                  <td>
                    <div className={styles.locationCell}>
                      <MapPin size={16} className={styles.mutedIcon} />
                      {fazenda.cidade}
                    </div>
                  </td>
                  <td>{fazenda.area} ha</td>
                  <td>
                    <div className={styles.actionButtons}>
                      <button 
                        className={styles.iconButton} 
                        onClick={() => handleEditarFazenda(fazenda)}
                        title="Editar"
                      >
                        <Pencil size={18} />
                      </button>
                      <button 
                        className={`${styles.iconButton} ${styles.deleteButton}`} 
                        onClick={() => handleApagar(fazenda.id)}
                        title="Apagar"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

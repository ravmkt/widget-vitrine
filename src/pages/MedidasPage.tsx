import React, { useEffect, useState, useMemo } from 'react';
import Navbar from '@/components/Navbar';
import { db, SizingModel, SizeMeasure } from '@/lib/db';
import {
  Ruler,
  Plus,
  Search,
  Trash2,
  Edit3,
  Save,
  X,
  PlusCircle,
  HelpCircle,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Info
} from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import CustomDialog from '@/components/CustomDialog';

const INITIAL_MEASURE_ROW: SizeMeasure = {
  name: 'Busto',
  value: 0,
  unit: 'cm'
};

const INITIAL_FORM_STATE = {
  name: '',
  size_name: '',
  measures: [] as SizeMeasure[]
};

const ITEMS_PER_PAGE = 5;

const MedidasPage = () => {
  const [sizingModels, setSizingModels] = useState<SizingModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [storeId, setStoreId] = useState('11111111-1111-1111-1111-111111111111');

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [errors, setFormErrors] = useState<Record<string, string>>({});

  // Search & Pagination States
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Custom Confirm Dialog state
  const [dialog, setDialog] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'warning' | 'confirm';
    title: string;
    description: string;
    onConfirm: () => void;
    onCancel?: () => void;
  }>({ isOpen: false, type: 'confirm', title: '', description: '', onConfirm: () => {} });

  const loadData = async () => {
    try {
      const stores = await db.stores.getAll();
      const mainStore = stores[0];
      if (mainStore) {
        setStoreId(mainStore.id);
        const models = await db.sizingModels.getAll(mainStore.id);
        setSizingModels(models);
      }
    } catch (e) {
      console.error('Erro ao carregar os dados de tabelas de medidas:', e);
      showError('Falha ao carregar tabelas de medidas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered and paginated lists
  const filteredModels = useMemo(() => {
    return sizingModels.filter((model) => {
      const matchesName = model.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSize = model.size_name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesName || matchesSize;
    });
  }, [sizingModels, searchTerm]);

  const totalPages = Math.ceil(filteredModels.length / ITEMS_PER_PAGE) || 1;

  const paginatedModels = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredModels.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredModels, currentPage]);

  // Adjust page number if items change
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [filteredModels, totalPages]);

  const handleCreateNew = () => {
    setFormData({
      name: '',
      size_name: 'M',
      measures: [
        { name: 'Cintura', value: 80, unit: 'cm' },
        { name: 'Quadril', value: 98, unit: 'cm' }
      ]
    });
    setEditingId(null);
    setFormErrors({});
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEdit = (model: SizingModel) => {
    setFormData({
      name: model.name || '',
      size_name: model.size_name || '',
      measures: model.measures ? [...model.measures] : []
    });
    setEditingId(model.id);
    setFormErrors({});
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id: string, name: string) => {
    setDialog({
      isOpen: true,
      type: 'confirm',
      title: 'Remover Modelo de Medidas?',
      description: `Tem certeza que deseja excluir o modelo "${name}"? Esta ação removerá permanentemente as medidas registradas no provador virtual.`,
      onConfirm: async () => {
        try {
          await db.sizingModels.delete(id);
          showSuccess('Modelo de medidas excluído!');
          setDialog(prev => ({ ...prev, isOpen: false }));
          loadData();
        } catch (e) {
          showError('Falha ao excluir o modelo.');
        }
      },
      onCancel: () => setDialog(prev => ({ ...prev, isOpen: false }))
    });
  };

  // Measures Rows controls
  const handleAddMeasureRow = () => {
    setFormData(prev => ({
      ...prev,
      measures: [...prev.measures, { name: 'Busto', value: 0, unit: 'cm' }]
    }));
  };

  const handleUpdateMeasureRow = (index: number, field: keyof SizeMeasure, value: any) => {
    setFormData(prev => {
      const updated = [...prev.measures];
      updated[index] = {
        ...updated[index],
        [field]: field === 'value' ? (parseFloat(value) || 0) : value
      };
      return { ...prev, measures: updated };
    });
  };

  const handleRemoveMeasureRow = (index: number) => {
    setFormData(prev => ({
      ...prev,
      measures: prev.measures.filter((_, i) => i !== index)
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validations
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) {
      newErrors.name = 'O nome do modelo de roupas é obrigatório.';
    }
    if (!formData.size_name.trim()) {
      newErrors.size_name = 'O tamanho (ex: P, M, G) é obrigatório.';
    }
    if (formData.measures.length === 0) {
      newErrors.measures = 'Adicione ao menos uma linha de especificação de medidas.';
    }

    if (Object.keys(newErrors).length > 0) {
      setFormErrors(newErrors);
      showError('Por favor, corrija as marcações de erro obrigatórias em vermelho.');
      return;
    }

    try {
      const payload: SizingModel = {
        id: editingId || Math.random().toString(36).substr(2, 9),
        store_id: storeId,
        name: formData.name.trim(),
        size_name: formData.size_name.trim(),
        measures: formData.measures
      };

      await db.sizingModels.save(payload);
      showSuccess(editingId ? 'Especiais de medidas salvos!' : 'Tabela de tamanho cadastrada!');
      setShowForm(false);
      setEditingId(null);
      loadData();
    } catch (e) {
      showError('Ocorreu um erro ao salvar o registro de tamanho.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500"></div>
        <p className="text-base text-slate-400 font-semibold font-mono">Sincronizando tabelas de tamanhos...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Title */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent flex items-center gap-2.5">
              Tabelas de Medidas
            </h1>
            <p className="text-slate-400 text-sm md:text-base mt-1">
              Cadastre tabelas de tamanhos, especificações e medidas para o provador virtual de roupas e vestuário.
            </p>
          </div>

          {!showForm && (
            <button
              onClick={handleCreateNew}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white px-5 py-3 rounded-2xl font-bold text-sm md:text-base shadow-lg transition-all self-start sm:self-auto"
            >
              <Plus className="w-5 h-5" />
              Adicionar Modelo
            </button>
          )}
        </div>

        {/* 1. FORM WINDOW (ADD/EDIT) */}
        {showForm && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl max-w-3xl mx-auto animate-fade-in space-y-6">
            <div className="flex items-center justify-between border-b border-slate-850 pb-4">
              <div className="flex items-center gap-2">
                <Ruler className="w-5 h-5 text-violet-400" />
                <h3 className="text-lg font-bold">
                  {editingId ? 'Editar Modelo de Medidas' : 'Cadastrar Modelo de Medidas'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditingId(null); }}
                className="text-slate-400 hover:text-slate-200 text-sm font-semibold transition-all"
              >
                Cancelar
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                
                {/* Nome do Modelo */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Nome do Modelo / Produto *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({ ...formData, name: e.target.value });
                      if (e.target.value.trim()) setFormErrors(prev => ({ ...prev, name: '' }));
                    }}
                    placeholder="Ex: Tabela de Medidas Jeans Useanny"
                    className={`w-full bg-slate-950 border focus:ring-1 focus:outline-none rounded-xl px-4 py-3 text-sm md:text-base text-slate-100 font-bold ${
                      errors.name ? 'border-rose-500 focus:ring-rose-500 focus:border-rose-500' : 'border-slate-800 focus:border-violet-500 focus:ring-violet-500'
                    }`}
                  />
                  {errors.name && (
                    <span className="text-xs text-rose-500 font-bold mt-1 block">{errors.name}</span>
                  )}
                </div>

                {/* Nome do Tamanho */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Nome do Tamanho *
                  </label>
                  <input
                    type="text"
                    value={formData.size_name}
                    onChange={(e) => {
                      setFormData({ ...formData, size_name: e.target.value });
                      if (e.target.value.trim()) setFormErrors(prev => ({ ...prev, size_name: '' }));
                    }}
                    placeholder="Ex: M"
                    className={`w-full bg-slate-950 border focus:ring-1 focus:outline-none rounded-xl px-4 py-3 text-sm md:text-base text-slate-100 font-bold ${
                      errors.size_name ? 'border-rose-500 focus:ring-rose-500 focus:border-rose-500' : 'border-slate-800 focus:border-violet-500 focus:ring-violet-500'
                    }`}
                  />
                  {errors.size_name && (
                    <span className="text-xs text-rose-500 font-bold mt-1 block">{errors.size_name}</span>
                  )}
                </div>

              </div>

              {/* MEDIDAS ROWS EDITOR */}
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-slate-850 pb-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Especificações de Medidas</span>
                  
                  <button
                    type="button"
                    onClick={handleAddMeasureRow}
                    className="inline-flex items-center gap-1.5 text-xs text-violet-400 font-bold hover:underline"
                  >
                    <PlusCircle className="w-4 h-4" /> Adicionar Medida
                  </button>
                </div>

                {errors.measures && (
                  <div className="bg-rose-500/10 text-rose-400 border border-rose-500/20 p-3 rounded-xl text-xs font-bold">
                    {errors.measures}
                  </div>
                )}

                <div className="space-y-3">
                  {formData.measures.map((row, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-[1fr_120px_100px_40px] gap-3 items-center p-3 bg-slate-950 rounded-xl border border-slate-850"
                    >
                      {/* Name of Measure */}
                      <input
                        type="text"
                        required
                        value={row.name}
                        onChange={(e) => handleUpdateMeasureRow(index, 'name', e.target.value)}
                        placeholder="Ex: Busto, Cintura, Quadril"
                        className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-semibold"
                      />

                      {/* Numeric Value */}
                      <input
                        type="number"
                        step="0.01"
                        required
                        min="0"
                        value={row.value || ''}
                        onChange={(e) => handleUpdateMeasureRow(index, 'value', e.target.value)}
                        placeholder="Ex: 86"
                        className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono font-bold"
                      />

                      {/* Unit measure selector */}
                      <select
                        value={row.unit}
                        onChange={(e) => handleUpdateMeasureRow(index, 'unit', e.target.value as any)}
                        className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-100 font-semibold"
                      >
                        <option value="cm">cm</option>
                        <option value="m">m</option>
                      </select>

                      {/* Delete row button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveMeasureRow(index)}
                        className="text-rose-500 hover:text-rose-400 p-1"
                        title="Remover linha"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                    </div>
                  ))}
                </div>
              </div>

              {/* SAVE FORM ACTIONS */}
              <div className="flex justify-end gap-3 pt-6 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setEditingId(null); }}
                  className="px-5 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:bg-slate-800 font-bold text-sm transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-md transition-all"
                >
                  {editingId ? 'Salvar Alterações' : 'Cadastrar Tabela'}
                </button>
              </div>

            </form>
          </div>
        )}

        {/* 2. SEARCH & LIST FILTERS */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar modelos de medidas ou tamanhos (ex: Calça Jeans, P, M)..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1); // Reset page to 1 on searching
              }}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl text-sm font-semibold text-slate-200"
            />
          </div>
        </div>

        {/* 3. MODELS TABLE LIST VIEW */}
        {filteredModels.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-16 text-center max-w-xl mx-auto shadow-xl">
            <Ruler className="w-12 h-12 text-slate-700 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-200">Nenhum modelo cadastrado</h3>
            <p className="text-slate-400 text-sm mt-1">
              {searchTerm ? 'Nenhum resultado corresponde à sua pesquisa.' : 'Comece a configurar o provador cadastrando sua primeira tabela de tamanhos.'}
            </p>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl animate-fade-in space-y-4">
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/40 uppercase font-bold text-[10px] tracking-wider">
                    <th className="p-4 pl-6 w-[240px]">Modelo / Vestuário</th>
                    <th className="p-4 text-center w-[120px]">Tamanho</th>
                    <th className="p-4">Tabela de Medidas (Detalhes)</th>
                    <th className="p-4 pr-6 text-right w-[140px]">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-semibold text-slate-300">
                  {paginatedModels.map((model) => (
                    <tr key={model.id} className="hover:bg-slate-800/20 transition-all">
                      <td className="p-4 pl-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-violet-600/10 text-violet-400 flex items-center justify-center border border-violet-500/20">
                            <Ruler className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="text-slate-100 font-bold block text-base leading-tight">{model.name}</span>
                            <span className="text-[10px] text-slate-500 font-mono">ID: {model.id}</span>
                          </div>
                        </div>
                      </td>

                      <td className="p-4 text-center">
                        <span className="bg-violet-500/15 text-violet-400 border border-violet-500/20 px-3 py-1.5 rounded-xl font-black text-xs">
                          {model.size_name}
                        </span>
                      </td>

                      <td className="p-4">
                        <div className="flex flex-wrap gap-2">
                          {model.measures && model.measures.map((measure, idx) => (
                            <div
                              key={idx}
                              className="bg-slate-950 border border-slate-850 px-2.5 py-1 rounded-lg text-xs flex items-center gap-1"
                            >
                              <span className="text-slate-400">{measure.name}:</span>
                              <span className="font-bold text-slate-200 font-mono">{measure.value} {measure.unit}</span>
                            </div>
                          ))}
                        </div>
                      </td>

                      <td className="p-4 pr-6 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => handleEdit(model)}
                          className="p-1.5 rounded-lg bg-slate-950 hover:bg-violet-600/20 text-slate-400 hover:text-violet-400 transition-all inline-flex items-center"
                          title="Editar"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(model.id, model.name)}
                          className="p-1.5 rounded-lg bg-slate-950 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-all inline-flex items-center"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-slate-850">
                <span className="text-xs text-slate-500 font-semibold font-mono">
                  Página {currentPage} de {totalPages} ({filteredModels.length} modelos)
                </span>
                
                <div className="inline-flex gap-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    className="p-2 rounded-lg bg-slate-950 hover:bg-slate-850 border border-slate-800 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4 text-slate-300" />
                  </button>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    className="p-2 rounded-lg bg-slate-950 hover:bg-slate-850 border border-slate-800 disabled:opacity-40"
                  >
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </button>
                </div>
              </div>
            )}

          </div>
        )}

        {/* Info Explanatory Box */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Sparkles className="w-48 h-48 text-violet-500" />
          </div>

          <div className="space-y-4 max-w-3xl">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-violet-600/15 text-violet-400 border border-violet-500/20">
                <Info className="w-4 h-4" />
              </span>
              <h3 className="font-extrabold text-base text-slate-100 uppercase tracking-wider">Como funciona o Provador Virtual?</h3>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed font-semibold">
              Ao vincular as tabelas de tamanhos criadas acima nas páginas de produto correspondentes na Useanny, a tag em Javascript detecta automaticamente as medidas do manequim do cliente, indicando o tamanho ideal e reduzindo a taxa de devoluções e logística reversa por tamanho incorreto.
            </p>
          </div>
        </div>

      </main>

      {/* Confirm Deletion Custom Dialog */}
      <CustomDialog
        isOpen={dialog.isOpen}
        type={dialog.type}
        title={dialog.title}
        description={dialog.description}
        onConfirm={dialog.onConfirm}
        onCancel={dialog.onCancel}
        confirmText="Excluir Modelo"
        cancelText="Cancelar"
      />
    </div>
  );
};

export default MedidasPage;
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Clock,
  Check,
  ChevronRight,
  ChevronLeft,
  Copy,
  Plus,
  Minus,
  RefreshCcw,
  FileSpreadsheet,
  Edit2,
  Trash2,
  AlertCircle,
  FolderDot,
  CheckCircle2,
  HelpCircle,
  Download,
  Upload,
  Sparkles,
  Info,
  Layers,
  ArrowRight,
  Search
} from 'lucide-react';
import {
  ProjectID,
  HoursBreakdown,
  TaskCategoryKey,
  TASK_CATEGORIES,
  DEFAULT_PROJECTS
} from './types';

export default function App() {
  // --- STATE ---
  const [projects, setProjects] = useState<ProjectID[]>(() => {
    try {
      const saved = localStorage.getItem('allocated_projects_flat');
      return saved ? JSON.parse(saved) : DEFAULT_PROJECTS;
    } catch (e) {
      console.error("Erro ao carregar projetos do localStorage:", e);
      return DEFAULT_PROJECTS;
    }
  });
  
  // Clean, flat allocations state (one generic user session, no person mixing up)
  const [allocations, setAllocations] = useState<{ [projectId: string]: HoursBreakdown }>(() => {
    try {
      const saved = localStorage.getItem('allocated_hours_flat_v3');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.error("Erro ao carregar alocações do localStorage:", e);
      return {};
    }
  });

  const [activeProjectId, setActiveProjectId] = useState<string>('');
  const [screen, setScreen] = useState<'setup' | 'fill' | 'summary'>('setup');
  
  // Custom project configuration text area (prefilled)
  const [pastedProjectsText, setPastedProjectsText] = useState<string>('');
  const [configError, setConfigError] = useState<string | null>(null);

  // States for manual single project insertion
  const [newProjectId, setNewProjectId] = useState<string>('');
  const [newProjectDesc, setNewProjectDesc] = useState<string>('');
  const [manualAddError, setManualAddError] = useState<string | null>(null);

  // Success indicator states
  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);
  const [showHelp, setShowHelp] = useState<boolean>(false);

  // Search filter term for the sequential project list
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Filter projects by ID or description (case-insensitive)
  const filteredProjects = useMemo(() => {
    if (!searchTerm.trim()) return projects;
    const term = searchTerm.toLowerCase();
    return projects.filter(
      (p) =>
        p.id.toLowerCase().includes(term) ||
        p.description.toLowerCase().includes(term)
    );
  }, [projects, searchTerm]);

  // --- CUSTOM DIALOG CONFIRMATION (REPLACES BLOCKED WINDOW.CONFIRM) ---
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmLabel?: string;
    cancelLabel?: string;
    type?: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    confirmLabel: 'Confirmar',
    cancelLabel: 'Cancelar',
    type: 'danger'
  });

  const triggerConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    confirmLabel = 'Sim, Confirmar',
    cancelLabel = 'Cancelar',
    type: 'danger' | 'warning' | 'info' = 'danger'
  ) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      },
      confirmLabel,
      cancelLabel,
      type
    });
  };

  // Auto-activate matching project when user types search
  useEffect(() => {
    if (searchTerm.trim() && filteredProjects.length > 0) {
      const existsInFiltered = filteredProjects.some((p) => p.id === activeProjectId);
      if (!existsInFiltered) {
        setActiveProjectId(filteredProjects[0].id);
      }
    }
  }, [searchTerm, filteredProjects, activeProjectId]);

  // --- PERSISTENCE ---
  useEffect(() => {
    localStorage.setItem('allocated_projects_flat', JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem('allocated_hours_flat_v3', JSON.stringify(allocations));
  }, [allocations]);

  // Handle activeProjectId initialization
  useEffect(() => {
    if (projects.length > 0 && !activeProjectId) {
      setActiveProjectId(projects[0].id);
    }
  }, [projects, activeProjectId]);

  // --- ACTIONS ---
  
  // Current active project hours
  const activeHours: HoursBreakdown = useMemo(() => {
    if (!activeProjectId) {
      return { ideacao: 0, gravacao: 0, construcao: 0, conducao: 0, agendas: 0, pos_producao: 0 };
    }
    return allocations[activeProjectId] || {
      ideacao: 0,
      gravacao: 0,
      construcao: 0,
      conducao: 0,
      agendas: 0,
      pos_producao: 0
    };
  }, [activeProjectId, allocations]);

  // Calculate sum for current active ID
  const totalHoursForActiveId = useMemo(() => {
    return (
      activeHours.ideacao +
      activeHours.gravacao +
      activeHours.construcao +
      activeHours.conducao +
      activeHours.agendas +
      activeHours.pos_producao
    );
  }, [activeHours]);

  // Calculate overall total allocated hours
  const grandTotalAllocatedHours = useMemo(() => {
    const list = Object.values(allocations) as HoursBreakdown[];
    return list.reduce((acc, current) => {
      return (
        acc +
        (current.ideacao || 0) +
        (current.gravacao || 0) +
        (current.construcao || 0) +
        (current.conducao || 0) +
        (current.agendas || 0) +
        (current.pos_producao || 0)
      );
    }, 0);
  }, [allocations]);

  // Total projects populated with any hours
  const projectsAllocatedCount = useMemo(() => {
    const list = Object.values(allocations) as HoursBreakdown[];
    return list.filter((breakdown) => {
      const sum =
        (breakdown.ideacao || 0) +
        (breakdown.gravacao || 0) +
        (breakdown.construcao || 0) +
        (breakdown.conducao || 0) +
        (breakdown.agendas || 0) +
        (breakdown.pos_producao || 0);
      return sum > 0;
    }).length;
  }, [allocations]);

  // Update specific category hours for the active project
  const handleUpdateHours = (category: TaskCategoryKey, value: number) => {
    if (!activeProjectId) return;
    
    // Ensure value is non-negative and formatted cleanly
    const safeValue = Math.max(0, Math.round(value * 100) / 100);

    setAllocations((prev) => {
      const currentProjState = prev[activeProjectId] || {
        ideacao: 0,
        gravacao: 0,
        construcao: 0,
        conducao: 0,
        agendas: 0,
        pos_producao: 0
      };

      return {
        ...prev,
        [activeProjectId]: {
          ...currentProjState,
          [category]: safeValue
        }
      };
    });
  };

  const handleAdjustHours = (category: TaskCategoryKey, delta: number) => {
    const current = activeHours[category] || 0;
    handleUpdateHours(category, Math.max(0, current + delta));
  };

  // Skip project or set everything to 0
  const handleClearProject = (id?: string) => {
    const targetId = id || activeProjectId;
    if (!targetId) return;
    setAllocations((prev) => {
      const updated = { ...prev };
      delete updated[targetId];
      return { ...updated };
    });
  };

  // Keyboard Navigation Helpers
  const activeProjectIndex = useMemo(() => {
    return projects.findIndex((p) => p.id === activeProjectId);
  }, [projects, activeProjectId]);

  const handleNext = () => {
    if (activeProjectIndex < projects.length - 1) {
      setActiveProjectId(projects[activeProjectIndex + 1].id);
    } else {
      setScreen('summary');
    }
  };

  const handlePrev = () => {
    if (activeProjectIndex > 0) {
      setActiveProjectId(projects[activeProjectIndex - 1].id);
    }
  };

  // Parse custom project list pasted from Excel/Sheets
  const handleParseProjectsList = () => {
    if (!pastedProjectsText.trim()) {
      setConfigError('Por favor, cole algum texto contendo IDs e Descrições.');
      return;
    }

    try {
      const lines = pastedProjectsText.split('\n');
      const parsed: ProjectID[] = [];

      lines.forEach((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) return;

        // Try splitting by tabs (standard copy-paste from Excel/Google Sheets)
        let parts = trimmed.split('\t');
        
        // Fallback to semicolon if no tabs
        if (parts.length < 2) {
          parts = trimmed.split(';');
        }

        // Fallback to comma if no tabs/semicolon
        if (parts.length < 2) {
          parts = trimmed.split(',');
        }

        if (parts.length >= 2) {
          const id = parts[0].trim();
          const description = parts.slice(1).join(' ').trim();
          parsed.push({ id, description });
        } else if (parts.length === 1 && parts[0].trim().length > 0) {
          // If just one long line, split first word as ID, remainder as description
          const wordSplit = parts[0].trim().match(/^([^\s]+)\s+(.+)$/);
          if (wordSplit) {
            parsed.push({ id: wordSplit[1].trim(), description: wordSplit[2].trim() });
          } else {
            // Last resort: treat entire line as both ID and description
            parsed.push({ id: `ID_${index + 1}`, description: parts[0].trim() });
          }
        }
      });

      if (parsed.length === 0) {
        throw new Error('Não foi possível identificar colunas na colagem. Use formato: ID [Espaço/Tab/Ponto-e-vírgula] Descrição');
      }

      setProjects(parsed);
      setAllocations({}); // Garantir que sempre que iniciar uma nova alocação o lixo da anterior suma.
      setPastedProjectsText('');
      setConfigError(null);
      if (parsed.length > 0) {
        setActiveProjectId(parsed[0].id);
      }
    } catch (err: any) {
      setConfigError(err.message || 'Erro ao processar. Verifique se o formato é compatível.');
    }
  };

  // Add individual project manually
  const handleAddNewProjectManual = () => {
    setManualAddError(null);
    const id = newProjectId.trim();
    const desc = newProjectDesc.trim();

    if (!id || !desc) {
      setManualAddError('Por favor, preencha tanto o ID quanto a Descrição.');
      return;
    }

    // Check duplicate
    if (projects.some((p) => p.id === id)) {
      setManualAddError(`O ID "${id}" já está cadastrado.`);
      return;
    }

    const updated = [...projects, { id, description: desc }];
    setProjects(updated);
    
    // Clear inputs
    setNewProjectId('');
    setNewProjectDesc('');
    
    if (!activeProjectId) {
      setActiveProjectId(id);
    }
  };

  // Remove individual project completely from the active project list and clear allocated hours
  const handleRemoveProjectFromList = (idToExclude: string) => {
    triggerConfirm(
      'Remover ID do Backlog',
      `Tem certeza de que deseja remover o ID "${idToExclude}" e exclui-lo completamente do backlog? Todos os registros de horas para ele também serão limpos.`,
      () => {
        setProjects((prev) => prev.filter((p) => p.id !== idToExclude));
        
        if (activeProjectId === idToExclude) {
          const remaining = projects.filter((p) => p.id !== idToExclude);
          if (remaining.length > 0) {
            setActiveProjectId(remaining[0].id);
          } else {
            setActiveProjectId('');
          }
        }

        // Sync allocations by removing the project ID
        setAllocations((prev) => {
          const updated = { ...prev };
          delete updated[idToExclude];
          return updated;
        });
      }
    );
  };

  // Copy exactly one column of hours ready for spreadsheet pasting
  const handleCopyColumnToClipboard = () => {
    try {
      // Map over each project in sequential order, and print just the total hours
      const columnLines = projects.map((proj) => {
        const breakdown = allocations[proj.id];
        if (!breakdown) return '';
        const sum =
          (breakdown.ideacao || 0) +
          (breakdown.gravacao || 0) +
          (breakdown.construcao || 0) +
          (breakdown.conducao || 0) +
          (breakdown.agendas || 0) +
          (breakdown.pos_producao || 0);
        
        // Format with comma as decimal separator common in Portuguese spreadsheets. Unallocated cells remain completely blank.
        return sum > 0 ? sum.toString().replace('.', ',') : '';
      });

      const copyText = columnLines.join('\n');
      navigator.clipboard.writeText(copyText);
      setCopiedSuccess(true);
      setTimeout(() => setCopiedSuccess(false), 2500);
    } catch (err) {
      console.error('Falha ao copiar', err);
    }
  };

  // Reset all allocation inputs
  const handleResetAllocations = () => {
    triggerConfirm(
      'Zerar lançamentos',
      'Tem certeza que deseja apagar TODOS os lançamentos de horas de todos os projetos? Esta ação não pode ser desfeita.',
      () => {
        setAllocations({});
        setScreen('setup');
      }
    );
  };

  // Reset entire saved database
  const handleResetAllLocalStorage = () => {
    triggerConfirm(
      'Resetar Aplicação',
      'Tem certeza de que deseja restaurar a aplicação ao estado inicial? Todos os dados salvos e backlog colado serão removidos.',
      () => {
        localStorage.clear();
        setProjects(DEFAULT_PROJECTS);
        setAllocations({});
        setScreen('setup');
      }
    );
  };

  // Help sample project text area prefill
  const handlePrefillSampleProjectText = () => {
    const sample = `C03\tTrilha de Ideação e Unidade Curricular de TI
D11\tVídeos de Formação Docente e Gravação síncrona
E24\tPlanos de aula, avaliações e exercícios do 1º Semestre
F09\tUpload de materiais, QA de links e verificação final
G15\tAlinhamento com cliente e agendas com o time comercial`;
    setPastedProjectsText(sample);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col antialiased">
      
      {/* HEADER BAR */}
      <header className="bg-white border-b border-slate-100 py-4 px-6 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Logo & Info */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-md shadow-indigo-100">
              <Clock className="w-5 h-5" id="app_header_logo_icon" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display font-bold text-lg md:text-xl tracking-tight text-slate-900 leading-none">
                  Alocador de Horas
                </h1>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-md font-bold tracking-wider">
                  Mapeador v2.5
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Assistente dinâmico de lançamento compatível com o Google Sheets
              </p>
            </div>
          </div>

          {/* Action Header Stats */}
          <div className="flex items-center gap-3">
            {grandTotalAllocatedHours > 0 && (
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-1.5 text-xs">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-emerald-700 font-medium">Lançamento Ativo:</span>
                <span className="font-mono font-bold text-emerald-800 bg-emerald-100/50 px-1.5 py-0.5 rounded-sm">
                  {grandTotalAllocatedHours.toString().replace('.', ',')}h
                </span>
              </div>
            )}

            <button
              onClick={() => setShowHelp(!showHelp)}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-100 cursor-pointer"
              title="Ajuda e Instruções"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* HELP MODAL/DRAWER */}
      <AnimatePresence>
        {showHelp && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-indigo-900 text-white p-6 md:p-8"
          >
            <div className="max-w-4xl mx-auto">
              <div className="flex justify-between items-start gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-300" />
                  <h3 className="font-display font-medium text-lg text-amber-200">Como funciona o Alocador de Horas?</h3>
                </div>
                <button
                  onClick={() => setShowHelp(false)}
                  className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-medium cursor-pointer transition-colors"
                >
                  Fechar [X]
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-indigo-100 text-sm">
                <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                  <span className="font-mono text-amber-300 text-xs font-semibold block mb-2">PASSO 1: CARREGAR A PLANILHA</span>
                  <p className="text-xs leading-relaxed">
                    Cole as colunas de ID e Descrição diretamente de sua planilha no editor destacado. A lista de IDs ativos é atualizada imediatamente.
                  </p>
                </div>
                <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                  <span className="font-mono text-amber-300 text-xs font-semibold block mb-2">PASSO 2: ALOCAR AS HORAS</span>
                  <p className="text-xs leading-relaxed">
                    Clique em Iniciar Alocação. Vá de ID em ID alocando as suas horas nas seis macro-atividades. A soma é automática e salva na hora.
                  </p>
                </div>
                <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                  <span className="font-mono text-amber-300 text-xs font-semibold block mb-2">PASSO 3: COPIAR COLUNA ÚNICA</span>
                  <p className="text-xs leading-relaxed">
                    Vá para a tela de Conclusão, clique em "Copiar Coluna" e dê Ctrl+V direto na célula correspondente da sua planilha do Drive/Excel!
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 flex-1 w-full flex flex-col justify-start">
        
        {/* =========================================================================
            SCREEN 1: SETUP & HIGH-CONTRAST SEED IMPORTER (DESTAQUE)
            ========================================================================= */}
        {screen === 'setup' && (
          <div className="space-y-6 animate-fade-in">
            
            {/* Elegant Header Banner */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6 md:p-8 shadow-xs relative overflow-hidden">
              <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-40 h-40 bg-indigo-50 rounded-full blur-2xl opacity-60"></div>
              
              <div className="max-w-4xl relative z-10">
                <span className="text-xs font-mono text-indigo-600 font-bold tracking-wider uppercase bg-indigo-50 px-2.5 py-1 rounded-sm">
                  Ambiente Prático & Livre de Contas de Membros
                </span>
                <h2 className="font-display font-bold text-2xl md:text-3xl text-slate-900 mt-3 tracking-tight">
                  Preenchimento Rápido de Horas por ID de Projetos
                </h2>
                <p className="text-sm md:text-base text-slate-500 mt-2 leading-relaxed">
                  Evite fazer cálculos lentos célula por célula. Importe seus IDs (ou use o padrão), 
                  lance suas horas em um fluxo sequencial passo-a-passo e, por fim, copie a coluna inteira 
                  para colar diretamente de volta na planilha operacional. Simples, rápido e inteligente.
                </p>
              </div>
            </div>

            {/* THREE BLOCK GRID FOCUSING ON HIGH-CONTRAST IMPORTER */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* LEFT & CENTER BOX (8 COLS): COPIER AREA HIGHLIGHTED (DESTAQUE MÁXIMO) */}
              <div className="lg:col-span-7 space-y-4">
                
                {/* Highlight Container */}
                <div className="bg-white border-2 border-indigo-500 rounded-2xl p-6 shadow-md relative overflow-hidden ring-4 ring-indigo-500/10">
                  <div className="absolute top-0 right-0 bg-indigo-500 text-white font-mono text-[9px] uppercase tracking-wider font-bold px-3 py-1 rounded-bl-xl shadow-xs">
                    Área Principal de Configuração
                  </div>

                  <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-4">
                    <div className="p-2.5 bg-indigo-50 rounded-xl text-indigo-600">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-slate-900 text-sm md:text-base">
                        Passo 1: Importar IDs da sua Planilha (Google Sheets / Excel)
                      </h3>
                      <p className="text-xs text-indigo-600 font-medium">
                        Selecione as colunas de ID e Descrição, copie (Ctrl+C) e cole no espaço abaixo:
                      </p>
                    </div>
                  </div>

                  {/* Excel Importer text area */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Espaço para Colar (Tabulado ou Separado por Ponto-e-vírgula)
                      </span>
                      <button
                        onClick={handlePrefillSampleProjectText}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold underline flex items-center gap-1 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        Carregar Exemplo de Colagem
                      </button>
                    </div>

                    <textarea
                      value={pastedProjectsText}
                      onChange={(e) => setPastedProjectsText(e.target.value)}
                      placeholder={`Cole suas linhas aqui... ex:\nA01\tEdição de Curso Básico de React\nB08\tRevisão Gramatical e Formatação\nC15\tGravação de Podcasts Temáticos`}
                      rows={6}
                      className="w-full text-xs font-mono p-3 bg-indigo-50/20 border-2 border-indigo-100 rounded-xl focus:outline-hidden focus:border-indigo-500 focus:bg-white resize-y font-bold text-slate-700"
                    />

                    {configError && (
                      <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-100 rounded-lg text-rose-700 text-xs">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span>{configError}</span>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={handleParseProjectsList}
                        className="flex-1 min-w-[200px] py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-100 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Upload className="w-4 h-4" />
                        Substituir Atual por {pastedProjectsText.split('\n').filter(Boolean).length} IDs do Backlog
                      </button>
                    </div>
                  </div>
                </div>

                {/* Manual insertion subcard */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                  <div className="flex items-center gap-1.5 mb-3">
                    <Plus className="w-4 h-4 text-indigo-600" />
                    <h4 className="font-display font-semibold text-slate-800 text-xs uppercase tracking-wider">
                      Ou inclua um único ID manualmente:
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                    <div className="md:col-span-3">
                      <input
                        type="text"
                        value={newProjectId}
                        onChange={(e) => setNewProjectId(e.target.value)}
                        placeholder="ID ex: C04"
                        className="w-full text-xs font-mono p-2.5 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-slate-800 font-bold bg-white"
                      />
                    </div>
                    <div className="md:col-span-6">
                      <input
                        type="text"
                        value={newProjectDesc}
                        onChange={(e) => setNewProjectDesc(e.target.value)}
                        placeholder="Nome ou Descrição detalhada do projeto..."
                        className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-slate-800 bg-white"
                      />
                    </div>
                    <div className="md:col-span-3">
                      <button
                        onClick={handleAddNewProjectManual}
                        className="w-full py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-2xs border border-indigo-100"
                      >
                        <Plus className="w-4 h-4" /> Adicionar ID
                      </button>
                    </div>
                  </div>

                  {manualAddError && (
                    <p className="text-[11px] text-rose-600 mt-2 font-medium flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {manualAddError}
                    </p>
                  )}
                </div>

              </div>

              {/* RIGHT BOX (5 COLS): ACTIVE LIST PREVIEW & SYSTEM TRIGGER */}
              <div className="lg:col-span-5 space-y-4">
                
                {/* Active memory projects list card */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="font-display font-semibold text-slate-900 text-xs uppercase tracking-wider">
                        IDs Ativos no Backlog ({projects.length})
                      </h3>
                      <p className="text-[10px] text-slate-400 mt-0.5">Clique em "Lixeira" para excluir IDs incorretos</p>
                    </div>
                    
                    <button
                      onClick={() => {
                        triggerConfirm(
                          'Apagar Todo o Backlog',
                          'Tem certeza de que deseja apagar todos os IDs do backlog ativo? Isso limpará a lista inteira e todos os lançamentos ativos salvos.',
                          () => {
                            setProjects([]);
                            setActiveProjectId('');
                          }
                        );
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-600 bg-rose-50 border border-rose-100 hover:bg-rose-100/80 hover:border-rose-200 rounded-xl cursor-pointer transition-all"
                      title="Apagar backlog antigo para colar um novo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Esvaziar Lista / Apagar Backlog Antigo
                    </button>
                  </div>

                  {/* Backlog Item List Visualizer */}
                  <div className="border border-slate-100 rounded-xl overflow-hidden max-h-[300px] overflow-y-auto bg-slate-50">
                    <table className="w-full text-xs text-left table-fixed">
                      <thead className="bg-slate-100 text-slate-500 font-mono text-[10px] uppercase sticky top-0 border-b border-slate-150">
                        <tr>
                          <th className="p-2.5 w-24 text-left font-bold">ID</th>
                          <th className="p-2.5 text-left font-bold">Descrição</th>
                          <th className="p-2.5 w-14 text-center font-bold">Apagar</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {projects.map((proj) => {
                          const hasHrs = allocations[proj.id] && (
                            (allocations[proj.id].ideacao || 0) +
                            (allocations[proj.id].gravacao || 0) +
                            (allocations[proj.id].construcao || 0) +
                            (allocations[proj.id].conducao || 0) +
                            (allocations[proj.id].agendas || 0) +
                            (allocations[proj.id].pos_producao || 0)
                          ) > 0;

                          return (
                            <tr key={proj.id} className="hover:bg-indigo-50/20 bg-white">
                              <td className="p-2.5 font-bold text-slate-700 truncate text-left flex items-center gap-1">
                                {hasHrs && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Horas preenchidas" />}
                                {proj.id}
                              </td>
                              <td className="p-2.5 truncate text-slate-500 text-left font-sans text-xs" title={proj.description}>
                                {proj.description}
                              </td>
                              <td className="p-2 text-center">
                                <button
                                  onClick={() => handleRemoveProjectFromList(proj.id)}
                                  className="p-1.5 hover:bg-rose-50 text-rose-500 hover:text-rose-700 rounded-lg cursor-pointer transition-colors inline-flex items-center justify-center"
                                  title="Remover ID integralmente"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}

                        {projects.length === 0 && (
                          <tr>
                            <td colSpan={3} className="p-8 text-center text-slate-400 font-sans">
                              Nenhum ID ativo. Use a área de cópia ao lado para importar os IDs da planilha.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* RESET ENTIRE STATE (BACKLOG & ALLOCATIONS) */}
                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <button
                      onClick={handleResetAllLocalStorage}
                      className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <RefreshCcw className="w-3 h-3" />
                      Resetar Aplicação Original
                    </button>
                    {projectsAllocatedCount > 0 && (
                      <span className="text-emerald-600 font-semibold font-mono">
                        {projectsAllocatedCount} IDs com horas salvas
                      </span>
                    )}
                  </div>
                </div>

                {/* GIANT ACTION LAUNCHER BUTTON */}
                {projects.length > 0 ? (
                  <button
                    onClick={() => {
                      if (!activeProjectId) {
                        setActiveProjectId(projects[0].id);
                      }
                      setScreen('fill');
                    }}
                    className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold transition-all shadow-md flex items-center justify-center gap-2 group cursor-pointer text-sm"
                  >
                    <span>Iniciar Lancamento de Horas</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform text-indigo-400" />
                  </button>
                ) : (
                  <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl text-center text-xs text-amber-800 font-medium">
                    Importe ou configure a lista de IDs para habilitar o lançamento de horas.
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* =========================================================================
            SCREEN 2: STEP BY STEP ASSISTANT (WIZARD FILL)
            ========================================================================= */}
        {screen === 'fill' && activeProjectId && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-fade-in">
            
            {/* Sidebar with all project steps (List of projects with state indicator) */}
            <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-100 p-4 shadow-xs space-y-4 order-2 lg:order-1">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-1.5">
                  <FolderDot className="w-4 h-4 text-indigo-600" />
                  <span className="font-display font-bold text-xs text-slate-500 uppercase tracking-wider">Passos: {projects.length} IDs</span>
                </div>
                <div className="text-xs font-mono font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-sm">
                  {projectsAllocatedCount} preenchidos
                </div>
              </div>

              {/* Progress visual bar */}
              <div className="space-y-1">
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                    style={{ width: `${projects.length > 0 ? (projectsAllocatedCount / projects.length) * 100 : 0}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>Conclusão</span>
                  <span>{projects.length > 0 ? Math.round((projectsAllocatedCount / projects.length) * 100) : 0}%</span>
                </div>
              </div>

              {/* Search ID filter input field directly above the list */}
              <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Search className="w-3.5 h-3.5 text-indigo-600" />
                  Ir para o ID / Buscar:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Digite o ID (ex: 4112)..."
                    className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-slate-800 font-bold"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-2.5 top-2 text-xs text-slate-400 font-bold hover:text-slate-600 h-6 w-6 flex items-center justify-center cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Sequential Projects Checklist */}
              <div className="space-y-1 max-h-[380px] overflow-y-auto pr-1">
                {filteredProjects.map((proj) => {
                  const originalIdx = projects.findIndex((p) => p.id === proj.id);
                  const projBreakdown = allocations[proj.id];
                  const projSum = projBreakdown
                    ? (projBreakdown.ideacao || 0) +
                      (projBreakdown.gravacao || 0) +
                      (projBreakdown.construcao || 0) +
                      (projBreakdown.conducao || 0) +
                      (projBreakdown.agendas || 0) +
                      (projBreakdown.pos_producao || 0)
                    : 0;

                  const isActive = activeProjectId === proj.id;

                  return (
                    <button
                      key={proj.id}
                      onClick={() => setActiveProjectId(proj.id)}
                      className={`w-full text-left p-2.5 rounded-xl border text-xs flex items-center justify-between transition-all cursor-pointer ${
                        isActive
                          ? 'bg-slate-950 border-slate-950 text-white shadow-xs'
                          : projSum > 0
                          ? 'bg-emerald-50 border-emerald-100 hover:bg-emerald-100/50 text-slate-700'
                          : 'bg-white border-transparent hover:bg-slate-50 text-slate-600 hover:border-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`font-mono text-[10px] w-5 h-5 flex items-center justify-center rounded-md font-semibold select-none ${
                          isActive
                            ? 'bg-slate-850 text-white'
                            : projSum > 0
                            ? 'bg-emerald-500 text-white'
                            : 'bg-slate-100 text-slate-400'
                        }`}>
                          {originalIdx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="font-mono font-bold leading-none">{proj.id}</p>
                          <p className={`text-[10px] truncate mt-0.5 ${isActive ? 'text-slate-300' : 'text-slate-400'}`} title={proj.description}>
                            {proj.description}
                          </p>
                        </div>
                      </div>
                      
                      {projSum > 0 && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <span className={`font-mono font-bold text-[10px] px-1.5 py-0.5 rounded-sm ${
                            isActive ? 'bg-slate-800 text-emerald-300' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {projSum.toString().replace('.', ',')}h
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              triggerConfirm(
                                'Zerar Lançamento',
                                `Tem certeza que deseja apagar/zerar as horas alocadas do ID "${proj.id}"?`,
                                () => {
                                  handleClearProject(proj.id);
                                }
                              );
                            }}
                            className={`p-1 rounded-md transition-colors cursor-pointer ${
                              isActive ? 'text-rose-400 hover:bg-slate-800 hover:text-rose-300' : 'text-slate-400 hover:bg-rose-50 hover:text-rose-600'
                            }`}
                            title="Apagar horas deste ID"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </button>
                  );
                })}

                {filteredProjects.length === 0 && (
                  <div className="p-4 text-center text-xs text-slate-400 font-sans border border-slate-100 border-dashed rounded-xl bg-slate-50/50">
                    Nenhum ID correspondente encontrado.
                  </div>
                )}
              </div>

              {/* Control bottom */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <button
                  onClick={() => setScreen('setup')}
                  className="w-full py-2 bg-slate-50 hover:bg-slate-150 text-slate-600 rounded-xl text-xs font-semibold border border-slate-200 transition-colors cursor-pointer text-center block"
                >
                  ⚙️ Configurações e Backlog
                </button>
                <button
                  onClick={() => setScreen('summary')}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-50 transition-colors cursor-pointer text-center block hover:scale-[1.01] active:scale-[0.99]"
                >
                  📋 Finalizar e Copiar Planilha
                </button>
              </div>
            </div>

            {/* Main Interactive Allocator Card */}
            <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-100 p-6 md:p-8 shadow-xs space-y-6 order-1 lg:order-2">
              
              {/* TOP ACTION HIGH-VISIBILITY BANNER BAR - BRINGS SUMMARY CLOSE TO THE USER */}
              <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl p-4 md:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm shadow-emerald-100">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-200 animate-pulse" />
                    <span className="text-[10px] font-mono tracking-wider font-bold uppercase text-emerald-100 bg-emerald-700/30 px-2 py-0.5 rounded-md">
                      Status Global de Lançamento
                    </span>
                  </div>
                  <p className="text-xs text-emerald-50 leading-relaxed mt-1">
                    Você já alocou <strong className="text-white font-bold">{grandTotalAllocatedHours.toString().replace('.', ',')}h</strong> em <strong className="text-white font-bold">{projectsAllocatedCount} de {projects.length} IDs</strong> ativos no backlog.
                  </p>
                </div>
                
                <button
                  onClick={() => setScreen('summary')}
                  className="w-full sm:w-auto py-2.5 px-5 bg-white hover:bg-emerald-50 text-emerald-800 font-sans font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 hover:scale-[1.02] cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Visualizar Resumo Geral & Copiar
                </button>
              </div>
              
              {/* CURRENT ACTIVE PROJECT CARD CONTAINER */}
              <div className="bg-slate-50 rounded-2xl border border-slate-100 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">
                      ID Ativo Selecionado
                    </span>
                    <span className="text-xs text-slate-400">
                      ID {activeProjectIndex + 1} de {projects.length}
                    </span>
                  </div>
                  <h2 className="font-display font-medium text-xl text-slate-900 font-mono tracking-tight">
                    {activeProjectId} - <span className="font-sans font-normal text-slate-700 text-base">{projects[activeProjectIndex]?.description}</span>
                  </h2>
                </div>

                <div className="text-right p-4 bg-white border border-slate-150 rounded-xl shadow-2xs min-w-[140px] flex flex-col justify-center">
                  <span className="text-[10px] text-slate-400 font-semibold block uppercase">Soma deste ID</span>
                  <div className="flex items-baseline justify-end gap-1 mt-0.5">
                    <span className="font-mono text-2xl font-bold text-indigo-600">
                      {totalHoursForActiveId.toString().replace('.', ',')}
                    </span>
                    <span className="text-xs text-slate-400">horas</span>
                  </div>
                  {totalHoursForActiveId > 0 && (
                    <button
                      onClick={() => {
                        triggerConfirm(
                          'Zerar Horas deste ID',
                          `Tem certeza de que deseja apagar e zerar todos os lançamentos de horas salvos para o ID "${activeProjectId}"?`,
                          () => {
                            handleClearProject();
                          }
                        );
                      }}
                      className="mt-2 w-full flex items-center justify-center gap-1 bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 hover:border-rose-300 rounded-lg p-1.5 text-xs font-semibold cursor-pointer transition-colors animate-fade-in"
                      title="Apagar todos os lançamentos para este ID"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Zerar Lançamento
                    </button>
                  )}
                </div>
              </div>

              {/* HOURLY CALCULATOR BY CORE FUNCTIONALITIES */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-600" />
                    Insira as horas desmembrando as tarefas abaixo:
                  </h3>
                  <span className="text-xs text-slate-400 font-mono">Incrementos inteligentes de 0,5h</span>
                </div>

                {/* THE 6 CATEGORIES LIST */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {TASK_CATEGORIES.map((cat) => {
                    const value = activeHours[cat.key] || 0;
                    
                    return (
                      <div
                        key={cat.key}
                        className={`rounded-xl border p-4 transition-all flex flex-col justify-between space-y-3 ${
                          value > 0 ? 'bg-white border-indigo-200 ring-1 ring-indigo-100/50 shadow-xs' : 'bg-white border-slate-100 hover:border-slate-200'
                        }`}
                      >
                        {/* Header of category card */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className={`text-sm font-semibold tracking-tight ${cat.color}`}>
                              {cat.label}
                            </span>
                            {value > 0 && (
                              <span className="text-[11px] font-mono font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-sm">
                                {value.toString().replace('.', ',')}h
                              </span>
                            )}
                          </div>
                          
                          {/* Inner child subtasks listing */}
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {cat.subTasks.map((sub, sidx) => (
                              <span
                                key={sidx}
                                className="text-[9px] px-1.5 py-0.5 bg-slate-50 border border-slate-100 text-slate-400 rounded-sm font-medium"
                              >
                                {sub}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Interactive Calculators/Quick Presets */}
                        <div className="flex items-center gap-1.5 pt-2 border-t border-slate-50">
                          {/* Increment Controls */}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleAdjustHours(cat.key, -0.5)}
                              className="p-1 px-2 hover:bg-slate-100 text-slate-500 active:bg-slate-200 rounded-lg border border-slate-200 font-bold transition-all text-xs flex items-center justify-center font-mono cursor-pointer disabled:opacity-50"
                              disabled={value <= 0}
                              title="Retirar 30 min (-0.5h)"
                            >
                              -0.5
                            </button>
                            
                            {/* Manual numerical input field */}
                            <input
                              type="number"
                              min="0"
                              step="0.5"
                              value={value === 0 ? '' : value}
                              onChange={(e) => {
                                const parsedVal = parseFloat(e.target.value);
                                handleUpdateHours(cat.key, isNaN(parsedVal) ? 0 : parsedVal);
                              }}
                              placeholder="0,0"
                              className="w-12 text-center text-xs font-mono font-semibold py-1 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-slate-800 bg-white"
                            />

                            <button
                              onClick={() => handleAdjustHours(cat.key, 0.5)}
                              className="p-1 px-2 hover:bg-slate-100 text-slate-500 active:bg-slate-200 rounded-lg border border-slate-200 font-bold transition-all text-xs flex items-center justify-center font-mono cursor-pointer"
                              title="Adicionar 30 min (+0.5h)"
                            >
                              +0.5
                            </button>
                          </div>

                          {/* Fast Shortcuts Presets */}
                          <div className="flex-1 flex gap-1 justify-end">
                            {[1, 2, 4].map((preset) => (
                              <button
                                key={preset}
                                onClick={() => handleAdjustHours(cat.key, preset)}
                                className="p-1 px-1.5 hover:bg-indigo-50 hover:text-indigo-700 font-mono text-[10px] font-semibold text-slate-400 rounded-md border border-dotted border-slate-200 hover:border-indigo-200 cursor-pointer transition-colors"
                              >
                                +{preset}h
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* NAVIGATION FLOW STEPS BAR */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-100">
                
                {/* Back button */}
                <button
                  onClick={handlePrev}
                  className={`w-full sm:w-auto p-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-xl text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeProjectIndex === 0 ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  disabled={activeProjectIndex === 0}
                >
                  <ChevronLeft className="w-4 h-4" />
                  ID Anterior ({projects[activeProjectIndex - 1]?.id || 'Nenhum'})
                </button>

                {/* Progress dot indicator */}
                <div className="hidden md:flex items-center gap-1">
                  {projects.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setActiveProjectId(p.id)}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        activeProjectId === p.id
                          ? 'bg-indigo-600 ring-2 ring-indigo-200'
                          : allocations[p.id]
                          ? 'bg-emerald-500'
                          : 'bg-slate-200'
                      }`}
                      title={`${p.id}: ${p.description}`}
                    />
                  ))}
                </div>

                <div className="w-full sm:w-auto flex items-center gap-2">
                  {/* Clean launch block */}
                  <button
                    onClick={() => {
                      triggerConfirm(
                        'Zerar Registro de Horas',
                        `Tem certeza que deseja apagar e zerar as horas alocadas do ID "${activeProjectId}" no banco local?`,
                        () => {
                          handleClearProject();
                        }
                      );
                    }}
                    className="flex-1 sm:flex-none p-2.5 px-4 text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700 border border-transparent hover:border-rose-100 rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Zerar Registro
                  </button>
                  
                  {/* Next Step / Pronto button */}
                  <button
                    onClick={handleNext}
                    className={`flex-2 sm:flex-none p-3 px-6 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      activeProjectIndex === projects.length - 1
                        ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100 animate-pulse'
                        : 'bg-slate-900 hover:bg-slate-800'
                    }`}
                  >
                    {activeProjectIndex === projects.length - 1 ? (
                      <>
                        📋 Finalizar e Copiar Planilha
                        <Check className="w-4 h-4 text-white" />
                      </>
                    ) : (
                      <>
                        Próximo ID ({projects[activeProjectIndex + 1]?.id || 'Fim'})
                        <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            SCREEN 3: SUMMARY / READY TO COPY (PRONTO)
            ========================================================================= */}
        {screen === 'summary' && (
          <div className="space-y-6 animate-fade-in">
            
            {/* Quick Navigation Top Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-100 shadow-2xs">
              <button
                onClick={() => setScreen('setup')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs transition-colors cursor-pointer border border-indigo-150"
              >
                <ChevronLeft className="w-4 h-4" />
                ⚙️ Voltar ao Início (Colar Backlog / IDs)
              </button>
              
              <button
                onClick={() => {
                  if (projects.length > 0) {
                    if (!activeProjectId) {
                      setActiveProjectId(projects[0].id);
                    }
                    setScreen('fill');
                  }
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer border border-slate-200"
              >
                ✏️ Continuar Lançando / Ajustar Horas
              </button>
            </div>
            
            {/* Success Welcome Box */}
            <div className="bg-[#0f172a] text-white rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-md relative overflow-hidden">
              <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl select-none"></div>
              
              <div className="space-y-2 relative z-10 max-w-xl">
                <span className="text-[10px] uppercase tracking-widest font-mono text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-sm font-bold">
                  Concluído com Sucesso
                </span>
                <h2 className="font-display font-semibold text-2xl md:text-3xl tracking-tight text-white flex items-center gap-2">
                  <CheckCircle2 className="w-7 h-7 text-emerald-400 leading-none flex-shrink-0" />
                  Pronto! Horas Calculadas
                </h2>
                <p className="text-slate-300 text-xs md:text-sm leading-relaxed">
                  Todos os IDs e sub-tarefas foram computados de forma individual para o navegador. 
                  Copie a coluna gerada abaixo e cole na sua planilha do time com total compatibilidade.
                </p>
              </div>

              {/* STATS CAPSULE */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-5 text-center min-w-[200px] relative z-10">
                <span className="text-[10px] uppercase text-indigo-300 font-mono tracking-wider">Lançamento Geral</span>
                <h3 className="font-mono text-3xl font-bold mt-1 text-emerald-300">
                  {grandTotalAllocatedHours.toString().replace('.', ',')}h
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Alocado em {projectsAllocatedCount} de {projects.length} IDs ativos
                </p>
              </div>
            </div>

            {/* PASTE INTERPRETER & COPY INTERFACE */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left Side: Copy Panel */}
              <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-100 p-6 shadow-xs space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="font-display font-semibold text-slate-900 text-sm flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                    Área para Copiar e Colar
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Copie a coluna e cole exatamente na sua célula da coluna na planilha.
                  </p>
                </div>

                {/* Big Copy Button */}
                <button
                  onClick={handleCopyColumnToClipboard}
                  className={`w-full py-4 rounded-xl text-sm font-bold transition-all cursor-pointer shadow-md flex items-center justify-center gap-2 ${
                    copiedSuccess
                      ? 'bg-emerald-600 text-white shadow-emerald-150'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-150'
                  }`}
                >
                  {copiedSuccess ? (
                    <>
                      <Check className="w-5 h-5 animate-bounce" />
                      Copiado! Cola direto no Sheets / Excel
                    </>
                  ) : (
                    <>
                      <Copy className="w-5 h-5" />
                      Copiar Coluna Única (Especial)
                    </>
                  )}
                </button>

                {/* Textbox container displaying the clipboard columns content */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Visualização do Clip de Cópia (Valores verticais):
                  </label>
                  <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl font-mono text-xs max-h-[180px] overflow-y-auto space-y-1">
                    {projects.map((proj, idx) => {
                      const breakdown = allocations[proj.id];
                      const val = breakdown
                        ? (breakdown.ideacao || 0) +
                          (breakdown.gravacao || 0) +
                          (breakdown.construcao || 0) +
                          (breakdown.conducao || 0) +
                          (breakdown.agendas || 0) +
                          (breakdown.pos_producao || 0)
                        : 0;

                      return (
                        <div key={proj.id} className="flex justify-between border-b border-slate-100/50 pb-1">
                          <span className="text-slate-400 font-normal">
                            Linha {idx + 1} ({proj.id}):
                          </span>
                          <span className="font-bold text-slate-800">
                            {val > 0 ? val.toString().replace('.', ',') : ''}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    *Nota: A ordem dos valores corresponde exatamente aos IDs do backlog para evitar erros de decalagem.
                  </p>
                </div>

                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-800 space-y-1.5">
                  <div className="font-bold flex items-center gap-1">
                    <Info className="w-4 h-4 flex-shrink-0" />
                    Como colar na minha Planilha?
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Abra o seu Google Sheets, selecione a **primeira célula da sua coluna** de horas (na linha correspondente ao primeiro ID) e dê um **Ctrl+V** (ou colar). O Excel/Google Sheets preencherá sucessivamente as células subsequentes de forma empilhada!
                  </p>
                </div>
              </div>

              {/* Right Side: Tabular Overview and Recalculations */}
              <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-100 p-6 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-display font-semibold text-slate-900 text-sm">
                      Detalhamento de Lançamento Ativo
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Veja os valores individuais e remova os que desejar.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      if (projects.length > 0) {
                        setActiveProjectId(projects[0].id);
                        setScreen('fill');
                      }
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-indigo-600 border border-indigo-150 hover:bg-indigo-50 rounded-lg cursor-pointer transition-colors"
                  >
                    Voltar para Edição Passo a Passo
                  </button>
                </div>

                {/* Listing of allocations table */}
                <div className="border border-slate-100 rounded-xl overflow-hidden max-h-[300px] overflow-y-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-400 font-mono text-[10px] uppercase border-b border-slate-100 sticky top-0">
                      <tr>
                        <th className="p-3 w-20">ID</th>
                        <th className="p-3">Descrição / Categorias Computadas</th>
                        <th className="p-3 text-right text-sm">Horas</th>
                        <th className="p-3 text-center w-16">Limpar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {projects.map((proj) => {
                        const breakdown = allocations[proj.id];
                        const total = breakdown
                          ? (breakdown.ideacao || 0) +
                            (breakdown.gravacao || 0) +
                            (breakdown.construcao || 0) +
                            (breakdown.conducao || 0) +
                            (breakdown.agendas || 0) +
                            (breakdown.pos_producao || 0)
                          : 0;

                        if (total === 0) return null; // Show only populated for focus

                        return (
                          <tr key={proj.id} className="hover:bg-slate-50">
                            <td className="p-3 font-mono font-bold text-slate-700">{proj.id}</td>
                            <td className="p-3 text-slate-600">
                              <p className="font-medium text-slate-700 font-sans">{proj.description}</p>
                              
                              {/* Sub categories display */}
                              <div className="flex flex-wrap gap-1 mt-1 text-[10px] font-mono">
                                {breakdown.ideacao > 0 && (
                                  <span className="px-1.5 py-0.25 bg-amber-50 text-amber-700 border border-amber-100 rounded-sm">
                                    Ideação: {breakdown.ideacao}h
                                  </span>
                                )}
                                {breakdown.gravacao > 0 && (
                                  <span className="px-1.5 py-0.25 bg-rose-50 text-rose-700 border border-rose-100 rounded-sm">
                                    Gravação: {breakdown.gravacao}h
                                  </span>
                                )}
                                {breakdown.construcao > 0 && (
                                  <span className="px-1.5 py-0.25 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-sm">
                                    Material: {breakdown.construcao}h
                                  </span>
                                )}
                                {breakdown.conducao > 0 && (
                                  <span className="px-1.5 py-0.25 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-sm">
                                    Síncrono: {breakdown.conducao}h
                                  </span>
                                )}
                                {breakdown.agendas > 0 && (
                                  <span className="px-1.5 py-0.25 bg-sky-50 text-sky-700 border border-sky-100 rounded-sm">
                                    Agendas: {breakdown.agendas}h
                                  </span>
                                )}
                                {breakdown.pos_producao > 0 && (
                                  <span className="px-1.5 py-0.25 bg-purple-50 text-purple-700 border border-purple-100 rounded-sm">
                                    Pós-Prod: {breakdown.pos_producao}h
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-3 font-mono font-bold text-slate-800 text-right text-sm">
                              {total.toString().replace('.', ',')}h
                            </td>
                            <td className="p-3 text-center">
                              <button
                                onClick={() => {
                                  triggerConfirm(
                                    'Zerar Lançamento',
                                    `Tem certeza que deseja apagar e zerar todo o lançamento de horas do ID "${proj.id}"? Esta ação limpará esses dados locais.`,
                                    () => {
                                      handleClearProject(proj.id);
                                    }
                                  );
                                }}
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors inline-flex items-center justify-center"
                                title="Zerar todas as horas deste ID"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}

                      {projectsAllocatedCount === 0 && (
                        <tr>
                          <td colSpan={4} className="text-center p-6 text-slate-400">
                            Nenhum ID possui horas alocadas no momento.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Foot Action Buttons */}
                <div className="pt-6 border-t border-slate-150 space-y-4">
                  {/* Danger zone to clear allocations (Muita visibilidade / Alta importância) */}
                  <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="space-y-1 text-center sm:text-left">
                      <div className="flex items-center justify-center sm:justify-start gap-1.5 text-rose-750 font-bold text-xs uppercase tracking-wider font-sans">
                        <AlertCircle className="w-4 h-4" />
                        Atenção: Limpeza Completa
                      </div>
                      <p className="text-[11px] text-rose-600 font-sans leading-relaxed">
                        Deseja apagar os lançamentos atuais para iniciar do zero? O backlog de IDs e as configurações continuarão salvos.
                      </p>
                    </div>
                    
                    <button
                      onClick={handleResetAllocations}
                      className="w-full sm:w-auto py-2.5 px-5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-sans font-bold text-xs rounded-xl shadow-lg shadow-rose-100 transition-all flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                      Zerar Todos os Lançamentos de Horas
                    </button>
                  </div>

                  {/* Primary Return and Control Row */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                    <button
                      onClick={() => setScreen('setup')}
                      className="w-full sm:w-auto p-3 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-50 transition-all flex items-center justify-center gap-1.5 hover:scale-[1.01] cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Voltar ao Início e Mudar IDs
                    </button>
                    
                    <span className="text-[10px] font-mono text-slate-400">
                      Banco de Dados Local Ativo ({projects.length} IDs)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* FOOTER METRICS AND CREDITS */}
      <footer className="bg-white border-t border-slate-100 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-450">
          <div>
            <p className="font-mono text-[10px] text-slate-400 uppercase tracking-widest font-bold">
              Organização Operacional Simples
            </p>
            <p className="text-slate-400 mt-1">
              Desenvolvido de forma genérica e prática para automatizar o apontamento de horas na liderança de pessoas.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-sm font-semibold font-mono">
              OFFLINE SECURE (LOCALSTORAGE)
            </span>
            <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-sm font-semibold font-sans">
              PREENCHIMENTO INDIVIDUAL DIRETO
            </span>
          </div>
        </div>
      </footer>

      {/* CUSTOM DIALOG CONFIRMATION MODAL (No more blocked window.confirm!) */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
            />
            
            {/* Modal Body */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-2xl shadow-xl border border-slate-100 max-w-sm w-full p-6 space-y-4 z-10"
            >
              <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-xl ${
                  confirmModal.type === 'danger'
                    ? 'bg-rose-50 text-rose-600'
                    : confirmModal.type === 'warning'
                    ? 'bg-amber-50 text-amber-600'
                    : 'bg-indigo-50 text-indigo-600'
                }`}>
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-sans font-bold text-slate-900 text-sm leading-tight">
                    {confirmModal.title}
                  </h3>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    {confirmModal.message}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 justify-end pt-2">
                <button
                  onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                  className="px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-650 rounded-xl text-xs font-semibold border border-slate-150 transition-colors cursor-pointer"
                >
                  {confirmModal.cancelLabel || 'Cancelar'}
                </button>
                <button
                  onClick={() => {
                    confirmModal.onConfirm();
                  }}
                  className={`px-3.5 py-1.5 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    confirmModal.type === 'danger'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : confirmModal.type === 'warning'
                      ? 'bg-amber-500 hover:bg-amber-600'
                      : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  {confirmModal.confirmLabel || 'Confirmar'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

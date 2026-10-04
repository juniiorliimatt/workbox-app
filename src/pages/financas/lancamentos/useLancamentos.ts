import { ChangeEvent, FormEvent, SyntheticEvent, useCallback, useEffect, useState } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import { useAxiosWithAuth } from '@/services/useAxiosWithAuth';
import { useSnackbar } from '@/hooks/useSnackbar';
import { getErrorMessage } from '@/utils/errors';

/** Campos do formulário de um lançamento. `description` e `wasPaid` só existem nas despesas; a receita os ignora. */
export interface LancamentoForm {
  date: Dayjs | null;
  refDate: Dayjs | null;
  value: string;
  typeId: string;
  description: string;
  wasPaid: boolean;
}

export const emptyForm = (): LancamentoForm => ({ date: dayjs(), refDate: null, value: '', typeId: '', description: '', wasPaid: false });

/** Uma revisão do histórico de auditoria (Envers) — só o que as telas mostram. */
export interface LancamentoRevision {
  revision: number;
  revisionType: string;
  changedAt?: string | null;
  changedBy?: string | null;
  value?: number;
}

/** Corpo comum aos dois tipos de lançamento (a despesa soma descrição e situação). */
export const basePayload = (form: LancamentoForm) => ({
  date: form.date?.format('YYYY-MM-DD') || '',
  referenceDate: form.refDate ? form.refDate.format('YYYY-MM-DD') : null,
  value: Number(form.value),
  typeId: form.typeId,
});

/**
 * O que difere entre Receitas e Despesas: URLs, como o item vira formulário e o formulário vira payload, o corpo do
 * "novo tipo" e as mensagens (os textos são exatamente os de cada tela — algumas divergem de propósito).
 */
export interface LancamentoConfig<TItem extends { id: string }, TExtras> {
  listUrl: string;
  typesUrl: string;
  toForm: (item: TItem) => LancamentoForm;
  toPayload: (form: LancamentoForm) => Record<string, unknown>;
  typeExtrasDefault: TExtras;
  toTypePayload: (name: string, extras: TExtras) => Record<string, unknown>;
  messages: {
    created: string;
    updated: string;
    saveError: (detail: string) => string;
    deleted: string;
    deleteError: (error: unknown) => string;
    typeCreated: string;
  };
}

/** Filtro de uma aba (mensal ou anual): `month` 0 = todos os meses (só a visão anual permite). */
interface FilterState {
  type: string;
  month: number;
  year: number;
}

/**
 * Estado e ações das telas de lançamentos (Receitas/Despesas): listagem paginada com filtro mensal/anual e ordenação,
 * formulário de criar/editar, exclusão com confirmação, histórico de auditoria e criação de tipo.
 */
export const useLancamentos = <TItem extends { id: string }, TType extends { id: string }, TExtras>(
  config: LancamentoConfig<TItem, TExtras>,
) => {
  const api = useAxiosWithAuth();
  const { showSnackbar } = useSnackbar();
  const today = new Date();

  const [items, setItems] = useState<TItem[]>([]);
  const [types, setTypes] = useState<TType[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalElements, setTotalElements] = useState(0);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(12);
  const [orderBy, setOrderBy] = useState('date');
  const [orderDirection, setOrderDirection] = useState<'asc' | 'desc'>('desc');

  const [tabValue, setTabValue] = useState(0);
  const [monthly, setMonthly] = useState<FilterState>({ type: '', month: today.getMonth() + 1, year: today.getFullYear() });
  const [annual, setAnnual] = useState<FilterState>({ type: '', month: 0, year: today.getFullYear() });
  const [applied, setApplied] = useState<FilterState>({ type: '', month: today.getMonth() + 1, year: today.getFullYear() });

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<LancamentoForm>(emptyForm);

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const [auditTarget, setAuditTarget] = useState<TItem | null>(null);
  const [auditHistory, setAuditHistory] = useState<LancamentoRevision[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);

  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [typeExtras, setTypeExtras] = useState<TExtras>(config.typeExtrasDefault);
  const [typeLoading, setTypeLoading] = useState(false);

  const [batchOpen, setBatchOpen] = useState(false);

  const { listUrl, typesUrl } = config;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [listRes, typesRes] = await Promise.all([
        api.get(listUrl, {
          params: {
            page,
            size: rowsPerPage,
            sort: `${orderBy},${orderDirection}`,
            year: applied.year,
            ...(applied.month > 0 && { month: applied.month }),
            ...(applied.type && { typeId: applied.type }),
          },
        }),
        api.get(typesUrl),
      ]);
      setItems(Array.isArray(listRes.data?.content) ? listRes.data.content : []);
      setTotalElements(listRes.data?.totalElements || 0);
      setTypes(Array.isArray(typesRes.data) ? typesRes.data : []);
    } catch (e: unknown) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [api, listUrl, typesUrl, page, rowsPerPage, orderBy, orderDirection, applied]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // --- abas, filtros, ordenação e paginação ---
  const handleTabChange = (_: SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setApplied(newValue === 0 ? monthly : annual);
    setPage(0);
  };

  const applyFilter = (filter: FilterState) => {
    setApplied(filter);
    setPage(0);
  };

  const handleRequestSort = (property: string) => {
    const isAsc = orderBy === property && orderDirection === 'asc';
    setOrderDirection(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleChangeRowsPerPage = (event: ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // --- formulário de criar/editar ---
  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm());
    setFormOpen(true);
  };

  const openEdit = (item: TItem) => {
    setEditingId(item.id);
    setForm(config.toForm(item));
    setFormOpen(true);
  };

  const patchForm = (patch: Partial<LancamentoForm>) => setForm((previous) => ({ ...previous, ...patch }));

  const save = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const payload = config.toPayload(form);
      if (editingId) {
        await api.put(`${listUrl}/${editingId}`, payload);
        showSnackbar(config.messages.updated, 'success');
      } else {
        await api.post(listUrl, payload);
        showSnackbar(config.messages.created, 'success');
      }
      setFormOpen(false);
      void loadData();
    } catch (err: unknown) {
      console.error(err);
      showSnackbar(config.messages.saveError(getErrorMessage(err) || 'Desconhecido'), 'error');
    }
  };

  // --- exclusão com confirmação ---
  const confirmDelete = async () => {
    const id = deleteTargetId;
    if (!id) return;
    try {
      await api.delete(`${listUrl}/${id}`);
      void loadData();
      showSnackbar(config.messages.deleted, 'success');
    } catch (err: unknown) {
      console.error(err);
      showSnackbar(config.messages.deleteError(err), 'error');
    } finally {
      setDeleteTargetId(null);
    }
  };

  // --- histórico de auditoria ---
  const openAudit = async (item: TItem) => {
    setAuditTarget(item);
    setIsLoadingAudit(true);
    setAuditHistory([]);
    try {
      const res = await api.get(`${listUrl}/${item.id}/history`);
      setAuditHistory(res.data || []);
    } catch (err: unknown) {
      console.error(err);
      showSnackbar('Erro ao carregar histórico de auditoria', 'error');
    } finally {
      setIsLoadingAudit(false);
    }
  };

  // --- novo tipo, a partir do formulário ---
  const saveType = async (e: FormEvent) => {
    e.preventDefault();
    setTypeLoading(true);
    try {
      const res = await api.post<TType>(typesUrl, config.toTypePayload(newTypeName, typeExtras));
      setTypes((previous) => [...previous, res.data]);
      patchForm({ typeId: res.data.id });
      setTypeModalOpen(false);
      setNewTypeName('');
      setTypeExtras(config.typeExtrasDefault);
      showSnackbar(config.messages.typeCreated, 'success');
    } catch (err: unknown) {
      console.error(err);
      showSnackbar(`Erro: ${getErrorMessage(err) || 'Desconhecido'}`, 'error');
    } finally {
      setTypeLoading(false);
    }
  };

  return {
    items, types, loading, totalElements,
    page, setPage, rowsPerPage, orderBy, orderDirection,
    tabValue, monthly, setMonthly, annual, setAnnual,
    handleTabChange, applyFilter, handleRequestSort, handleChangeRowsPerPage, reload: loadData,
    formOpen, setFormOpen, editingId, form, patchForm, openNew, openEdit, save,
    deleteTargetId, setDeleteTargetId, confirmDelete,
    auditTarget, setAuditTarget, auditHistory, isLoadingAudit, openAudit,
    typeModalOpen, setTypeModalOpen, newTypeName, setNewTypeName, typeExtras, setTypeExtras, typeLoading, saveType,
    batchOpen, setBatchOpen,
  };
};

export type Lancamentos<TItem extends { id: string }, TType extends { id: string }, TExtras> = ReturnType<typeof useLancamentos<TItem, TType, TExtras>>;

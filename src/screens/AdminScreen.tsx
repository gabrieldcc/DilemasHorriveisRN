import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { ScreenContainer } from '../components/ScreenContainer';
import { ModoJogo, ModoJogoConteudo, Pergunta } from '../models/game';
import {
  adicionarPergunta,
  aprovarSugestaoPergunta,
  atualizarSugestaoPergunta,
  buscarPerguntasPorModo,
  buscarSugestoes,
  recusarSugestaoPergunta,
  removerPergunta,
  SugestaoPergunta,
  SugestaoStatus,
} from '../services/questionsService';
import { atualizarFeatureFlags } from '../services/featureFlagsService';
import { useAdminStore } from '../store/adminStore';
import { useFeatureFlagsStore } from '../store/featureFlagsStore';
import { CONTENT_GAME_MODES, getModoLabel } from '../utils/gameModes';

const SUGGESTION_FILTERS: Array<{ key: SugestaoStatus | 'todas'; label: string }> = [
  { key: 'pendente', label: 'Pendentes' },
  { key: 'todas', label: 'Todas' },
  { key: 'aprovada', label: 'Aprovadas' },
  { key: 'recusada', label: 'Recusadas' },
];

function formatDateLabel(value: number) {
  if (!value) {
    return '-';
  }
  return new Date(value).toLocaleDateString('pt-BR');
}

export function AdminScreen() {
  const router = useRouter();
  const isAdminUnlocked = useAdminStore((state) => state.isUnlocked);
  const lockAdmin = useAdminStore((state) => state.lock);
  const [titulo, setTitulo] = useState('');
  const [opcaoA, setOpcaoA] = useState('');
  const [opcaoB, setOpcaoB] = useState('');
  const [modo, setModo] = useState<ModoJogoConteudo>(ModoJogo.leve);
  const [items, setItems] = useState<Pergunta[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [suggestions, setSuggestions] = useState<SugestaoPergunta[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);
  const [suggestionFilter, setSuggestionFilter] = useState<SugestaoStatus | 'todas'>('pendente');
  const [editingSuggestionId, setEditingSuggestionId] = useState<string | null>(null);
  const [editTitulo, setEditTitulo] = useState('');
  const [editOpcaoA, setEditOpcaoA] = useState('');
  const [editOpcaoB, setEditOpcaoB] = useState('');
  const [editModo, setEditModo] = useState<ModoJogoConteudo>(ModoJogo.leve);
  const [moderationBusyId, setModerationBusyId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'perguntas' | 'sugestoes' | 'features'>('sugestoes');
  const featureFlags = useFeatureFlagsStore((state) => state.flags);
  const setFeatureFlagsLocal = useFeatureFlagsStore((state) => state.setFlagsLocal);
  const [featureToggleBusyKey, setFeatureToggleBusyKey] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdminUnlocked) {
      router.replace('/');
    }
  }, [isAdminUnlocked, router]);

  const loadPerguntas = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await buscarPerguntasPorModo(modo);
      setItems(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao buscar perguntas.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [modo]);

  const loadSuggestions = useCallback(async () => {
    setSuggestionsLoading(true);
    setSuggestionsError(null);
    try {
      const data = await buscarSugestoes(suggestionFilter === 'todas' ? undefined : suggestionFilter);
      setSuggestions(data);
    } catch (e) {
      setSuggestionsError(e instanceof Error ? e.message : 'Erro ao buscar sugestões.');
      setSuggestions([]);
    } finally {
      setSuggestionsLoading(false);
    }
  }, [suggestionFilter]);

  useEffect(() => {
    void loadPerguntas();
  }, [loadPerguntas]);

  useEffect(() => {
    void loadSuggestions();
  }, [loadSuggestions]);

  const handleSave = async () => {
    if (!titulo.trim() || !opcaoA.trim() || !opcaoB.trim()) {
      Alert.alert('Campos obrigatórios', 'Preencha título, opção A e opção B.');
      return;
    }

    setSaving(true);
    try {
      await adicionarPergunta({
        titulo: titulo.trim(),
        opcaoA: opcaoA.trim(),
        opcaoB: opcaoB.trim(),
        modo,
      });

      setTitulo('');
      setOpcaoA('');
      setOpcaoB('');
      await loadPerguntas();
    } catch (e) {
      Alert.alert('Erro ao salvar', e instanceof Error ? e.message : 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Remover pergunta', 'Tem certeza que deseja remover esta pergunta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          try {
            await removerPergunta(modo, id);
            await loadPerguntas();
          } catch (e) {
            Alert.alert('Erro', e instanceof Error ? e.message : 'Não foi possível remover.');
          }
        },
      },
    ]);
  };

  const beginEditSuggestion = (item: SugestaoPergunta) => {
    setEditingSuggestionId(item.id);
    setEditTitulo(item.titulo);
    setEditOpcaoA(item.opcaoA);
    setEditOpcaoB(item.opcaoB);
    setEditModo(item.modoSugerido);
  };

  const stopEditSuggestion = () => {
    setEditingSuggestionId(null);
    setEditTitulo('');
    setEditOpcaoA('');
    setEditOpcaoB('');
  };

  const handleSaveSuggestionEdit = async (id: string) => {
    setModerationBusyId(id);
    try {
      await atualizarSugestaoPergunta(id, {
        titulo: editTitulo,
        opcaoA: editOpcaoA,
        opcaoB: editOpcaoB,
        modoSugerido: editModo,
      });
      stopEditSuggestion();
      await loadSuggestions();
    } catch (error) {
      Alert.alert('Erro ao editar', error instanceof Error ? error.message : 'Não foi possível salvar edição.');
    } finally {
      setModerationBusyId(null);
    }
  };

  const handleApproveSuggestion = async (item: SugestaoPergunta) => {
    setModerationBusyId(item.id);
    try {
      await aprovarSugestaoPergunta(
        item.id,
        editingSuggestionId === item.id
          ? {
              titulo: editTitulo,
              opcaoA: editOpcaoA,
              opcaoB: editOpcaoB,
              modoSugerido: editModo,
            }
          : undefined
      );
      if (editingSuggestionId === item.id) {
        stopEditSuggestion();
      }
      await Promise.all([loadSuggestions(), loadPerguntas()]);
    } catch (error) {
      Alert.alert('Erro ao aprovar', error instanceof Error ? error.message : 'Não foi possível aprovar sugestão.');
    } finally {
      setModerationBusyId(null);
    }
  };

  const handleRejectSuggestion = async (item: SugestaoPergunta) => {
    setModerationBusyId(item.id);
    try {
      await recusarSugestaoPergunta(item.id);
      if (editingSuggestionId === item.id) {
        stopEditSuggestion();
      }
      await loadSuggestions();
    } catch (error) {
      Alert.alert('Erro ao recusar', error instanceof Error ? error.message : 'Não foi possível recusar sugestão.');
    } finally {
      setModerationBusyId(null);
    }
  };

  const suggestionSectionTitle = useMemo(() => {
    const selected = SUGGESTION_FILTERS.find((item) => item.key === suggestionFilter);
    return `Sugestões (${selected?.label ?? 'Todas'})`;
  }, [suggestionFilter]);

  if (!isAdminUnlocked) {
    return (
      <ScreenContainer>
        <View style={styles.lockedWrap}>
          <Text style={styles.lockedText}>Acesso admin bloqueado.</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Painel Admin</Text>
        <Text style={styles.subtitle}>Gerencie perguntas e modere sugestões</Text>
        <View style={styles.topTabsWrap}>
          <Pressable
            onPress={() => setActiveTab('sugestoes')}
            style={({ pressed }) => [
              styles.topTabButton,
              activeTab === 'sugestoes' && styles.topTabButtonActive,
              pressed && styles.modeButtonPressed,
            ]}
          >
            <Text style={[styles.topTabText, activeTab === 'sugestoes' && styles.topTabTextActive]}>Sugestões</Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab('perguntas')}
            style={({ pressed }) => [
              styles.topTabButton,
              activeTab === 'perguntas' && styles.topTabButtonActive,
              pressed && styles.modeButtonPressed,
            ]}
          >
            <Text style={[styles.topTabText, activeTab === 'perguntas' && styles.topTabTextActive]}>Perguntas</Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab('features')}
            style={({ pressed }) => [
              styles.topTabButton,
              activeTab === 'features' && styles.topTabButtonActive,
              pressed && styles.modeButtonPressed,
            ]}
          >
            <Text style={[styles.topTabText, activeTab === 'features' && styles.topTabTextActive]}>Flags</Text>
          </Pressable>
        </View>
        <Pressable
          onPress={() => {
            lockAdmin();
            router.replace('/');
          }}
          style={styles.logoutButton}
        >
          <Text style={styles.logoutText}>Sair do admin</Text>
        </Pressable>

        {activeTab === 'perguntas' ? (
          <>
            <Text style={styles.sectionTitle}>Modo</Text>
            <View style={styles.modeWrap}>
              {CONTENT_GAME_MODES.map((item) => (
                <Pressable
                  key={item.value}
                  onPress={() => setModo(item.value)}
                  style={({ pressed }) => [
                    styles.modeButton,
                    modo === item.value && styles.modeButtonSelected,
                    pressed && styles.modeButtonPressed,
                  ]}
                >
                  <Text style={[styles.modeText, modo === item.value && styles.modeTextSelected]}>{item.label}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Nova Pergunta</Text>
            <TextInput
              placeholder="Título"
              placeholderTextColor="#64748b"
              value={titulo}
              onChangeText={setTitulo}
              style={styles.input}
            />
            <TextInput
              placeholder="Opção A"
              placeholderTextColor="#64748b"
              value={opcaoA}
              onChangeText={setOpcaoA}
              style={styles.input}
            />
            <TextInput
              placeholder="Opção B"
              placeholderTextColor="#64748b"
              value={opcaoB}
              onChangeText={setOpcaoB}
              style={styles.input}
            />
            <Pressable
              style={({ pressed }) => [styles.saveButton, pressed && styles.saveButtonPressed, saving && styles.disabled]}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={styles.saveButtonText}>{saving ? 'Salvando...' : 'Salvar pergunta'}</Text>
            </Pressable>

            <Text style={styles.sectionTitle}>Perguntas de {getModoLabel(modo)}</Text>
            {loading ? <ActivityIndicator color="#22d3ee" style={styles.loadingIndicator} /> : null}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            {!loading && !error && items.length === 0 ? <Text style={styles.emptyText}>Nenhuma pergunta nesse modo.</Text> : null}
            {items.map((item) => (
              <View key={item.id} style={styles.itemCard}>
                <Text style={styles.itemTitle}>{item.titulo}</Text>
                <Text style={styles.itemOption}>A: {item.opcaoA}</Text>
                <Text style={styles.itemOption}>B: {item.opcaoB}</Text>
                <Pressable onPress={() => handleDelete(item.id)} style={styles.deleteButton}>
                  <Text style={styles.deleteText}>Remover</Text>
                </Pressable>
              </View>
            ))}
          </>
        ) : null}

        {activeTab === 'sugestoes' ? (
          <>
            <Text style={styles.sectionTitle}>{suggestionSectionTitle}</Text>
            <View style={styles.filterWrap}>
              {SUGGESTION_FILTERS.map((item) => (
                <Pressable
                  key={item.key}
                  onPress={() => setSuggestionFilter(item.key)}
                  style={({ pressed }) => [
                    styles.filterButton,
                    suggestionFilter === item.key && styles.filterButtonSelected,
                    pressed && styles.modeButtonPressed,
                  ]}
                >
                  <Text style={[styles.filterButtonText, suggestionFilter === item.key && styles.filterButtonTextSelected]}>
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            {suggestionsLoading ? <ActivityIndicator color="#22d3ee" style={styles.loadingIndicator} /> : null}
            {suggestionsError ? <Text style={styles.errorText}>{suggestionsError}</Text> : null}
            {!suggestionsLoading && !suggestionsError && suggestions.length === 0 ? (
              <Text style={styles.emptyText}>Nenhuma sugestão encontrada.</Text>
            ) : null}
          </>
        ) : null}

        {activeTab === 'sugestoes'
          ? suggestions.map((item) => {
          const isEditing = editingSuggestionId === item.id;
          const isBusy = moderationBusyId === item.id;
          const canModerate = item.status === 'pendente';

          return (
            <View key={item.id} style={styles.suggestionCard}>
              <View style={styles.suggestionTopRow}>
                <Text style={styles.suggestionAuthor}>{item.autorNome}</Text>
                <Text style={styles.suggestionMeta}>
                  {item.status.toUpperCase()} | {formatDateLabel(item.createdAtMs)}
                </Text>
              </View>

              {isEditing ? (
                <View>
                  <TextInput
                    style={styles.editInput}
                    value={editTitulo}
                    onChangeText={setEditTitulo}
                    placeholder="Título"
                    placeholderTextColor="#64748b"
                  />
                  <TextInput
                    style={[styles.editInput, styles.editInputMulti]}
                    value={editOpcaoA}
                    onChangeText={setEditOpcaoA}
                    placeholder="Opção A"
                    placeholderTextColor="#64748b"
                    multiline
                  />
                  <TextInput
                    style={[styles.editInput, styles.editInputMulti]}
                    value={editOpcaoB}
                    onChangeText={setEditOpcaoB}
                    placeholder="Opção B"
                    placeholderTextColor="#64748b"
                    multiline
                  />
                  <View style={styles.modeWrap}>
                    {CONTENT_GAME_MODES.map((modeItem) => (
                      <Pressable
                        key={modeItem.value}
                        onPress={() => setEditModo(modeItem.value)}
                        style={({ pressed }) => [
                          styles.modeButton,
                          editModo === modeItem.value && styles.modeButtonSelected,
                          pressed && styles.modeButtonPressed,
                        ]}
                      >
                        <Text style={[styles.modeText, editModo === modeItem.value && styles.modeTextSelected]}>
                          {modeItem.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : (
                <View>
                  <Text style={styles.itemTitle}>{item.titulo}</Text>
                  <Text style={styles.itemOption}>A: {item.opcaoA}</Text>
                  <Text style={styles.itemOption}>B: {item.opcaoB}</Text>
                  <Text style={styles.suggestionMode}>Modo: {getModoLabel(item.modoSugerido)}</Text>
                </View>
              )}

              <View style={styles.suggestionActions}>
                {isEditing ? (
                  <>
                    <Pressable
                      onPress={() => void handleSaveSuggestionEdit(item.id)}
                      disabled={isBusy}
                      style={({ pressed }) => [styles.actionPrimary, pressed && styles.modeButtonPressed, isBusy && styles.disabled]}
                    >
                      <Text style={styles.actionText}>{isBusy ? 'Salvando...' : 'Salvar edição'}</Text>
                    </Pressable>
                    <Pressable onPress={stopEditSuggestion} style={({ pressed }) => [styles.actionNeutral, pressed && styles.modeButtonPressed]}>
                      <Text style={styles.actionText}>Cancelar</Text>
                    </Pressable>
                  </>
                ) : (
                  <>
                    <Pressable onPress={() => beginEditSuggestion(item)} style={({ pressed }) => [styles.actionNeutral, pressed && styles.modeButtonPressed]}>
                      <Text style={styles.actionText}>Editar</Text>
                    </Pressable>
                    {canModerate ? (
                      <>
                        <Pressable
                          onPress={() => void handleApproveSuggestion(item)}
                          disabled={isBusy}
                          style={({ pressed }) => [styles.actionApprove, pressed && styles.modeButtonPressed, isBusy && styles.disabled]}
                        >
                          <Text style={styles.actionText}>{isBusy ? 'Processando...' : 'Aprovar'}</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => void handleRejectSuggestion(item)}
                          disabled={isBusy}
                          style={({ pressed }) => [styles.actionReject, pressed && styles.modeButtonPressed, isBusy && styles.disabled]}
                        >
                          <Text style={styles.actionText}>Recusar</Text>
                        </Pressable>
                      </>
                    ) : null}
                  </>
                )}
              </View>
            </View>
          );
            })
          : null}

        {activeTab === 'features' ? (
          <>
            <Text style={styles.sectionTitle}>Feature Flags</Text>
            <View style={styles.featureFlagCard}>
              <View style={styles.featureFlagHeader}>
                <View style={styles.featureFlagCopy}>
                  <Text style={styles.featureFlagTitle}>Comentários no jogo</Text>
                  <Text style={styles.featureFlagSubtitle}>Oculta ou exibe o botão de comentários no card.</Text>
                </View>
                <Switch
                  value={featureFlags.commentsEnabled}
                  onValueChange={(value) => {
                    if (featureToggleBusyKey) {
                      return;
                    }

                    const previous = featureFlags.commentsEnabled;
                    setFeatureFlagsLocal({ commentsEnabled: value });
                    setFeatureToggleBusyKey('commentsEnabled');

                    void atualizarFeatureFlags({ commentsEnabled: value })
                      .catch((error) => {
                        setFeatureFlagsLocal({ commentsEnabled: previous });
                        Alert.alert('Erro ao salvar flag', error instanceof Error ? error.message : 'Tente novamente.');
                      })
                      .finally(() => setFeatureToggleBusyKey(null));
                  }}
                  disabled={featureToggleBusyKey === 'commentsEnabled'}
                  trackColor={{ false: '#334155', true: '#0891b2' }}
                  thumbColor={featureFlags.commentsEnabled ? '#ecfeff' : '#cbd5e1'}
                />
              </View>
              <Text style={styles.featureFlagMeta}>
                Estado atual: {featureFlags.commentsEnabled ? 'Ativado' : 'Desativado'}
              </Text>
            </View>
          </>
        ) : null}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 24,
  },
  lockedWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedText: {
    color: '#fca5a5',
    fontSize: 16,
    fontWeight: '500',
  },
  title: {
    color: '#f8fafc',
    fontSize: 34,
    fontWeight: '500',
    marginTop: 8,
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 16,
    marginTop: 6,
    marginBottom: 10,
  },
  topTabsWrap: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  topTabButton: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  topTabButtonActive: {
    backgroundColor: '#0e7490',
    borderColor: '#22d3ee',
  },
  topTabText: {
    color: '#cbd5e1',
    fontWeight: '500',
    fontSize: 13,
  },
  topTabTextActive: {
    color: '#ecfeff',
  },
  logoutButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#7c2d12',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
  },
  logoutText: {
    color: '#ffedd5',
    fontWeight: '500',
    fontSize: 12,
  },
  sectionTitle: {
    color: '#cbd5e1',
    marginTop: 14,
    marginBottom: 8,
    fontWeight: '500',
    fontSize: 16,
  },
  modeWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modeButton: {
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#111827',
  },
  modeButtonSelected: {
    backgroundColor: '#0e7490',
    borderColor: '#22d3ee',
  },
  modeButtonPressed: {
    opacity: 0.85,
  },
  modeText: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '500',
  },
  modeTextSelected: {
    color: '#ecfeff',
  },
  input: {
    backgroundColor: '#111827',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    color: '#f8fafc',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#0891b2',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginTop: 2,
  },
  saveButtonPressed: {
    opacity: 0.9,
  },
  saveButtonText: {
    color: '#ecfeff',
    textAlign: 'center',
    fontWeight: '500',
    fontSize: 16,
  },
  disabled: {
    opacity: 0.6,
  },
  loadingIndicator: {
    marginTop: 8,
    marginBottom: 10,
  },
  errorText: {
    color: '#fca5a5',
    marginTop: 8,
    marginBottom: 10,
  },
  emptyText: {
    color: '#94a3b8',
    marginTop: 8,
    marginBottom: 10,
  },
  itemCard: {
    backgroundColor: '#111827',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1f2937',
    padding: 14,
    marginTop: 10,
  },
  itemTitle: {
    color: '#f8fafc',
    fontWeight: '500',
    fontSize: 17,
    marginBottom: 6,
  },
  itemOption: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  deleteButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#7f1d1d',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  deleteText: {
    color: '#fee2e2',
    fontWeight: '500',
    fontSize: 12,
  },
  filterWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  filterButton: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterButtonSelected: {
    borderColor: '#67e8f9',
    backgroundColor: '#123445',
  },
  filterButtonText: {
    color: '#cbd5e1',
    fontWeight: '500',
    fontSize: 12,
  },
  filterButtonTextSelected: {
    color: '#ecfeff',
  },
  suggestionCard: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1f2937',
    padding: 12,
    marginTop: 10,
  },
  suggestionTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  suggestionAuthor: {
    color: '#93c5fd',
    fontSize: 12,
    fontWeight: '500',
  },
  suggestionMeta: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '500',
  },
  suggestionMode: {
    color: '#67e8f9',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  editInput: {
    backgroundColor: '#111827',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    color: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    fontSize: 14,
  },
  editInputMulti: {
    minHeight: 64,
    textAlignVertical: 'top',
  },
  suggestionActions: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionNeutral: {
    backgroundColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  actionPrimary: {
    backgroundColor: '#0369a1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  actionApprove: {
    backgroundColor: '#166534',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  actionReject: {
    backgroundColor: '#9f1239',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  actionText: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '500',
  },
  featureFlagCard: {
    marginTop: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1f2937',
    backgroundColor: '#0f172a',
    padding: 12,
  },
  featureFlagHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  featureFlagCopy: {
    flex: 1,
  },
  featureFlagTitle: {
    color: '#e2e8f0',
    fontSize: 15,
    fontWeight: '500',
  },
  featureFlagSubtitle: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 4,
    lineHeight: 17,
  },
  featureFlagMeta: {
    color: '#67e8f9',
    marginTop: 10,
    fontSize: 12,
    fontWeight: '500',
  },
});

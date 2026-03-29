import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { ScreenContainer } from '../components/ScreenContainer';
import { FeatureFlags } from '../models/featureFlags';
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
import { getAppLanguage, getLanguageOverride, setLanguageOverride, SupportedAppLanguage } from '../services/languageService';
import { useAdminStore } from '../store/adminStore';
import { useFeatureFlagsStore } from '../store/featureFlagsStore';
import { CONTENT_GAME_MODES, getModoLabel } from '../utils/gameModes';
import { getLocaleTag, t } from '../i18n';

const SUGGESTION_FILTERS: Array<{ key: SugestaoStatus | 'todas'; label: string }> = [
  { key: 'pendente', label: t('admin.filter.pending') },
  { key: 'todas', label: t('admin.filter.all') },
  { key: 'aprovada', label: t('admin.filter.approved') },
  { key: 'recusada', label: t('admin.filter.rejected') },
];

function formatDateLabel(value: number) {
  if (!value) {
    return '-';
  }
  return new Date(value).toLocaleDateString(getLocaleTag());
}

function getSuggestionStatusLabel(status: SugestaoStatus): string {
  if (status === 'pendente') {
    return t('admin.filter.pending');
  }
  if (status === 'aprovada') {
    return t('admin.filter.approved');
  }
  return t('admin.filter.rejected');
}

const FEATURE_FLAG_CONTROLS: Array<{
  key: keyof FeatureFlags;
  title: string;
  subtitle: string;
}> = [
  {
    key: 'commentsEnabled',
    title: t('admin.commentsFlagTitle'),
    subtitle: t('admin.commentsFlagSubtitle'),
  },
  {
    key: 'suggestButtonEnabled',
    title: 'Botao sugerir dilemas',
    subtitle: 'Mostra ou esconde o botao de enviar novos dilemas na tela inicial.',
  },
  {
    key: 'modeLeveEnabled',
    title: 'Modo Leve',
    subtitle: 'Controla a exibicao do botao do modo Leve.',
  },
  {
    key: 'modePesadoEnabled',
    title: 'Modo Pesado',
    subtitle: 'Controla a exibicao do botao do modo Pesado.',
  },
  {
    key: 'modeNerdEnabled',
    title: 'Modo Nerd',
    subtitle: 'Controla a exibicao do botao do modo Nerd.',
  },
  {
    key: 'modeCulturaBREnabled',
    title: 'Modo Cultura BR',
    subtitle: 'Controla a exibicao do botao do modo Cultura BR.',
  },
  {
    key: 'modeAdultosEnabled',
    title: 'Modo Adultos',
    subtitle: 'Controla a exibicao do botao do modo Adultos.',
  },
  {
    key: 'modeFavoritasEnabled',
    title: 'Modo Favoritas',
    subtitle: 'Controla a exibicao do botao do modo Favoritas.',
  },
  {
    key: 'modeComunidadeEnabled',
    title: 'Modo Comunidade',
    subtitle: 'Controla a exibicao do botao do modo Comunidade.',
  },
];

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
  const [languageOverride, setLanguageOverrideState] = useState<SupportedAppLanguage | null>(getLanguageOverride());
  const [languageBusy, setLanguageBusy] = useState(false);

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
      setError(e instanceof Error ? e.message : t('admin.fetchQuestionsError'));
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
      setSuggestionsError(e instanceof Error ? e.message : t('admin.fetchSuggestionsError'));
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
      Alert.alert(t('admin.requiredTitle'), t('admin.requiredBody'));
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
      Alert.alert(t('admin.saveErrorTitle'), e instanceof Error ? e.message : t('admin.saveErrorBody'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert(t('admin.removeQuestionTitle'), t('admin.removeQuestionBody'), [
      { text: t('modeSelection.cancel'), style: 'cancel' },
      {
        text: t('admin.remove'),
        style: 'destructive',
        onPress: async () => {
          try {
            await removerPergunta(modo, id);
            await loadPerguntas();
          } catch (e) {
            Alert.alert(t('admin.errorTitle'), e instanceof Error ? e.message : t('admin.removeErrorBody'));
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
      Alert.alert(t('admin.editErrorTitle'), error instanceof Error ? error.message : t('admin.editErrorBody'));
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
      Alert.alert(t('admin.approveErrorTitle'), error instanceof Error ? error.message : t('admin.approveErrorBody'));
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
      Alert.alert(t('admin.rejectErrorTitle'), error instanceof Error ? error.message : t('admin.rejectErrorBody'));
    } finally {
      setModerationBusyId(null);
    }
  };

  const suggestionSectionTitle = useMemo(() => {
    const selected = SUGGESTION_FILTERS.find((item) => item.key === suggestionFilter);
    return t('admin.suggestionsTitle', { filter: selected?.label ?? t('admin.filter.all') });
  }, [suggestionFilter]);

  const currentLanguageStateLabel = useMemo(() => {
    const value = languageOverride ?? getAppLanguage();
    if (value === 'pt') {
      return 'Português';
    }
    if (value === 'es') {
      return 'Español';
    }
    return 'English';
  }, [languageOverride]);

  const handleChangeLanguage = async (language: SupportedAppLanguage | null) => {
    setLanguageBusy(true);
    try {
      await setLanguageOverride(language);
      setLanguageOverrideState(language);
    } catch (error) {
      Alert.alert(t('admin.errorTitle'), error instanceof Error ? error.message : 'Could not change language.');
    } finally {
      setLanguageBusy(false);
    }
  };

  const handleToggleFeatureFlag = (key: keyof FeatureFlags, value: boolean) => {
    if (featureToggleBusyKey) {
      return;
    }

    const previous = featureFlags[key];
    setFeatureFlagsLocal({ [key]: value });
    setFeatureToggleBusyKey(key);

    void atualizarFeatureFlags({ [key]: value })
      .catch((error) => {
        setFeatureFlagsLocal({ [key]: previous });
        Alert.alert(t('admin.flagSaveErrorTitle'), error instanceof Error ? error.message : t('admin.flagSaveErrorBody'));
      })
      .finally(() => setFeatureToggleBusyKey(null));
  };

  if (!isAdminUnlocked) {
    return (
      <ScreenContainer>
        <View style={styles.lockedWrap}>
          <Text style={styles.lockedText}>{t('admin.locked')}</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{t('admin.title')}</Text>
        <Text style={styles.subtitle}>{t('admin.subtitle')}</Text>
        <View style={styles.topTabsWrap}>
          <Pressable
            onPress={() => setActiveTab('sugestoes')}
            style={({ pressed }) => [
              styles.topTabButton,
              activeTab === 'sugestoes' && styles.topTabButtonActive,
              pressed && styles.modeButtonPressed,
            ]}
          >
            <Text style={[styles.topTabText, activeTab === 'sugestoes' && styles.topTabTextActive]}>{t('admin.tab.suggestions')}</Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab('perguntas')}
            style={({ pressed }) => [
              styles.topTabButton,
              activeTab === 'perguntas' && styles.topTabButtonActive,
              pressed && styles.modeButtonPressed,
            ]}
          >
            <Text style={[styles.topTabText, activeTab === 'perguntas' && styles.topTabTextActive]}>{t('admin.tab.questions')}</Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab('features')}
            style={({ pressed }) => [
              styles.topTabButton,
              activeTab === 'features' && styles.topTabButtonActive,
              pressed && styles.modeButtonPressed,
            ]}
          >
            <Text style={[styles.topTabText, activeTab === 'features' && styles.topTabTextActive]}>{t('admin.tab.flags')}</Text>
          </Pressable>
        </View>
        <Pressable
          onPress={() => {
            lockAdmin();
            router.replace('/');
          }}
          style={styles.logoutButton}
        >
          <Text style={styles.logoutText}>{t('admin.logout')}</Text>
        </Pressable>

        {activeTab === 'perguntas' ? (
          <>
            <Text style={styles.sectionTitle}>{t('admin.section.mode')}</Text>
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
                  <Text style={[styles.modeText, modo === item.value && styles.modeTextSelected]}>{getModoLabel(item.value)}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.sectionTitle}>{t('admin.section.newQuestion')}</Text>
            <TextInput
              placeholder={t('admin.titlePlaceholder')}
              placeholderTextColor="#64748b"
              value={titulo}
              onChangeText={setTitulo}
              style={styles.input}
            />
            <TextInput
              placeholder={t('admin.optionAPlaceholder')}
              placeholderTextColor="#64748b"
              value={opcaoA}
              onChangeText={setOpcaoA}
              style={styles.input}
            />
            <TextInput
              placeholder={t('admin.optionBPlaceholder')}
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
              <Text style={styles.saveButtonText}>{saving ? t('admin.saving') : t('admin.saveQuestion')}</Text>
            </Pressable>

            <Text style={styles.sectionTitle}>{t('admin.questionsOfMode', { mode: getModoLabel(modo) })}</Text>
            {loading ? <ActivityIndicator color="#22d3ee" style={styles.loadingIndicator} /> : null}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            {!loading && !error && items.length === 0 ? <Text style={styles.emptyText}>{t('admin.emptyQuestions')}</Text> : null}
            {items.map((item) => (
              <View key={item.id} style={styles.itemCard}>
                <Text style={styles.itemTitle}>{item.titulo}</Text>
                <Text style={styles.itemOption}>{t('game.optionA')}: {item.opcaoA}</Text>
                <Text style={styles.itemOption}>{t('game.optionB')}: {item.opcaoB}</Text>
                <Pressable onPress={() => handleDelete(item.id)} style={styles.deleteButton}>
                  <Text style={styles.deleteText}>{t('admin.remove')}</Text>
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
              <Text style={styles.emptyText}>{t('admin.emptySuggestions')}</Text>
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
                  {getSuggestionStatusLabel(item.status).toUpperCase()} | {formatDateLabel(item.createdAtMs)}
                </Text>
              </View>

              {isEditing ? (
                <View>
                  <TextInput
                    style={styles.editInput}
                    value={editTitulo}
                    onChangeText={setEditTitulo}
                    placeholder={t('admin.titlePlaceholder')}
                    placeholderTextColor="#64748b"
                  />
                  <TextInput
                    style={[styles.editInput, styles.editInputMulti]}
                    value={editOpcaoA}
                    onChangeText={setEditOpcaoA}
                    placeholder={t('admin.optionAPlaceholder')}
                    placeholderTextColor="#64748b"
                    multiline
                  />
                  <TextInput
                    style={[styles.editInput, styles.editInputMulti]}
                    value={editOpcaoB}
                    onChangeText={setEditOpcaoB}
                    placeholder={t('admin.optionBPlaceholder')}
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
                          {getModoLabel(modeItem.value)}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : (
                <View>
                  <Text style={styles.itemTitle}>{item.titulo}</Text>
                  <Text style={styles.itemOption}>{t('game.optionA')}: {item.opcaoA}</Text>
                  <Text style={styles.itemOption}>{t('game.optionB')}: {item.opcaoB}</Text>
                  <Text style={styles.suggestionMode}>{t('admin.modeLabel', { mode: getModoLabel(item.modoSugerido) })}</Text>
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
                      <Text style={styles.actionText}>{isBusy ? t('admin.saving') : t('admin.saveEdit')}</Text>
                    </Pressable>
                    <Pressable onPress={stopEditSuggestion} style={({ pressed }) => [styles.actionNeutral, pressed && styles.modeButtonPressed]}>
                      <Text style={styles.actionText}>{t('modeSelection.cancel')}</Text>
                    </Pressable>
                  </>
                ) : (
                  <>
                    <Pressable onPress={() => beginEditSuggestion(item)} style={({ pressed }) => [styles.actionNeutral, pressed && styles.modeButtonPressed]}>
                      <Text style={styles.actionText}>{t('admin.edit')}</Text>
                    </Pressable>
                    {canModerate ? (
                      <>
                        <Pressable
                          onPress={() => void handleApproveSuggestion(item)}
                          disabled={isBusy}
                          style={({ pressed }) => [styles.actionApprove, pressed && styles.modeButtonPressed, isBusy && styles.disabled]}
                        >
                          <Text style={styles.actionText}>{isBusy ? t('admin.processing') : t('admin.approve')}</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => void handleRejectSuggestion(item)}
                          disabled={isBusy}
                          style={({ pressed }) => [styles.actionReject, pressed && styles.modeButtonPressed, isBusy && styles.disabled]}
                        >
                          <Text style={styles.actionText}>{t('admin.reject')}</Text>
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
            <Text style={styles.sectionTitle}>{t('admin.section.flags')}</Text>
            <View style={styles.featureFlagCard}>
              <View style={styles.featureFlagCopy}>
                <Text style={styles.featureFlagTitle}>Idioma de teste</Text>
                <Text style={styles.featureFlagSubtitle}>Force um idioma para testes no app. Use Automático para voltar ao idioma do dispositivo.</Text>
              </View>
              <View style={styles.filterWrap}>
                {[
                  { key: null, label: 'Automático' },
                  { key: 'pt' as const, label: 'Português' },
                  { key: 'en' as const, label: 'English' },
                  { key: 'es' as const, label: 'Español' },
                ].map((item) => {
                  const selected = languageOverride === item.key;
                  return (
                    <Pressable
                      key={item.label}
                      onPress={() => void handleChangeLanguage(item.key)}
                      disabled={languageBusy}
                      style={({ pressed }) => [
                        styles.filterButton,
                        selected && styles.filterButtonSelected,
                        pressed && styles.modeButtonPressed,
                        languageBusy && styles.disabled,
                      ]}
                    >
                      <Text style={[styles.filterButtonText, selected && styles.filterButtonTextSelected]}>{item.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={styles.featureFlagMeta}>
                {`Idioma atual: ${currentLanguageStateLabel}${languageOverride ? ' (forçado)' : ' (automático)'}`}
              </Text>
            </View>
            <View style={styles.featureFlagCard}>
              {FEATURE_FLAG_CONTROLS.map((item) => {
                const value = featureFlags[item.key];
                const isBusy = featureToggleBusyKey === item.key;

                return (
                  <View key={item.key} style={styles.featureFlagItem}>
                    <View style={styles.featureFlagHeader}>
                      <View style={styles.featureFlagCopy}>
                        <Text style={styles.featureFlagTitle}>{item.title}</Text>
                        <Text style={styles.featureFlagSubtitle}>{item.subtitle}</Text>
                      </View>
                      <Switch
                        value={value}
                        onValueChange={(nextValue) => handleToggleFeatureFlag(item.key, nextValue)}
                        disabled={isBusy}
                        trackColor={{ false: '#334155', true: '#0891b2' }}
                        thumbColor={value ? '#ecfeff' : '#cbd5e1'}
                      />
                    </View>
                    <Text style={styles.featureFlagMeta}>
                      {t('admin.currentState', { state: value ? t('admin.enabled') : t('admin.disabled') })}
                    </Text>
                  </View>
                );
              })}
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
  featureFlagItem: {
    gap: 6,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
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

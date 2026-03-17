import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { ScreenContainer } from '../components/ScreenContainer';
import { getEnabledGameModes } from '../config/remoteConfig';
import { ModoJogoConteudo } from '../models/game';
import { useAppTranslation } from '../i18n';
import { enviarSugestaoPergunta } from '../services/questionsService';
import { getContentModeIds, getModoLabel } from '../utils/gameModes';

export function SuggestionScreen() {
  const router = useRouter();
  const { t } = useAppTranslation();
  const contentModes = getEnabledGameModes().filter((mode) => getContentModeIds().includes(mode.id));
  const [titulo, setTitulo] = useState(t('suggestion.questionPlaceholder'));
  const [opcaoA, setOpcaoA] = useState('');
  const [opcaoB, setOpcaoB] = useState('');
  const [modoSugerido, setModoSugerido] = useState<ModoJogoConteudo>(contentModes[0]?.id ?? 'leve');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (sending) {
      return;
    }

    setSending(true);
    try {
      await enviarSugestaoPergunta({
        titulo: titulo.trim(),
        opcaoA: opcaoA.trim(),
        opcaoB: opcaoB.trim(),
        modoSugerido,
      });

      setTitulo(t('suggestion.questionPlaceholder'));
      setOpcaoA('');
      setOpcaoB('');
      Alert.alert(t('suggestion.successTitle'), t('suggestion.successBody'));
    } catch (error) {
      Alert.alert(t('suggestion.errorTitle'), error instanceof Error ? error.message : t('suggestion.errorBody'));
    } finally {
      setSending(false);
    }
  };

  return (
    <ScreenContainer>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{t('suggestion.title')}</Text>
        <Text style={styles.subtitle}>{t('suggestion.subtitle')}</Text>

        <Text style={styles.label}>{t('suggestion.modeLabel')}</Text>
        <View style={styles.modeWrap}>
          {contentModes.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => setModoSugerido(item.id)}
              style={({ pressed }) => [
                styles.modeButton,
                modoSugerido === item.id && styles.modeButtonSelected,
                pressed && styles.modeButtonPressed,
              ]}
            >
              <Text style={[styles.modeText, modoSugerido === item.id && styles.modeTextSelected]}>
                {getModoLabel(item.id)}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>{t('suggestion.questionLabel')}</Text>
        <TextInput
          style={styles.input}
          value={titulo}
          onChangeText={setTitulo}
          placeholder={t('suggestion.questionPlaceholder')}
          placeholderTextColor="#64748b"
        />

        <Text style={styles.label}>{t('suggestion.optionALabel')}</Text>
        <TextInput
          style={[styles.input, styles.multilineInput]}
          value={opcaoA}
          onChangeText={setOpcaoA}
          placeholder={t('suggestion.optionAPlaceholder')}
          placeholderTextColor="#64748b"
          multiline
        />

        <Text style={styles.label}>{t('suggestion.optionBLabel')}</Text>
        <TextInput
          style={[styles.input, styles.multilineInput]}
          value={opcaoB}
          onChangeText={setOpcaoB}
          placeholder={t('suggestion.optionBPlaceholder')}
          placeholderTextColor="#64748b"
          multiline
        />

        <Pressable
          onPress={() => void handleSend()}
          disabled={sending}
          style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed, sending && styles.disabled]}
        >
          <Text style={styles.primaryButtonText}>{sending ? t('suggestion.sending') : t('suggestion.send')}</Text>
        </Pressable>

        <Pressable onPress={() => router.back()} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>{t('common.back')}</Text>
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 28,
  },
  title: {
    color: '#f8fafc',
    fontSize: 30,
    fontWeight: '500',
    marginTop: 6,
  },
  subtitle: {
    color: '#94a3b8',
    marginTop: 8,
    marginBottom: 14,
    fontSize: 15,
    lineHeight: 21,
  },
  label: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
    marginTop: 8,
  },
  modeWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
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
    opacity: 0.9,
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
    fontSize: 16,
  },
  multilineInput: {
    minHeight: 82,
    textAlignVertical: 'top',
  },
  primaryButton: {
    marginTop: 16,
    backgroundColor: '#0891b2',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonPressed: {
    opacity: 0.9,
  },
  primaryButtonText: {
    color: '#ecfeff',
    fontWeight: '500',
    fontSize: 16,
  },
  secondaryButton: {
    marginTop: 10,
    backgroundColor: '#1f2937',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#f8fafc',
    fontWeight: '500',
  },
  disabled: {
    opacity: 0.65,
  },
});

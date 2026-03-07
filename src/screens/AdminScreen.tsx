import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ScreenContainer } from '../components/ScreenContainer';
import { ModoJogo, Pergunta } from '../models/game';
import { adicionarPergunta, buscarPerguntasPorModo, removerPergunta } from '../services/questionsService';
import { useAdminStore } from '../store/adminStore';
import { GAME_MODES, getModoLabel } from '../utils/gameModes';

export function AdminScreen() {
  const router = useRouter();
  const isAdminUnlocked = useAdminStore((state) => state.isUnlocked);
  const lockAdmin = useAdminStore((state) => state.lock);
  const [titulo, setTitulo] = useState('');
  const [opcaoA, setOpcaoA] = useState('');
  const [opcaoB, setOpcaoB] = useState('');
  const [modo, setModo] = useState<ModoJogo>(ModoJogo.leve);
  const [items, setItems] = useState<Pergunta[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdminUnlocked) {
      router.replace('/');
    }
  }, [isAdminUnlocked, router]);

  const load = useCallback(async () => {
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

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    if (!titulo.trim() || !opcaoA.trim() || !opcaoB.trim()) {
      Alert.alert('Campos obrigatorios', 'Preencha titulo, opcao A e opcao B.');
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
      await load();
    } catch (e) {
      Alert.alert('Erro ao salvar', e instanceof Error ? e.message : 'Nao foi possivel salvar.');
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
            await load();
          } catch (e) {
            Alert.alert('Erro', e instanceof Error ? e.message : 'Nao foi possivel remover.');
          }
        },
      },
    ]);
  };

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
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View>
            <Text style={styles.title}>Painel Admin</Text>
            <Text style={styles.subtitle}>Gerencie perguntas por modo</Text>
            <Pressable
              onPress={() => {
                lockAdmin();
                router.replace('/');
              }}
              style={styles.logoutButton}
            >
              <Text style={styles.logoutText}>Sair do admin</Text>
            </Pressable>

            <Text style={styles.sectionTitle}>Modo</Text>
            <View style={styles.modeWrap}>
              {GAME_MODES.map((item) => (
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
              placeholder="Titulo"
              placeholderTextColor="#64748b"
              value={titulo}
              onChangeText={setTitulo}
              style={styles.input}
            />
            <TextInput
              placeholder="Opcao A"
              placeholderTextColor="#64748b"
              value={opcaoA}
              onChangeText={setOpcaoA}
              style={styles.input}
            />
            <TextInput
              placeholder="Opcao B"
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
            {loading ? <ActivityIndicator color="#22d3ee" style={{ marginTop: 8, marginBottom: 10 }} /> : null}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            {!loading && !error && items.length === 0 ? (
              <Text style={styles.emptyText}>Nenhuma pergunta cadastrada neste modo.</Text>
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.itemCard}>
            <Text style={styles.itemTitle}>{item.titulo}</Text>
            <Text style={styles.itemOption}>A: {item.opcaoA}</Text>
            <Text style={styles.itemOption}>B: {item.opcaoB}</Text>
            <Pressable onPress={() => handleDelete(item.id)} style={styles.deleteButton}>
              <Text style={styles.deleteText}>Remover</Text>
            </Pressable>
          </View>
        )}
        contentContainerStyle={styles.content}
      />
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
    fontWeight: '600',
  },
  title: {
    color: '#f8fafc',
    fontSize: 34,
    fontWeight: '800',
    marginTop: 8,
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 16,
    marginTop: 6,
    marginBottom: 8,
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
    fontWeight: '700',
    fontSize: 12,
  },
  sectionTitle: {
    color: '#cbd5e1',
    marginTop: 14,
    marginBottom: 8,
    fontWeight: '700',
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
    fontWeight: '700',
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
    fontWeight: '800',
    fontSize: 16,
  },
  disabled: {
    opacity: 0.6,
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
    fontWeight: '700',
    fontSize: 17,
    marginBottom: 6,
  },
  itemOption: {
    color: '#cbd5e1',
    fontSize: 14,
    marginBottom: 2,
  },
  deleteButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
    backgroundColor: '#7f1d1d',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  deleteText: {
    color: '#fee2e2',
    fontWeight: '700',
    fontSize: 12,
  },
});

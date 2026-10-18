import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { View, ActivityIndicator, BackHandler, AppState } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { carregar, salvar, visiveis, pendentes } from './src/db';
import { sincronizar, contarConflitos } from './src/sync';
import { cores } from './src/ui';
import { ListaTalhoes, FormTalhao, DetalheTalhao, FormColheita, Relatorio, Config } from './src/telas';
import { ListaProdutores, FormProdutor } from './src/produtores';

const TELAS = {
  produtores: ListaProdutores,
  formProdutor: FormProdutor,
  inicio: ListaTalhoes,
  formTalhao: FormTalhao,
  talhao: DetalheTalhao,
  formColheita: FormColheita,
  relatorio: Relatorio,
  config: Config,
};

export default function App() {
  const [dados, setDados] = useState(null);
  const [pilha, setPilha] = useState([{ tela: 'inicio' }]);
  const carregado = useRef(false);

  useEffect(() => {
    carregar().then((d) => {
      setDados(d);
      carregado.current = true;
    });
  }, []);

  // Grava no celular sempre que algo mudar
  useEffect(() => {
    if (carregado.current && dados) salvar(dados);
  }, [dados]);

  // ---------- Sincronização (online/offline) ----------
  const [sync, setSync] = useState({ estado: 'desligado', msg: '' });
  const dadosRef = useRef(null);
  dadosRef.current = dados;
  const rodando = useRef(false);

  const sincronizarAgora = useCallback(async () => {
    const d = dadosRef.current;
    if (!d || rodando.current) return;
    if (!d.config.servidor || !d.config.token) {
      setSync({ estado: 'desligado', msg: 'Servidor não configurado' });
      return;
    }
    rodando.current = true;
    setSync((s) => ({ ...s, estado: 'enviando', msg: 'Sincronizando…' }));
    try {
      const aplicar = await sincronizar(d);
      setDados((atual) => aplicar(atual));
      setSync({ estado: 'ok', msg: 'Sincronizado', quando: new Date() });
    } catch (e) {
      if (e.desligado) setSync({ estado: 'desligado', msg: 'Servidor não configurado' });
      else if (e.offline) setSync((s) => ({ ...s, estado: 'offline', msg: 'Sem internet — dados salvos no celular' }));
      else setSync({ estado: 'erro', msg: e.message, login: !!e.login });
    } finally {
      rodando.current = false;
    }
  }, []);

  // Ao abrir o app e depois a cada 1 minuto
  useEffect(() => {
    if (!dados) return undefined;
    sincronizarAgora();
    const t = setInterval(sincronizarAgora, 60000);
    return () => clearInterval(t);
  }, [!!dados, dados?.config?.token, sincronizarAgora]);

  // Alguns segundos depois de cada alteração
  const qtdPendentes = dados ? pendentes(dados) + (dados.config.parametrosPendentes ? 1 : 0) : 0;
  useEffect(() => {
    if (!qtdPendentes) return undefined;
    const t = setTimeout(sincronizarAgora, 4000);
    return () => clearTimeout(t);
  }, [dados, qtdPendentes, sincronizarAgora]);

  // Quando o app volta para a tela
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') sincronizarAgora();
    });
    return () => sub.remove();
  }, [sincronizarAgora]);

  const infoSync = useMemo(
    () => ({ ...sync, pendentes: qtdPendentes, conflitos: dados ? contarConflitos(dados) : 0, sincronizarAgora }),
    [sync, qtdPendentes, dados, sincronizarAgora]
  );

  // As telas só enxergam registros não excluídos
  const vistos = useMemo(() => (dados ? visiveis(dados) : null), [dados]);

  const ir = useCallback((tela, params) => setPilha((p) => [...p, { tela, params }]), []);
  const voltar = useCallback(() => setPilha((p) => (p.length > 1 ? p.slice(0, -1) : p)), []);

  // Botão "voltar" do Android
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (pilha.length > 1) {
        voltar();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [pilha, voltar]);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: cores.cafe }} edges={['top']}>
        <StatusBar style="light" />
        <View style={{ flex: 1, backgroundColor: cores.fundo }}>
          {!dados ? (
            <ActivityIndicator style={{ marginTop: 60 }} color={cores.cafe} />
          ) : (
            // Mantém as telas anteriores montadas (escondidas) para não perder o que foi digitado
            pilha.map((item, i) => {
              const T = TELAS[item.tela];
              const topo = i === pilha.length - 1;
              return (
                <View key={i + item.tela} style={{ flex: 1, display: topo ? 'flex' : 'none' }}>
                  <T dados={vistos} setDados={setDados} ir={ir} voltar={voltar} params={item.params} sync={infoSync} />
                </View>
              );
            })
          )}
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

# Café Talhões — app de produção por talhão

App em React Native (Expo) para iPhone e Android. Funciona **online e offline**: grava sempre no celular primeiro e sincroniza com o servidor Django (pasta `servidor/`) quando há internet — ao abrir o app, a cada minuto e logo depois de cada lançamento. A faixa no topo da tela inicial mostra se está sincronizado, offline com pendências ou com conflito.

Para ligar o servidor, veja `servidor/LEIA-ME.md` e depois preencha **Parâmetros → Servidor** no celular.

## Cadastros

**Produtor (proprietário)**
- Código, nome, produção média (ex.: 20,2), telefone, cidade, local, fazenda
- Divisão da produção: % do proprietário + 1 a 5 meeiros (código, nome, %). A soma precisa fechar 100%.

**Talhão**
- Código (número, sequencial automático), nome, produtor, local, fazenda
- Latitude e longitude: digitadas ou pelo botão "Usar minha localização atual" (GPS); abre no mapa
- Total de hectares, variedade, ano de plantio, espaçamento, nº de pés, observações

**Produção do talhão**
- Código da produção (sequencial automático), data e hora
- Quantidade em sacas de café maduro, ou em litros com conversão automática para sacas (litros por saca em Parâmetros; padrão 60 L)
- Transporte (placa do caminhão, trator…), com atalho para os já usados
- Código da pesagem na chegada do secador
- Quem participa da produção (proprietário e/ou meeiros). A produção é dividida entre os marcados, na proporção do % de cada um.

## Relatórios
- Total e sc/ha por talhão e por safra
- Quanto cada proprietário e meeiro produziu na safra

## Como rodar no seu computador

Precisa do Node.js instalado (versão 20 ou mais nova).

```bash
# 1. Criar o projeto Expo
npx create-expo-app@latest cafe-talhoes --template blank
cd cafe-talhoes

# 2. Instalar as bibliotecas que o app usa
npx expo install @react-native-async-storage/async-storage react-native-safe-area-context expo-location

# 3. Copiar para dentro da pasta cafe-talhoes os arquivos deste pacote:
#    App.js (substitui o que veio) e a pasta src/

# 4. Rodar
npx expo start
```

Instale o **Expo Go** no celular e leia o QR code que aparece no terminal.

### Permissão de GPS (para publicar nas lojas)

No `app.json` do projeto, dentro de `"expo"`, acrescente:

```json
"plugins": [
  ["expo-location", {
    "locationWhenInUsePermission": "O app usa sua localização para marcar onde fica cada talhão."
  }]
]
```

## Publicar nas lojas (depois)

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform android
eas build --platform ios
eas submit
```

Precisa de conta de desenvolvedor Google Play (taxa única) e Apple Developer (anual).

## Estrutura
- `App.js` — navegação e gravação automática
- `src/db.js` — armazenamento, conversões, divisão entre proprietário e meeiros
- `src/ui.js` — componentes visuais e cores
- `src/telas.js` — talhões, produção, relatório, parâmetros
- `src/produtores.js` — cadastro de produtores e meeiros
- `src/sync.js` — envio e recebimento com o servidor
- `servidor/` — API Django/PostgreSQL de sincronização e painel admin

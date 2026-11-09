# Corridas e recursos do aparelho

Em **Minhas Rotas**, cadastre início e chegada e gere um mapa. Use **Iniciar rota** no cartão ou **Corridas → Adicionar Corrida**. Na tela de acompanhamento, informe o peso e inicie a corrida. GPS e movimento só são acompanhados durante a sessão; finalizar ou sair encerra os listeners.

O GPS registra o percurso real em verde sobre a rota planejada em azul. Posições com precisão pior que 40 m, pequenas oscilações e saltos acima de 12 m/s são ignorados. Tempo e distância são reais; passos são uma aproximação a partir dos picos do acelerômetro, sem certificação de pedômetro. Calorias são uma estimativa de `peso em kg × distância em km`, seguindo a aproximação de custo energético de corrida de 1 kcal/kg/km ([referência científica](https://pubmed.ncbi.nlm.nih.gov/2081745/)). O peso inicial de 70 kg é editável antes de correr.

Acompanhar a corrida exige manter a tela aberta. Não há serviço de rastreamento em segundo plano. Antes de sair com uma sessão em andamento, o app pede confirmação. O histórico e as fotos ficam no armazenamento local; as corridas marcadas **Exemplo** são mockadas.

Ao finalizar, a corrida é salva antes da foto opcional. A foto recebe nome, distância, tempo, calorias estimadas e data. Entre 18h e 6h, pelo relógio local do aparelho, o app pergunta se deve ativar o flash. Isso é uma regra de horário, não uma medição de luminosidade. Câmeras sem flash ou navegadores sem suporte a `torch` mostram uma mensagem e permitem fotografar sem flash. Cancelar ou negar a câmera mantém a corrida salva.

## Android e iOS

O repositório ainda não possui projetos `android/` ou `ios/`. Os plugins foram adicionados às dependências; ao criar um projeto nativo com Capacitor 8, execute `npx cap sync` e configure as permissões abaixo antes de testar em aparelho.

Android, no `android/app/src/main/AndroidManifest.xml`, diretamente em `<manifest>`:

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-feature android:name="android.hardware.camera" android:required="false" />
<uses-feature android:name="android.hardware.camera.flash" android:required="false" />
```

iOS, em `ios/App/App/Info.plist`:

```xml
<key>NSCameraUsageDescription</key>
<string>Registrar uma foto ao finalizar sua corrida.</string>
<key>NSLocationWhenInUseUsageDescription</key>
<string>Registrar o percurso e a distância durante a corrida.</string>
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>Registrar o percurso enquanto a tela de corrida estiver aberta.</string>
<key>NSMotionUsageDescription</key>
<string>Estimar os passos durante a corrida.</string>
```

No navegador, câmera e GPS precisam de HTTPS ou localhost. O acesso a movimento no iOS é solicitado no gesto de iniciar. No app nativo, a câmera utiliza [Camera Preview](https://github.com/capacitor-community/camera-preview); GPS e acelerômetro utilizam [Geolocation](https://capacitorjs.com/docs/apis/geolocation) e [Motion](https://capacitorjs.com/docs/apis/motion).

Verificação em celular: autorizar e negar GPS; caminhar um trajeto curto; comparar os pontos e a distância; finalizar e confirmar que as métricas param; fotografar de dia e de noite, com e sem flash; cancelar a câmera; reabrir o histórico e conferir foto e métricas. Os testes automatizados simulam GPS, movimento e câmera e não substituem essa validação física.

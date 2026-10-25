# Tutorial completo: cinebridge (microsserviço de recomendação de equipes)

Este tutorial tem duas partes que se encaixam:

- **Parte A (seções 1 a 4):** como instalar e como funciona o que **já existia** (Atividade 1: Strategy, Template Method, Observer, Visitor; Atividade 2: Prototype, Factory Method e Abstract Factory).
- **Parte B (seção 5):** o que foi **adicionado agora** (Atividade 3: **Adapter, Composite e Decorator**), onde está, por que é necessário e como se liga ao que já existia.

As seções 6 em diante são de uso (API com JSONs prontos, eventos, testes, extensão).

---

## 1. Pré-requisitos

|Item|Versão|Observação|
|---|---|---|
|Node.js|20 LTS ou superior|`node -v`|
|PostgreSQL|16|via Docker (recomendado) ou instalado na máquina|
|Docker Desktop (Windows) / Docker Engine (Linux)|qualquer recente|só para subir o Postgres|

**Compatibilidade exigida pela atividade:** Windows 10 ou superior, Ubuntu 24.04.03 ou superior e derivados do Ubuntu. Os scripts do `package.json` usam só `npm` (nada de bash ou caminhos com `/` fixos), então os mesmos comandos funcionam nos três. O `.gitattributes` normaliza as quebras de linha. O novo `AdaptadorLocal` (armazenamento em disco) monta caminhos com `path` e `os`, nunca com separadores fixos, e bloqueia caminhos com `..`.

## 2. Instalação e execução

**Ubuntu / derivados**

```bash
cd AV3
npm install
cp .envExemplo .env
docker compose up -d        # sobe o Postgres com os dados do .env
npm run migration:run       # cria as tabelas
npm start                   # API em http://localhost:3000
```

**Windows 10+ (PowerShell)**

```powershell
cd AV3
npm install
copy .envExemplo .env
docker compose up -d
npm run migration:run
npm start
```

Na primeira execução a API popula o banco com 32 profissionais, 10 projetos (alternando os 4 tipos) e 160 avaliações. Se o banco já tiver dados, o seed é ignorado.

Sem Docker: instale o PostgreSQL, crie banco e usuário e ajuste `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS` e `DB_NAME` no `.env`. Modo desenvolvimento: `npm run dev`. Outra porta: `PORT` no `.env`.

Teste rápido: `curl http://localhost:3000/saude` deve responder `{"status":"ok"}`.

> **Banco já existente (da ATV II):** a Atividade 3 **não criou migration nova** e não mexeu nas tabelas. Pode continuar usando o mesmo banco. Se ele é mais antigo que a ATV II, rode `npm run migration:run` de novo (a migration `AddTipoPublicitario` é da ATV II).

## 3. Mapa do projeto

```
src/
├── app.ts                    # monta tudo (registro de fábricas, sistema, service), seed e start
├── server.ts                 # Fastify (recebe service e registro por injeção)
├── controller/               # schemas de validação e handlers HTTP
├── servico/                  # ServiceRecomendacao: cache, retry, fallback
├── SistemaRecomendacao/      # fachada: recomendar, substituir, convites + (NOVO) adaptadores
├── Equipe/ e Projetos/       # modelos de domínio (Projeto agora tem servicoPrincipal)
├── Strategy/                 # 3 estratégias + StrategyFactory (agora aceita decoradores)
├── Observer/                 # e-mail, interno, auditoria, barramento     (Atividade 1)
├── Visitor/                  # validador, compatibilidade, relatório      (Atividade 1)
├── Fabricas/                 # FabricaProjeto, 4 fábricas, RegistroFabricas (Atividade 2)
│   ├── Validadores/ Recomendadores/ Notificadores/
├── adapter/                  # NOVO (Atividade 3): Adapter
│   ├── armazenamento/        #   S3, Google Cloud, Local  (+ simuladores/)
│   ├── pagamento/            #   Stripe, PagSeguro, PayPal (+ simuladores/)
│   └── profissional/         #   LinkedIn, Interno         (+ simuladores/)
├── composite/                # NOVO (Atividade 3): ServicoProjeto, ServicoAtomico, PacoteServico
├── decorator/                # NOVO (Atividade 3): RecomendadorBase, Cache/Auditoria/Compressao + Montador
├── Entidades/ Repositorio/   # persistência TypeORM
├── migration/                # esquema do banco (sem migration nova na ATV III)
└── __tests__/                # 158 testes (115 antigos + 43 novos em adapter/, composite/ e decorator/)
exemplos/
├── *.json                    # exemplos por tipo de projeto (ATV II)
└── atv3/                     # NOVO: 10 requisições prontas para testar a API da ATV III
```

## 4. Como funciona o que já existia (Atividades 1 e 2)

### 4.1 O caminho de uma requisição

```
POST /  ──► Controller ──► ServiceRecomendacao ──► SistemaRecomendacao ──► OrquestradorEquipe
            (valida o       (busca profissionais,    (fachada: escolhe a      (Template Method:
             corpo, monta    com cache e retry)       fábrica, orquestra,       validar → filtrar →
             o Projeto)                               notifica)                 recomendar → normalizar
                                                                                → pós-processar)
```

O domínio não conhece o banco: o service depende da interface `ProfissionalProvider`, implementada por `ProfissionalProviderTypeorm` (inversão de dependência).

Na Atividade 3, **entre o controller e o orquestrador** a estratégia escolhida passa a poder vir embrulhada em decorators (seção 5.4), e o `SistemaRecomendacao` ganha acesso a sistemas externos pelos adaptadores (seção 5.2).

### 4.2 Os padrões das Atividades 1 e 2

|Padrão|Onde|O que faz|
|---|---|---|
|**Strategy**|`src/Strategy/*`|Três algoritmos de recomendação trocáveis pelo nome (`similiaridadecosseno`, `filtragemcolaborativa`, `regrasdeorcamento`), criados por `StrategyFactory` com parâmetros.|
|**Template Method**|`Equipe/Modelo/OrquestradorEquipe.ts`|`orquestrar()` fixa o esqueleto `validar → filtrar disponíveis → recomendar → normalizar → pós-processar`. O construtor bloqueia sobrescrever `orquestrar()`.|
|**Observer**|`src/Observer/*`|`NotificadorEmail`, `NotificadorInterno`, `AuditoriaRecomendacao` e `PublicadorEventos` (barramento em memória) recebem cada `EventoRecomendacao`.|
|**Visitor**|`src/Visitor/*`|`ValidadorConscistencia`, `CalculadorCompatibilidade` e `GeradorRelatorio` percorrem `Projeto` e `Profissional` via `aceitar(visitante)`.|
|**Facade**|`SistemaRecomendacao`|Ponto único: recomendar, substituir membro, responder convite.|
|**Prototype**|`Projetos/Modelo/*`|`Projeto.clonar()` com cópia profunda; `RegistroPrototipos` guarda modelos e entrega clones com ajustes.|
|**Factory Method / Abstract Factory**|`src/Fabricas/*`|`FabricaProjeto` cria, por tipo (documentário, animação, publicitário e ficção), a família: projeto, validador, recomendador e notificador. `RegistroFabricas` é uma tabela `tipo → fábrica`, sem `if`/`switch`.|

O que cada tipo faz de diferente (Atividade 2):

|Tipo|Papéis essenciais (validador)|Competências priorizadas (recomendador)|Notificador avisa|
|---|---|---|---|
|Documentário|`DIRETOR`, `EDITOR`|Roteirista: Roteiro 4; Editor: Edição 4|produção, para agendar entrevistas|
|Animação|`DIRETOR`, `EFEITOS_VISUAIS`|Efeitos visuais: Animação 3D 4 e Efeitos Visuais 4; Diretor: Animação 3D 3|estúdio, para reservar renderização|
|Publicitário|`DIRETOR`, `DIRETOR_FOTOGRAFIA`|Fotografia: Fotografia 4; Diretor: Produção 3|agência, para aprovação do cliente|
|Ficção|(só as regras gerais)|nenhuma|pré-produção|

Se a equipe passa nas regras gerais mas falha nas do tipo, o status vira `inconsistente`.

### 4.3 Por que a Atividade 3 era necessária

Até a Atividade 2 o microsserviço funcionava **isolado**: lia profissionais do próprio banco, o projeto era só um mapa de papéis e competências, e qualquer comportamento extra na recomendação teria de ser escrito dentro das estratégias. Os pontos de dor:

|Sintoma|Onde aparecia no código antigo|
|---|---|
|**Acoplamento com o mundo externo**|Guardar roteiros na nuvem, cobrar produtores ou consumir cadastros de outras plataformas obrigaria o `SistemaRecomendacao` a conhecer cada API (cada uma com formato, unidade e vocabulário próprios), com `if (provedor === ...)` espalhados. Trocar de fornecedor significaria reescrever regra de negócio.|
|**Projeto "plano"**|Um projeto era só uma lista de papéis. Não havia como dizer que "Pós-produção" contém "Áudio", que contém "Mixagem", cada um com custo e prazo, nem como somar custos e validar prazos nessa estrutura sem percorrer a árvore à mão em cada operação.|
|**Funcionalidades transversais sem lugar para morar**|Cache, auditoria detalhada e compressão não são responsabilidade do algoritmo de recomendação, mas precisam funcionar com qualquer um dos 3 algoritmos. Sem um padrão, seria preciso alterar cada estratégia ou criar uma subclasse para cada combinação (cache+auditoria, cache+compressão, as três...).|

## 5. O que foi adicionado (Atividade 3)

### 5.1 Visão geral: o que o PDF pede e onde está

|Pedido da atividade|Onde foi feito|
|---|---|
|Interfaces `AdaptadorArmazenamento`, `AdaptadorPagamento`, `AdaptadorProfissional`|`src/adapter/armazenamento/`, `pagamento/` e `profissional/`|
|Pelo menos 2 classes concretas por interface (S3/GoogleCloud, Stripe/PagSeguro, LinkedIn/Interno)|**3 por interface**: S3, GoogleCloud, Local; Stripe, PagSeguro, PayPal; LinkedIn, Interno|
|Classes que simulam os sistemas externos|`simuladores/` de cada pasta|
|`SistemaRecomendacao` recebe os adaptadores (construtor ou método de configuração)|`SistemaRecomendacao.configurarAdaptadores(armazenamento, pagamento, profissional)`|
|Composite: `ServicoProjeto` (`calcularCusto`, `listarSubservicos`, `obterPrazo`, `validar`), `ServicoAtomico`, `PacoteServico`|`src/composite/`|
|`Projeto` com `servicoPrincipal`; `calcularCustoTotal` delega; validação recursiva|`Projetos/Modelo/projetos.ts`|
|Decorator: `RecomendadorBase`, `CacheDecorator`, `AuditoriaDecorator`, `CompressaoDecorator` sobre `RecomendacaoStrategy` (inalterada)|`src/decorator/`|
|Combinar decoradores em ordens diferentes e definir a pilha em tempo de execução|`decorator/MontadorDecoradores.ts` + `Strategy/StrategyFactory.ts` (campo `parametros.decoradores` da API)|
|Testes de integração dos três padrões|`src/__tests__/adapter/`, `composite/`, `decorator/`|
|Compatível com Windows 10+ e Ubuntu 24.04+|Seção 1; só `npm` nos scripts; caminhos com `path`/`os`|

### 5.2 Adapter: falar com sistemas externos por um contrato único

```
                    SistemaRecomendacao
        (só conhece as 3 interfaces, nunca o provedor)
              │ utiliza        │ utiliza         │ utiliza
              ▼                ▼                 ▼
   AdaptadorArmazenamento  AdaptadorPagamento  AdaptadorProfissional   ◄── contrato padronizado
     ▲      ▲      ▲         ▲      ▲      ▲      ▲        ▲
    S3  GoogleCloud Local  Stripe PagSeguro PayPal LinkedIn Interno    ◄── adaptadores
     │      │      │         │      │      │      │        │ adapta
     ▼      ▼      ▼         ▼      ▼      ▼      ▼        ▼
 Simulador… (SistemaArmazenamentoExterno) · Simulador… (GatewayPagamento) · Simulador… (ApiProfissionalExterna)
```

Cada adaptador **traduz** as chamadas padronizadas para as chamadas e formatos do sistema externo, e as respostas de volta.

|Interface|Métodos|Provedores|O que o adaptador traduz|
|---|---|---|---|
|`AdaptadorArmazenamento`|`salvarArquivo(conteudo, metadados)`, `recuperarArquivo(id)`, `listarArquivos(prefixo)`|`AdaptadorS3`, `AdaptadorGoogleCloud`, `AdaptadorLocal`|`metadados {pasta, nome}` viram o caminho/chave do provedor (S3 usa `s3://bucket/...`, Local grava em disco). O `id` devolvido é o caminho lógico, ex.: `projetos/7/roteiro.pdf`.|
|`AdaptadorPagamento`|`efetuarPagamento(valor, origem, destino)`, `cancelarPagamento(id)`, `verificarPagamento(id)`|`AdaptadorStripe`, `AdaptadorPagSeguro`, `AdaptadorPayPal`|Valor em reais → centavos (Stripe). Status do provedor (`succeeded`, `PAGO`, `COMPLETED`...) → status único: `APROVADO`, `CANCELADO`, `RECUSADO`, `PENDENTE` ou `DESCONHECIDO`.|
|`AdaptadorProfissional`|`listarProfissionais(criterios)`, `detalharProfissional(id)`, `registrarAvaliacao(id, avaliacao)`|`AdaptadorLinkedIn`, `AdaptadorInterno`|Registro bruto de cada fonte (`fullName`/`skills`/`hourlyRate` no LinkedIn; `nome`/`competencias{}`/`preco` no interno) → objeto `Profissional` do domínio. A avaliação aceita um objeto `Avaliacao` ou a nota (1 a 5).|

Os **simuladores** imitam APIs reais sem rede nem credenciais: guardam dados em memória (o Local, em disco), cada um com o vocabulário do seu provedor. Os adaptadores de pagamento e de profissionais compartilham uma classe base (`BaseAdaptadorPagamento`, `BaseAdaptadorProfissional`) que concentra validação e fluxo; cada adaptador só informa a tradução.

**Como o sistema usa:**

```ts
const sistema = new SistemaRecomendacao()
sistema.definirEstrategia(new SimiliaridadeCosseno())

// armazenamento, pagamento, profissional (qualquer um pode ser omitido com undefined)
sistema.configurarAdaptadores(new AdaptadorS3(), new AdaptadorStripe(), new AdaptadorLinkedIn())

sistema.executarRecomendacao(projeto)               // profissionais vêm da fonte configurada
sistema.salvarMidia(projeto, "roteiro.pdf", buffer) // "projetos/<id>/roteiro.pdf"
sistema.listarMidias(projeto); sistema.recuperarMidia(id)
sistema.pagarEquipe(projeto, equipe, "produtor")    // paga o preço médio de cada membro

// Trocar de provedor, sem mudar mais nada:
sistema.configurarAdaptadores(new AdaptadorGoogleCloud(), new AdaptadorPagSeguro(), new AdaptadorInterno())
```

Chamar um método sem ter configurado o adaptador lança `ErroServicoIndisponivel` (HTTP 503) com uma mensagem clara.

### 5.3 Composite: hierarquia de serviços do projeto

```
ServicoProjeto (interface) ◄── calcularCusto() · listarSubservicos() · obterPrazo() · validar()
     ▲                     ▲
ServicoAtomico        PacoteServico ──── contém ──► 0..* ServicoProjeto (atômico OU outro pacote)
(folha: nome, custo,
 prazo, papel)
```

Exemplo de árvore (os números são os usados nos testes):

```
Filme (PacoteServico)                     custo 4200
└── Pós-produção (PacoteServico)
    ├── Edição     (atômico, R$ 1000, 01/03, EDITOR)
    ├── Áudio (PacoteServico)
    │   └── Mixagem (atômico, R$ 500,  10/03, SONOPLASTA)
    └── Visual (PacoteServico)
        ├── Coloração (atômico, R$ 700, 01/04, DIRETOR_FOTOGRAFIA)
        └── Efeitos (PacoteServico)
            └── VFX  (atômico, R$ 2000, 01/05, EFEITOS_VISUAIS)
```

|Operação|Serviço atômico|Pacote|
|---|---|---|
|`calcularCusto()`|o próprio custo|soma recursiva dos filhos|
|`listarSubservicos()`|lista vazia|filhos diretos|
|`obterPrazo()`|a sua data|datas de **todos** os atômicos da hierarquia|
|`validar()`|custo ≥ 0, data válida e papel existente no enum `Papel`|não vazio, **todos** os filhos válidos e (se houver limite) nenhum prazo acima dele|

Extras de `PacoteServico`: `adicionar`/`remover`, `atomicos()` (lista achatada), `profundidade()` e **proteção contra ciclos** (um pacote não pode conter a si mesmo, direta ou indiretamente).

**Integração com `Projeto`** (`projetos.ts`):

- `servicoPrincipal?: ServicoProjeto`: a raiz da hierarquia.
- `calcularCustoTotal()`: apenas **delega** ao serviço principal, que propaga recursivamente (0 se não houver serviços).
- `validarEstrutura()`: serviços válidos **e** custo total ≤ orçamento **e** todos os prazos ≤ prazo do projeto.
- `clonar()` (Prototype) e `aplicarAjustes({ servicoPrincipal })` também tratam o serviço principal; a hierarquia é tratada como imutável e compartilhada entre clone e original.

### 5.4 Decorator: cache, auditoria e compressão empilháveis

```
chamada ──► [ Compressão ] ──► [ Auditoria ] ──► [ Cache ] ──► RecomendadorBase ──► estratégia escolhida
            (por fora)                           (por dentro)
            pilha ["cache","auditoria","compressao"]: o 1º da lista fica mais perto da base
```

Todos implementam `RecomendacaoStrategy` (a interface **não mudou**) e recebem outra `RecomendacaoStrategy` no construtor. Por isso o `SistemaRecomendacao` e o orquestrador **não sabem** se estão falando com a estratégia pura ou com uma pilha.

|Classe|O que faz|Detalhes|
|---|---|---|
|`RecomendadorBase`|Lógica principal de recomendação (a mesma da Atividade 1)|Envolve a estratégia escolhida (cosseno por padrão); não é alterado pelos decorators.|
|`CacheDecorator`|Guarda o resultado de requisições idênticas|Chave = projeto (id, tipo, gênero, orçamento, prazo, competências, pesos) + candidatos (id, preço, disponibilidade, competências). Validade `ttlMs` (padrão 60 s). Devolve cópia do `Map`, então mexer no resultado não contamina o cache. Contadores `acertos` e `erros`.|
|`AuditoriaDecorator`|Registra cada chamada|Projeto, nº de candidatos, selecionados, duração e sucesso/erro (falhas também são registradas e o erro é repropagado). Sai como linha JSON `auditoria_recomendacao` no console.|
|`CompressaoDecorator`|Comprime (gzip) a carga serializada da recomendação|Mantém o retorno `Map`; a carga e as estatísticas ficam em `ultimaCarga` e `ultimaEstatistica` (`bytesOriginais` × `bytesComprimidos`). `CompressaoDecorator.descomprimir(carga)` faz o inverso.|

**A ordem muda o comportamento.** Com `["cache","auditoria"]` a auditoria fica por fora e registra **todas** as chamadas, inclusive as que o cache respondeu. Com `["auditoria","cache"]` o cache fica por fora e a auditoria só registra o que **passou** pelo cache.

**Pilha definida em tempo de execução**, por política ou preferência do produtor:

```ts
const estrategia = aplicarDecoradores(new RecomendadorBase(), {
  decoradores: ["cache", "auditoria", "compressao"],
  cache: { ttlMs: 30000 },          // opcional
})
sistema.definirEstrategia(estrategia)  // nenhuma linha do SistemaRecomendacao muda
```

Na **API**, a mesma escolha vem no JSON, em `parametros` (seção 6). `criarEstrategia` monta a pilha e **reaproveita a mesma pilha** para requisições com a mesma configuração (senão o cache nasceria vazio a cada chamada).

### 5.5 O que foi alterado em arquivos que já existiam

|Arquivo|Alteração|
|---|---|
|`Projetos/Modelo/projetos.ts`|`servicoPrincipal`, `calcularCustoTotal()`, `validarEstrutura()`; `clonar()`/`aplicarAjustes()` tratam o serviço principal.|
|`SistemaRecomendacao/SistemaRecomendacao.ts`|`configurarAdaptadores`, `executarRecomendacao`, `salvarMidia`, `listarMidias`, `recuperarMidia`, `pagarEquipe`. Os métodos antigos (`executarEstrategia`, `substituirMembro`, `responderConvite`...) continuam iguais, e o construtor aceita os mesmos argumentos.|
|`Strategy/StrategyFactory.ts`|`criarEstrategia` aceita `parametros.decoradores` e `parametros.cache`. Sem `decoradores`, o comportamento é exatamente o de antes.|

Tudo o mais permaneceu: orquestrador, fábricas, validadores, observadores, controller, rotas e banco. **Nenhuma rota nova**, nenhuma migration nova.

### 5.6 Banco de dados

Nada mudou. Adaptadores, serviços e decorators não persistem nada nesta etapa (os simuladores guardam em memória; o `AdaptadorLocal` grava arquivos na pasta temporária do sistema).

### 5.7 Testando as novidades

- **Decorator** é acionável **pela API**: veja os exemplos 8 a 10 da seção 6.2 e o experimento abaixo.
- **Adapter e Composite não têm rota HTTP**: são usados por código (`SistemaRecomendacao`, `Projeto`) e exercitados pelos testes automatizados (seção 8). Hoje nenhum campo do JSON da API cria um `servicoPrincipal` nem escolhe um adaptador.

**Experimento para ver o Decorator trabalhando:** envie o exemplo 8 (seção 6.2) **duas vezes** e olhe o console da API.

1. Na pilha `["cache","auditoria","compressao"]`, aparecem **duas** linhas `"evento":"auditoria_recomendacao"` (a auditoria vê as duas chamadas), mas só a primeira executa o algoritmo; a segunda é respondida pelo cache.
2. Agora envie o exemplo 9 (`["auditoria","cache"]`) duas vezes: aparece **uma** linha (a segunda chamada nem chega à auditoria, o cache responde antes).
3. O resultado (a equipe) é **idêntico** ao do exemplo 1 nos três casos: os decorators não alteram a recomendação.

### 5.8 Diferenças e decisões em relação ao PDF e ao diagrama

|No PDF / diagrama|No código|Motivo|
|---|---|---|
|Diagrama cortado na borda do PDF (só parte dos adaptadores aparece)|Composite e Decorator implementados a partir do **texto** da atividade; adaptadores a partir do que o diagrama mostra|A imagem do diagrama está truncada.|
|Texto cita `AdaptadorInterno`; diagrama mostra `AdaptadorLocal` e `AdaptadorPayPal`|Existem **todos**: 3 adaptadores por interface|O texto pede "pelo menos duas"; o diagrama traz os três.|
|`listarArquivos(prefixo): string[]`|`string[]`|Segue o diagrama (um esqueleto inicial declarava `string`).|
|Sistemas externos: `GatewayPagamento`, `ApiProfissionalExterna`|Mesmos nomes; o de armazenamento se chama `SistemaArmazenamentoExterno`|O diagrama não mostra o nome do de armazenamento.|
|`SistemaRecomendacao.executarRecomendacao(projeto): Equipe`|Existe, e busca os profissionais no adaptador configurado|O `executarEstrategia(projeto, profissionais)` da ATV I/II foi **mantido** (a API e os testes dependem dele).|
|Adaptadores recebidos "no construtor ou por métodos de configuração"|Por `configurarAdaptadores(...)`|Mantém compatível o construtor existente, que a ATV II e os testes usam.|
|`Projeto` com `servicoPrincipal` "em vez de uma lista simples de papéis"|`servicoPrincipal` **foi acrescentado e `competencias` foi mantido**|Estratégias, validadores, fábricas e a API inteira dependem de `competencias`; trocar quebraria as Atividades 1 e 2.|
|`listarSubservicos()` sem tipo de retorno definido|Devolve `ServicoProjeto[]`|Uma lista é mais útil que imprimir; o pacote devolve os filhos diretos.|
|`RecomendadorBase` "com a lógica principal já implementada na primeira atividade"|Envolve a estratégia existente (cosseno por padrão)|Evita duplicar os algoritmos da ATV I.|
|Decorator "comprime os dados de saída"|A interface devolve `Map`; a carga gzip fica em `ultimaCarga`|A assinatura de `RecomendacaoStrategy` precisa permanecer **inalterada**, como o PDF exige.|

## 6. A API HTTP: corpos prontos para copiar e colar

|Método e rota|Para quê|
|---|---|
|`GET /saude`|verificar se o serviço está de pé|
|`POST /`|recomendar uma equipe para um projeto|
|`POST /equipe/substituir`|trocar o profissional de um papel, mantendo os demais|
|`POST /convites/responder`|aceitar (confirma) ou recusar (substitui) uma sugestão|

### 6.0 Configuração no Insomnia, Postman, Bruno ou Thunder Client

1. Suba a API (`npm start`). O endereço base é `http://localhost:3000`.
2. Crie uma requisição com o método e a URL da tabela acima (ex.: `POST http://localhost:3000/`).
3. Em **Body**, escolha **JSON** (no Postman: _raw_ + _JSON_) e cole o corpo do exemplo. O cabeçalho `Content-Type: application/json` é colocado automaticamente; se a ferramenta não colocar, adicione-o.
4. Envie e compare com o "resultado esperado" abaixo de cada exemplo.

Regras para o JSON colado funcionar:

- Cole **sem alterar os acentos**: `"tipo"` usa `"FICÇÃO"` e `"ANIMAÇÃO"`, e `"genero"` usa `"AÇÃO"`.
- JSON não aceita comentários nem vírgula sobrando no fim.
- `GET /saude` não tem corpo.

**Atalho:** os exemplos novos da Atividade 3 também estão prontos, um por arquivo, em `exemplos/atv3/` (`curl -X POST http://localhost:3000/ -H "content-type: application/json" -d @exemplos/atv3/02-recomendacao-cache-auditoria-compressao.json`). No PowerShell: `Invoke-RestMethod -Uri http://localhost:3000/ -Method Post -ContentType 'application/json' -InFile .\exemplos\atv3\02-recomendacao-cache-auditoria-compressao.json | ConvertTo-Json -Depth 8`.

|Arquivo em `exemplos/atv3/`|Rota|Resultado esperado|
|---|---|---|
|`01-recomendacao-simples.json`|`POST /`|200, equipe 1 / 3 / 15 (igual ao exemplo 1 abaixo)|
|`02-recomendacao-cache-auditoria-compressao.json`|`POST /`|200, mesma equipe, pilha completa|
|`03-recomendacao-auditoria-por-dentro.json`|`POST /`|200, mesma equipe, pilha em outra ordem|
|`04-erro-400-decorator-invalido.json`|`POST /`|400, "Decorator desconhecido..."|
|`05-erro-422-orcamento-baixo.json`|`POST /`|422, nenhum profissional elegível|
|`06-erro-400-campo-faltando.json`|`POST /`|400, falta `orcamento`|
|`07-substituir-editor.json`|`POST /equipe/substituir`|200, o editor 3 é trocado pelo 13|
|`08-convite-recusado-editor.json`|`POST /convites/responder`|200, recusa dispara substituto (13)|
|`09-convite-aceito-diretor.json`|`POST /convites/responder`|200, diretor 1 com `confirmado: true`|
|`10-filtragem-com-decoradores.json`|`POST /`|200, equipe 25 / 1 / 13 (igual ao exemplo 10 abaixo)|

> **Sobre os resultados esperados:** os nomes e ids abaixo vêm dos dados do seed (32 profissionais criados na primeira execução). Eles só se repetem se o seu banco foi populado por esse seed e você não alterou os dados. Os exemplos foram conferidos contra uma réplica em memória do seed, passando pelo servidor HTTP real do projeto (Fastify); os resultados dos exemplos 1 a 7 e das seções 6.3 e 6.4 são **idênticos aos da versão da Atividade 2**, o que confirma que nada do que existia foi alterado. Se algum resultado diferir no seu banco, o formato da resposta continua o mesmo, só mudam os profissionais. Todos os exemplos usam `prazo` em março ou junho de 2026, dentro da janela de disponibilidade dos profissionais do seed.

### 6.1 `GET /saude`

Sem corpo. Resposta esperada: `200` com

```json
{ "status": "ok" }
```

### 6.2 `POST /` (recomendar uma equipe)

**Campos do corpo**

|Campo|Obrigatório|Descrição|
|---|---|---|
|`id`|sim|número do projeto|
|`genero`|sim|`COMEDIA`, `AÇÃO`, `TERROR` ou `DRAMA`|
|`tipo`|sim|`DOCUMENTARIO`, `FICÇÃO`, `ANIMAÇÃO` ou `PUBLICITARIO`. **Escolhe a fábrica**|
|`duracaoMin`, `orcamento`|sim|números maiores que 0|
|`prazo`|sim|data ISO, ex.: `2026-03-10T00:00:00.000Z`. Só entram profissionais disponíveis nessa data|
|`competencias`|sim|papéis exigidos, cada um com a lista `{nome, nivel 1-5}`|
|`pesos`|não|importância de cada papel (padrão 1). Divide o orçamento por papel e pesa a nota em `regrasdeorcamento`|
|`estrategia`|sim|`similiaridadecosseno`, `filtragemcolaborativa` ou `regrasdeorcamento`|
|`parametros`|não|ajustes do algoritmo **e (novo na ATV III)** a pilha de decoradores (tabela abaixo)|
|`detalhes`|não|atributos específicos do tipo (`DOCUMENTARIO`: `tema`, `entrevistados`; `ANIMAÇÃO`: `tecnica`, `cenas`; `PUBLICITARIO`: `cliente`, `veiculos`; ignorados em `FICÇÃO`)|

**Papéis aceitos** (valor ou nome do enum): `DIRETOR`, `DIRETOR DE FOTOGRAFIA` (ou `DIRETOR_FOTOGRAFIA`), `SONOPLASTA`, `EDITOR`, `ROTEIRISTA`, `EFEITOS VISUAIS` (ou `EFEITOS_VISUAIS`).

**Estratégias e parâmetros**

|Estratégia|Como escolhe|Parâmetros|
|---|---|---|
|`similiaridadecosseno`|similaridade entre as competências exigidas e as do profissional|`limiarMinimo` (0 a 1, padrão 0)|
|`filtragemcolaborativa`|maior média de avaliações recebidas no papel|`minAvaliacoes` (padrão 1)|
|`regrasdeorcamento`|maximiza a nota total respeitando o orçamento (otimização inteira)|`usarPesos` (padrão true), `topPorPapel` (padrão 50)|

**Parâmetros novos (Decorator), válidos para qualquer estratégia**

|Parâmetro|Descrição|
|---|---|
|`decoradores`|lista, na ordem de empilhamento (o 1º fica mais perto do algoritmo): `"cache"`, `"auditoria"`, `"compressao"`. Lista vazia ou ausente = sem decorators. Nome inexistente = erro 400.|
|`cache`|opcional, ex.: `{ "ttlMs": 30000 }` (validade do cache em milissegundos; padrão 60000)|

Para ver o Strategy funcionando, envie o mesmo projeto trocando só `estrategia` e compare os profissionais devolvidos. Para ver o Decorator, troque só `decoradores` e veja que a equipe **não muda**.

#### Exemplo 1: ficção, estratégia `similiaridadecosseno`

Resultado esperado: `200`, `status: "formada"`, DIRETOR: 1 Ana Lima, EDITOR: 3 Fernanda Oliveira, SONOPLASTA: 15 Patrícia Almeida, todos com `confirmado: false`.

```json
{
  "id": 1,
  "genero": "DRAMA",
  "tipo": "FICÇÃO",
  "duracaoMin": 90,
  "orcamento": 150000,
  "prazo": "2026-03-10T00:00:00.000Z",
  "competencias": {
    "DIRETOR": [
      {
        "nome": "Direção",
        "nivel": 5
      }
    ],
    "EDITOR": [
      {
        "nome": "Edição",
        "nivel": 4
      }
    ],
    "SONOPLASTA": [
      {
        "nome": "Som",
        "nivel": 5
      }
    ]
  },
  "pesos": {
    "DIRETOR": 3,
    "EDITOR": 2,
    "SONOPLASTA": 1
  },
  "estrategia": "similiaridadecosseno",
  "parametros": {
    "limiarMinimo": 0.2
  }
}
```

#### Exemplo 2: o mesmo projeto com `filtragemcolaborativa`

Só mudam `estrategia` e `parametros`. Resultado esperado: DIRETOR: 25 Letícia Dias, EDITOR: 1 Ana Lima, SONOPLASTA: 13 Larissa Melo. A troca de estratégia mudou a equipe.

```json
{
  "id": 1,
  "genero": "DRAMA",
  "tipo": "FICÇÃO",
  "duracaoMin": 90,
  "orcamento": 150000,
  "prazo": "2026-03-10T00:00:00.000Z",
  "competencias": {
    "DIRETOR": [
      {
        "nome": "Direção",
        "nivel": 5
      }
    ],
    "EDITOR": [
      {
        "nome": "Edição",
        "nivel": 4
      }
    ],
    "SONOPLASTA": [
      {
        "nome": "Som",
        "nivel": 5
      }
    ]
  },
  "pesos": {
    "DIRETOR": 3,
    "EDITOR": 2,
    "SONOPLASTA": 1
  },
  "estrategia": "filtragemcolaborativa",
  "parametros": {
    "minAvaliacoes": 1
  }
}
```

#### Exemplo 3: o mesmo projeto com `regrasdeorcamento`

Resultado esperado: DIRETOR: 1 Ana Lima, EDITOR: 2 Carlos Ribeiro, SONOPLASTA: 3 Fernanda Oliveira.

```json
{
  "id": 1,
  "genero": "DRAMA",
  "tipo": "FICÇÃO",
  "duracaoMin": 90,
  "orcamento": 150000,
  "prazo": "2026-03-10T00:00:00.000Z",
  "competencias": {
    "DIRETOR": [
      {
        "nome": "Direção",
        "nivel": 5
      }
    ],
    "EDITOR": [
      {
        "nome": "Edição",
        "nivel": 4
      }
    ],
    "SONOPLASTA": [
      {
        "nome": "Som",
        "nivel": 5
      }
    ]
  },
  "pesos": {
    "DIRETOR": 3,
    "EDITOR": 2,
    "SONOPLASTA": 1
  },
  "estrategia": "regrasdeorcamento",
  "parametros": {
    "usarPesos": true,
    "topPorPapel": 50
  }
}
```

#### Exemplo 4: documentário (`DOCUMENTARIO`)

Resultado esperado: `formada`, DIRETOR: 18 Diego Rocha, EDITOR: 3 Fernanda Oliveira, ROTEIRISTA: 2 Carlos Ribeiro. No console da API aparece `NOTIFICADOR-DOCUMENTARIO`.

```json
{
  "id": 2,
  "genero": "DRAMA",
  "tipo": "DOCUMENTARIO",
  "duracaoMin": 60,
  "orcamento": 90000,
  "prazo": "2026-06-10T00:00:00.000Z",
  "competencias": {
    "DIRETOR": [
      {
        "nome": "Direção",
        "nivel": 5
      }
    ],
    "EDITOR": [
      {
        "nome": "Edição",
        "nivel": 4
      }
    ],
    "ROTEIRISTA": [
      {
        "nome": "Roteiro",
        "nivel": 3
      }
    ]
  },
  "estrategia": "similiaridadecosseno",
  "detalhes": {
    "tema": "Rios do Brasil",
    "entrevistados": [
      "Ana Lima",
      "Carlos Souza"
    ]
  }
}
```

#### Exemplo 5: animação (`ANIMAÇÃO`)

Resultado esperado: `formada`, DIRETOR: 18 Diego Rocha, EFEITOS VISUAIS: 3 Fernanda Oliveira.

```json
{
  "id": 3,
  "genero": "COMEDIA",
  "tipo": "ANIMAÇÃO",
  "duracaoMin": 15,
  "orcamento": 120000,
  "prazo": "2026-06-10T00:00:00.000Z",
  "competencias": {
    "DIRETOR": [
      {
        "nome": "Direção",
        "nivel": 4
      }
    ],
    "EFEITOS_VISUAIS": [
      {
        "nome": "Efeitos Visuais",
        "nivel": 5
      }
    ]
  },
  "estrategia": "similiaridadecosseno",
  "detalhes": {
    "tecnica": "3D",
    "cenas": 24
  }
}
```

#### Exemplo 6: publicitário (`PUBLICITARIO`)

Resultado esperado: `formada`, DIRETOR: 18 Diego Rocha, DIRETOR DE FOTOGRAFIA: 4 João Gomes.

```json
{
  "id": 4,
  "genero": "AÇÃO",
  "tipo": "PUBLICITARIO",
  "duracaoMin": 1,
  "orcamento": 60000,
  "prazo": "2026-06-10T00:00:00.000Z",
  "competencias": {
    "DIRETOR": [
      {
        "nome": "Direção",
        "nivel": 4
      }
    ],
    "DIRETOR_FOTOGRAFIA": [
      {
        "nome": "Fotografia",
        "nivel": 5
      }
    ]
  },
  "estrategia": "similiaridadecosseno",
  "detalhes": {
    "cliente": "Marca X",
    "veiculos": [
      "TV",
      "Internet"
    ]
  }
}
```

#### Exemplo 7: o Abstract Factory em ação (documentário sem editor)

O pedido só tem DIRETOR. Resultado esperado: `200` com `"status": "inconsistente"` (o validador de documentário exige um editor).

```json
{
  "id": 2,
  "genero": "DRAMA",
  "tipo": "DOCUMENTARIO",
  "duracaoMin": 60,
  "orcamento": 90000,
  "prazo": "2026-06-10T00:00:00.000Z",
  "competencias": {
    "DIRETOR": [
      {
        "nome": "Direção",
        "nivel": 5
      }
    ]
  },
  "estrategia": "similiaridadecosseno",
  "detalhes": {
    "tema": "Rios do Brasil",
    "entrevistados": [
      "Ana Lima",
      "Carlos Souza"
    ]
  }
}
```

Agora o **mesmo pedido** com `"tipo": "FICÇÃO"`. Resultado esperado: `"status": "formada"`. Só a fábrica mudou.

```json
{
  "id": 2,
  "genero": "DRAMA",
  "tipo": "FICÇÃO",
  "duracaoMin": 60,
  "orcamento": 90000,
  "prazo": "2026-06-10T00:00:00.000Z",
  "competencias": {
    "DIRETOR": [
      {
        "nome": "Direção",
        "nivel": 5
      }
    ]
  },
  "estrategia": "similiaridadecosseno",
  "detalhes": {
    "tema": "Rios do Brasil",
    "entrevistados": [
      "Ana Lima",
      "Carlos Souza"
    ]
  }
}
```

#### Exemplo 8 (novo, ATV III): pilha completa `cache` → `auditoria` → `compressao`

É o exemplo 1 com `decoradores`. Resultado esperado: **a mesma equipe do exemplo 1** (DIRETOR: 1 Ana Lima, EDITOR: 3 Fernanda Oliveira, SONOPLASTA: 15 Patrícia Almeida). **Envie duas vezes** e veja a seção 5.7: duas linhas `auditoria_recomendacao` no console, mas o algoritmo só roda na primeira.

```json
{
  "id": 1,
  "genero": "DRAMA",
  "tipo": "FICÇÃO",
  "duracaoMin": 90,
  "orcamento": 150000,
  "prazo": "2026-03-10T00:00:00.000Z",
  "competencias": {
    "DIRETOR": [
      {
        "nome": "Direção",
        "nivel": 5
      }
    ],
    "EDITOR": [
      {
        "nome": "Edição",
        "nivel": 4
      }
    ],
    "SONOPLASTA": [
      {
        "nome": "Som",
        "nivel": 5
      }
    ]
  },
  "pesos": {
    "DIRETOR": 3,
    "EDITOR": 2,
    "SONOPLASTA": 1
  },
  "estrategia": "similiaridadecosseno",
  "parametros": {
    "limiarMinimo": 0.2,
    "decoradores": [
      "cache",
      "auditoria",
      "compressao"
    ]
  }
}
```

#### Exemplo 9 (novo, ATV III): mesma pilha em outra ordem, `auditoria` por dentro

Resultado esperado: a mesma equipe do exemplo 1. Enviando duas vezes, só **uma** linha de auditoria (o cache responde antes de a auditoria ser chamada).

```json
{
  "id": 1,
  "genero": "DRAMA",
  "tipo": "FICÇÃO",
  "duracaoMin": 90,
  "orcamento": 150000,
  "prazo": "2026-03-10T00:00:00.000Z",
  "competencias": {
    "DIRETOR": [
      {
        "nome": "Direção",
        "nivel": 5
      }
    ],
    "EDITOR": [
      {
        "nome": "Edição",
        "nivel": 4
      }
    ],
    "SONOPLASTA": [
      {
        "nome": "Som",
        "nivel": 5
      }
    ]
  },
  "pesos": {
    "DIRETOR": 3,
    "EDITOR": 2,
    "SONOPLASTA": 1
  },
  "estrategia": "similiaridadecosseno",
  "parametros": {
    "limiarMinimo": 0.2,
    "decoradores": [
      "auditoria",
      "cache"
    ]
  }
}
```

#### Exemplo 10 (novo, ATV III): decorators com outra estratégia

Os decorators funcionam com qualquer estratégia, sem alterar nenhuma. É o exemplo 2 (`filtragemcolaborativa`) com `["cache","auditoria"]`. Resultado esperado: **a mesma equipe do exemplo 2** (DIRETOR: 25 Letícia Dias, EDITOR: 1 Ana Lima, SONOPLASTA: 13 Larissa Melo).

```json
{
  "id": 1,
  "genero": "DRAMA",
  "tipo": "FICÇÃO",
  "duracaoMin": 90,
  "orcamento": 150000,
  "prazo": "2026-03-10T00:00:00.000Z",
  "competencias": {
    "DIRETOR": [
      {
        "nome": "Direção",
        "nivel": 5
      }
    ],
    "EDITOR": [
      {
        "nome": "Edição",
        "nivel": 4
      }
    ],
    "SONOPLASTA": [
      {
        "nome": "Som",
        "nivel": 5
      }
    ]
  },
  "pesos": {
    "DIRETOR": 3,
    "EDITOR": 2,
    "SONOPLASTA": 1
  },
  "estrategia": "filtragemcolaborativa",
  "parametros": {
    "minAvaliacoes": 1,
    "decoradores": [
      "cache",
      "auditoria"
    ]
  }
}
```

**Resposta (formato)**

```json
{
  "Recomendacao": {
    "dataFormacao": "2026-10-18T17:40:00.000Z",
    "status": "formada",
    "membrosEquipe": [
      { "papel": "DIRETOR", "confirmado": false, "profissional": { "id": "1", "nome": "Ana Lima", "precoMedio": 3000 } }
    ]
  },
  "degradado": false
}
```

(O `profissional` vem com mais campos: competências, disponibilidade e avaliações.)

|`status`|Significado|
|---|---|
|`formada`|todos os papéis preenchidos e dentro do orçamento|
|`parcial`|algum papel exigido ficou sem profissional elegível|
|`acima_do_orcamento`|o custo da equipe passou do orçamento|
|`confirmada`|todos os membros aceitaram o convite|
|`inconsistente`|a equipe está completa e no orçamento, mas o validador do tipo reprovou (ex.: documentário sem editor)|

`degradado: true` indica que o banco estava fora do ar e a resposta usou os últimos dados em cache.

### 6.3 `POST /equipe/substituir`

O serviço **não guarda estado**: a equipe atual vai no corpo, em `equipe` (papel → `profissionalId`). Os ids devem existir no banco (o seed cria de 1 a 32). Use os ids devolvidos pelo `POST /`. Só o `papel` indicado é recalculado; quem já está na equipe ou em `rejeitados` não volta. O campo `parametros.decoradores` também funciona aqui.

#### Exemplo 1: trocar a SONOPLASTA

Resultado esperado: DIRETOR: 1 Ana Lima, EDITOR: 3 Fernanda Oliveira, SONOPLASTA: 25 Letícia Dias (SONOPLASTA passa de 15 para 25; DIRETOR e EDITOR continuam).

```json
{
  "id": 1,
  "genero": "DRAMA",
  "tipo": "FICÇÃO",
  "duracaoMin": 90,
  "orcamento": 150000,
  "prazo": "2026-03-10T00:00:00.000Z",
  "competencias": {
    "DIRETOR": [
      {
        "nome": "Direção",
        "nivel": 5
      }
    ],
    "EDITOR": [
      {
        "nome": "Edição",
        "nivel": 4
      }
    ],
    "SONOPLASTA": [
      {
        "nome": "Som",
        "nivel": 5
      }
    ]
  },
  "pesos": {
    "DIRETOR": 3,
    "EDITOR": 2,
    "SONOPLASTA": 1
  },
  "estrategia": "similiaridadecosseno",
  "parametros": {
    "limiarMinimo": 0.2
  },
  "equipe": {
    "DIRETOR": {
      "profissionalId": "1"
    },
    "EDITOR": {
      "profissionalId": "3"
    },
    "SONOPLASTA": {
      "profissionalId": "15"
    }
  },
  "papel": "SONOPLASTA",
  "rejeitados": []
}
```

#### Exemplo 2: trocar de novo, rejeitando a Letícia

Resultado esperado: DIRETOR: 1 Ana Lima, EDITOR: 3 Fernanda Oliveira, SONOPLASTA: 2 Carlos Ribeiro.

```json
{
  "id": 1,
  "genero": "DRAMA",
  "tipo": "FICÇÃO",
  "duracaoMin": 90,
  "orcamento": 150000,
  "prazo": "2026-03-10T00:00:00.000Z",
  "competencias": {
    "DIRETOR": [
      {
        "nome": "Direção",
        "nivel": 5
      }
    ],
    "EDITOR": [
      {
        "nome": "Edição",
        "nivel": 4
      }
    ],
    "SONOPLASTA": [
      {
        "nome": "Som",
        "nivel": 5
      }
    ]
  },
  "pesos": {
    "DIRETOR": 3,
    "EDITOR": 2,
    "SONOPLASTA": 1
  },
  "estrategia": "similiaridadecosseno",
  "parametros": {
    "limiarMinimo": 0.2
  },
  "equipe": {
    "DIRETOR": {
      "profissionalId": "1"
    },
    "EDITOR": {
      "profissionalId": "3"
    },
    "SONOPLASTA": {
      "profissionalId": "15"
    }
  },
  "papel": "SONOPLASTA",
  "rejeitados": [
    "25"
  ]
}
```

#### Exemplo 3: trocar o EDITOR de um documentário

Resultado esperado: DIRETOR: 18 Diego Rocha, EDITOR: 13 Larissa Melo, ROTEIRISTA: 2 Carlos Ribeiro. O projeto continua `DOCUMENTARIO` e `formada`.

```json
{
  "id": 2,
  "genero": "DRAMA",
  "tipo": "DOCUMENTARIO",
  "duracaoMin": 60,
  "orcamento": 90000,
  "prazo": "2026-06-10T00:00:00.000Z",
  "competencias": {
    "DIRETOR": [
      {
        "nome": "Direção",
        "nivel": 5
      }
    ],
    "EDITOR": [
      {
        "nome": "Edição",
        "nivel": 4
      }
    ],
    "ROTEIRISTA": [
      {
        "nome": "Roteiro",
        "nivel": 3
      }
    ]
  },
  "estrategia": "similiaridadecosseno",
  "detalhes": {
    "tema": "Rios do Brasil",
    "entrevistados": [
      "Ana Lima",
      "Carlos Souza"
    ]
  },
  "equipe": {
    "DIRETOR": {
      "profissionalId": "18"
    },
    "EDITOR": {
      "profissionalId": "3"
    },
    "ROTEIRISTA": {
      "profissionalId": "2"
    }
  },
  "papel": "EDITOR",
  "rejeitados": []
}
```

> **Dica:** nem todo papel tem substituto em qualquer data. Se der `422 Nenhum profissional elegível`, ninguém disponível no `prazo` atende ao papel e ao orçamento restante: aumente o `orcamento`, mude o `prazo` ou tire o `limiarMinimo` de `parametros`.

### 6.4 `POST /convites/responder`

Mesmo corpo da substituição, mais `"aceito": true` ou `false`.

- `true`: o membro fica `confirmado`. Quando todos confirmam, o status vira `confirmada` e é emitido o evento `Equipe Confirmada`.
- `false`: o convite é marcado como recusado e o papel é substituído automaticamente.

#### Exemplo 1: o EDITOR aceita

Resultado esperado: DIRETOR: 1 Ana Lima, EDITOR: 3 Fernanda Oliveira (confirmado), SONOPLASTA: 15 Patrícia Almeida, status `formada`.

```json
{
  "id": 1,
  "genero": "DRAMA",
  "tipo": "FICÇÃO",
  "duracaoMin": 90,
  "orcamento": 150000,
  "prazo": "2026-03-10T00:00:00.000Z",
  "competencias": {
    "DIRETOR": [
      {
        "nome": "Direção",
        "nivel": 5
      }
    ],
    "EDITOR": [
      {
        "nome": "Edição",
        "nivel": 4
      }
    ],
    "SONOPLASTA": [
      {
        "nome": "Som",
        "nivel": 5
      }
    ]
  },
  "pesos": {
    "DIRETOR": 3,
    "EDITOR": 2,
    "SONOPLASTA": 1
  },
  "estrategia": "similiaridadecosseno",
  "parametros": {
    "limiarMinimo": 0.2
  },
  "equipe": {
    "DIRETOR": {
      "profissionalId": "1"
    },
    "EDITOR": {
      "profissionalId": "3"
    },
    "SONOPLASTA": {
      "profissionalId": "15"
    }
  },
  "papel": "EDITOR",
  "aceito": true
}
```

#### Exemplo 2: a SONOPLASTA recusa

Resultado esperado: DIRETOR: 1 Ana Lima, EDITOR: 3 Fernanda Oliveira, SONOPLASTA: 25 Letícia Dias.

```json
{
  "id": 1,
  "genero": "DRAMA",
  "tipo": "FICÇÃO",
  "duracaoMin": 90,
  "orcamento": 150000,
  "prazo": "2026-03-10T00:00:00.000Z",
  "competencias": {
    "DIRETOR": [
      {
        "nome": "Direção",
        "nivel": 5
      }
    ],
    "EDITOR": [
      {
        "nome": "Edição",
        "nivel": 4
      }
    ],
    "SONOPLASTA": [
      {
        "nome": "Som",
        "nivel": 5
      }
    ]
  },
  "pesos": {
    "DIRETOR": 3,
    "EDITOR": 2,
    "SONOPLASTA": 1
  },
  "estrategia": "similiaridadecosseno",
  "parametros": {
    "limiarMinimo": 0.2
  },
  "equipe": {
    "DIRETOR": {
      "profissionalId": "1"
    },
    "EDITOR": {
      "profissionalId": "3"
    },
    "SONOPLASTA": {
      "profissionalId": "15"
    }
  },
  "papel": "SONOPLASTA",
  "aceito": false,
  "rejeitados": []
}
```

#### Exemplo 3: o último membro aceita (equipe confirmada)

Os outros dois já chegam com `"confirmado": true`. Resultado esperado: DIRETOR: 1 Ana Lima (confirmado), EDITOR: 3 Fernanda Oliveira (confirmado), SONOPLASTA: 15 Patrícia Almeida (confirmado), `"status": "confirmada"`.

```json
{
  "id": 1,
  "genero": "DRAMA",
  "tipo": "FICÇÃO",
  "duracaoMin": 90,
  "orcamento": 150000,
  "prazo": "2026-03-10T00:00:00.000Z",
  "competencias": {
    "DIRETOR": [
      {
        "nome": "Direção",
        "nivel": 5
      }
    ],
    "EDITOR": [
      {
        "nome": "Edição",
        "nivel": 4
      }
    ],
    "SONOPLASTA": [
      {
        "nome": "Som",
        "nivel": 5
      }
    ]
  },
  "pesos": {
    "DIRETOR": 3,
    "EDITOR": 2,
    "SONOPLASTA": 1
  },
  "estrategia": "similiaridadecosseno",
  "parametros": {
    "limiarMinimo": 0.2
  },
  "equipe": {
    "DIRETOR": {
      "profissionalId": "1",
      "confirmado": true
    },
    "EDITOR": {
      "profissionalId": "3",
      "confirmado": true
    },
    "SONOPLASTA": {
      "profissionalId": "15"
    }
  },
  "papel": "SONOPLASTA",
  "aceito": true
}
```

#### Exemplo 4: a ROTEIRISTA de um documentário recusa

Resultado esperado: DIRETOR: 18 Diego Rocha, EDITOR: 3 Fernanda Oliveira, ROTEIRISTA: 29 Tatiane Martins.

```json
{
  "id": 2,
  "genero": "DRAMA",
  "tipo": "DOCUMENTARIO",
  "duracaoMin": 60,
  "orcamento": 90000,
  "prazo": "2026-06-10T00:00:00.000Z",
  "competencias": {
    "DIRETOR": [
      {
        "nome": "Direção",
        "nivel": 5
      }
    ],
    "EDITOR": [
      {
        "nome": "Edição",
        "nivel": 4
      }
    ],
    "ROTEIRISTA": [
      {
        "nome": "Roteiro",
        "nivel": 3
      }
    ]
  },
  "estrategia": "similiaridadecosseno",
  "detalhes": {
    "tema": "Rios do Brasil",
    "entrevistados": [
      "Ana Lima",
      "Carlos Souza"
    ]
  },
  "equipe": {
    "DIRETOR": {
      "profissionalId": "18"
    },
    "EDITOR": {
      "profissionalId": "3"
    },
    "ROTEIRISTA": {
      "profissionalId": "2"
    }
  },
  "papel": "ROTEIRISTA",
  "aceito": false,
  "rejeitados": []
}
```

### 6.5 Erros

|Código|Quando|
|---|---|
|400|corpo inválido, estratégia, papel ou **decorator** desconhecido|
|422|regra de negócio: ninguém elegível, sem substituto, orçamento restante esgotado|
|503|banco indisponível e sem cache (ou, no código, adaptador não configurado)|

Todos devolvem `{ "status": "error", "mensagem": "..." }`.

#### Corpos para provocar cada erro

**400** (estratégia inexistente), `POST /`: é o exemplo 1 com `"estrategia": "xpto"`. Resposta: `{"status":"error","mensagem":"body/estrategia must be equal to one of the allowed values"}`.

```json
{
  "id": 1,
  "genero": "DRAMA",
  "tipo": "FICÇÃO",
  "duracaoMin": 90,
  "orcamento": 150000,
  "prazo": "2026-03-10T00:00:00.000Z",
  "competencias": {
    "DIRETOR": [
      {
        "nome": "Direção",
        "nivel": 5
      }
    ],
    "EDITOR": [
      {
        "nome": "Edição",
        "nivel": 4
      }
    ],
    "SONOPLASTA": [
      {
        "nome": "Som",
        "nivel": 5
      }
    ]
  },
  "pesos": {
    "DIRETOR": 3,
    "EDITOR": 2,
    "SONOPLASTA": 1
  },
  "estrategia": "xpto",
  "parametros": {
    "limiarMinimo": 0.2
  }
}
```

**400** (decorator inexistente, novo), `POST /`: é o exemplo 1 com `"decoradores": ["inexistente"]`. Resposta: `{"status":"error","mensagem":"Decorator desconhecido: \"inexistente\". Use: cache, auditoria, compressao"}`.

```json
{
  "id": 1,
  "genero": "DRAMA",
  "tipo": "FICÇÃO",
  "duracaoMin": 90,
  "orcamento": 150000,
  "prazo": "2026-03-10T00:00:00.000Z",
  "competencias": {
    "DIRETOR": [
      {
        "nome": "Direção",
        "nivel": 5
      }
    ],
    "EDITOR": [
      {
        "nome": "Edição",
        "nivel": 4
      }
    ],
    "SONOPLASTA": [
      {
        "nome": "Som",
        "nivel": 5
      }
    ]
  },
  "pesos": {
    "DIRETOR": 3,
    "EDITOR": 2,
    "SONOPLASTA": 1
  },
  "estrategia": "similiaridadecosseno",
  "parametros": {
    "limiarMinimo": 0.2,
    "decoradores": [
      "inexistente"
    ]
  }
}
```

**422** (orçamento baixo demais), `POST /`: é o exemplo 1 com `"orcamento": 100`. Resposta: `{"status":"error","mensagem":"Nenhum profissional elegível para os papéis do projeto (verifique orçamento e prazo)"}`.

```json
{
  "id": 1,
  "genero": "DRAMA",
  "tipo": "FICÇÃO",
  "duracaoMin": 90,
  "orcamento": 100,
  "prazo": "2026-03-10T00:00:00.000Z",
  "competencias": {
    "DIRETOR": [
      {
        "nome": "Direção",
        "nivel": 5
      }
    ],
    "EDITOR": [
      {
        "nome": "Edição",
        "nivel": 4
      }
    ],
    "SONOPLASTA": [
      {
        "nome": "Som",
        "nivel": 5
      }
    ]
  },
  "pesos": {
    "DIRETOR": 3,
    "EDITOR": 2,
    "SONOPLASTA": 1
  },
  "estrategia": "similiaridadecosseno",
  "parametros": {
    "limiarMinimo": 0.2
  }
}
```

## 7. Notificações, auditoria e eventos

Cada ação gera uma linha JSON no console, por exemplo:

```json
{"ts":"...","nivel":"info","evento":"auditoria","observador":"LOG AUDITORIA","tipoEvento":"Convite Recusado","origem":"Sistema Recomendação","statusEquipe":"formada","membros":[...]}
```

**Novo (ATV III):** com `AuditoriaDecorator` na pilha, cada chamada ao algoritmo gera também:

```json
{"ts":"...","nivel":"info","evento":"auditoria_recomendacao","projetoId":"1","candidatos":9,"selecionados":[{"papel":"DIRETOR","profissionalId":"1"},{"papel":"EDITOR","profissionalId":"3"},{"papel":"SONOPLASTA","profissionalId":"15"}],"duracaoMs":0.4,"sucesso":true}
```

Em caso de falha, `"nivel":"error"`, `"sucesso":false` e o campo `erro`. (`candidatos` e `duracaoMs` variam conforme o banco e a máquina.) É diferente da linha `auditoria` acima: aquela é do **Observer** (eventos de negócio) e esta é do **Decorator** (cada execução do algoritmo, com tempo).

Tipos de evento: `Recomendação de Equipe`, `Convite Aceito`, `Convite Recusado`, `Membro Substituído`, `Equipe Confirmada`.

Outros módulos podem assinar os eventos pelo barramento em memória (EventEmitter):

```ts
barramento.assinar("Equipe Confirmada", (evento) => { /* gerência de projetos, financeiro */ });
barramento.assinar("*", (evento) => { /* todos os eventos */ });
```

Para trocar por RabbitMQ, crie outra implementação de `BarramentoEventos` e passe-a ao `PublicadorEventos` no `app.ts`.

## 8. Testes

```bash
npm test            # 158 testes (115 das Atividades 1 e 2 + 43 novos)
npm run test:cov    # com cobertura (mínimo exigido: 80%; atual: acima de 98% em linhas e instruções e cerca de 90% em ramos)
npm run typecheck   # TypeScript em modo estrito
```

Os testes não precisam de banco, nem de rede, nem da API no ar. Usam simuladores em memória (e uma pasta temporária para o `AdaptadorLocal`). Para rodar só um padrão: `npx jest Adapter` (ou `Composite`, `Decorator`).

**Testes novos da Atividade 3**

|Arquivo|O que prova|
|---|---|
|`adapter/Adapter.test.ts`|Os 3 provedores de cada tipo seguem o **mesmo contrato** (mesmos testes rodados para cada um). Status de pagamento unificado; Stripe converte para centavos sem vazar isso ao negócio; arquivo inexistente, nota inválida e fuga de pasta (`..`, inclusive com barras do Windows) são tratados. **Integração:** trocar o adaptador injetado no `SistemaRecomendacao` (profissionais LinkedIn → Interno, armazenamento S3 → Google Cloud, os 3 gateways) não muda a lógica de negócio; sem adaptador configurado, erro claro.|
|`composite/Composite.test.ts`|Custo, prazo e validação corretos em pacotes de **1 a 4 níveis**; adicionar/remover; pacote vazio, serviço inválido, prazo acima do limite e ciclo são recusados. **Integração com `Projeto`:** `calcularCustoTotal` delega; `validarEstrutura` falha por orçamento estourado, prazo posterior ao do projeto ou serviço inválido; `clonar` e `aplicarAjustes` preservam/trocam a hierarquia.|
|`decorator/Decorator.test.ts`|**Cache:** a 2ª requisição idêntica não chega ao recomendador e é mais rápida (medido com relógio simulado e com tempo real); entradas diferentes não colidem; expira pelo TTL. **Auditoria:** registra todas as chamadas, duração e falhas. **Compressão:** a carga gzip é menor que a original e restaurável. **Composição:** pilhas em ordens diferentes dão o mesmo resultado da base; a ordem muda _o que a auditoria enxerga_; decorator desconhecido é rejeitado; o `SistemaRecomendacao` funciona com a pilha sem ser alterado; `criarEstrategia` com `decoradores` reaproveita a pilha.|

Os 115 testes antigos continuaram passando **sem nenhuma alteração**.

## 9. Como estender

|Quero...|Faça|
|---|---|
|**Novo provedor de armazenamento** (ex.: Azure)|Implemente `SistemaArmazenamentoExterno` (ou use o SDK real) e crie `AdaptadorAzure implements AdaptadorArmazenamento` traduzindo as 3 chamadas. Injete com `configurarAdaptadores(new AdaptadorAzure())`. Nenhuma linha do `SistemaRecomendacao` muda.|
|**Novo gateway de pagamento**|Implemente `GatewayPagamento` e estenda `BaseAdaptadorPagamento` informando só o mapa de status do provedor.|
|**Nova fonte de profissionais**|Implemente `ApiProfissionalExterna` e estenda `BaseAdaptadorProfissional` com `traduzir(registro)` (registro bruto → `Profissional`).|
|**Novo tipo de serviço no Composite**|Implemente `ServicoProjeto` (4 métodos). Pode ser colocado dentro de qualquer `PacoteServico`; os algoritmos existentes não mudam.|
|**Novo decorator** (ex.: limite de taxa, métricas)|Estenda `DecoratorRecomendacao`, implemente `recomendar` chamando `this.strategy.recomendar(...)` e registre o nome no mapa de `decorator/MontadorDecoradores.ts`. Depois ele já pode ser pedido em `parametros.decoradores`.|
|**Novo tipo de projeto (ex.: realidade virtual)**|1) acrescente o valor em `TipoProjeto` e crie uma migration `ALTER TYPE ... ADD VALUE`; 2) crie projeto (opcional), validador, recomendador e notificador; 3) crie `FabricaRealidadeVirtual extends FabricaProjeto`; 4) `registro.registrar(new FabricaRealidadeVirtual())` no `app.ts`. Nenhuma linha do orquestrador ou do `SistemaRecomendacao` muda.|
|Modelo pré-configurado de projeto|`new RegistroPrototipos().registrar("nome", projetoModelo)` e depois `.criar("nome", ajustes)`|
|Nova estratégia|classe que implementa `RecomendacaoStrategy` + nome em `src/Strategy/StrategyFactory.ts`|
|Novo observador geral|implemente `Observador` e adicione à lista do `SistemaRecomendacao` no `app.ts`|
|Nova operação sobre projeto ou profissional|implemente `VisitanteProjeto` e chame `projeto.aceitar(visitante)`|
|Outra regra de orquestração|herde `OrquestradorEquipe` e implemente os 3 passos abstratos (`orquestrar` não pode ser sobrescrito)|

## 10. Limitações conhecidas desta entrega

- A API HTTP **não expõe** o Composite (não há campo no JSON para montar um `servicoPrincipal`) nem a escolha de adaptadores; ambos são usados por código e provados pelos testes. Só o Decorator é acionável pelo JSON.
- Os sistemas externos (S3, Stripe, LinkedIn...) são **simulados**, como a atividade pede; não há chamadas reais de rede.
- O cache do `CacheDecorator` é em memória do processo (some ao reiniciar a API).
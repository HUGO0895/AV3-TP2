import { FastifyInstance } from "fastify";
import { Papel } from "../../Equipe/Enum/papel";
import OrquestradorPadrao from "../../Equipe/Modelo/OrquestradorPadrao";
import FabricaAnimacao from "../../Fabricas/FabricaAnimacao";
import FabricaFiccao from "../../Fabricas/FabricaFiccao";
import FabricaProjeto from "../../Fabricas/FabricaProjeto";
import RegistroFabricas from "../../Fabricas/RegistroFabricas";
import { novaAvaliacao, novaCompetencia, novoProfissional, novoProjeto } from "../../helpers/factories";
import Observador from "../../Observer/Observador";
import { Genero } from "../../Projetos/Enum/TipoGenero";
import { TipoProjeto } from "../../Projetos/Enum/TipoProjeto";
import Projeto from "../../Projetos/Modelo/projetos";
import ProjetoAnimacao from "../../Projetos/Modelo/ProjetoAnimacao";
import { construirServidor } from "../../server";
import ServiceRecomendacao from "../../servico/ServiceRecomendacao";
import SistemaRecomendacao from "../../SistemaRecomendacao/SistemaRecomendacao";
import SimiliaridadeCosseno from "../../Strategy/SimiliaridadedeCosseno";
import ValidadorConscistencia from "../../Visitor/ValidadorConscistencia";

const prof = (id: string, nome: string, comps: [string, number][], preco = 1000) =>
  novoProfissional({ id, nome, precoMedio: preco, competencias: comps.map(([n, v]) => novaCompetencia(n, v)), avaliacoes: [novaAvaliacao(4, Papel.DIRETOR)] });

const pool = () => [
  prof("1", "Ana Diretora", [["Direção", 5]]),
  prof("2", "Beto Editor", [["Edição", 5]]),
  prof("3", "Caio VFX", [["Efeitos Visuais", 5]]),
  prof("4", "Duda 3D", [["Animação 3D", 5], ["Efeitos Visuais", 3]]),
  prof("5", "Edu Foto", [["Fotografia", 5]]),
];

const projetoDe = (tipo: TipoProjeto, papeis: Partial<Record<Papel, [string, number][]>>) => {
  const p = novoProjeto({
    tipo, orcamento: 100000,
    competenciasPorPapel: Object.fromEntries(Object.entries(papeis).map(([papel, cs]) => [papel, cs!.map(([n, v]) => novaCompetencia(n, v))])),
  });
  return p;
};

let linhas: any[];
beforeEach(() => {
  linhas = [];
  jest.spyOn(console, "log").mockImplementation((s: string) => { try { linhas.push(JSON.parse(s)); } catch { /* ignora */ } });
});
afterEach(() => jest.restoreAllMocks());

describe("SistemaRecomendacao escolhe a fábrica pelo tipo do projeto", () => {
  const sistema = () => { const s = new SistemaRecomendacao([]); s.definirEstrategiaAtual(new SimiliaridadeCosseno()); return s; };

  it("recomendador do tipo muda a escolha: mesmo pedido, FICÇÃO vs ANIMAÇÃO", () => {
    const pedido = { [Papel.EFEITOS_VISUAIS]: [["Efeitos Visuais", 5]] as [string, number][] };
    const ficcao = sistema().executarEstrategia(projetoDe(TipoProjeto.FICCAO, pedido), pool());
    const animacao = sistema().executarEstrategia(projetoDe(TipoProjeto.ANIMACAO, pedido), pool());
    expect(ficcao.membrosEquipe[0].profissional.nome).toBe("Caio VFX");
    expect(animacao.membrosEquipe[0].profissional.nome).toBe("Duda 3D");
  });

  it("o projeto original não é alterado pelo recomendador (ele usa um clone)", () => {
    const projeto = projetoDe(TipoProjeto.ANIMACAO, { [Papel.EFEITOS_VISUAIS]: [["Efeitos Visuais", 5]] });
    sistema().executarEstrategia(projeto, pool());
    expect(projeto.competencias!.get(Papel.EFEITOS_VISUAIS)).toHaveLength(1);
  });

  it("validador do tipo muda o status: documentário sem editor é 'inconsistente', ficção igual é 'formada'", () => {
    const pedido = { [Papel.DIRETOR]: [["Direção", 5]] as [string, number][] };
    expect(sistema().executarEstrategia(projetoDe(TipoProjeto.FICCAO, pedido), pool()).status).toBe("formada");
    expect(sistema().executarEstrategia(projetoDe(TipoProjeto.DOCUMENTARIO, pedido), pool()).status).toBe("inconsistente");
  });

  it("documentário com diretor e editor é 'formada'", () => {
    const projeto = projetoDe(TipoProjeto.DOCUMENTARIO, { [Papel.DIRETOR]: [["Direção", 5]], [Papel.EDITOR]: [["Edição", 5]] });
    expect(sistema().executarEstrategia(projeto, pool()).status).toBe("formada");
  });

  it("cada tipo usa o seu notificador (além dos observadores gerais)", () => {
    const geral: Observador = { atualizar: jest.fn() };
    const s = new SistemaRecomendacao([geral]);
    s.definirEstrategiaAtual(new SimiliaridadeCosseno());
    const pedido = { [Papel.DIRETOR]: [["Direção", 5]] as [string, number][] };
    s.executarEstrategia(projetoDe(TipoProjeto.DOCUMENTARIO, pedido), pool());
    s.executarEstrategia(projetoDe(TipoProjeto.ANIMACAO, pedido), pool());
    s.executarEstrategia(projetoDe(TipoProjeto.PUBLICITARIO, pedido), pool());
    s.executarEstrategia(projetoDe(TipoProjeto.FICCAO, pedido), pool());
    expect(geral.atualizar).toHaveBeenCalledTimes(4);
    const rotulos = linhas.filter((l) => l.evento === "notificacao_tipo").map((l) => l.observador);
    expect(rotulos).toEqual(["NOTIFICADOR-DOCUMENTARIO", "NOTIFICADOR-ANIMACAO", "NOTIFICADOR-PUBLICITARIO", "NOTIFICADOR-FICCAO"]);
  });

  it("substituir membro e responder convite também usam a fábrica do tipo e preservam a subclasse", () => {
    const s = sistema();
    const projeto = new ProjetoAnimacao("a", Genero.DRAMA, 30, 100000, new Date("2026-06-01"),
      new Map([[Papel.EFEITOS_VISUAIS, [novaCompetencia("Efeitos Visuais", 5)]]]), undefined, undefined, undefined, "3D", 10);
    const equipe = s.executarEstrategia(projeto, pool());
    expect(equipe.membrosEquipe[0].profissional.nome).toBe("Duda 3D");
    linhas.length = 0;
    const nova = s.responderConvite(projeto, equipe, Papel.EFEITOS_VISUAIS, false, pool(), []);
    expect(nova.membrosEquipe[0].profissional.nome).toBe("Caio VFX");
    expect(projeto.constructor).toBe(ProjetoAnimacao);
    expect(linhas.some((l) => l.observador === "NOTIFICADOR-ANIMACAO")).toBe(true);
  });
});

describe("Extensibilidade: novo tipo sem tocar no orquestrador", () => {
  class FabricaRV extends FabricaProjeto {
    readonly tipo = "REALIDADE_VIRTUAL" as unknown as TipoProjeto;
    notificador: Observador = { atualizar: jest.fn() };
    criarProjeto(d: any) { return new Projeto(d.id, d.genero, d.duracaoMin, d.orcamento, d.prazo, this.tipo, d.competencias); }
    criarValidador() { return new ValidadorConscistencia(); }
    criarRecomendador(base?: any) { return base ?? new SimiliaridadeCosseno(); }
    criarNotificador() { return this.notificador; }
  }

  it("basta registrar a nova fábrica", () => {
    const rv = new FabricaRV();
    const registro = RegistroFabricas.padrao().registrar(rv);
    const s = new SistemaRecomendacao([], registro);
    s.definirEstrategiaAtual(new SimiliaridadeCosseno());
    const projeto = rv.criarProjeto({ id: "v", genero: Genero.ACAO, duracaoMin: 10, orcamento: 100000, prazo: new Date("2026-06-01"),
      competencias: new Map([[Papel.DIRETOR, [novaCompetencia("Direção", 5)]]]) });
    const equipe = s.executarEstrategia(projeto, pool());
    expect(equipe.status).toBe("formada");
    expect(rv.notificador.atualizar).toHaveBeenCalledTimes(1);
  });

  it("o orquestrador usa exatamente a fábrica recebida no construtor", () => {
    const fabrica = new FabricaFiccao();
    const spy = jest.spyOn(fabrica, "criarRecomendador");
    const projeto = projetoDe(TipoProjeto.FICCAO, { [Papel.DIRETOR]: [["Direção", 5]] });
    new OrquestradorPadrao(fabrica).orquestrar(projeto, new SimiliaridadeCosseno(), pool());
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("trocar a fábrica do mesmo orquestrador troca o comportamento", () => {
    const pedido = { [Papel.EFEITOS_VISUAIS]: [["Efeitos Visuais", 5]] as [string, number][] };
    const projeto = projetoDe(TipoProjeto.ANIMACAO, pedido);
    const generico = new OrquestradorPadrao(new FabricaFiccao()).orquestrar(projeto, new SimiliaridadeCosseno(), pool());
    const especifico = new OrquestradorPadrao(new FabricaAnimacao()).orquestrar(projeto, new SimiliaridadeCosseno(), pool());
    expect(generico.membrosEquipe[0].profissional.nome).toBe("Caio VFX");
    expect(especifico.membrosEquipe[0].profissional.nome).toBe("Duda 3D");
  });
});

describe("API HTTP com tipos de projeto", () => {
  let app: FastifyInstance;
  beforeEach(() => {
    const service = new ServiceRecomendacao({ buscarTodos: async () => pool() }, new SistemaRecomendacao([]));
    app = construirServidor(service, { logger: false });
  });
  afterEach(async () => { await app.close(); });

  const corpo = (tipo: string, competencias: object, extra: object = {}) => ({
    id: 1, genero: "DRAMA", tipo, duracaoMin: 30, orcamento: 100000, prazo: "2026-06-01T00:00:00.000Z",
    competencias, estrategia: "similiaridadecosseno", ...extra,
  });

  it("PUBLICITARIO é aceito e DIRETOR sozinho fica inconsistente (falta fotografia)", async () => {
    const r = await app.inject({ method: "POST", url: "/", payload: corpo("PUBLICITARIO", { DIRETOR: [{ nome: "Direção", nivel: 5 }] }, { detalhes: { cliente: "Marca X" } }) });
    expect(r.statusCode).toBe(200);
    expect(r.json().Recomendacao.status).toBe("inconsistente");
  });

  it("PUBLICITARIO com diretor e fotografia fecha como 'formada'", async () => {
    const r = await app.inject({ method: "POST", url: "/", payload: corpo("PUBLICITARIO", {
      DIRETOR: [{ nome: "Direção", nivel: 5 }], DIRETOR_FOTOGRAFIA: [{ nome: "Fotografia", nivel: 5 }] }) });
    expect(r.json().Recomendacao.status).toBe("formada");
  });

  it("ANIMAÇÃO usa o recomendador de animação", async () => {
    const r = await app.inject({ method: "POST", url: "/", payload: corpo("ANIMAÇÃO", { EFEITOS_VISUAIS: [{ nome: "Efeitos Visuais", nivel: 5 }] }, { detalhes: { tecnica: "3D", cenas: 8 } }) });
    expect(r.json().Recomendacao.membrosEquipe[0].profissional.nome).toBe("Duda 3D");
  });

  it("FICÇÃO continua igual ao comportamento original", async () => {
    const r = await app.inject({ method: "POST", url: "/", payload: corpo("FICÇÃO", { EFEITOS_VISUAIS: [{ nome: "Efeitos Visuais", nivel: 5 }] }) });
    expect(r.json().Recomendacao.membrosEquipe[0].profissional.nome).toBe("Caio VFX");
    expect(r.json().Recomendacao.status).toBe("formada");
  });

  it("tipo inexistente continua dando 400", async () => {
    const r = await app.inject({ method: "POST", url: "/", payload: corpo("VR", { DIRETOR: [{ nome: "Direção", nivel: 5 }] }) });
    expect(r.statusCode).toBe(400);
  });
});

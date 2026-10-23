import { FastifyInstance } from "fastify";
import Profissional from "../../Equipe/Modelo/Profissional";
import { poolGrande, poolPequeno } from "../../helpers/pool";
import SistemaRecomendacao from "../../SistemaRecomendacao/SistemaRecomendacao";
import { construirServidor } from "../../server";
import ServiceRecomendacao from "../../servico/ServiceRecomendacao";

const corpo = (extra: Record<string, unknown> = {}) => ({
  id: 1, genero: "DRAMA", tipo: "FICÇÃO", duracaoMin: 90, orcamento: 300000,
  prazo: "2026-06-01T00:00:00.000Z",
  competencias: {
    DIRETOR: [{ nome: "Direção", nivel: 5 }],
    EDITOR: [{ nome: "Edição", nivel: 5 }],
    SONOPLASTA: [{ nome: "Som", nivel: 5 }],
  },
  estrategia: "similiaridadecosseno",
  ...extra,
});

function subir(buscar: () => Promise<Profissional[]>) {
  const service = new ServiceRecomendacao({ buscarTodos: buscar }, new SistemaRecomendacao([]));
  return construirServidor(service, { logger: false });
}
const ids = (resp: any) => Object.fromEntries(resp.Recomendacao.membrosEquipe.map((m: any) => [m.papel, m.profissional.id]));
const post = (app: FastifyInstance, url: string, payload: unknown) => app.inject({ method: "POST", url, payload: payload as any });

describe("API HTTP (integração, sem banco)", () => {
  let app: FastifyInstance;
  beforeAll(() => { jest.spyOn(console, "log").mockImplementation(() => {}); });
  beforeEach(() => { app = subir(async () => poolPequeno()); });
  afterEach(async () => { await app.close(); });

  it("GET /saude responde ok", async () => {
    const r = await app.inject({ method: "GET", url: "/saude" });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toEqual({ status: "ok" });
  });

  it("POST / devolve a equipe recomendada com membros ainda não confirmados", async () => {
    const r = await post(app, "/", corpo());
    expect(r.statusCode).toBe(200);
    const json = r.json();
    expect(json.degradado).toBe(false);
    expect(json.Recomendacao.status).toBe("formada");
    expect(json.Recomendacao.membrosEquipe).toHaveLength(3);
    expect(json.Recomendacao.membrosEquipe.every((m: any) => m.confirmado === false)).toBe(true);
  });

  it("trocar a estratégia altera o resultado para o MESMO projeto", async () => {
    const cosseno = ids((await post(app, "/", corpo({ estrategia: "similiaridadecosseno" }))).json());
    const colaborativa = ids((await post(app, "/", corpo({ estrategia: "filtragemcolaborativa" }))).json());
    expect(cosseno.DIRETOR).toBe("1");        // maior similaridade de competências
    expect(colaborativa.DIRETOR).toBe("2");   // melhor avaliação histórica no papel
    const orcamento = await post(app, "/", corpo({ estrategia: "regrasdeorcamento" }));
    expect(orcamento.statusCode).toBe(200);
  });

  it("aceita o nome do enum (DIRETOR_FOTOGRAFIA) e devolve o valor do papel", async () => {
    const r = await post(app, "/", corpo({ competencias: { DIRETOR_FOTOGRAFIA: [{ nome: "Fotografia", nivel: 5 }] } }));
    expect(r.statusCode).toBe(200);
    expect(r.json().Recomendacao.membrosEquipe[0].papel).toBe("DIRETOR DE FOTOGRAFIA");
  });

  it("parâmetros do algoritmo são repassados (limiarMinimo elimina candidatos fracos)", async () => {
    const r = await post(app, "/", corpo({ parametros: { limiarMinimo: 0.99 }, competencias: { EDITOR: [{ nome: "Edição", nivel: 5 }] } }));
    expect(ids(r.json()).EDITOR).toBe("3");
  });

  it("400 para corpo inválido, estratégia desconhecida e papel inválido", async () => {
    const { orcamento, ...semOrcamento } = corpo();
    expect((await post(app, "/", semOrcamento)).statusCode).toBe(400);
    expect((await post(app, "/", corpo({ estrategia: "xpto" }))).statusCode).toBe(400);
    const papel = await post(app, "/", corpo({ competencias: { CAMERA: [{ nome: "x", nivel: 1 }] } }));
    expect(papel.statusCode).toBe(400);
    expect(papel.json().mensagem).toContain("Papel inválido");
  });

  it("422 quando ninguém cabe no orçamento", async () => {
    const r = await post(app, "/", corpo({ orcamento: 100 }));
    expect(r.statusCode).toBe(422);
    expect(r.json().mensagem).toContain("Nenhum profissional elegível");
  });

  it("substituir: troca só o papel pedido e respeita rejeitados", async () => {
    const equipe = ids((await post(app, "/", corpo())).json());
    const corpoEquipe = Object.fromEntries(Object.entries(equipe).map(([papel, id]) => [papel, { profissionalId: id }]));

    const r = await post(app, "/equipe/substituir", corpo({ equipe: corpoEquipe, papel: "DIRETOR" }));
    expect(r.statusCode).toBe(200);
    const nova = ids(r.json());
    expect(nova.DIRETOR).toBe("7");
    expect(nova.EDITOR).toBe(equipe.EDITOR);
    expect(nova.SONOPLASTA).toBe(equipe.SONOPLASTA);

    const r2 = await post(app, "/equipe/substituir", corpo({ equipe: corpoEquipe, papel: "DIRETOR", rejeitados: ["7"] }));
    expect(ids(r2.json()).DIRETOR).not.toBe("7");
  });

  it("convites/responder: aceite confirma e recusa substitui", async () => {
    const equipe = ids((await post(app, "/", corpo())).json());
    const corpoEquipe = Object.fromEntries(Object.entries(equipe).map(([papel, id]) => [papel, { profissionalId: id }]));

    const aceito = await post(app, "/convites/responder", corpo({ equipe: corpoEquipe, papel: "EDITOR", aceito: true }));
    const membroEditor = aceito.json().Recomendacao.membrosEquipe.find((m: any) => m.papel === "EDITOR");
    expect(membroEditor.confirmado).toBe(true);

    const recusado = await post(app, "/convites/responder", corpo({ equipe: corpoEquipe, papel: "DIRETOR", aceito: false }));
    expect(ids(recusado.json()).DIRETOR).toBe("7");
  });

  it("503 quando o repositório está fora do ar e não há cache", async () => {
    const fora = subir(async () => { throw new Error("db off"); });
    const r = await post(fora, "/", corpo());
    expect(r.statusCode).toBe(503);
    await fora.close();
  });
});

describe("Requisitos não funcionais (10 mil profissionais)", () => {
  let app: FastifyInstance;
  const pool = poolGrande(10_000);
  beforeAll(() => { jest.spyOn(console, "log").mockImplementation(() => {}); app = subir(async () => pool); });
  afterAll(async () => { await app.close(); });

  it.each(["similiaridadecosseno", "filtragemcolaborativa"])("%s responde em menos de 2s", async (estrategia) => {
    await post(app, "/", corpo({ estrategia })); // aquece o cache de profissionais
    const inicio = Date.now();
    const r = await post(app, "/", corpo({ estrategia }));
    expect(r.statusCode).toBe(200);
    expect(Date.now() - inicio).toBeLessThan(2000);
  });

  it("regrasdeorcamento responde em menos de 2s", async () => {
    await post(app, "/", corpo({ estrategia: "regrasdeorcamento" }));
    const inicio = Date.now();
    const r = await post(app, "/", corpo({ estrategia: "regrasdeorcamento" }));
    expect(r.statusCode).toBe(200);
    expect(Date.now() - inicio).toBeLessThan(2000);
  });

  it("atende 100 requisições simultâneas sem erro", async () => {
    const inicio = Date.now();
    const respostas = await Promise.all(Array.from({ length: 100 }, () => post(app, "/", corpo())));
    expect(respostas.every((r) => r.statusCode === 200)).toBe(true);
    expect(Date.now() - inicio).toBeLessThan(5000);
  });
});

import { Papel } from "../../Equipe/Enum/papel";
import { ErroNegocio, ErroServicoIndisponivel } from "../../erros";
import { novoProfissional, novoProjeto } from "../../helpers/factories";
import SistemaRecomendacao from "../../SistemaRecomendacao/SistemaRecomendacao";
import ServiceRecomendacao, { ProfissionalProvider } from "../../servico/ServiceRecomendacao";
import RecomendacaoStrategy from "../../Strategy/RecomendacaoStrategy";

describe("ServiceRecomendacao: tolerância a falhas", () => {
  const ana = novoProfissional({ id: "1", nome: "Ana" });
  const estrategia: RecomendacaoStrategy = { recomendar: () => new Map([[Papel.DIRETOR, ana]]) };
  const projeto = () => novoProjeto({ competenciasPorPapel: { [Papel.DIRETOR]: [] } });
  let relogio: number;
  const criar = (provider: ProfissionalProvider, opcoes = {}) =>
    new ServiceRecomendacao(provider, new SistemaRecomendacao([]), { agora: () => relogio, cacheTtlMs: 1000, tentativas: 2, ...opcoes });

  beforeEach(() => { relogio = 0; jest.spyOn(console, "log").mockImplementation(() => {}); });
  afterEach(() => jest.restoreAllMocks());

  it("usa cache dentro do TTL (uma só consulta ao repositório)", async () => {
    const provider = { buscarTodos: jest.fn().mockResolvedValue([ana]) };
    const service = criar(provider);
    await service.recomendar(projeto(), estrategia);
    await service.recomendar(projeto(), estrategia);
    expect(provider.buscarTodos).toHaveBeenCalledTimes(1);
  });

  it("tenta de novo quando a primeira consulta falha", async () => {
    const provider = { buscarTodos: jest.fn().mockRejectedValueOnce(new Error("timeout")).mockResolvedValue([ana]) };
    const r = await criar(provider).recomendar(projeto(), estrategia);
    expect(provider.buscarTodos).toHaveBeenCalledTimes(2);
    expect(r.degradado).toBe(false);
  });

  it("com o repositório fora do ar usa o último cache e sinaliza 'degradado'", async () => {
    const provider = { buscarTodos: jest.fn().mockResolvedValueOnce([ana]).mockRejectedValue(new Error("fora do ar")) };
    const service = criar(provider);
    await service.recomendar(projeto(), estrategia);
    relogio = 5000; // cache expirado
    const r = await service.recomendar(projeto(), estrategia);
    expect(r.degradado).toBe(true);
    expect(r.equipe.membrosEquipe).toHaveLength(1);
  });

  it("sem cache e sem repositório lança ErroServicoIndisponivel (503)", async () => {
    const provider = { buscarTodos: jest.fn().mockRejectedValue(new Error("fora do ar")) };
    await expect(criar(provider).recomendar(projeto(), estrategia)).rejects.toThrow(ErroServicoIndisponivel);
  });

  it("substituir/responderConvite falham para profissional desconhecido na equipe enviada", async () => {
    const service = criar({ buscarTodos: async () => [ana] });
    const dto = { [Papel.DIRETOR]: { profissionalId: "999" } };
    await expect(service.substituir(projeto(), estrategia, dto, Papel.DIRETOR)).rejects.toThrow(ErroNegocio);
    await expect(service.responderConvite(projeto(), estrategia, dto, Papel.DIRETOR, true)).rejects.toThrow(ErroNegocio);
  });
});

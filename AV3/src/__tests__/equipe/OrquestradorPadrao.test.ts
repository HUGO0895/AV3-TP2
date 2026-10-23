import FabricaFiccao from "../../Fabricas/FabricaFiccao";
import OrquestradorPadrao from "../../Equipe/Modelo/OrquestradorPadrao";
import RecomendacaoStrategy from "../../Strategy/RecomendacaoStrategy";
import { Papel } from "../../Equipe/Enum/papel";
import Projeto from "../../Projetos/Modelo/projetos";
import { novoProfissional, novoProjeto } from "../../helpers/factories";

describe("OrquestradorPadrao", () => {
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it("orquestrar monta uma Equipe 'formada' a partir da estratégia informada", () => {
    const ana = novoProfissional({ id: "1", nome: "Ana" });
    const mapa = new Map([[Papel.DIRETOR, ana]]);
    const estrategiaFake: RecomendacaoStrategy = {
      recomendar: jest.fn().mockReturnValue(mapa),
    };
    const projeto = novoProjeto({ competenciasPorPapel: { [Papel.DIRETOR]: [] } });

    const equipe = new OrquestradorPadrao(new FabricaFiccao()).orquestrar(projeto, estrategiaFake, [ana]);

    expect(equipe.status).toBe("formada");
    expect(equipe.membrosEquipe).toHaveLength(1);
    expect(equipe.membrosEquipe[0].papel).toBe(Papel.DIRETOR);
    expect(equipe.membrosEquipe[0].confirmado).toBe(false); // só confirma quando o profissional aceita o convite
    expect(equipe.membrosEquipe[0].profissional).toBe(ana);
    expect(estrategiaFake.recomendar).toHaveBeenCalledWith(projeto, [ana]);
  });

  it("posProcessar é chamado (loga a equipe processada) após orquestrar", () => {
    const ana = novoProfissional({ id: "1", nome: "Ana" });
    const estrategiaFake: RecomendacaoStrategy = {
      recomendar: jest.fn().mockReturnValue(new Map([[Papel.DIRETOR, ana]])),
    };
    const projeto = novoProjeto({ competenciasPorPapel: { [Papel.DIRETOR]: [] } });

    new OrquestradorPadrao(new FabricaFiccao()).orquestrar(projeto, estrategiaFake, [ana]);

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("equipe_processada"));
  });

  it(
    "lança um erro quando o projeto não é uma instância válida (sem a propriedade competencias)",
    () => {
      const projetoInvalido = {} as unknown as Projeto;
      const estrategiaFake: RecomendacaoStrategy = { recomendar: jest.fn() };

      expect(() =>
        new OrquestradorPadrao(new FabricaFiccao()).orquestrar(projetoInvalido, estrategiaFake, [])
      ).toThrow("O projeto não possui competencias");
    }
  );

  it("rejeita projeto sem competências (validação antes de chamar a estratégia)", () => {
    const estrategiaFake: RecomendacaoStrategy = { recomendar: jest.fn() };

    expect(() =>
      new OrquestradorPadrao(new FabricaFiccao()).orquestrar(novoProjeto({}), estrategiaFake, [])
    ).toThrow("O projeto não possui competencias");
    expect(estrategiaFake.recomendar).not.toHaveBeenCalled();
  });
});

import FabricaFiccao from "../../Fabricas/FabricaFiccao";
import Equipe from "../../Equipe/Modelo/equipe";
import OrquestradorPadrao from "../../Equipe/Modelo/OrquestradorPadrao";
import Profissional from "../../Equipe/Modelo/Profissional";
import Projeto from "../../Projetos/Modelo/projetos";
import { Papel } from "../../Equipe/Enum/papel";
import { ErroNegocio } from "../../erros";
import { novaCompetencia, novoIntervalo, novoProfissional, novoProjeto } from "../../helpers/factories";
import RecomendacaoStrategy from "../../Strategy/RecomendacaoStrategy";

describe("Template Method: OrquestradorEquipe", () => {
  beforeEach(() => { jest.spyOn(console, "log").mockImplementation(() => {}); });
  afterEach(() => jest.restoreAllMocks());

  const ana = () => novoProfissional({ id: "1", nome: "Ana" });
  const fake = (mapa: Map<Papel, Profissional>): RecomendacaoStrategy => ({ recomendar: jest.fn().mockReturnValue(mapa) });

  it("executa sempre as etapas na mesma ordem (fluxo invariável)", () => {
    const ordem: string[] = [];
    class Espiao extends OrquestradorPadrao {
      validarRestricoes(p: Projeto) { ordem.push("validar"); return super.validarRestricoes(p); }
      filtrarDisponiveis(p: Projeto, l: Profissional[]) { ordem.push("filtrar"); return super.filtrarDisponiveis(p, l); }
      normalizarDados(m: Map<Papel, Profissional>) { ordem.push("normalizar"); return super.normalizarDados(m); }
      posProcessar(e: Equipe, p?: Projeto) { ordem.push("posprocessar"); super.posProcessar(e, p); }
    }
    const estrategia: RecomendacaoStrategy = {
      recomendar: () => { ordem.push("recomendar"); return new Map([[Papel.DIRETOR, ana()]]); },
    };
    new Espiao(new FabricaFiccao()).orquestrar(novoProjeto({ competenciasPorPapel: { [Papel.DIRETOR]: [] } }), estrategia, [ana()]);
    expect(ordem).toEqual(["validar", "filtrar", "recomendar", "normalizar", "posprocessar"]);
  });

  it("subclasses não conseguem sobrescrever o esqueleto orquestrar()", () => {
    class Ruim extends OrquestradorPadrao { orquestrar(): Equipe { return null as any; } }
    expect(() => new Ruim(new FabricaFiccao())).toThrow("não pode ser sobrescrito");
  });

  it("filtra profissionais indisponíveis na data do prazo antes de chamar a estratégia", () => {
    const disponivel = ana();
    const indisponivel = novoProfissional({ id: "2", nome: "Bia", disponibilidade: novoIntervalo("2027-01-01", "2027-12-31") });
    const estrategia = fake(new Map([[Papel.DIRETOR, disponivel]]));
    new OrquestradorPadrao(new FabricaFiccao()).orquestrar(novoProjeto({ competenciasPorPapel: { [Papel.DIRETOR]: [] } }), estrategia, [disponivel, indisponivel]);
    expect(estrategia.recomendar).toHaveBeenCalledWith(expect.anything(), [disponivel]);
  });

  it("marca a equipe como 'parcial' quando falta preencher um papel exigido", () => {
    const projeto = novoProjeto({ competenciasPorPapel: { [Papel.DIRETOR]: [], [Papel.EDITOR]: [] } });
    const equipe = new OrquestradorPadrao(new FabricaFiccao()).orquestrar(projeto, fake(new Map([[Papel.DIRETOR, ana()]])), [ana()]);
    expect(equipe.status).toBe("parcial");
  });

  it("marca como 'acima_do_orcamento' quando o custo estoura o orçamento", () => {
    const caro = novoProfissional({ id: "9", nome: "Caro", precoMedio: 90000 });
    const projeto = novoProjeto({ orcamento: 1000, competenciasPorPapel: { [Papel.DIRETOR]: [] } });
    const equipe = new OrquestradorPadrao(new FabricaFiccao()).orquestrar(projeto, fake(new Map([[Papel.DIRETOR, caro]])), [caro]);
    expect(equipe.status).toBe("acima_do_orcamento");
  });

  it("estratégia sem nenhum resultado gera ErroNegocio (422)", () => {
    const projeto = novoProjeto({ competenciasPorPapel: { [Papel.DIRETOR]: [novaCompetencia("x", 1)] } });
    expect(() => new OrquestradorPadrao(new FabricaFiccao()).orquestrar(projeto, fake(new Map()), [])).toThrow(ErroNegocio);
  });
});

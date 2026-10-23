import Convite from "../../Equipe/Modelo/Convite";
import Equipe from "../../Equipe/Modelo/equipe";
import MembroEquipe from "../../Equipe/Modelo/membroEquipe";
import Profissional from "../../Equipe/Modelo/Profissional";
import Projeto from "../../Projetos/Modelo/projetos";
import { Papel } from "../../Equipe/Enum/papel";
import { ErroNegocio, ErroValidacao } from "../../erros";
import { novoProfissional, novoProjeto } from "../../helpers/factories";
import EventoRecomendacao, { TiposEvento } from "../../Observer/EventoRecomendacao";
import SistemaRecomendacao from "../../SistemaRecomendacao/SistemaRecomendacao";
import RecomendacaoStrategy from "../../Strategy/RecomendacaoStrategy";

const prof = (id: string, preco = 1000) => novoProfissional({ id, nome: `P${id}`, precoMedio: preco });
/** Estratégia fake: para cada papel escolhe o primeiro candidato ainda não usado. */
const primeiroDaLista: RecomendacaoStrategy = {
  recomendar: (projeto: Projeto, lista: Profissional[]) => {
    const mapa = new Map<Papel, Profissional>();
    Array.from(projeto.competencias!.keys()).forEach((papel, i) => { if (lista[i]) mapa.set(papel, lista[i]); });
    return mapa;
  },
};

describe("Convite", () => {
  it("só pode ser respondido uma vez", () => {
    const c = new Convite(Papel.DIRETOR, prof("1"));
    c.aceitar();
    expect(c.status).toBe("ACEITO");
    expect(() => c.recusar()).toThrow(ErroNegocio);
  });
});

describe("Projeto (métodos do diagrama)", () => {
  const montar = () => {
    const p = novoProjeto({ competenciasPorPapel: { [Papel.DIRETOR]: [] } });
    p.equipe = new Equipe(new Date(), "formada", [new MembroEquipe(Papel.DIRETOR, false, prof("1"))]);
    return p;
  };

  it("aceitarRecomendacao confirma o membro; falha se o profissional não foi recomendado", () => {
    const p = montar();
    p.aceitarRecomendacao(Papel.DIRETOR, prof("1"));
    expect(p.equipe!.membrosEquipe[0].confirmado).toBe(true);
    expect(() => p.aceitarRecomendacao(Papel.DIRETOR, prof("9"))).toThrow(ErroNegocio);
  });

  it("substituirMembro troca o profissional e volta a exigir confirmação", () => {
    const p = montar();
    p.aceitarRecomendacao(Papel.DIRETOR, prof("1"));
    p.substituirMembro(Papel.DIRETOR, prof("2"));
    expect(p.equipe!.membrosEquipe[0]).toMatchObject({ confirmado: false });
    expect(p.equipe!.membrosEquipe[0].profissional.getId()).toBe("2");
    expect(() => p.substituirMembro(Papel.EDITOR, prof("3"))).toThrow(ErroNegocio);
  });

  it("substituirMembro sem equipe e solicitarReavaliacao", () => {
    const p = novoProjeto({});
    expect(() => p.substituirMembro(Papel.DIRETOR, prof("1"))).toThrow(ErroNegocio);
    const q = montar();
    q.solicitarReavaliacao();
    expect(q.equipe).toBeUndefined();
  });

  it("pesoDe usa 1 como padrão", () => {
    const p = novoProjeto({ pesos: { [Papel.EDITOR]: 3 } });
    expect(p.pesoDe(Papel.EDITOR)).toBe(3);
    expect(p.pesoDe(Papel.DIRETOR)).toBe(1);
  });
});

describe("SistemaRecomendacao: substituição e convites", () => {
  let eventos: EventoRecomendacao[];
  let sistema: SistemaRecomendacao;
  beforeEach(() => {
    eventos = [];
    sistema = new SistemaRecomendacao([{ atualizar: (e) => { eventos.push(e); } }]);
    jest.spyOn(console, "log").mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  const projeto = () => novoProjeto({ competenciasPorPapel: { [Papel.DIRETOR]: [], [Papel.EDITOR]: [] } });
  const equipeInicial = () => new Equipe(new Date(), "formada", [
    new MembroEquipe(Papel.DIRETOR, false, prof("1")),
    new MembroEquipe(Papel.EDITOR, false, prof("2")),
  ]);
  const pool = () => [prof("1"), prof("2"), prof("3"), prof("4")];

  it("sem estratégia definida lança ErroValidacao; definirEstrategia é alias do diagrama", () => {
    expect(() => sistema.executarEstrategia(projeto(), pool())).toThrow(ErroValidacao);
    sistema.definirEstrategia(primeiroDaLista);
    expect(sistema.executarEstrategia(projeto(), pool()).membrosEquipe).toHaveLength(2);
    expect(eventos[0].tipo).toBe(TiposEvento.RECOMENDACAO);
  });

  it("substituirMembro mantém os demais fixos, exclui quem já está na equipe e notifica", () => {
    const equipe = equipeInicial();
    const r = sistema.substituirMembro(projeto(), equipe, Papel.DIRETOR, pool(), [], primeiroDaLista);
    const diretor = r.membrosEquipe.find((m) => m.papel === Papel.DIRETOR)!;
    const editor = r.membrosEquipe.find((m) => m.papel === Papel.EDITOR)!;
    expect(diretor.profissional.getId()).toBe("3");
    expect(diretor.confirmado).toBe(false);
    expect(editor.profissional.getId()).toBe("2");
    expect(eventos.at(-1)!.tipo).toBe(TiposEvento.MEMBRO_SUBSTITUIDO);
    expect(eventos.at(-1)!.detalhes).toMatchObject({ papel: Papel.DIRETOR, anterior: "1", novo: "3" });
  });

  it("rejeitados nunca voltam como substitutos", () => {
    const r = sistema.substituirMembro(projeto(), equipeInicial(), Papel.DIRETOR, pool(), ["3"], primeiroDaLista);
    expect(r.membrosEquipe.find((m) => m.papel === Papel.DIRETOR)!.profissional.getId()).toBe("4");
  });

  it("falha quando não há substituto, papel inexistente ou orçamento restante esgotado", () => {
    const so2 = [prof("1"), prof("2")];
    expect(() => sistema.substituirMembro(projeto(), equipeInicial(), Papel.DIRETOR, so2, [], primeiroDaLista)).toThrow(ErroNegocio);
    expect(() => sistema.substituirMembro(projeto(), equipeInicial(), Papel.SONOPLASTA, pool(), [], primeiroDaLista)).toThrow(ErroNegocio);
    const apertado = novoProjeto({ orcamento: 1000, competenciasPorPapel: { [Papel.DIRETOR]: [], [Papel.EDITOR]: [] } });
    expect(() => sistema.substituirMembro(apertado, equipeInicial(), Papel.DIRETOR, pool(), [], primeiroDaLista)).toThrow("Orçamento restante");
  });

  it("convite aceito confirma o membro; quando todos aceitam a equipe fica 'confirmada' e o evento é emitido", () => {
    const equipe = equipeInicial();
    const p = projeto();
    sistema.responderConvite(p, equipe, Papel.DIRETOR, true, pool());
    expect(equipe.status).toBe("formada");
    sistema.responderConvite(p, equipe, Papel.EDITOR, true, pool());
    expect(equipe.status).toBe("confirmada");
    const tipos = eventos.map((e) => e.tipo);
    expect(tipos).toEqual([TiposEvento.CONVITE_ACEITO, TiposEvento.CONVITE_ACEITO, TiposEvento.EQUIPE_CONFIRMADA]);
    expect(eventos.at(-1)!.detalhes).toMatchObject({ projetoId: "p1" });
  });

  it("convite recusado dispara a substituição automática do papel", () => {
    const equipe = equipeInicial();
    const r = sistema.responderConvite(projeto(), equipe, Papel.EDITOR, false, pool(), [], primeiroDaLista);
    expect(r.membrosEquipe.find((m) => m.papel === Papel.EDITOR)!.profissional.getId()).toBe("3");
    expect(eventos.map((e) => e.tipo)).toEqual([TiposEvento.CONVITE_RECUSADO, TiposEvento.MEMBRO_SUBSTITUIDO]);
  });

  it("responder convite de papel que não está na equipe falha", () => {
    expect(() => sistema.responderConvite(projeto(), equipeInicial(), Papel.SONOPLASTA, true, pool())).toThrow(ErroNegocio);
  });

  it("adicionarObservador (nome correto) e adicionarObeservador (legado) funcionam", () => {
    const a = jest.fn(); const b = jest.fn();
    const s = new SistemaRecomendacao([]);
    s.adicionarObservador({ atualizar: a }); s.adicionarObeservador({ atualizar: b });
    s.executarEstrategia(projeto(), pool(), primeiroDaLista);
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });
});

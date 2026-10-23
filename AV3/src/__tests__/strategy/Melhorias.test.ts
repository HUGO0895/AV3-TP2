import { Papel } from "../../Equipe/Enum/papel";
import { ErroValidacao } from "../../erros";
import { novaAvaliacao, novaCompetencia, novoProfissional, novoProjeto } from "../../helpers/factories";
import FiltragemColaborativa from "../../Strategy/FiltragemColaborativa";
import RegrasOrcamento from "../../Strategy/RegrasOrcamento";
import SimiliaridadeCosseno from "../../Strategy/SimiliaridadedeCosseno";
import { criarEstrategia } from "../../Strategy/StrategyFactory";

describe("SimiliaridadeCosseno (correções)", () => {
  const projeto = (extra = {}) =>
    novoProjeto({ competenciasPorPapel: { [Papel.DIRETOR]: [novaCompetencia("direção", 5)] }, ...extra });

  it("ignora diferença de maiúsculas/minúsculas e espaços no nome da competência", () => {
    const certo = novoProfissional({ id: "1", nome: "Certo", competencias: [novaCompetencia(" DIREÇÃO ", 5)] });
    const errado = novoProfissional({ id: "2", nome: "Errado", competencias: [novaCompetencia("Som", 5)] });
    const mapa = new SimiliaridadeCosseno().recomendar(projeto(), [errado, certo]);
    expect(mapa.get(Papel.DIRETOR)).toBe(certo);
  });

  it("não lança erro quando não há candidato: o papel simplesmente fica sem preenchimento", () => {
    expect(new SimiliaridadeCosseno().recomendar(projeto(), []).size).toBe(0);
  });

  it("respeita o orçamento do papel", () => {
    const caro = novoProfissional({ id: "1", nome: "Caro", precoMedio: 5000, competencias: [novaCompetencia("Direção", 5)] });
    expect(new SimiliaridadeCosseno().recomendar(projeto({ orcamento: 1000 }), [caro]).size).toBe(0);
  });

  it("limiarMinimo descarta candidatos pouco similares", () => {
    const fraco = novoProfissional({ id: "1", nome: "Fraco", competencias: [novaCompetencia("Direção", 1), novaCompetencia("Som", 5)] });
    expect(new SimiliaridadeCosseno().recomendar(projeto(), [fraco]).size).toBe(1);
    expect(new SimiliaridadeCosseno({ limiarMinimo: 0.9 }).recomendar(projeto(), [fraco]).size).toBe(0);
  });

  it("não repete o mesmo profissional em dois papéis", () => {
    const unico = novoProfissional({ id: "1", nome: "Único", competencias: [novaCompetencia("Direção", 5), novaCompetencia("Edição", 5)] });
    const p = novoProjeto({ competenciasPorPapel: {
      [Papel.DIRETOR]: [novaCompetencia("Direção", 5)], [Papel.EDITOR]: [novaCompetencia("Edição", 5)] } });
    expect(new SimiliaridadeCosseno().recomendar(p, [unico]).size).toBe(1);
  });
});

describe("FiltragemColaborativa (correções)", () => {
  const projeto = novoProjeto({ competenciasPorPapel: { [Papel.EDITOR]: [] } });

  it("ignora quem não tem avaliação no papel (sem NaN) e não quebra com lista vazia", () => {
    const semNota = novoProfissional({ id: "1", nome: "Sem nota" });
    const comNota = novoProfissional({ id: "2", nome: "Com nota", avaliacoes: [novaAvaliacao(3, Papel.EDITOR)] });
    expect(new FiltragemColaborativa().recomendar(projeto, [semNota, comNota]).get(Papel.EDITOR)).toBe(comNota);
    expect(new FiltragemColaborativa().recomendar(projeto, [semNota]).size).toBe(0);
    expect(new FiltragemColaborativa().recomendar(projeto, []).size).toBe(0);
  });

  it("usa a média sem arredondar e desempata por número de avaliações", () => {
    const a = novoProfissional({ id: "1", nome: "A", avaliacoes: [novaAvaliacao(4, Papel.EDITOR), novaAvaliacao(4, Papel.EDITOR)] });
    const b = novoProfissional({ id: "2", nome: "B", avaliacoes: [novaAvaliacao(4, Papel.EDITOR)] });
    const c = novoProfissional({ id: "3", nome: "C", avaliacoes: [novaAvaliacao(5, Papel.EDITOR), novaAvaliacao(4, Papel.EDITOR)] });
    expect(new FiltragemColaborativa().recomendar(projeto, [b, a]).get(Papel.EDITOR)).toBe(a);
    expect(new FiltragemColaborativa().recomendar(projeto, [a, c]).get(Papel.EDITOR)).toBe(c);
  });

  it("minAvaliacoes exige histórico mínimo", () => {
    const novato = novoProfissional({ id: "1", nome: "Novato", avaliacoes: [novaAvaliacao(5, Papel.EDITOR)] });
    expect(new FiltragemColaborativa({ minAvaliacoes: 2 }).recomendar(projeto, [novato]).size).toBe(0);
  });

  it("respeita o orçamento do papel", () => {
    const caro = novoProfissional({ id: "1", nome: "Caro", precoMedio: 9000, avaliacoes: [novaAvaliacao(5, Papel.EDITOR)] });
    const barato = novoProjeto({ orcamento: 1000, competenciasPorPapel: { [Papel.EDITOR]: [] } });
    expect(new FiltragemColaborativa().recomendar(barato, [caro]).size).toBe(0);
  });
});

describe("RegrasOrcamento (correções)", () => {
  const dupla = () => [
    novoProfissional({ id: "1", nome: "P1", avaliacoes: [novaAvaliacao(5, Papel.DIRETOR), novaAvaliacao(5, Papel.EDITOR)] }),
    novoProfissional({ id: "2", nome: "P2", avaliacoes: [novaAvaliacao(4, Papel.DIRETOR), novaAvaliacao(4, Papel.EDITOR)] }),
  ];
  const papeis = { [Papel.DIRETOR]: [], [Papel.EDITOR]: [] };

  it("problema inviável devolve mapa vazio em vez de lançar erro", () => {
    const p = novoProjeto({ orcamento: 1, competenciasPorPapel: papeis });
    expect(new RegrasOrcamento().recomendar(p, dupla()).size).toBe(0);
  });

  it("os pesos por papel mudam quem fica com o papel mais importante", () => {
    const [p1, p2] = dupla();
    const diretorImporta = novoProjeto({ competenciasPorPapel: papeis, pesos: { [Papel.DIRETOR]: 10, [Papel.EDITOR]: 1 } });
    const editorImporta = novoProjeto({ competenciasPorPapel: papeis, pesos: { [Papel.DIRETOR]: 1, [Papel.EDITOR]: 10 } });

    const a = new RegrasOrcamento().recomendar(diretorImporta, dupla());
    expect(a.get(Papel.DIRETOR)?.getId()).toBe(p1.getId());
    expect(a.get(Papel.EDITOR)?.getId()).toBe(p2.getId());

    const b = new RegrasOrcamento().recomendar(editorImporta, dupla());
    expect(b.get(Papel.EDITOR)?.getId()).toBe(p1.getId());
    expect(b.get(Papel.DIRETOR)?.getId()).toBe(p2.getId());
  });
});

describe("StrategyFactory", () => {
  it("cria a estratégia pelo nome (sem diferenciar maiúsculas) e repassa parâmetros", () => {
    expect(criarEstrategia("RegrasDeOrcamento")).toBeInstanceOf(RegrasOrcamento);
    expect(criarEstrategia("filtragemcolaborativa")).toBeInstanceOf(FiltragemColaborativa);
    expect(criarEstrategia("similiaridadecosseno", { limiarMinimo: 0.5 })).toBeInstanceOf(SimiliaridadeCosseno);
  });

  it("nome desconhecido gera ErroValidacao (400)", () => {
    expect(() => criarEstrategia("xpto")).toThrow(ErroValidacao);
  });
});

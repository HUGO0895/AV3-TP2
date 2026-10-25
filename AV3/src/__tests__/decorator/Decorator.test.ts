import { Papel } from "../../Equipe/Enum/papel";
import Profissional from "../../Equipe/Modelo/Profissional";
import { novaCompetencia, novoProfissional, novoProjeto } from "../../helpers/factories";
import Projeto from "../../Projetos/Modelo/projetos";
import AuditoriaDecorator from "../../decorator/AuditoriaDecorator";
import CacheDecorator from "../../decorator/CacheDecorator";
import CompressaoDecorator from "../../decorator/CompressaoDecorator";
import { aplicarDecoradores } from "../../decorator/MontadorDecoradores";
import RecomendadorBase from "../../decorator/RecomendadorBase";
import SistemaRecomendacao from "../../SistemaRecomendacao/SistemaRecomendacao";
import RecomendacaoStrategy from "../../Strategy/RecomendacaoStrategy";
import { criarEstrategia } from "../../Strategy/StrategyFactory";
import { ErroValidacao } from "../../erros";

const profissionais = () => Array.from({ length: 40 }, (_, i) => novoProfissional({
  id: `p${i}`, nome: `Profissional número ${i}`, precoMedio: 1000 + i,
  competencias: [novaCompetencia("Direção", 1 + (i % 5)), novaCompetencia("Edição", 1 + ((i + 2) % 5))],
}));
const projeto = (id = "1"): Projeto => novoProjeto({ id, competenciasPorPapel: {
  [Papel.DIRETOR]: [novaCompetencia("Direção", 5)], [Papel.EDITOR]: [novaCompetencia("Edição", 5)] } });
const ids = (m: Map<Papel, Profissional>) => Array.from(m.entries()).map(([p, x]) => `${p}:${x.getId()}`).sort();

beforeEach(() => { jest.spyOn(console, "log").mockImplementation(() => {}); });
afterEach(() => jest.restoreAllMocks());

/** Estratégia espiã: conta chamadas e simula custo (relógio manual) sem alterar o resultado. */
function espia(relogio?: { t: number }) {
  const base = new RecomendadorBase();
  const chamadas = { n: 0 };
  const s: RecomendacaoStrategy = { recomendar: (p, l) => { chamadas.n++; if (relogio) relogio.t += 50; return base.recomendar(p, l); } };
  return { s, chamadas };
}

describe("Decorator: RecomendadorBase", () => {
  it("devolve o mesmo que a estratégia pura", () => {
    expect(ids(new RecomendadorBase().recomendar(projeto(), profissionais()))).toEqual(
      ids(criarEstrategia("similiaridadecosseno").recomendar(projeto(), profissionais())));
  });
});

describe("Decorator: cache", () => {
  it("requisição repetida não chega ao recomendador e é mais rápida (tempo simulado)", () => {
    const relogio = { t: 0 };
    const { s, chamadas } = espia(relogio);
    const cache = new CacheDecorator(s, { agora: () => relogio.t });
    const l = profissionais();
    const t0 = relogio.t; const r1 = cache.recomendar(projeto(), l); const custo1 = relogio.t - t0;
    const t1 = relogio.t; const r2 = cache.recomendar(projeto(), l); const custo2 = relogio.t - t1;
    expect(custo1).toBe(50); expect(custo2).toBe(0);
    expect(chamadas.n).toBe(1);
    expect(ids(r2)).toEqual(ids(r1));
    expect([cache.acertos, cache.erros]).toEqual([1, 1]);
  });

  it("tempo real: segunda chamada é mais rápida que a primeira", () => {
    const lento: RecomendacaoStrategy = { recomendar: (p, l) => { const f = Date.now() + 30; while (Date.now() < f) { /* espera */ } return new RecomendadorBase().recomendar(p, l); } };
    const cache = new CacheDecorator(lento);
    const a = performance.now(); cache.recomendar(projeto(), profissionais()); const t1 = performance.now() - a;
    const b = performance.now(); cache.recomendar(projeto(), profissionais()); const t2 = performance.now() - b;
    expect(t2).toBeLessThan(t1);
  });

  it("entradas diferentes não colidem; expira pelo TTL; limpar esvazia", () => {
    const relogio = { t: 0 };
    const { s, chamadas } = espia();
    const cache = new CacheDecorator(s, { ttlMs: 100, agora: () => relogio.t });
    const l = profissionais();
    cache.recomendar(projeto("1"), l);
    cache.recomendar(projeto("2"), l);
    cache.recomendar(projeto("1"), l.slice(0, 10));
    expect(chamadas.n).toBe(3);
    relogio.t = 500; cache.recomendar(projeto("1"), l);
    expect(chamadas.n).toBe(4);
    cache.limpar(); cache.recomendar(projeto("1"), l);
    expect(chamadas.n).toBe(5);
  });

  it("mexer no resultado devolvido não contamina o cache", () => {
    const cache = new CacheDecorator(new RecomendadorBase());
    const l = profissionais();
    cache.recomendar(projeto(), l).clear();
    expect(cache.recomendar(projeto(), l).size).toBe(2);
  });
});

describe("Decorator: auditoria", () => {
  it("registra todas as chamadas com projeto, candidatos, selecionados e duração", () => {
    const relogio = { t: 0 };
    const { s } = espia(relogio);
    const saida: any[] = [];
    const aud = new AuditoriaDecorator(s, (r) => saida.push(r), () => relogio.t);
    const resultado = aud.recomendar(projeto("9"), profissionais());
    aud.recomendar(projeto("9"), profissionais());
    expect(aud.registros).toHaveLength(2);
    expect(saida).toHaveLength(2);
    expect(aud.registros[0]).toMatchObject({ projetoId: "9", candidatos: 40, sucesso: true, duracaoMs: 50 });
    expect(aud.registros[0].selecionados).toHaveLength(resultado.size);
  });

  it("registra falhas e repropaga o erro; usa o log estruturado por padrão", () => {
    const falha: RecomendacaoStrategy = { recomendar: () => { throw new Error("boom"); } };
    const aud = new AuditoriaDecorator(falha);
    expect(() => aud.recomendar(projeto(), [])).toThrow("boom");
    expect(aud.registros[0]).toMatchObject({ sucesso: false, erro: "Error: boom" });
    expect(console.log).toHaveBeenCalled();
    new AuditoriaDecorator(new RecomendadorBase()).recomendar(projeto(), profissionais());
  });
});

describe("Decorator: compressão", () => {
  it("a carga comprimida é menor que a original e pode ser restaurada", () => {
    const comp = new CompressaoDecorator(new RecomendadorBase());
    const r = comp.recomendar(projeto(), profissionais());
    const est = comp.ultimaEstatistica!;
    expect(est.bytesComprimidos).toBeLessThan(est.bytesOriginais);
    expect(comp.ultimaCarga!.length).toBe(est.bytesComprimidos);
    expect(CompressaoDecorator.descomprimir(comp.ultimaCarga!).map((x) => x.id).sort()).toEqual(Array.from(r.values()).map((p) => p.getId()).sort());
  });
});

describe("Decorator: composição dinâmica em qualquer ordem", () => {
  it("cache → auditoria → compressão e a ordem inversa dão o mesmo resultado da base", () => {
    const esperado = ids(new RecomendadorBase().recomendar(projeto(), profissionais()));
    for (const ordem of [["cache", "auditoria", "compressao"], ["compressao", "auditoria", "cache"], ["auditoria", "cache"], []] as any[]) {
      const pilha = aplicarDecoradores(new RecomendadorBase(), { decoradores: ordem });
      expect(ids(pilha.recomendar(projeto(), profissionais()))).toEqual(esperado);
    }
  });

  it("a ordem muda o comportamento: auditoria por fora vê o acerto de cache, por dentro não", () => {
    const { s, chamadas } = espia();
    const porFora = aplicarDecoradores(s, { decoradores: ["cache", "auditoria"] }) as AuditoriaDecorator;
    porFora.recomendar(projeto(), profissionais()); porFora.recomendar(projeto(), profissionais());
    expect(porFora.registros).toHaveLength(2); expect(chamadas.n).toBe(1);

    const { s: s2 } = espia();
    const porDentro = aplicarDecoradores(s2, { decoradores: ["auditoria", "cache"] }) as CacheDecorator;
    porDentro.recomendar(projeto(), profissionais()); porDentro.recomendar(projeto(), profissionais());
    expect(((porDentro as any).strategy as AuditoriaDecorator).registros).toHaveLength(1);
  });

  it("decorator desconhecido é rejeitado", () => {
    expect(() => aplicarDecoradores(new RecomendadorBase(), { decoradores: ["x" as any] })).toThrow(ErroValidacao);
  });

  it("SistemaRecomendacao funciona com a pilha escolhida em tempo de execução, sem ser alterado", () => {
    const sistema = new SistemaRecomendacao([]);
    sistema.definirEstrategia(aplicarDecoradores(new RecomendadorBase(), { decoradores: ["cache", "auditoria", "compressao"] }));
    const equipe = sistema.executarEstrategia(projeto(), profissionais());
    expect(equipe.membrosEquipe).toHaveLength(2);
  });

  it("política via fábrica de estratégias (parametros.decoradores) reaproveita a mesma pilha/cache", () => {
    const params = { limiarMinimo: 0.1, decoradores: ["cache", "auditoria"] };
    const a = criarEstrategia("similiaridadecosseno", params);
    const b = criarEstrategia("similiaridadecosseno", { ...params });
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(AuditoriaDecorator);
    expect(criarEstrategia("similiaridadecosseno", { decoradores: [] })).not.toBeInstanceOf(AuditoriaDecorator);
  });
});

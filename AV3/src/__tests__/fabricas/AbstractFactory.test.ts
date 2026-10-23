import FabricaAnimacao from "../../Fabricas/FabricaAnimacao";
import FabricaDocumentario from "../../Fabricas/FabricaDocumentario";
import FabricaFiccao from "../../Fabricas/FabricaFiccao";
import FabricaProjeto from "../../Fabricas/FabricaProjeto";
import FabricaPublicitario from "../../Fabricas/FabricaPublicitario";
import NotificadorAnimacao from "../../Fabricas/Notificadores/NotificadorAnimacao";
import NotificadorDocumentario from "../../Fabricas/Notificadores/NotificadorDocumentario";
import NotificadorPublicitario from "../../Fabricas/Notificadores/NotificadorPublicitario";
import RecomendadorAnimacao from "../../Fabricas/Recomendadores/RecomendadorAnimacao";
import RecomendadorDocumentario from "../../Fabricas/Recomendadores/RecomendadorDocumentario";
import RecomendadorPublicitario from "../../Fabricas/Recomendadores/RecomendadorPublicitario";
import RegistroFabricas from "../../Fabricas/RegistroFabricas";
import ValidadorAnimacao from "../../Fabricas/Validadores/ValidadorAnimacao";
import ValidadorDocumentario from "../../Fabricas/Validadores/ValidadorDocumentario";
import ValidadorPublicitario from "../../Fabricas/Validadores/ValidadorPublicitario";
import { Genero } from "../../Projetos/Enum/TipoGenero";
import { TipoProjeto } from "../../Projetos/Enum/TipoProjeto";
import Projeto from "../../Projetos/Modelo/projetos";
import ProjetoAnimacao from "../../Projetos/Modelo/ProjetoAnimacao";
import ProjetoDocumentario from "../../Projetos/Modelo/ProjetoDocumentario";
import ProjetoPublicitario from "../../Projetos/Modelo/ProjetoPublicitario";
import ValidadorConscistencia from "../../Visitor/ValidadorConscistencia";
import { ErroValidacao } from "../../erros";

const dados = { id: "1", genero: Genero.DRAMA, duracaoMin: 90, orcamento: 1000, prazo: new Date("2026-06-01") };

describe("Abstract Factory / Factory Method: famílias de objetos por tipo", () => {
  it.each([
    ["documentário", new FabricaDocumentario(), TipoProjeto.DOCUMENTARIO, ProjetoDocumentario, ValidadorDocumentario, RecomendadorDocumentario, NotificadorDocumentario],
    ["animação", new FabricaAnimacao(), TipoProjeto.ANIMACAO, ProjetoAnimacao, ValidadorAnimacao, RecomendadorAnimacao, NotificadorAnimacao],
    ["publicitário", new FabricaPublicitario(), TipoProjeto.PUBLICITARIO, ProjetoPublicitario, ValidadorPublicitario, RecomendadorPublicitario, NotificadorPublicitario],
  ] as const)("fábrica de %s cria projeto, validador, recomendador e notificador do seu tipo", (_n, fabrica, tipo, Projeto_, Validador, Recomendador, Notificador) => {
    expect(fabrica).toBeInstanceOf(FabricaProjeto);
    expect(fabrica.tipo).toBe(tipo);
    const projeto = fabrica.criarProjeto(dados);
    expect(projeto).toBeInstanceOf(Projeto_);
    expect(projeto.tipo).toBe(tipo);
    expect(fabrica.criarValidador()).toBeInstanceOf(Validador);
    expect(fabrica.criarRecomendador()).toBeInstanceOf(Recomendador);
    expect(fabrica.criarNotificador()).toBeInstanceOf(Notificador);
  });

  it("detalhes específicos chegam ao projeto criado pela fábrica", () => {
    const d = new FabricaDocumentario().criarProjeto({ ...dados, detalhes: { tema: "Mar", entrevistados: ["A"] } }) as ProjetoDocumentario;
    expect([d.tema, d.entrevistados]).toEqual(["Mar", ["A"]]);
    const a = new FabricaAnimacao().criarProjeto({ ...dados, detalhes: { tecnica: "stop-motion", cenas: 5 } }) as ProjetoAnimacao;
    expect([a.tecnica, a.cenas]).toEqual(["stop-motion", 5]);
    const p = new FabricaPublicitario().criarProjeto({ ...dados, detalhes: { cliente: "X", veiculos: ["TV"] } }) as ProjetoPublicitario;
    expect([p.cliente, p.veiculos]).toEqual(["X", ["TV"]]);
  });

  it("fábrica de ficção mantém o comportamento original (projeto genérico, validador geral)", () => {
    const f = new FabricaFiccao();
    const p = f.criarProjeto(dados);
    expect(p.constructor).toBe(Projeto);
    expect(p.tipo).toBe(TipoProjeto.FICCAO);
    expect(f.criarValidador()).toBeInstanceOf(ValidadorConscistencia);
    const base = { recomendar: jest.fn() };
    expect(f.criarRecomendador(base)).toBe(base);
  });

  it("o recomendador especializado envolve a estratégia escolhida pelo cliente", () => {
    const base = { recomendar: jest.fn().mockReturnValue(new Map()) };
    const projeto = new FabricaAnimacao().criarProjeto(dados);
    new FabricaAnimacao().criarRecomendador(base).recomendar(projeto, []);
    expect(base.recomendar).toHaveBeenCalledTimes(1);
    expect(base.recomendar.mock.calls[0][0]).not.toBe(projeto); // trabalhou num clone
  });
});

describe("RegistroFabricas", () => {
  it("o registro padrão cobre todos os tipos do enum", () => {
    const r = RegistroFabricas.padrao();
    for (const tipo of Object.values(TipoProjeto)) expect(r.obter(tipo).tipo).toBe(tipo);
  });

  it("tipo sem fábrica gera erro 400 listando os disponíveis", () => {
    const r = new RegistroFabricas().registrar(new FabricaFiccao());
    expect(() => r.obter(TipoProjeto.ANIMACAO)).toThrow(ErroValidacao);
    expect(() => r.obter(TipoProjeto.ANIMACAO)).toThrow(TipoProjeto.FICCAO);
  });

  it("registrar um tipo novo é só uma chamada", () => {
    const nova = new FabricaAnimacao();
    const r = new RegistroFabricas().registrar(nova);
    expect(r.obter(TipoProjeto.ANIMACAO)).toBe(nova);
    expect(r.tipos()).toEqual([TipoProjeto.ANIMACAO]);
  });
});
